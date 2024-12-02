import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  server: {
    cors: true
  },
  plugins: [
    {
      name: 'mask-images',
      configureServer(server) {
        // Add API endpoint for mask images
        server.middlewares.use('/api/mask-images', (req, res) => {
          if (req.method === 'GET') {
            try {
              const publicDir = path.join(process.cwd(), 'public');
              const files = fs.readdirSync(publicDir);
              const maskImages = files
                .filter(file => file.toLowerCase().endsWith('.png'))
                .map(file => '/' + file);

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
