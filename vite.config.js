import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import dotenv from "dotenv";

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Advanced Vercel API Emulation for Vite
 * Dynamically handles all /api routes for local development.
 * Note: Uses a safer routing approach to prevent server crashes.
 */
const vercelApiEmulation = () => ({
  name: 'vercel-api-emulation',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/')) return next();

      try {
        // Resolve the API file path (.ts first, then .js)
        const urlPath = req.url.split('?')[0]; // Remove query params
        const tsPath = path.resolve(process.cwd(), urlPath.substring(1) + '.ts');
        const jsPath = path.resolve(process.cwd(), urlPath.substring(1) + '.js');
        const catchAllJs = path.resolve(process.cwd(), 'api/[...route].js');
        const catchAllTs = path.resolve(process.cwd(), 'api/[...route].ts');
        
        let filePath = '';
        if (fs.existsSync(tsPath)) filePath = tsPath;
        else if (fs.existsSync(jsPath)) filePath = jsPath;
        else if (fs.existsSync(catchAllJs)) filePath = catchAllJs;
        else if (fs.existsSync(catchAllTs)) filePath = catchAllTs;

        if (!filePath) {
          return next();
        }
        
        // Parse request body for POST/PUT/PATCH requests
        let rawBody = '';
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          try {
            const chunks = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            rawBody = Buffer.concat(chunks).toString();
            // Store it for handlers
            try {
              req.body = rawBody ? JSON.parse(rawBody) : {};
            } catch (e) {
              req.body = {};
            }
          } catch (e) {
            console.error('[API Body Parse ERROR]:', e);
            req.body = {};
          }
        }

        // Polyfill Vercel helper functions
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };

        const parsedUrl = url.parse(req.url, true);
        req.query = parsedUrl.query;

        // Use Vite's internal loader to handle .ts/ESM/etc.
        // We wrap this in a localized try/catch to prevent the whole server from crashing
        try {
          const handler = await server.ssrLoadModule(filePath);
          if (handler && typeof handler.default === 'function') {
            await handler.default(req, res);
          } else {
            res.status(404).json({ error: `Handler default export not found in ${filePath}` });
          }
        } catch (loaderError) {
          console.error(`[API Loader Error] ${filePath}:`, loaderError);
          res.status(500).json({ 
            error: "Module Loading Failed", 
            message: loaderError.message,
            path: filePath
          });
        }
      } catch (globalError) {
        console.error(`[API Global Error]:`, globalError);
        next();
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
