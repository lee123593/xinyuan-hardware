const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, '..', 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'product_' + Date.now() + Math.random().toString(36).slice(2, 6) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});
app.use('/uploads', express.static(UPLOAD_DIR));

function readJSON(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8'));
  } catch { return []; }
}

function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please select an image' });
  res.json({ success: true, url: '/uploads/' + req.file.filename });
});

app.get('/api/products', (req, res) => {
  const products = readJSON('products.json');
  const { category, search } = req.query;
  let result = [...products];
  if (category && category !== '全部') result = result.filter(p => p.category === category);
  if (search) {
    const kw = search.toLowerCase();
    result = result.filter(p => p.name.toLowerCase().includes(kw) || p.desc.toLowerCase().includes(kw));
  }
  res.json(result);
});

app.get('/api/categories', (req, res) => {
  const products = readJSON('products.json');
  res.json([...new Set(products.map(p => p.category))]);
});

app.get('/api/products/:id', (req, res) => {
  const products = readJSON('products.json');
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/products', (req, res) => {
  const products = readJSON('products.json');
  const { name, category, price, unit, stock, image, desc, featured } = req.body;
  if (!name || !category || price == null) return res.status(400).json({ error: 'Name, category, price required' });
  const maxId = products.length > 0 ? Math.max(...products.map(p => p.id)) : 0;
  const product = { id: maxId + 1, name, category, price: parseFloat(price), unit: unit || '个', stock: parseInt(stock) || 0, image: image || '📦', desc: desc || '', featured: featured === true || featured === 'true' };
  products.push(product);
  writeJSON('products.json', products);
  res.status(201).json({ success: true, product });
});

app.put('/api/products/:id', (req, res) => {
  const products = readJSON('products.json');
  const idx = products.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  const p = products[idx];
  const keys = ['name','category','price','unit','stock','image','desc','featured'];
  keys.forEach(k => { if (req.body[k] !== undefined) p[k] = k === 'price' ? parseFloat(req.body[k]) : k === 'stock' ? parseInt(req.body[k]) : k === 'featured' ? (req.body[k] === true || req.body[k] === 'true') : req.body[k]; });
  writeJSON('products.json', products);
  res.json({ success: true, product: p });
});

app.delete('/api/products/:id', (req, res) => {
  const products = readJSON('products.json');
  const idx = products.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  products.splice(idx, 1);
  writeJSON('products.json', products);
  res.json({ success: true });
});

app.post('/api/orders', (req, res) => {
  const orders = readJSON('orders.json');
  const { items, customer } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'Items required' });
  if (!customer || !customer.name || !customer.phone) return res.status(400).json({ error: 'Name and phone required' });
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const order = { id: Date.now().toString(36)+Math.random().toString(36).slice(2,6), items, customer, total: Math.round(total*100)/100, status: '待处理', createdAt: new Date().toISOString(), note: customer.note || '' };
  orders.push(order);
  writeJSON('orders.json', orders);
  res.json({ success: true, order });
});

app.get('/api/orders', (req, res) => {
  const orders = readJSON('orders.json');
  let result = [...orders];
  if (req.query.status && req.query.status !== '全部') result = result.filter(o => o.status === req.query.status);
  result.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(result);
});

app.patch('/api/orders/:id', (req, res) => {
  const orders = readJSON('orders.json');
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (req.body.status) order.status = req.body.status;
  writeJSON('orders.json', orders);
  res.json({ success: true, order });
});

app.post('/api/messages', (req, res) => {
  const messages = readJSON('messages.json');
  const { name, phone, content } = req.body;
  if (!name || !phone || !content) return res.status(400).json({ error: 'All fields required' });
  const msg = { id: Date.now().toString(36), name, phone, content, createdAt: new Date().toISOString(), read: false };
  messages.push(msg);
  writeJSON('messages.json', messages);
  res.json({ success: true, message: msg });
});

app.get('/api/messages', (req, res) => {
  const messages = readJSON('messages.json');
  messages.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(messages);
});

app.patch('/api/messages/:id', (req, res) => {
  const messages = readJSON('messages.json');
  const msg = messages.find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  if (req.body.read !== undefined) msg.read = req.body.read;
  writeJSON('messages.json', messages);
  res.json({ success: true, message: msg });
});

app.post('/api/inquiries', (req, res) => {
  const inquiries = readJSON('inquiries.json');
  const { name, phone, company, productName, quantity, detail } = req.body;
  if (!name || !phone || !productName) return res.status(400).json({ error: 'Name, phone, product required' });
  const inquiry = { id: Date.now().toString(36), name, phone, company: company||'', productName, quantity: quantity||1, detail: detail||'', createdAt: new Date().toISOString(), status: '待回复' };
  inquiries.push(inquiry);
  writeJSON('inquiries.json', inquiries);
  res.json({ success: true, inquiry });
});

app.get('/api/inquiries', (req, res) => {
  const inquiries = readJSON('inquiries.json');
  inquiries.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(inquiries);
});

app.patch('/api/inquiries/:id', (req, res) => {
  const inquiries = readJSON('inquiries.json');
  const inquiry = inquiries.find(i => i.id === req.params.id);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
  if (req.body.status) inquiry.status = req.body.status;
  writeJSON('inquiries.json', inquiries);
  res.json({ success: true, inquiry });
});

app.get('/api/stats', (req, res) => {
  const orders = readJSON('orders.json');
  const messages = readJSON('messages.json');
  const inquiries = readJSON('inquiries.json');
  res.json({
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === '待处理').length,
    totalSales: Math.round(orders.filter(o => o.status === '已完成').reduce((s,o) => s+o.total, 0)*100)/100,
    unreadMessages: messages.filter(m => !m.read).length,
    pendingInquiries: inquiries.filter(i => i.status === '待回复').length
  });
});

module.exports = app;
