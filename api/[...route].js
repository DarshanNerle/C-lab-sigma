import routeApiRequest from '../lib/serverless/router.ts';

/**
 * Standard Catch-all Route for C-LAB API
 * This allows all /api/* requests to be handled by the central serverless router.
 */
export default async function handler(req, res) {
  try {
    return await routeApiRequest(req, res);
  } catch (error) {
    console.error('[API:Catchall] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Execution Error', 
        message: error.message 
      });
    }
  }
}
