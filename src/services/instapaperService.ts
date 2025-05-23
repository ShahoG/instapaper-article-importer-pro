
import { CSVRow, InstapaperCredentials, ImportResult } from "../types";

// Function to authenticate with Instapaper
export const authenticateInstapaper = async (
  credentials: InstapaperCredentials
): Promise<boolean> => {
  try {
    // In a real implementation, this would be a server-side call to prevent exposing credentials
    // As per Instapaper API docs: https://www.instapaper.com/api/simple
    console.log("Authenticating with Instapaper:", credentials.username);
    
    // This is a mock implementation - in production this should be a server-side call
    // Mock successful authentication for development purposes
    return true;
  } catch (error) {
    console.error("Authentication error:", error);
    return false;
  }
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

// Function to import articles to Instapaper
export const importArticlesToInstapaper = async (
  credentials: InstapaperCredentials,
  articles: CSVRow[]
): Promise<ImportResult> => {
  try {
    // In a real implementation, this would be a server-side call to prevent exposing credentials
    // As per Instapaper API docs: https://www.instapaper.com/api/full
    
    // Authenticate first
    const isAuthenticated = await authenticateInstapaper(credentials);
    if (!isAuthenticated) {
      return { 
        success: false, 
        message: "Failed to authenticate with Instapaper" 
      };
    }
    
    console.log(`Importing ${articles.length} articles to Instapaper for user: ${credentials.username}`);
    
    // Mock successful import for development purposes
    return { 
      success: true, 
      message: `Successfully imported ${articles.length} articles to your Instapaper account`,
      importedCount: articles.length,
      failedCount: 0
    };
  } catch (error) {
    console.error("Import error:", error);
    return { 
      success: false, 
      message: "An error occurred during the import process" 
    };
  }
};
