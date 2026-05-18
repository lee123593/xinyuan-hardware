const fs = require('fs');
const path = require('path');

// Vercel serverless: copy seed products.json to /tmp for runtime access
const tmpDir = '/tmp/data';
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}
const seedProduct = path.join(__dirname, '..', 'backend', 'data', 'products.json');
const tmpProduct = path.join(tmpDir, 'products.json');
if (fs.existsSync(seedProduct) && !fs.existsSync(tmpProduct)) {
  fs.copyFileSync(seedProduct, tmpProduct);
}

process.env.DATA_DIR = tmpDir;
module.exports = require('../backend/app');
