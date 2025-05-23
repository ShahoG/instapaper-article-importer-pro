const express = require('express');
const axios = require('axios');
const cors = require('cors');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Load Instapaper API credentials from environment variables
const INSTAPAPER_CONSUMER_KEY = process.env.INSTAPAPER_CONSUMER_KEY;
const INSTAPAPER_CONSUMER_SECRET = process.env.INSTAPAPER_CONSUMER_SECRET;

function getOAuthClient(token = '', tokenSecret = '') {
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
    const url = 'https://www.instapaper.com/api/1/oauth/access_token';
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
    const headers = oauth.toHeader(oauth.authorize(request_data));
    const params = new URLSearchParams(data);
    const response = await axios.post(url, params, { headers });
    // Parse response: oauth_token=...&oauth_token_secret=...
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
    res.status(401).send({ success: false, error: 'Authentication failed' });
  }
});

// Add an article using Instapaper Full API
app.post('/api/add', async (req, res) => {
  const { token, tokenSecret, url, title, tags, status } = req.body;
  try {
    const oauth = getOAuthClient(token, tokenSecret);
    const apiUrl = 'https://www.instapaper.com/api/1/bookmarks/add';
    const data = {
      url,
      // Only include title if present
      ...(title ? { title } : {}),
      // Only include description if tags present
      ...(tags ? { description: `Tags: ${tags}` } : {}),
      // Map status to 'archive' param: 1 = archived, 0 = unread
      ...(status ? { archive: status === 'archived' || status === '1' ? '1' : '0' } : {}),
    };
    const request_data = {
      url: apiUrl,
      method: 'POST',
      data,
    };
    const headers = oauth.toHeader(oauth.authorize(request_data, { key: token, secret: tokenSecret }));
    const params = new URLSearchParams(data);
    const response = await axios.post(apiUrl, params, { headers });
    // Instapaper returns an array of objects; check for type=bookmark
    if (Array.isArray(response.data) && response.data.some(item => item.type === 'bookmark')) {
      res.send({ success: true });
    } else {
      res.status(400).send({ success: false, error: 'Failed to add article' });
    }
  } catch (error) {
    res.status(400).send({ success: false, error: 'Failed to add article' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Instapaper proxy backend running on port ${PORT}`);
});