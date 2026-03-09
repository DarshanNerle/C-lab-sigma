import aiHandler from './ai.js';
import chemistryAiHandler from './chemistry-ai.js';
import experimentGenerateHandler from './experiment/generate.js';
import experimentParseHandler from './experiment/parse.js';
import learnSearchHandler from './learn/search.js';
import userGetAliasHandler from './user/get.js';
import usersAddXpHandler from './users/add-xp.js';
import usersCreateHandler from './users/create.js';
import usersGetExperimentsHandler from './users/get-experiments.js';
import usersGetHandler from './users/get.js';
import usersSaveAiHistoryHandler from './users/save-ai-history.js';
import usersSaveExperimentHandler from './users/save-experiment.js';
import usersSaveLabHandler from './users/save-lab.js';
import usersUpdateExperimentProgressHandler from './users/update-experiment-progress.js';
import usersUpdateSettingsHandler from './users/update-settings.js';
import usersUpdateHandler from './users/update.js';

const ROUTES = new Map([
  ['/ai', aiHandler],
  ['/chemistry-ai', chemistryAiHandler],
  ['/experiment/generate', experimentGenerateHandler],
  ['/experiment/parse', experimentParseHandler],
  ['/learn/search', learnSearchHandler],
  ['/user/get', userGetAliasHandler],
  ['/users/add-xp', usersAddXpHandler],
  ['/users/create', usersCreateHandler],
  ['/users/get', usersGetHandler],
  ['/users/get-experiments', usersGetExperimentsHandler],
  ['/users/save-ai-history', usersSaveAiHistoryHandler],
  ['/users/save-experiment', usersSaveExperimentHandler],
  ['/users/save-lab', usersSaveLabHandler],
  ['/users/update', usersUpdateHandler],
  ['/users/update-experiment-progress', usersUpdateExperimentProgressHandler],
  ['/users/update-settings', usersUpdateSettingsHandler]
]);

const HEALTH_PAYLOAD = () => ({
  status: 'alive',
  timestamp: new Date().toISOString()
});

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
  const pathname = new URL(rawUrl, 'http://localhost').pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/api' || pathname === '/api/') {
    return '/';
  }

  return pathname.startsWith('/api/') ? pathname.slice(4) : pathname;
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

    const handler = ROUTES.get(routePath);
    if (!handler) {
      return res.status(404).json({ 
        error: `API route not found: ${routePath}`,
        availableRoutes: Array.from(ROUTES.keys())
      });
    }

    return await handler(req, res);
  } catch (error) {
    console.error('[API:router] CRITICAL ERROR:', error);
    return res.status(500).json({ 
      error: 'Serverless router failed.',
      message: error?.message,
      stack: error?.stack
    });
  }
}
