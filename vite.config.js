import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/FlameShader2-WindsurfTest/',
  resolve: {
    alias: {
      'three': path.resolve(__dirname, 'node_modules/three')
    }
  },
  server: {
    cors: true,
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html')
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.png')) {
            return 'Flame-images/[name][extname]';
          }
          return 'assets/[name].[hash][extname]';
        }
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
              const imagesDir = path.join(process.cwd(), 'Flame-images');
              const files = fs.readdirSync(imagesDir);
              const maskImages = files
                .filter(file => file.toLowerCase().startsWith('flame_mask') && file.toLowerCase().endsWith('.png'))
                .map(file => './Flame-images/' + file);

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
}));
