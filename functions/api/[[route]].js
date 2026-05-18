export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = '/api/' + (params.route || '');
  const method = request.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    let result;

    // ---- Products ----
    if (path === '/api/products' && method === 'GET') {
      result = await listProducts(env.DB, url.searchParams);
    } else if (path === '/api/categories' && method === 'GET') {
      result = await listCategories(env.DB);
    } else if (path.match(/^\/api\/products\/\d+$/) && method === 'GET') {
      result = await getProduct(env.DB, path.split('/').pop());
    } else if (path === '/api/products' && method === 'POST') {
      result = await createProduct(env.DB, await request.json());
    } else if (path.match(/^\/api\/products\/\d+$/) && method === 'PUT') {
      result = await updateProduct(env.DB, path.split('/').pop(), await request.json());
    } else if (path.match(/^\/api\/products\/\d+$/) && method === 'DELETE') {
      result = await deleteProduct(env.DB, path.split('/').pop());

    // ---- Orders ----
    } else if (path === '/api/orders' && method === 'GET') {
      result = await listOrders(env.DB, url.searchParams);
    } else if (path === '/api/orders' && method === 'POST') {
      result = await createOrder(env.DB, await request.json());
    } else if (path.match(/^\/api\/orders\/.+$/) && method === 'PATCH') {
      result = await updateOrder(env.DB, path.split('/').pop(), await request.json());

    // ---- Messages ----
    } else if (path === '/api/messages' && method === 'GET') {
      result = await listMessages(env.DB);
    } else if (path === '/api/messages' && method === 'POST') {
      result = await createMessage(env.DB, await request.json());
    } else if (path.match(/^\/api\/messages\/.+$/) && method === 'PATCH') {
      result = await updateMessage(env.DB, path.split('/').pop(), await request.json());

    // ---- Inquiries ----
    } else if (path === '/api/inquiries' && method === 'GET') {
      result = await listInquiries(env.DB);
    } else if (path === '/api/inquiries' && method === 'POST') {
      result = await createInquiry(env.DB, await request.json());
    } else if (path.match(/^\/api\/inquiries\/.+$/) && method === 'PATCH') {
      result = await updateInquiry(env.DB, path.split('/').pop(), await request.json());

    // ---- Stats ----
    } else if (path === '/api/stats' && method === 'GET') {
      result = await getStats(env.DB);

    // ---- Upload (base64, no R2 needed) ----
    } else if (path === '/api/upload' && method === 'POST') {
      result = await handleUpload(request);

    // ---- Health ----
    } else if (path === '/api/health' && method === 'GET') {
      return json({ ok: true });

    } else {
      return json({ error: 'Not found' }, 404);
    }

    return json(result);
  } catch (err) {
    console.error('API Error:', err);
    return json({ error: err.message || 'Server error' }, err.status || 500);
  }
}

// ===================== Products =====================

async function listProducts(db, params) {
  let sql = 'SELECT * FROM products';
  const conditions = [];
  const values = [];

  if (params.get('category') && params.get('category') !== '全部') {
    conditions.push('category = ?');
    values.push(params.get('category'));
  }
  if (params.get('search')) {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    const kw = '%' + params.get('search') + '%';
    values.push(kw, kw);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY category, id';

  const { results } = await db.prepare(sql).bind(...values).all();
  return results.map(mapProduct);
}

async function listCategories(db) {
  const { results } = await db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
  return results.map(r => r.category);
}

async function getProduct(db, id) {
  const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(parseInt(id)).first();
  if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });
  return mapProduct(product);
}

async function createProduct(db, body) {
  const { name, category, price, unit, stock, image, desc, featured } = body;
  if (!name || !category || price == null) throw Object.assign(new Error('Name, category, price required'), { status: 400 });

  const result = await db.prepare(
    'INSERT INTO products (name, category, price, unit, stock, image, description, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    name, category, parseFloat(price), unit || '个', parseInt(stock) || 0,
    image || '📦', desc || '', featured ? 1 : 0
  ).run();

  const product = await db.prepare('SELECT * FROM products WHERE rowid = ?').bind(result.meta.last_row_id).first();
  return { success: true, product: mapProduct(product) };
}

async function updateProduct(db, id, body) {
  const existing = await db.prepare('SELECT * FROM products WHERE id = ?').bind(parseInt(id)).first();
  if (!existing) throw Object.assign(new Error('Product not found'), { status: 404 });

  const fields = [];
  const values = [];
  const keys = { name: 'name', category: 'category', price: 'price', unit: 'unit', stock: 'stock', image: 'image', desc: 'description', featured: 'featured' };
  for (const [k, col] of Object.entries(keys)) {
    if (body[k] !== undefined) {
      fields.push(col + ' = ?');
      if (k === 'price') values.push(parseFloat(body[k]));
      else if (k === 'stock') values.push(parseInt(body[k]));
      else if (k === 'featured') values.push(body[k] === true || body[k] === 'true' ? 1 : 0);
      else values.push(body[k]);
    }
  }

  if (fields.length) {
    values.push(parseInt(id));
    await db.prepare('UPDATE products SET ' + fields.join(', ') + ' WHERE id = ?').bind(...values).run();
  }

  const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(parseInt(id)).first();
  return { success: true, product: mapProduct(product) };
}

async function deleteProduct(db, id) {
  const existing = await db.prepare('SELECT * FROM products WHERE id = ?').bind(parseInt(id)).first();
  if (!existing) throw Object.assign(new Error('Product not found'), { status: 404 });
  await db.prepare('DELETE FROM products WHERE id = ?').bind(parseInt(id)).run();
  return { success: true };
}

function mapProduct(p) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    unit: p.unit,
    stock: p.stock,
    image: p.image,
    desc: p.description,
    featured: p.featured === 1,
  };
}

// ===================== Orders =====================

async function listOrders(db, params) {
  let sql = 'SELECT * FROM orders';
  const values = [];
  if (params.get('status') && params.get('status') !== '全部') {
    sql += ' WHERE status = ?';
    values.push(params.get('status'));
  }
  sql += ' ORDER BY created_at DESC';

  const { results } = await db.prepare(sql).bind(...values).all();
  return results.map(mapOrder);
}

async function createOrder(db, body) {
  const { items, customer } = body;
  if (!items || !items.length) throw Object.assign(new Error('Items required'), { status: 400 });
  if (!customer || !customer.name || !customer.phone) throw Object.assign(new Error('Name and phone required'), { status: 400 });

  const total = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  await db.prepare(
    'INSERT INTO orders (id, items_json, customer_name, customer_phone, customer_note, total, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, JSON.stringify(items), customer.name, customer.phone, customer.note || '', total, '待处理').run();

  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  return { success: true, order: mapOrder(order) };
}

async function updateOrder(db, id, body) {
  const existing = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if (!existing) throw Object.assign(new Error('Order not found'), { status: 404 });

  if (body.status) {
    await db.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(body.status, id).run();
  }

  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  return { success: true, order: mapOrder(order) };
}

function mapOrder(o) {
  return {
    id: o.id,
    items: JSON.parse(o.items_json),
    customer: { name: o.customer_name, phone: o.customer_phone, note: o.customer_note },
    total: o.total,
    status: o.status,
    createdAt: o.created_at,
  };
}

// ===================== Messages =====================

async function listMessages(db) {
  const { results } = await db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  return results.map(mapMessage);
}

async function createMessage(db, body) {
  const { name, phone, content } = body;
  if (!name || !phone || !content) throw Object.assign(new Error('All fields required'), { status: 400 });

  const id = Date.now().toString(36);
  await db.prepare(
    'INSERT INTO messages (id, name, phone, content, read) VALUES (?, ?, ?, ?, 0)'
  ).bind(id, name, phone, content).run();

  const msg = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
  return { success: true, message: mapMessage(msg) };
}

async function updateMessage(db, id, body) {
  const existing = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
  if (!existing) throw Object.assign(new Error('Message not found'), { status: 404 });

  if (body.read !== undefined) {
    await db.prepare('UPDATE messages SET read = ? WHERE id = ?').bind(body.read ? 1 : 0, id).run();
  }

  const msg = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
  return { success: true, message: mapMessage(msg) };
}

function mapMessage(m) {
  return { id: m.id, name: m.name, phone: m.phone, content: m.content, read: m.read === 1, createdAt: m.created_at };
}

// ===================== Inquiries =====================

async function listInquiries(db) {
  const { results } = await db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC').all();
  return results.map(mapInquiry);
}

async function createInquiry(db, body) {
  const { name, phone, company, productName, quantity, detail } = body;
  if (!name || !phone || !productName) throw Object.assign(new Error('Name, phone, product required'), { status: 400 });

  const id = Date.now().toString(36);
  await db.prepare(
    'INSERT INTO inquiries (id, name, phone, company, product_name, quantity, detail, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, name, phone, company || '', productName, quantity || 1, detail || '', '待回复').run();

  const inquiry = await db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first();
  return { success: true, inquiry: mapInquiry(inquiry) };
}

async function updateInquiry(db, id, body) {
  const existing = await db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first();
  if (!existing) throw Object.assign(new Error('Inquiry not found'), { status: 404 });

  if (body.status) {
    await db.prepare('UPDATE inquiries SET status = ? WHERE id = ?').bind(body.status, id).run();
  }

  const inquiry = await db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first();
  return { success: true, inquiry: mapInquiry(inquiry) };
}

function mapInquiry(i) {
  return {
    id: i.id, name: i.name, phone: i.phone, company: i.company,
    productName: i.product_name, quantity: i.quantity, detail: i.detail,
    status: i.status, createdAt: i.created_at,
  };
}

// ===================== Stats =====================

async function getStats(db) {
  const { results: orders } = await db.prepare('SELECT status, total FROM orders').all();
  const unread = await db.prepare('SELECT COUNT(*) as count FROM messages WHERE read = 0').first();
  const pendingInq = await db.prepare('SELECT COUNT(*) as count FROM inquiries WHERE status = ?').bind('待回复').first();

  return {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === '待处理').length,
    totalSales: Math.round(orders.filter(o => o.status === '已完成').reduce((s, o) => s + o.total, 0) * 100) / 100,
    unreadMessages: unread.count,
    pendingInquiries: pendingInq.count,
  };
}

// ===================== Upload =====================

async function handleUpload(request) {
  const formData = await request.formData();
  const file = formData.get('image');
  if (!file || !file.name) throw Object.assign(new Error('Please select an image'), { status: 400 });
  if (!file.type.startsWith('image/')) throw Object.assign(new Error('Only image files allowed'), { status: 400 });

  const buf = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const dataUrl = 'data:' + file.type + ';base64,' + b64;

  return { success: true, url: dataUrl };
}

// ===================== Helpers =====================

function json(data, status = 200) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  return new Response(JSON.stringify(data), { status, headers });
}

