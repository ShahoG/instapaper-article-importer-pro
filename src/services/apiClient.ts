import axios from "axios";
import { InstapaperCredentials, CSVRow, ImportResult } from "../types";

// Create an axios instance for backend API calls
const backendClient = axios.create({
  baseURL: "http://localhost:4001/api",
  timeout: 120000, // 2 minutes timeout for very large batches
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Store OAuth tokens after authentication
let authTokens: { token: string; tokenSecret: string } | null = null;

// Configuration for rate limiting and retries - optimized for 1000+ articles
const RATE_LIMIT_CONFIG = {
  initialDelay: 150, // Slightly lower initial delay for efficiency
  maxDelay: 5000, // Higher max delay for safety with large batches
  batchSize: 25, // Larger batches for better throughput
  batchDelay: 2000, // 2 seconds between batches
  maxRetries: 3, // Max retries per article
  backoffMultiplier: 2.0, // More aggressive backoff for large batches
};

// Authenticate with backend proxy and store tokens
export const authenticate = async (credentials: InstapaperCredentials): Promise<boolean> => {
  try {
    const response = await backendClient.post(
      "/authenticate",
      credentials
    );
    if (response.data.success === true && response.data.token && response.data.tokenSecret) {
      authTokens = {
        token: response.data.token,
        tokenSecret: response.data.tokenSecret
      };
      return true;
    }
    return false;
  } catch (error) {
    console.error("Authentication error:", error);
    return false;
  }
};

// Helper function to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Add a single article with retry logic
const addArticleWithRetry = async (
  article: CSVRow,
  retryCount = 0
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!authTokens) {
      return { success: false, error: "No auth tokens available" };
    }
    
    const response = await backendClient.post(
      "/add",
      {
        token: authTokens.token,
        tokenSecret: authTokens.tokenSecret,
        url: article.url,
        title: article.title,
        status: article.status,
      }
    );
    
    return { success: response.data.success === true };
  } catch (error) {
    const isAxiosError = axios.isAxiosError(error);
    const statusCode = isAxiosError ? error.response?.status : undefined;
    const errorMessage = isAxiosError 
      ? error.response?.data?.details || error.message 
      : error instanceof Error ? error.message : 'Unknown error';
    
    // Handle rate limiting (429) or server errors (5xx)
    if ((statusCode === 429 || statusCode >= 500) && retryCount < RATE_LIMIT_CONFIG.maxRetries) {
      const backoffDelay = Math.min(
        RATE_LIMIT_CONFIG.initialDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, retryCount),
        RATE_LIMIT_CONFIG.maxDelay
      );
      console.log(`Retrying article ${article.url} after ${backoffDelay}ms (attempt ${retryCount + 1}/${RATE_LIMIT_CONFIG.maxRetries})`);
      await sleep(backoffDelay);
      return addArticleWithRetry(article, retryCount + 1);
    }
    
    console.error(`Error adding article: ${article.url}`, errorMessage);
    return { success: false, error: errorMessage };
  }
};

// Add a single article via backend proxy using OAuth tokens (for backward compatibility)
export const addArticle = async (
  credentials: InstapaperCredentials,
  article: CSVRow
): Promise<boolean> => {
  const result = await addArticleWithRetry(article);
  return result.success;
};

// Import batch of articles with progress tracking and advanced error handling
export const importArticles = async (
  credentials: InstapaperCredentials,
  articles: CSVRow[],
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult & { failedArticles?: Array<{url: string, error: string}> }> => {
  // First authenticate
  const isAuthenticated = await authenticate(credentials);
  if (!isAuthenticated) {
    return {
      success: false,
      message: "Failed to authenticate with Instapaper",
    };
  }
  
  let successCount = 0;
  let failedCount = 0;
  const failedArticles: Array<{url: string, error: string}> = [];
  let currentDelay = RATE_LIMIT_CONFIG.initialDelay;
  
  console.log(`Starting import of ${articles.length} articles...`);
  
  // For very large imports (>100 articles), process in mega-batches
  const useMegaBatches = articles.length > 100;
  const megaBatchSize = 100;
  const megaBatches = useMegaBatches ? [] : [articles];
  
  if (useMegaBatches) {
    for (let i = 0; i < articles.length; i += megaBatchSize) {
      megaBatches.push(articles.slice(i, i + megaBatchSize));
    }
    console.log(`Processing ${articles.length} articles in ${megaBatches.length} mega-batches of up to ${megaBatchSize} articles each`);
  }
  
  // Process each mega-batch
  for (let megaBatchIndex = 0; megaBatchIndex < megaBatches.length; megaBatchIndex++) {
    const megaBatch = megaBatches[megaBatchIndex];
    
    if (useMegaBatches && megaBatchIndex > 0) {
      console.log(`Waiting 10 seconds before processing mega-batch ${megaBatchIndex + 1}/${megaBatches.length}...`);
      await sleep(10000); // 10 second delay between mega-batches
    }
    
    // Process articles in regular batches within each mega-batch
    const batches = [];
    for (let i = 0; i < megaBatch.length; i += RATE_LIMIT_CONFIG.batchSize) {
      batches.push(megaBatch.slice(i, i + RATE_LIMIT_CONFIG.batchSize));
    }
    
    console.log(`Mega-batch ${megaBatchIndex + 1}: Processing ${megaBatch.length} articles in ${batches.length} batches...`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartTime = Date.now();
      
      // Process articles in the current batch
      for (let i = 0; i < batch.length; i++) {
        const article = batch[i];
        const overallIndex = megaBatchIndex * megaBatchSize + batchIndex * RATE_LIMIT_CONFIG.batchSize + i;
        
        try {
          // Update progress at intervals to avoid too frequent updates
          if (onProgress && (overallIndex % 5 === 0 || overallIndex === articles.length - 1)) {
            onProgress(overallIndex, articles.length);
          }
          
          const result = await addArticleWithRetry(article);
          
          if (result.success) {
            successCount++;
            // Successful request, gradually decrease delay
            currentDelay = Math.max(RATE_LIMIT_CONFIG.initialDelay, currentDelay * 0.95);
          } else {
            failedCount++;
            failedArticles.push({ url: article.url, error: result.error || "Unknown error" });
            // Failed request, increase delay
            currentDelay = Math.min(currentDelay * 1.3, RATE_LIMIT_CONFIG.maxDelay);
          }
          
          // Add delay between requests within a batch
          if (i < batch.length - 1) {
            await sleep(currentDelay);
          }
          
          // Log progress every 50 articles
          if ((overallIndex + 1) % 50 === 0) {
            const elapsed = (Date.now() - batchStartTime) / 1000;
            console.log(`Progress: ${overallIndex + 1}/${articles.length} articles processed (${successCount} success, ${failedCount} failed) - ${elapsed.toFixed(1)}s`);
          }
        } catch (error) {
          console.error(`Unexpected error processing article ${overallIndex}:`, error);
          failedCount++;
          failedArticles.push({ url: article.url, error: "Unexpected error" });
        }
      }
      
      // Add delay between batches (except after the last batch)
      if (batchIndex < batches.length - 1) {
        await sleep(RATE_LIMIT_CONFIG.batchDelay);
      }
    }
  }
  
  // Final progress update
  if (onProgress) {
    onProgress(articles.length, articles.length);
  }
  
  console.log(`Import complete: ${successCount} succeeded, ${failedCount} failed`);
  
  if (successCount === 0) {
    return {
      success: false,
      message: "Failed to import any articles",
      importedCount: 0,
      failedCount,
      failedArticles
    };
  }
  
  return {
    success: true,
    message: `Successfully imported ${successCount} articles${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
    importedCount: successCount,
    failedCount,
    failedArticles: failedCount > 0 ? failedArticles : undefined
  };
};
