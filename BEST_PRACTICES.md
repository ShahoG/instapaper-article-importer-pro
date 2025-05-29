# Best Practices for Bulk Article Import

## Overview

This guide outlines best practices for importing up to 1000+ articles at once using the Instapaper Article Importer Pro.

## Key Features for Reliable Bulk Import

### 1. **Intelligent Rate Limiting**

- Articles are processed in batches of 25 for optimal throughput
- Dynamic delay adjustment based on success/failure rates (150ms - 5s)
- 2-second pause between batches to prevent API overload
- Mega-batches of 100 articles with 10-second pauses for very large imports

### 2. **Automatic Retry Logic**

- Failed requests are automatically retried up to 3 times
- Exponential backoff with 2x multiplier for rate limit errors (429) and server errors (5xx)
- Graceful handling of temporary network issues

### 3. **Enhanced Error Tracking**

- Detailed error messages for each failed article
- Failed articles are logged with specific error reasons
- Complete visibility into what succeeded and what failed
- Progress logging every 50 articles for large imports

### 4. **Progress Tracking**

- Real-time progress updates during import
- Visual feedback on current processing status
- Batch and mega-batch progress indicators
- Estimated time remaining for large imports

## CSV Format Guidelines

### Basic Format (URL and Status)

```csv
https://example.com/article1,archive
https://example.com/article2,unread
https://example.com/article3,archive
```

### With Optional Title

```csv
"Article Title",https://example.com/article1,archive
"Another Title",https://example.com/article2,unread
```

### Supported Status Values

- `archive` or `archived` - Article will be added directly to archive
- `unread` - Article will be added to unread list
- Empty or any other value - Defaults to unread

## Performance Optimization

### Recommended Batch Sizes

- **Small batches (1-50 articles)**: Fast processing, minimal delays
- **Medium batches (50-200 articles)**: Balanced processing with batch optimization
- **Large batches (200-500 articles)**: Efficient processing with proper rate limiting
- **Very large batches (500-1000+ articles)**: Mega-batch processing with extended timeouts

### Expected Processing Times

- ~2-3 seconds per 10 articles (including delays)
- ~15-20 seconds for 100 articles
- ~3-5 minutes for 500 articles
- ~8-12 minutes for 1000 articles
- Times may vary based on Instapaper API response times and article complexity

## Error Handling

### Common Errors and Solutions

1. **Rate Limit Errors (429)**

   - Automatically handled with exponential backoff
   - System will wait up to 5 seconds between retries
   - No action needed - the system will retry

2. **Authentication Failures**

   - Verify your Instapaper credentials
   - Ensure API keys are correctly set in backend/.env

3. **Invalid URLs**

   - Check for proper URL format (must start with http:// or https://)
   - Remove any extra spaces or special characters

4. **Timeout Errors**
   - Large articles or slow API responses may cause timeouts
   - System has 2-minute timeout per request
   - Very large imports are automatically split into mega-batches

## Configuration Options

The system can be configured by modifying `RATE_LIMIT_CONFIG` in `src/services/apiClient.ts`:

```javascript
const RATE_LIMIT_CONFIG = {
  initialDelay: 150, // Starting delay between requests (ms)
  maxDelay: 5000, // Maximum delay between requests (ms)
  batchSize: 25, // Articles per batch
  batchDelay: 2000, // Delay between batches (ms)
  maxRetries: 3, // Maximum retry attempts
  backoffMultiplier: 2.0, // Exponential backoff rate
};
```

### For Very Large Imports (1000+ articles)

The system automatically switches to mega-batch mode for imports over 100 articles:

- Processes in mega-batches of 100 articles each
- 10-second delay between mega-batches
- Progress updates every 50 articles
- Optimized memory usage

## Monitoring and Logging

### Frontend Console

- Shows progress updates every 5 articles
- Displays extraction results from CSV parsing
- Reports final import statistics
- Time estimates for large imports

### Backend Console

- Logs each API request with timestamp
- Shows authentication attempts
- Displays detailed error messages
- Tracks retry attempts
- Progress summaries every 50 articles

## Tips for Success with Large Imports

1. **Test with Small Batches First**

   - Start with 10-20 articles to verify your CSV format
   - Ensure your API credentials are working correctly

2. **Prepare Your System**

   - Close unnecessary browser tabs to free up memory
   - Ensure stable internet connection
   - Keep the browser tab active (don't minimize)

3. **Monitor Progress**

   - Watch the console for progress updates
   - Check backend logs for any API issues
   - Note any patterns in failures

4. **Handle Large CSVs**

   - Files with 1000+ URLs should be under 50MB
   - Consider splitting very large files (>1000 articles)
   - Remove duplicate URLs before importing

5. **Time Your Imports**

   - Run large imports during off-peak hours
   - Allow 10-15 minutes for 1000 articles
   - Don't run multiple large imports simultaneously

6. **Post-Import Actions**
   - Review failed articles for patterns
   - Re-run failed articles in a separate batch
   - Consider adjusting delays if many failures occur

## Example Import Flow for 1000 Articles

1. Prepare your CSV file with proper formatting
2. Verify file size is reasonable (<50MB)
3. Start both backend and frontend servers
4. Enter your Instapaper credentials
5. Select your CSV file
6. System will show warning about large import
7. Click Import and monitor progress
8. Expect ~10-12 minutes for completion
9. Review results and failed articles (if any)
10. Export failed URLs for retry if needed

## Troubleshooting Large Imports

If you encounter issues with large imports:

1. **Memory Issues**

   - Restart your browser before large imports
   - Close other applications to free memory
   - Consider splitting into smaller files

2. **Timeout Errors**

   - Check backend is running with proper timeout settings
   - Ensure network connection is stable
   - Verify Instapaper API is responsive

3. **High Failure Rate**

   - Check if Instapaper API is having issues
   - Reduce batch size in configuration
   - Increase delays between requests
   - Try importing during different time of day

4. **Browser Becomes Unresponsive**
   - This is normal for very large imports
   - Don't close the tab - let it complete
   - Check backend console for actual progress

## Performance Tuning

For optimal performance with your specific use case:

### For Faster Processing (if API allows):

```javascript
initialDelay: 100,    // Reduce initial delay
batchSize: 50,        // Increase batch size
batchDelay: 1000,     // Reduce batch delay
```

### For More Reliability (if seeing failures):

```javascript
initialDelay: 300,    // Increase initial delay
batchSize: 10,        // Reduce batch size
batchDelay: 3000,     // Increase batch delay
maxRetries: 5,        // Increase retry attempts
```

## Future Enhancements

Consider these potential improvements for very large imports:

- Database queue system for reliability
- Parallel processing with worker threads
- Resume capability for interrupted imports
- Real-time dashboard for monitoring
- Automatic failure analysis and retry
- CSV streaming for files >100MB
- Background processing with email notifications
