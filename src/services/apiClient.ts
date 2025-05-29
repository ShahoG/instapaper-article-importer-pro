import axios from "axios";
import { InstapaperCredentials, CSVRow, ImportResult } from "../types";

// Create an axios instance for backend API calls
const backendClient = axios.create({
  baseURL: "http://localhost:4001/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Store OAuth tokens after authentication
let authTokens: { token: string; tokenSecret: string } | null = null;

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

// Add a single article via backend proxy using OAuth tokens
export const addArticle = async (
  credentials: InstapaperCredentials,
  article: CSVRow
): Promise<boolean> => {
  try {
    if (!authTokens) {
      console.error("No auth tokens available. Please authenticate first.");
      return false;
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
    return response.data.success === true;
  } catch (error) {
    console.error(`Error adding article: ${article.url}`, error);
    return false;
  }
};

// Import batch of articles with progress tracking
export const importArticles = async (
  credentials: InstapaperCredentials,
  articles: CSVRow[],
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> => {
  // First authenticate
  const isAuthenticated = await authenticate(credentials);
  if (!isAuthenticated) {
    return {
      success: false,
      message: "Failed to authenticate with Instapaper",
    };
  }
  
  // Add articles with rate limiting
  const results = [];
  let successCount = 0;
  let failedCount = 0;
  
  // Process articles with a small delay between requests to avoid rate limiting
  for (let i = 0; i < articles.length; i++) {
    try {
      // Update progress
      if (onProgress) {
        onProgress(i, articles.length);
      }
      
      const success = await addArticle(credentials, articles[i]);
      
      if (success) {
        successCount++;
      } else {
        failedCount++;
      }
      
      // Add a small delay between requests (200ms)
      if (i < articles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Error processing article ${i}:`, error);
      failedCount++;
    }
  }
  
  // Final progress update
  if (onProgress) {
    onProgress(articles.length, articles.length);
  }
  
  if (successCount === 0) {
    return {
      success: false,
      message: "Failed to import any articles",
      importedCount: 0,
      failedCount
    };
  }
  
  return {
    success: true,
    message: `Successfully imported ${successCount} articles${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
    importedCount: successCount,
    failedCount
  };
};
