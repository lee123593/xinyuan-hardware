// ============ Global state ============
const API = 'https://xinyuan-hardware-site.pages.dev/api';
let cart = [];
let allProducts = [];
let collapsedCategories = {};
let allExpanded = false;

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  loadCartFromStorage();
});

async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    allProducts = await res.json();
    renderProducts();
    renderFeatured();
  } catch (err) {
    console.error('Failed to load products:', err);
    showToast('无法连接到服务器，请确认后端已启动');
  }
}

// ============ Product image ============
function productImage(p, size) {
  if (p.image && (p.image.startsWith('/uploads/') || p.image.startsWith('http') || p.image.startsWith('data:'))) {
    const cls = size === 'large' ? 'w-full h-40 object-cover' : size === 'cart' ? 'w-10 h-10 object-cover' : 'w-12 h-12 object-cover';
    return `<img src="${p.image}" alt="${p.name}" class="${cls}" onerror="this.style.display='none'">`;
  }
  const iconSize = size === 'large' ? 'text-4xl' : size === 'cart' ? 'text-lg' : 'text-2xl';
  const icon = p.image && p.image.length <= 4 ? p.image : '&#9678;';
  return `<span class="${iconSize} text-stone-300">${icon}</span>`;
}

// ============ Collapsible Product Rendering ============
function getCategoryOrder(cat) {
  const order = ['螺丝螺帽','手动工具','电动工具','五金配件','管道阀门','锁具五金','建筑五金','卫浴五金'];
  const idx = order.indexOf(cat);
  return idx >= 0 ? idx : 99;
}

function renderProducts() {
  const search = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  let filtered = [...allProducts];
  if (search) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) || p.desc.toLowerCase().includes(search)
    );
  }

  // Group by category
  const groups = {};
  filtered.forEach(p => {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p);
  });

  // Sort categories
  const sortedCats = Object.keys(groups).sort((a, b) => getCategoryOrder(a) - getCategoryOrder(b));

  const container = document.getElementById('productCategories');
  if (filtered.length === 0) {
    container.innerHTML = '<div class="text-center py-16 text-stone-400 text-sm">未找到匹配的产品</div>';
    document.getElementById('toggleAllBtn').textContent = '展开全部';
    return;
  }

  container.innerHTML = sortedCats.map(cat => {
    const products = groups[cat];
    const catId = cat.replace(/[^a-zA-Z一-龥]/g, '_');
    const isCollapsed = collapsedCategories[cat] !== undefined ? collapsedCategories[cat] : false;

    const productCards = products.map(p => `
      <div class="product-card bg-white border border-stone-100 p-4 flex flex-col group">
        <div class="aspect-square bg-stone-50 flex items-center justify-center mb-3 overflow-hidden">${productImage(p, 'large')}</div>
        <div class="flex-1 flex flex-col gap-1.5">
          <p class="text-[11px] text-stone-400 font-mono">${p.name.split(' ')[0]}</p>
          <h3 class="text-sm font-medium text-stone-800 leading-snug line-clamp-2">${p.name}</h3>
          <div class="flex items-center justify-between mt-auto pt-2">
            <span class="text-sm font-bold font-mono text-stone-900">&yen;${p.price.toFixed(2)}</span>
            <span class="text-[10px] text-stone-400">${p.unit}</span>
          </div>
          <button onclick="event.stopPropagation();addToCart(${p.id})"
            class="mt-1 w-full border border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900 text-xs py-1.5 font-medium transition-colors">
            加入购物车
          </button>
        </div>
      </div>
    `).join('');

    return `
      <div class="border border-stone-200 bg-white">
        <div class="accordion-toggle flex items-center justify-between px-5 py-3" onclick="toggleCategory('${catId}', '${cat.replace(/'/g, "\\'")}')">
          <div class="flex items-center gap-3">
            <span class="accordion-arrow text-stone-400 text-xs ${isCollapsed ? '' : 'open'}" id="arrow_${catId}">&#9654;</span>
            <span class="text-sm font-semibold text-stone-800">${cat}</span>
            <span class="text-[11px] text-stone-400 font-mono">${products.length}</span>
          </div>
        </div>
        <div class="accordion-content ${isCollapsed ? 'collapsed' : ''} px-2 pb-3" id="content_${catId}" style="grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:4px;">
          ${productCards}
        </div>
      </div>
    `;
  }).join('');

  // Update toggle all button
  document.getElementById('toggleAllBtn').textContent = allExpanded ? '收起全部' : '展开全部';
}

function toggleCategory(catId, catName) {
  // Toggle collapsed state
  const isCurrentlyCollapsed = collapsedCategories[catName] !== undefined ? collapsedCategories[catName] : false;
  collapsedCategories[catName] = !isCurrentlyCollapsed;

  const content = document.getElementById('content_' + catId);
  const arrow = document.getElementById('arrow_' + catId);

  if (collapsedCategories[catName]) {
    content.classList.add('collapsed');
    arrow.classList.remove('open');
  } else {
    content.classList.remove('collapsed');
    arrow.classList.add('open');
  }

  // Update allExpanded state
  const allCats = Object.keys(collapsedCategories);
  allExpanded = allCats.length > 0 && allCats.every(c => !collapsedCategories[c]);
  document.getElementById('toggleAllBtn').textContent = allExpanded ? '收起全部' : '展开全部';
}

function toggleAllCategories() {
  allExpanded = !allExpanded;

  // Get all unique categories
  const cats = [...new Set(allProducts.map(p => p.category))];
  cats.forEach(cat => {
    collapsedCategories[cat] = !allExpanded;
  });

  renderProducts();
}

// ============ Featured ============
function renderFeatured() {
  const featured = allProducts.filter(p => p.featured);
  const grid = document.getElementById('featuredGrid');
  grid.innerHTML = featured.map(p => `
    <div class="bg-stone-800 p-6 flex flex-col group hover:bg-stone-700 transition-colors">
      <p class="text-[10px] text-stone-500 font-mono">${p.name.split(' ')[0]}</p>
      <h3 class="text-sm font-semibold text-white mt-2 leading-snug line-clamp-2">${p.name}</h3>
      <p class="text-xs text-stone-500 mt-2 line-clamp-2">${p.desc}</p>
      <div class="flex items-center justify-between mt-4 pt-3 border-t border-stone-700">
        <span class="text-base font-bold font-mono text-rust-400">&yen;${p.price.toFixed(2)}</span>
        <button onclick="event.stopPropagation();addToCart(${p.id})"
          class="text-xs text-stone-400 hover:text-white transition-colors font-medium">
          加入购物车 &rarr;
        </button>
      </div>
    </div>
  `).join('');
}

// ============ Cart ============
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.qty >= product.stock) { showToast('库存不足'); return; }
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
  showToast('已加入购物车');
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty < 1) cart = cart.filter(i => i.id !== productId);
  else if (item.qty > item.stock) { item.qty = item.stock; showToast('库存不足'); }
  saveCart();
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  if (cart.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-stone-400 text-xs">购物车为空</div>';
  } else {
    container.innerHTML = cart.map(item => `
      <div class="flex gap-3 items-center border-b border-stone-100 pb-3">
        <div class="w-10 h-10 flex items-center justify-center bg-stone-50">${productImage(item, 'cart')}</div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-stone-800 truncate">${item.name}</p>
          <p class="text-[10px] text-stone-400 font-mono">&yen;${item.price.toFixed(2)}</p>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="updateQty(${item.id}, -1)" class="w-6 h-6 border border-stone-200 text-stone-500 hover:border-stone-400 text-xs">-</button>
          <span class="text-xs font-mono w-5 text-center">${item.qty}</span>
          <button onclick="updateQty(${item.id}, 1)" class="w-6 h-6 border border-stone-200 text-stone-500 hover:border-stone-400 text-xs">+</button>
        </div>
        <p class="text-xs font-bold font-mono text-stone-900 w-16 text-right">&yen;${(item.price * item.qty).toFixed(2)}</p>
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
  try { cart = JSON.parse(localStorage.getItem('xinyuan_cart') || '[]'); }
  catch { cart = []; }
  updateCartBadge();
}

// ============ Checkout ============
function openCheckout() {
  if (cart.length === 0) { showToast('购物车为空'); return; }
  toggleCart();
  document.getElementById('checkoutOverlay').classList.remove('hidden');
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  document.getElementById('checkoutItems').innerHTML = cart.map(i =>
    `<div class="flex justify-between"><span>${i.name} &times;${i.qty}</span><span class="font-mono">&yen;${(i.price * i.qty).toFixed(2)}</span></div>`
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
    if (!res.ok) { showToast(data.error); return; }
    cart = [];
    saveCart();
    closeCheckout();
    ['custName','custPhone','custNote'].forEach(id => document.getElementById(id).value = '');
    showToast('下单成功！订单号: ' + data.order.id);
  } catch { showToast('提交失败，请检查网络连接'); }
}

// ============ Inquiry ============
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
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error); return; }
    e.target.reset();
    showToast('询价已提交，我们将在24小时内回复您');
  } catch { showToast('提交失败，请检查网络连接'); }
}

// ============ Message ============
async function submitMessage(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('msgName').value.trim(),
    phone: document.getElementById('msgPhone').value.trim(),
    content: document.getElementById('msgContent').value.trim()
  };
  try {
    const res = await fetch(`${API}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error); return; }
    e.target.reset();
    showToast('留言已发送，感谢您的反馈');
  } catch { showToast('提交失败，请检查网络连接'); }
}

// ============ Toast ============
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.opacity = '1';
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.classList.add('hidden'), 250); }, 2500);
}
