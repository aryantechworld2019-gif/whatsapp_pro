// functions/index.js
const functions = require('firebase-functions');
const express = require('express');
const { PassThrough } = require('stream');
const fetch = require('node-fetch'); // compatible with Node18 when using require()
const app = express();

// Accept raw bodies for any content type so we can proxy binary/json/form etc.
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// === Edit this if your backend changes ===
const BACKEND_BASE = 'http://45.117.183.187:8085';
// =========================================

// Remove hop-by-hop headers that should not be proxied
const stripHopByHop = (headers) => {
  const copy = { ...headers };
  [
    'host',
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
    'content-length',
    'accept-encoding'
  ].forEach(h => delete copy[h]);
  return copy;
};

app.all('/api/*', async (req, res) => {
  const pathAndQuery = req.originalUrl.replace(/^\/api/, '');
  const targetUrl = BACKEND_BASE + pathAndQuery;

  console.log('[proxy] incoming ->', req.method, req.originalUrl);
  console.log('[proxy] target ->', targetUrl);

  const forwardedHeaders = stripHopByHop(req.headers);
  // If your backend expects a specific Host header uncomment and set:
  // forwardedHeaders['host'] = 'expected.host.com';

  try {
    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardedHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      redirect: 'manual'
    });

    console.log('[proxy] upstream status ->', backendRes.status);

    // Forward status
    res.status(backendRes.status);

    // Forward headers (skip hop-by-hop ones)
    backendRes.headers.forEach((val, name) => {
      const skip = ['transfer-encoding', 'connection', 'content-encoding'];
      if (!skip.includes(name.toLowerCase())) {
        res.setHeader(name, val);
      }
    });

    // Stream response body
    if (backendRes.body) {
      const pass = new PassThrough();
      backendRes.body.pipe(pass).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error('[proxy] fetch error ->', String(err));
    res.status(502).json({ error: 'Bad gateway', details: String(err) });
  }
});

// Export as `api` (must match firebase.json rewrite function name)
exports.api = functions
  .region('asia-south1')
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onRequest(app);
