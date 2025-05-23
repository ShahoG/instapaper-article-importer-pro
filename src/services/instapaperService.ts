import { CSVRow, InstapaperCredentials, ImportResult, ImportProgress } from "../types";
import * as apiClient from "./apiClient";

// Function to authenticate with Instapaper (now uses our apiClient)
export const authenticateInstapaper = async (
  credentials: InstapaperCredentials
): Promise<boolean> => {
  return await apiClient.authenticate(credentials);
};

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
    // Only require url, all other fields optional
    if (values.length >= 2 && values[1]) { // url is required
      result.push({
        title: values[0] ? values[0].replace(/^"|"$/g, '') : '',
        url: values[1] ? values[1].replace(/^"|"$/g, '') : '',
        time_added: values[2] ? values[2].replace(/^"|"$/g, '') : '',
        tags: values[3] ? values[3].replace(/^"|"$/g, '') : '',
        status: values[4] ? values[4].replace(/^"|"$/g, '') : ''
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
