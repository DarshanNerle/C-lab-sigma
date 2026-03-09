export default async function handler(req, res) {
  // In Vite dev, bust ESM cache so fixes in router.js apply immediately
  // even after a previous failed module load.
  if (process.env.NODE_ENV === 'development') {
    const { default: routeApiRequest } = await import(`../lib/serverless/router.js?dev_reload=${Date.now()}`);
    return routeApiRequest(req, res);
  }

  const { default: routeApiRequest } = await import('../lib/serverless/router.js');
  return routeApiRequest(req, res);
}
