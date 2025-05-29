import { CSVRow, InstapaperCredentials, ImportResult, ImportProgress } from "../types";
import * as apiClient from "./apiClient";

// Function to authenticate with Instapaper (now uses our apiClient)
export const authenticateInstapaper = async (
  credentials: InstapaperCredentials
): Promise<boolean> => {
  return await apiClient.authenticate(credentials);
};

// Helper to extract title, url, and status from a row
function extractTitleUrlStatus(values: string[]): { title: string; url: string; status: string } {
  const title = '';
  let url = '';
  let status = '';
  // Normalize values
  const norm = (v: string) => v ? v.replace(/^"|"$/g, '').trim() : '';
  
  // Debug logging
  console.log('CSV row values:', values);
  
  // First, find the URL
  let urlIndex = -1;
  for (let i = 0; i < values.length; i++) {
    if (/^https?:\/\//.test(values[i].trim())) {
      url = norm(values[i]);
      urlIndex = i;
      break;
    }
  }
  
  // Then look for status values (archive, archived, unread, etc.)
  for (let i = 0; i < values.length; i++) {
    if (i !== urlIndex) {
      const val = norm(values[i]).toLowerCase();
      if (val === 'archive' || val === 'archived' || val === 'unread') {
        status = norm(values[i]);
        break;
      }
    }
  }
  
  // If we still don't have a status and there are exactly 2 values, 
  // assume the non-URL value is the status
  if (!status && values.length === 2 && urlIndex !== -1) {
    const otherIndex = urlIndex === 0 ? 1 : 0;
    status = norm(values[otherIndex]);
  }
  
  // Debug logging
  console.log('Extracted:', { title, url, status });
  
  return { title, url, status };
}

// Function to parse CSV data
export const parseCSV = (csvContent: string): CSVRow[] => {
  const lines = csvContent.split("\n");
  const result: CSVRow[] = [];
  
  // Skip header row if it exists
  const startIndex = lines[0].toLowerCase().includes("title,url") ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Properly handle commas within quoted fields
    const values: string[] = [];
    let currentValue = "";
    let insideQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue);
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    
    values.push(currentValue); // Add the last value

    // Use the helper to extract fields
    const { title, url, status } = extractTitleUrlStatus(values);
    if (url) {
      result.push({
        title,
        url,
        time_added: '',
        tags: '',
        status
      });
    }
  }
  
  return result;
};

// Function to validate CSV structure
export const validateCSV = (rows: CSVRow[]): { valid: boolean; message?: string } => {
  if (rows.length === 0) {
    return { valid: false, message: "CSV file is empty" };
  }
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    if (!row.url || !isValidUrl(row.url)) {
      return { 
        valid: false, 
        message: `Row ${i + 1} contains an invalid URL: "${row.url}"` 
      };
    }
    // Title is now optional, so we do not check for it
  }
  
  return { valid: true };
};

// Function to check if a URL is valid
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Function to import articles to Instapaper with progress tracking
export const importArticlesToInstapaper = async (
  credentials: InstapaperCredentials,
  articles: CSVRow[],
  onProgressUpdate?: (progress: ImportProgress) => void
): Promise<ImportResult> => {
  try {
    // Track progress of the import operation
    const handleProgress = (current: number, total: number) => {
      if (onProgressUpdate) {
        const percentage = Math.round((current / total) * 100);
        onProgressUpdate({
          current,
          total,
          percentage,
          isComplete: current === total
        });
      }
    };
    
    // Use our new API client to handle the import process
    return await apiClient.importArticles(credentials, articles, handleProgress);
  } catch (error) {
    console.error("Import error:", error);
    return { 
      success: false, 
      message: "An error occurred during the import process" 
    };
  }
};

// Note: The status field is now parsed and available in CSVRow. You can use it to filter or process articles (e.g., only import unread) in the future.

// Function to parse only URLs from CSV data
export const parseURLsFromCSV = (csvContent: string): string[] => {
  const lines = csvContent.split("\n");
  const urls: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Properly handle commas within quoted fields
    const values: string[] = [];
    let currentValue = "";
    let insideQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue);
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue); // Add the last value
    // Find the first non-empty value that looks like a URL
    for (const val of values) {
      const trimmed = val.replace(/^"|"$/g, '').trim();
      if (trimmed && /^https?:\/\//.test(trimmed)) {
        urls.push(trimmed);
        break;
      }
    }
  }
  return urls;
};

// Function to import URLs to Instapaper with progress tracking
export const importURLsToInstapaper = async (
  credentials: InstapaperCredentials,
  urls: string[],
  onProgressUpdate?: (progress: ImportProgress) => void
): Promise<ImportResult> => {
  try {
    const handleProgress = (current: number, total: number) => {
      if (onProgressUpdate) {
        const percentage = Math.round((current / total) * 100);
        onProgressUpdate({
          current,
          total,
          percentage,
          isComplete: current === total
        });
      }
    };

    // Authenticate first
    const isAuthenticated = await apiClient.authenticate(credentials);
    if (!isAuthenticated) {
      return {
        success: false,
        message: "Failed to authenticate with Instapaper",
      };
    }

    let successCount = 0;
    let failedCount = 0;
    for (let i = 0; i < urls.length; i++) {
      if (onProgressUpdate) handleProgress(i, urls.length);
      const url = urls[i];
      // Use apiClient.addArticle with only url
      const success = await apiClient.addArticle(credentials, { url, title: '', time_added: '', tags: '', status: '' });
      if (success) {
        successCount++;
      } else {
        failedCount++;
      }
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    if (onProgressUpdate) handleProgress(urls.length, urls.length);
    if (successCount === 0) {
      return {
        success: false,
        message: "Failed to import any URLs",
        importedCount: 0,
        failedCount
      };
    }
    return {
      success: true,
      message: `Successfully imported ${successCount} URLs${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      importedCount: successCount,
      failedCount
    };
  } catch (error) {
    console.error("Import error:", error);
    return {
      success: false,
      message: "An error occurred during the import process"
    };
  }
};
