import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Advanced Vercel API Emulation for Vite
 * Dynamically handles all /api routes for local development.
 * Note: Node modules are imported dynamically inside the plugin to avoid
 * issues in non-Node environments (like Cloudflare's build parser).
 */
const vercelApiEmulation = () => ({
  name: 'vercel-api-emulation',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/')) return next();

      try {
        const { default: fs } = await import('fs');
        const { default: path } = await import('path');
        const { default: url } = await import('url');
        const { default: dotenv } = await import('dotenv');

        dotenv.config();

        // Parse request body for POST/PUT/PATCH
        let body = '';
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          for await (const chunk of req) {
            body += chunk;
          }
        }

        // Resolve the API file path
        const urlPath = req.url.split('?')[0]; // Remove query params
        const exactFilePath = path.resolve(process.cwd(), urlPath.substring(1) + '.js');
        const catchAllFilePath = path.resolve(process.cwd(), 'api/[...route].js');
        const filePath = fs.existsSync(exactFilePath) ? exactFilePath : catchAllFilePath;

        if (!fs.existsSync(filePath)) {
          return next();
        }
        
        // Polyfill Vercel helper functions
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };

        // Inject parsed body and query params
        try {
          req.body = body ? JSON.parse(body) : {};
        } catch (e) {
          req.body = {};
        }

        const parsedUrl = url.parse(req.url, true);
        req.query = parsedUrl.query;

        // Dynamic Import of the handler
        const moduleUrl = url.pathToFileURL(filePath).href + `?t=${Date.now()}`;
        const { default: handler } = await import(moduleUrl);

        if (typeof handler === 'function') {
          await handler(req, res);
        } else {
          res.status(404).json({ error: `Handler not found in ${urlPath}.js` });
        }
      } catch (e) {
        console.error(`[API Emulation ERROR] ${req.method} ${req.url}:`, e);
        if (e.code === 'ERR_MODULE_NOT_FOUND') {
          next();
        } else {
          if (res.status) {
            res.status(500).json({ error: "Serverless Execution Error", details: e.message });
          } else {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Serverless Execution Error", details: e.message }));
          }
        }
      }
    });
  }
});

export default defineConfig({
  plugins: [
    react(),
    vercelApiEmulation()
  ],
  root: 'client',
  envDir: '../',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000
  },
  server: {
    fs: {
      allow: ['..'] // Allow serving files from the project root (like the api folder)
    }
  }
});
