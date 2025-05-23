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
    
    if (values.length >= 2) { // At minimum we need title and URL
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
    
    if (!row.title) {
      return { 
        valid: false, 
        message: `Row ${i + 1} is missing a title` 
      };
    }
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
