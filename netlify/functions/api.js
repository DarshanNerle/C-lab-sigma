import routeApiRequest from '../../lib/serverless/router.ts';

/**
 * Netlify Function Bridge for C-LAB API
 * Maps Netlify's (event, context) to Vercel's (req, res) structure.
 */
export const handler = async (event, context) => {
  // 1. Mock the Request object (req)
  const req = {
    url: event.path,
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
    // Add query params for compatibility
    query: event.queryStringParameters || {},
  };

  // 2. Mock the Response object (res)
  let statusCode = 200;
  let headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  let responseBody = '';

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseBody = JSON.stringify(data);
      return res;
    },
    setHeader: (name, value) => {
      headers[name] = value;
      return res;
    },
    end: (data) => {
      if (data) responseBody = data;
      return res;
    },
  };

  // Handle pre-flight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // 3. Execute the standard router logic
    await routeApiRequest(req, res);

    return {
      statusCode,
      headers,
      body: responseBody,
    };
  } catch (err) {
    console.error('[Netlify:Bridge] CRITICAL ERROR:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Netlify API Bridge Failure', 
        message: err.message 
      }),
    };
  }
};
