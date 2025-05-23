
import axios from "axios";
import { InstapaperCredentials, CSVRow, ImportResult } from "../types";

// Create an axios instance for Instapaper API calls
const instapaperClient = axios.create({
  baseURL: "https://www.instapaper.com/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json",
  },
});

// Encode credentials for Basic Auth
const encodeCredentials = (credentials: InstapaperCredentials): string => {
  return Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64");
};

// Authenticate with Instapaper
export const authenticate = async (credentials: InstapaperCredentials): Promise<boolean> => {
  try {
    const encodedAuth = encodeCredentials(credentials);
    const response = await instapaperClient.get("/authenticate", {
      headers: {
        Authorization: `Basic ${encodedAuth}`,
      },
    });
    return response.status === 200;
  } catch (error) {
    console.error("Authentication error:", error);
    return false;
  }
};

// Add a single article to Instapaper
export const addArticle = async (
  credentials: InstapaperCredentials,
  article: CSVRow
): Promise<boolean> => {
  try {
    const encodedAuth = encodeCredentials(credentials);
    const params = new URLSearchParams();
    params.append("url", article.url);
    
    if (article.title) {
      params.append("title", article.title);
    }
    
    // Use tags as description if available
    if (article.tags) {
      params.append("description", `Tags: ${article.tags}`);
    }
    
    const response = await instapaperClient.post("/1/bookmarks/add", params, {
      headers: {
        Authorization: `Basic ${encodedAuth}`,
      },
    });
    
    return response.status === 200 || response.status === 201;
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
