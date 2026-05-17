// ============ 全局状态 ============
const API = '/api';
let cart = [];
let allProducts = [];
let currentCategory = '全部';

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  loadCartFromStorage();
});

async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    allProducts = await res.json();
    renderCategories();
    renderProducts();
    renderFeatured();
  } catch (err) {
    console.error('加载商品失败:', err);
    showToast('⚠️ 无法连接到服务器，请确认后端已启动');
  }
}

// ============ 图片渲染 ============
function productImage(p, size) {
  if (p.image && (p.image.startsWith('/uploads/') || p.image.startsWith('http'))) {
    const cls = size === 'large' ? 'w-full h-48 object-cover' : size === 'cart' ? 'w-10 h-10 object-cover rounded' : 'w-16 h-16 object-cover rounded-xl';
    return `<img src="${p.image}" alt="${p.name}" class="${cls}" onerror="this.parentElement.innerHTML='<span class=text-3xl>📦</span>'">`;
  }
  const iconSize = size === 'large' ? 'text-6xl' : size === 'cart' ? 'text-3xl' : 'text-5xl';
  return `<span class="${iconSize}">${p.image || '📦'}</span>`;
}

// ============ 分类标签 ============
function renderCategories() {
  const categories = ['全部', ...new Set(allProducts.map(p => p.category))];
  const container = document.getElementById('categoryTags');
  container.innerHTML = categories.map(c =>
    `<button onclick="selectCategory('${c}')" class="px-4 py-2 rounded-full text-sm font-medium transition ${
      c === currentCategory
        ? 'bg-steel-900 text-white'
        : 'bg-white border border-steel-300 text-steel-700 hover:border-steel-500'
    }">${c}</button>`
  ).join('');
}

function selectCategory(cat) {
  currentCategory = cat;
  document.getElementById('searchInput').value = '';
  renderCategories();
  renderProducts();
}

// ============ 商品渲染 ============
function renderProducts() {
  const search = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  let filtered = [...allProducts];

  if (currentCategory !== '全部') {
    filtered = filtered.filter(p => p.category === currentCategory);
  }
  if (search) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) || p.desc.toLowerCase().includes(search)
    );
  }

  const grid = document.getElementById('productGrid');
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center py-16 text-steel-500">🔍 未找到匹配的商品</div>';
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden flex flex-col group border border-steel-100 hover:border-rust-300">
      <div class="text-center bg-steel-50 group-hover:bg-steel-100 transition flex items-center justify-center overflow-hidden" style="height:200px">${productImage(p, 'large')}</div>
      <div class="p-5 flex-1 flex flex-col gap-3">
        <div>
          <span class="text-xs text-rust-500 font-semibold bg-rust-50 px-2 py-0.5 rounded">${p.category}</span>
        </div>
        <h3 class="font-bold text-steel-900 leading-snug">${p.name}</h3>
        <p class="text-xs text-steel-500 flex-1">${p.desc}</p>
        <div class="flex items-center justify-between mt-2">
          <div>
            <span class="text-xl font-bold text-rust-600">¥${p.price.toFixed(2)}</span>
            <span class="text-xs text-steel-400">/${p.unit}</span>
          </div>
          <span class="text-xs text-steel-400">库存 ${p.stock}</span>
        </div>
        <button onclick="addToCart(${p.id})" class="w-full mt-2 bg-steel-900 hover:bg-rust-500 text-white py-2.5 rounded-lg font-semibold text-sm transition">加入购物车</button>
      </div>
    </div>
  `).join('');
}

function renderFeatured() {
  const featured = allProducts.filter(p => p.featured);
  const grid = document.getElementById('featuredGrid');
  grid.innerHTML = featured.map(p => `
    <div class="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10 hover:border-rust-500 transition flex gap-4 items-start">
      <div class="shrink-0 flex items-center justify-center" style="width:64px;height:64px">${productImage(p, 'small')}</div>
      <div class="min-w-0">
        <span class="text-xs text-rust-400 font-semibold">${p.category}</span>
        <h3 class="font-bold text-white mt-1 leading-snug">${p.name}</h3>
        <p class="text-sm text-steel-400 mt-1 line-clamp-2">${p.desc}</p>
        <div class="flex items-baseline gap-2 mt-3">
          <span class="text-xl font-bold text-rust-400">¥${p.price.toFixed(2)}</span>
          <span class="text-xs text-steel-500">/${p.unit}</span>
        </div>
        <button onclick="addToCart(${p.id})" class="mt-3 w-full bg-rust-500 hover:bg-rust-600 text-white py-2 rounded-lg font-semibold text-sm transition">加入购物车</button>
      </div>
    </div>
  `).join('');
}

// ============ 购物车 ============
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.qty >= product.stock) {
      showToast('⚠️ 库存不足');
      return;
    }
    existing.qty++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      image: product.image,
      qty: 1,
      stock: product.stock
    });
  }

  saveCart();
  showToast(`✅ ${product.name} 已加入购物车`);
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty < 1) cart = cart.filter(i => i.id !== productId);
  else if (item.qty > item.stock) { item.qty = item.stock; showToast('⚠️ 库存不足'); }
  saveCart();
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  if (cart.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-steel-400">🛒 购物车空空如也</div>';
  } else {
    container.innerHTML = cart.map(item => `
      <div class="flex gap-3 items-center border-b border-steel-100 pb-3">
        <div class="w-10 h-10 flex items-center justify-center overflow-hidden rounded">${productImage(item, 'cart')}</div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-steel-900 truncate">${item.name}</p>
          <p class="text-xs text-steel-500">¥${item.price.toFixed(2)}/${item.unit}</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="updateQty(${item.id}, -1)" class="w-7 h-7 rounded-full border border-steel-300 text-steel-600 hover:bg-steel-100 transition text-sm">-</button>
          <span class="text-sm font-semibold w-6 text-center">${item.qty}</span>
          <button onclick="updateQty(${item.id}, 1)" class="w-7 h-7 rounded-full border border-steel-300 text-steel-600 hover:bg-steel-100 transition text-sm">+</button>
        </div>
        <p class="text-sm font-bold text-rust-600 w-20 text-right">¥${(item.price * item.qty).toFixed(2)}</p>
      </div>
    `).join('');
  }

  document.getElementById('cartTotal').textContent = `¥${total.toFixed(2)}`;
  updateCartBadge();
}

function updateCartBadge() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  const badge = document.getElementById('cartBadge');
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function toggleCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  const open = sidebar.classList.contains('translate-x-full');
  sidebar.classList.toggle('translate-x-full', !open);
  sidebar.classList.toggle('translate-x-0', open);
  overlay.classList.toggle('hidden', !open);
  if (open) renderCart();
}

function saveCart() {
  localStorage.setItem('xinyuan_cart', JSON.stringify(cart));
  updateCartBadge();
}

function loadCartFromStorage() {
  try {
    cart = JSON.parse(localStorage.getItem('xinyuan_cart') || '[]');
  } catch { cart = []; }
  updateCartBadge();
}

// ============ 结算 ============
function openCheckout() {
  if (cart.length === 0) { showToast('⚠️ 购物车为空'); return; }
  toggleCart();
  document.getElementById('checkoutOverlay').classList.remove('hidden');
  const itemsDiv = document.getElementById('checkoutItems');
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  itemsDiv.innerHTML = cart.map(i =>
    `<div class="flex justify-between"><span>${i.name} ×${i.qty}</span><span>¥${(i.price * i.qty).toFixed(2)}</span></div>`
  ).join('');
  document.getElementById('checkoutTotal').textContent = `¥${total.toFixed(2)}`;
}

function closeCheckout() {
  document.getElementById('checkoutOverlay').classList.add('hidden');
}

async function submitOrder(e) {
  e.preventDefault();
  const customer = {
    name: document.getElementById('custName').value.trim(),
    phone: document.getElementById('custPhone').value.trim(),
    note: document.getElementById('custNote').value.trim()
  };

  const items = cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, unit: i.unit }));

  try {
    const res = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, customer })
    });
    const data = await res.json();
    if (!res.ok) { showToast('❌ ' + data.error); return; }

    cart = [];
    saveCart();
    closeCheckout();
    document.getElementById('custName').value = '';
    document.getElementById('custPhone').value = '';
    document.getElementById('custNote').value = '';
    showToast(`🎉 下单成功！订单号: ${data.order.id}`);
  } catch {
    showToast('❌ 提交失败，请检查网络连接');
  }
}

// ============ 询价 ============
async function submitInquiry(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('inqName').value.trim(),
    phone: document.getElementById('inqPhone').value.trim(),
    company: document.getElementById('inqCompany').value.trim(),
    productName: document.getElementById('inqProduct').value.trim(),
    quantity: parseInt(document.getElementById('inqQty').value) || 1,
    detail: document.getElementById('inqDetail').value.trim()
  };

  try {
    const res = await fetch(`${API}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) { showToast('❌ ' + data.error); return; }

    e.target.reset();
    showToast('📨 询价已提交，我们将在24小时内回复您！');
  } catch {
    showToast('❌ 提交失败，请检查网络连接');
  }
}

// ============ 留言 ============
async function submitMessage(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('msgName').value.trim(),
    phone: document.getElementById('msgPhone').value.trim(),
    content: document.getElementById('msgContent').value.trim()
  };

  try {
    const res = await fetch(`${API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) { showToast('❌ ' + data.error); return; }

    e.target.reset();
    showToast('✉️ 留言已发送，感谢您的反馈！');
  } catch {
    showToast('❌ 提交失败，请检查网络连接');
  }
}

// ============ Toast ============
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden', 'opacity-0');
  el.classList.add('opacity-100');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.add('hidden'), 3000);
}
