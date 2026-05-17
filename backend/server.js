const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..')));

const DATA_DIR = path.join(__dirname, 'data');

function readJSON(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8'));
  } catch {
    return [];
  }
}

function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

// ============ 商品 API ============

// 获取所有商品，支持分类筛选和搜索
app.get('/api/products', (req, res) => {
  const products = readJSON('products.json');
  const { category, search } = req.query;
  let result = [...products];

  if (category && category !== '全部') {
    result = result.filter(p => p.category === category);
  }

  if (search) {
    const kw = search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(kw) || p.desc.toLowerCase().includes(kw)
    );
  }

  res.json(result);
});

// 获取商品分类列表
app.get('/api/categories', (req, res) => {
  const products = readJSON('products.json');
  const categories = [...new Set(products.map(p => p.category))];
  res.json(categories);
});

// 获取单个商品
app.get('/api/products/:id', (req, res) => {
  const products = readJSON('products.json');
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: '商品不存在' });
  res.json(product);
});

// 添加商品
app.post('/api/products', (req, res) => {
  const products = readJSON('products.json');
  const { name, category, price, unit, stock, image, desc, featured } = req.body;

  if (!name || !category || price == null) {
    return res.status(400).json({ error: '商品名称、分类、价格为必填项' });
  }

  const maxId = products.length > 0 ? Math.max(...products.map(p => p.id)) : 0;
  const product = {
    id: maxId + 1,
    name,
    category,
    price: parseFloat(price),
    unit: unit || '个',
    stock: parseInt(stock) || 0,
    image: image || '📦',
    desc: desc || '',
    featured: featured === true || featured === 'true'
  };

  products.push(product);
  writeJSON('products.json', products);
  res.status(201).json({ success: true, product });
});

// 更新商品
app.put('/api/products/:id', (req, res) => {
  const products = readJSON('products.json');
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: '商品不存在' });

  const { name, category, price, unit, stock, image, desc, featured } = req.body;
  const product = products[index];

  if (name !== undefined) product.name = name;
  if (category !== undefined) product.category = category;
  if (price !== undefined) product.price = parseFloat(price);
  if (unit !== undefined) product.unit = unit;
  if (stock !== undefined) product.stock = parseInt(stock);
  if (image !== undefined) product.image = image;
  if (desc !== undefined) product.desc = desc;
  if (featured !== undefined) product.featured = featured === true || featured === 'true';

  writeJSON('products.json', products);
  res.json({ success: true, product });
});

// 删除商品
app.delete('/api/products/:id', (req, res) => {
  const products = readJSON('products.json');
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: '商品不存在' });

  products.splice(index, 1);
  writeJSON('products.json', products);
  res.json({ success: true });
});

// ============ 订单 API ============

// 创建订单
app.post('/api/orders', (req, res) => {
  const orders = readJSON('orders.json');
  const { items, customer } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: '订单商品不能为空' });
  }
  if (!customer || !customer.name || !customer.phone) {
    return res.status(400).json({ error: '请填写姓名和电话' });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const order = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    items,
    customer,
    total: Math.round(total * 100) / 100,
    status: '待处理',
    createdAt: new Date().toISOString(),
    note: customer.note || ''
  };

  orders.push(order);
  writeJSON('orders.json', orders);

  res.json({ success: true, order });
});

// 获取订单列表（商家后台）
app.get('/api/orders', (req, res) => {
  const orders = readJSON('orders.json');
  const { status } = req.query;
  let result = [...orders];

  if (status && status !== '全部') {
    result = result.filter(o => o.status === status);
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(result);
});

// 更新订单状态
app.patch('/api/orders/:id', (req, res) => {
  const orders = readJSON('orders.json');
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  if (req.body.status) order.status = req.body.status;
  writeJSON('orders.json', orders);
  res.json({ success: true, order });
});

// ============ 留言 API ============

app.post('/api/messages', (req, res) => {
  const messages = readJSON('messages.json');
  const { name, phone, content } = req.body;

  if (!name || !phone || !content) {
    return res.status(400).json({ error: '请填写完整信息' });
  }

  const msg = {
    id: Date.now().toString(36),
    name,
    phone,
    content,
    createdAt: new Date().toISOString(),
    read: false
  };

  messages.push(msg);
  writeJSON('messages.json', messages);
  res.json({ success: true, message: msg });
});

app.get('/api/messages', (req, res) => {
  const messages = readJSON('messages.json');
  messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(messages);
});

// 标记留言已读
app.patch('/api/messages/:id', (req, res) => {
  const messages = readJSON('messages.json');
  const msg = messages.find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: '留言不存在' });

  if (req.body.read !== undefined) msg.read = req.body.read;
  writeJSON('messages.json', messages);
  res.json({ success: true, message: msg });
});

// ============ 询价 API ============

app.post('/api/inquiries', (req, res) => {
  const inquiries = readJSON('inquiries.json');
  const { name, phone, company, productName, quantity, detail } = req.body;

  if (!name || !phone || !productName) {
    return res.status(400).json({ error: '请填写必要信息' });
  }

  const inquiry = {
    id: Date.now().toString(36),
    name,
    phone,
    company: company || '',
    productName,
    quantity: quantity || 1,
    detail: detail || '',
    createdAt: new Date().toISOString(),
    status: '待回复'
  };

  inquiries.push(inquiry);
  writeJSON('inquiries.json', inquiries);
  res.json({ success: true, inquiry });
});

app.get('/api/inquiries', (req, res) => {
  const inquiries = readJSON('inquiries.json');
  inquiries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(inquiries);
});

app.patch('/api/inquiries/:id', (req, res) => {
  const inquiries = readJSON('inquiries.json');
  const inquiry = inquiries.find(i => i.id === req.params.id);
  if (!inquiry) return res.status(404).json({ error: '询价不存在' });

  if (req.body.status) inquiry.status = req.body.status;
  writeJSON('inquiries.json', inquiries);
  res.json({ success: true, inquiry });
});

// ============ 统计 API ============

app.get('/api/stats', (req, res) => {
  const orders = readJSON('orders.json');
  const messages = readJSON('messages.json');
  const inquiries = readJSON('inquiries.json');

  const pendingOrders = orders.filter(o => o.status === '待处理').length;
  const totalSales = orders
    .filter(o => o.status === '已完成')
    .reduce((sum, o) => sum + o.total, 0);
  const unreadMessages = messages.filter(m => !m.read).length;
  const pendingInquiries = inquiries.filter(i => i.status === '待回复').length;

  res.json({
    totalOrders: orders.length,
    pendingOrders,
    totalSales: Math.round(totalSales * 100) / 100,
    unreadMessages,
    pendingInquiries
  });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`🔩 新远五金后端服务已启动: http://localhost:${PORT}`);
  console.log(`📦 商品API: http://localhost:${PORT}/api/products`);
  console.log(`📋 订单API: http://localhost:${PORT}/api/orders`);
});
