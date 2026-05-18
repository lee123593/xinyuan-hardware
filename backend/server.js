const express = require('express');
const app = require('./app');
const path = require('path');

// Serve static frontend files (local dev only; Vercel handles this in production)
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/products`);
});
