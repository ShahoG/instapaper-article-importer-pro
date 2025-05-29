const express = require('express');
const axios = require('axios');
const cors = require('cors');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
require('dotenv').config(); // Load .env

// Make sure to set your real Instapaper API key/secret in backend/.env

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for very large batches

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Load Instapaper API credentials from environment variables
const INSTAPAPER_CONSUMER_KEY = process.env.INSTAPAPER_CONSUMER_KEY;
const INSTAPAPER_CONSUMER_SECRET = process.env.INSTAPAPER_CONSUMER_SECRET;

// Configure axios for better timeout handling - support for long-running imports
axios.defaults.timeout = 120000; // 2 minutes timeout

function getOAuthClient() {
  return OAuth({
    consumer: { key: INSTAPAPER_CONSUMER_KEY, secret: INSTAPAPER_CONSUMER_SECRET },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    },
  });
}

// xAuth: Get access token
app.post('/api/authenticate', async (req, res) => {
  const { username, password } = req.body;
  try {
    const oauth = getOAuthClient();
    const url = 'https://instapaper.com/api/1/oauth/access_token';
    const data = {
      x_auth_username: username,
      x_auth_password: password || '',
      x_auth_mode: 'client_auth',
    };
    const request_data = {
      url,
      method: 'POST',
      data,
    };
    const headers = {
      ...oauth.toHeader(oauth.authorize(request_data)),
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    const params = new URLSearchParams(data);
    const response = await axios.post(url, params, { headers });

    const result = {};
    response.data.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      result[k] = v;
    });
    if (result.oauth_token && result.oauth_token_secret) {
      res.send({ success: true, token: result.oauth_token, tokenSecret: result.oauth_token_secret });
    } else {
      res.status(401).send({ success: false, error: 'Failed to obtain access token' });
    }
  } catch (error) {
    console.error('Authentication error:', error.response?.data || error.message);
    res.status(401).send({ success: false, error: 'Authentication failed', details: error.response?.data || error.message });
  }
});

// Add an article using Instapaper Full API
app.post('/api/add', async (req, res) => {
  const { token, tokenSecret, url, title, status } = req.body;
  
  console.log('Add article request:', { url, title, status, hasToken: !!token, hasTokenSecret: !!tokenSecret });
  
  try {
    const oauth = getOAuthClient();
    const apiUrl = 'https://www.instapaper.com/api/1/bookmarks/add';
    const data = {
      url,
      title: title || '',
    };
    
    // Add archived parameter if status is 'archive'
    console.log('Status value received:', status, 'Type:', typeof status);
    console.log('Status === "archive"?', status === 'archive');
    console.log('Status.toLowerCase() === "archive"?', status?.toLowerCase() === 'archive');
    
    // Make the comparison case-insensitive and handle various formats
    if (status && status.toString().toLowerCase().trim() === 'archive') {
      data.archived = '1';
      console.log('Setting archived to 1');
    }
    
    const request_data = {
      url: apiUrl,
      method: 'POST',
      data,
    };
    
    // Create token object for OAuth authorization
    const tokenObj = token && tokenSecret ? { key: token, secret: tokenSecret } : undefined;
    
    if (!tokenObj) {
      console.error('Missing OAuth tokens');
      res.status(401).send({ success: false, error: 'Missing authentication tokens' });
      return;
    }
    
    const headers = {
      ...oauth.toHeader(oauth.authorize(request_data, tokenObj)),
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    
    console.log('Making request to Instapaper API:', apiUrl);
    console.log('Request data:', data);
    
    const params = new URLSearchParams(data);
    const response = await axios.post(apiUrl, params, { headers });
    
    // Check if bookmark was created successfully
    if (Array.isArray(response.data) && response.data.some(item => item.type === 'bookmark')) {
      res.send({ success: true });
    } else {
      res.status(400).send({ success: false, error: 'Failed to add article', details: response.data });
    }
  } catch (error) {
    console.error('Add article error:', error.response?.data || error.message);
    res.status(400).send({ success: false, error: 'Failed to add article', details: error.response?.data || error.message });
  }
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Instapaper proxy backend running on port ${PORT}`);
});