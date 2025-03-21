const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the dist directory
app.use(express.static('dist'));

// API endpoint for mask images
app.get('/api/mask-images', (req, res) => {
  try {
    const distDir = path.join(__dirname, 'dist');
    const files = fs.readdirSync(distDir);
    const maskImages = files
      .filter(file => file.toLowerCase().endsWith('.png'))
      .map(file => './' + file);

    res.json(maskImages);
  } catch (error) {
    console.error('Error reading mask images:', error);
    res.status(500).json({ error: 'Failed to read mask images' });
  }
});

// For any other routes, serve the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 