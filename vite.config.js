import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  base: './',
  server: {
    cors: true,
    open: '/dev-index.html'
  },
  build: {
    outDir: '.',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'dev-index.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  plugins: [
    {
      name: 'mask-images',
      configureServer(server) {
        // Add API endpoint for mask images
        server.middlewares.use('/api/mask-images', (req, res) => {
          if (req.method === 'GET') {
            try {
              const rootDir = process.cwd();
              const files = fs.readdirSync(rootDir);
              const maskImages = files
                .filter(file => file.toLowerCase().startsWith('flame_mask') && file.toLowerCase().endsWith('.png'))
                .map(file => './' + file);

              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
              });
              res.end(JSON.stringify(maskImages));
            } catch (error) {
              console.error('Error reading mask images:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to read mask images' }));
            }
          } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
          }
        });
      }
    }
  ]
});
