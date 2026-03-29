import { getFirebaseConfigSummary } from '../firebase';

// C-LAB v6.1 Serverless Router
const ROUTES = new Map([
  ['/ai', () => import('./ai.js').then((m) => m.default)],
  ['/chemistry-ai', () => import('./chemistry-ai.js').then((m) => m.default)],
  ['/experiment/generate', () => import('./experiment/generate.js').then((m) => m.default)],
  ['/experiment/parse', () => import('./experiment/parse.js').then((m) => m.default)],
  ['/learn/search', () => import('./learn/search.js').then((m) => m.default)],
  ['/user/get', () => import('./user/get.js').then((m) => m.default)],
  ['/users/add-xp', () => import('./users/add-xp.js').then((m) => m.default)],
  ['/users/create', () => import('./users/create.js').then((m) => m.default)],
  ['/users/get', () => import('./users/get.js').then((m) => m.default)],
  ['/users/get-experiments', () => import('./users/get-experiments.js').then((m) => m.default)],
  ['/users/save-ai-history', () => import('./users/save-ai-history.js').then((m) => m.default)],
  ['/users/save-experiment', () => import('./users/save-experiment.js').then((m) => m.default)],
  ['/users/save-lab', () => import('./users/save-lab.js').then((m) => m.default)],
  ['/users/update', () => import('./users/update.js').then((m) => m.default)],
  ['/users/update-experiment-progress', () => import('./users/update-experiment-progress.js').then((m) => m.default)],
  ['/users/update-settings', () => import('./users/update-settings.js').then((m) => m.default)]
]);

const HEALTH_PAYLOAD = () => {
  const firebaseEnv = getFirebaseConfigSummary();
  return ({
  status: 'alive',
  timestamp: new Date().toISOString(),
  env_check: {
    firebase: firebaseEnv.hasConfig,
    firebase_missing: firebaseEnv.missing,
    openai: !!process.env.OPENAI_API_KEY,
    node_version: process.version
  }
});
};

function ensureResponseHelpers(res) {
  if (typeof res.status !== 'function') {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
  }

  if (typeof res.json !== 'function') {
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };
  }
}

function ensureQuery(req, rawUrl) {
  if (req.query && typeof req.query === 'object') {
    return req.query;
  }

  const url = new URL(rawUrl, 'http://localhost');
  const query = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      const current = query[key];
      query[key] = Array.isArray(current) ? [...current, value] : [current, value];
    } else {
      query[key] = value;
    }
  }

  req.query = query;
  return query;
}

function ensureBody(req) {
  if (req.body != null && typeof req.body === 'object') {
    return req.body;
  }

  try {
    const raw = typeof req.body === 'string' ? req.body : '';
    req.body = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('[API:router] Failed to parse request body as JSON');
    req.body = {};
  }
  return req.body;
}

function getRoutePath(req) {
  const rawUrl = typeof req.url === 'string' ? req.url : '/';
  // Use URL parser but maintain slashes for our map
  const pathname = new URL(rawUrl, 'http://localhost').pathname.replace(/\/+$/, '') || '/';

  // If exactly /api, return / for the home handler
  if (pathname === '/api') return '/';

  // For /api/ai returns /ai
  return pathname.startsWith('/api') ? pathname.slice(4) : pathname;
}

export default async function routeApiRequest(req, res) {
  ensureResponseHelpers(res);

  try {
    const rawUrl = typeof req.url === 'string' ? req.url : '/';
    ensureQuery(req, rawUrl);
    ensureBody(req);

    const routePath = getRoutePath(req);
    if (routePath === '/health') {
      return res.status(200).json(HEALTH_PAYLOAD());
    }

    const handlerLoader = ROUTES.get(routePath);
    if (!handlerLoader) {
      return res.status(404).json({ 
        error: `API route not found: ${routePath}`,
        availableRoutes: Array.from(ROUTES.keys())
      });
    }

    const handler = await handlerLoader();
    return await handler(req, res);
  } catch (error) {
    console.error('[API:router] CRITICAL ERROR:', error);
    return res.status(500).json({ 
      error: 'Serverless router failed.',
      message: error?.message,
      stack: error?.stack,
      env_check: {
        firebase: getFirebaseConfigSummary().hasConfig,
        openai: !!process.env.OPENAI_API_KEY
      }
    });
  }
}
