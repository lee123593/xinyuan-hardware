// ============ Admin Panel ============
const API = '/api';
const ADMIN_PWD = '123';
let currentTab = 'orders';
let orderStatusFilter = '全部';
let adminCollapsedView = false;
let adminCollapsedCats = {};

function login(e) {
  e.preventDefault();
  if (document.getElementById('pwd').value === ADMIN_PWD) {
    sessionStorage.setItem('xinyuan_admin', '1');
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadAll();
  } else { alert('密码错误'); }
}

function logout() {
  sessionStorage.removeItem('xinyuan_admin');
  location.reload();
}

(function checkAuth() {
  if (sessionStorage.getItem('xinyuan_admin') === '1') {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadAll();
  }
})();

async function loadAll() {
  await Promise.all([loadStats(), loadOrders(), loadProducts(), loadInquiries(), loadMessages()]);
}

// ============ Stats ============
async function loadStats() {
  try {
    const res = await fetch(`${API}/stats`);
    const s = await res.json();
    document.getElementById('statCards').innerHTML = `
      <div class="bg-white border border-stone-200 p-4"><div class="text-xl font-bold font-mono text-stone-900">${s.totalOrders}</div><div class="text-[10px] text-stone-400 mt-1">总订单</div></div>
      <div class="bg-white border border-stone-200 p-4"><div class="text-xl font-bold font-mono text-rust-600">${s.pendingOrders}</div><div class="text-[10px] text-stone-400 mt-1">待处理</div></div>
      <div class="bg-white border border-stone-200 p-4"><div class="text-xl font-bold font-mono text-stone-900">&yen;${s.totalSales.toFixed(0)}</div><div class="text-[10px] text-stone-400 mt-1">销售额</div></div>
      <div class="bg-white border border-stone-200 p-4"><div class="text-xl font-bold font-mono text-stone-900">${s.unreadMessages}</div><div class="text-[10px] text-stone-400 mt-1">未读留言</div></div>
      <div class="bg-white border border-stone-200 p-4"><div class="text-xl font-bold font-mono text-stone-900">${s.pendingInquiries}</div><div class="text-[10px] text-stone-400 mt-1">待回复询价</div></div>
    `;
  } catch { }
}

// ============ Orders ============
async function loadOrders() {
  try {
    const params = orderStatusFilter !== '全部' ? `?status=${orderStatusFilter}` : '';
    const res = await fetch(`${API}/orders${params}`);
    const orders = await res.json();
    const tbody = document.getElementById('orderTableBody');
    const empty = document.getElementById('orderEmpty');
    if (orders.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      tbody.innerHTML = orders.map(o => `
        <tr class="border-b border-stone-100">
          <td class="px-4 py-2.5 font-mono text-[11px] text-stone-500">${o.id}</td>
          <td class="px-4 py-2.5"><div class="font-medium text-stone-800">${o.customer.name}</div><div class="text-[10px] text-stone-400">${o.customer.phone}</div></td>
          <td class="px-4 py-2.5 text-[11px]">${o.items.map(i => `${i.name}&times;${i.qty}`).join('<br>')}</td>
          <td class="px-4 py-2.5 text-right font-mono font-bold text-stone-900">&yen;${o.total.toFixed(2)}</td>
          <td class="px-4 py-2.5 text-center"><span class="tag tag-${o.status}">${o.status}</span></td>
          <td class="px-4 py-2.5 text-[11px] text-stone-400">${new Date(o.createdAt).toLocaleString('zh-CN')}</td>
          <td class="px-4 py-2.5 text-center">
            <select onchange="updateOrderStatus('${o.id}', this.value)" class="border border-stone-200 px-2 py-1 text-[11px] focus:outline-none focus:border-stone-400 bg-white">
              <option value="">变更状态</option>
              <option value="待处理">待处理</option>
              <option value="处理中">处理中</option>
              <option value="已发货">已发货</option>
              <option value="已完成">已完成</option>
            </select>
          </td>
        </tr>
      `).join('');
    }
    const statuses = ['全部','待处理','处理中','已发货','已完成'];
    document.getElementById('orderStatusFilter').innerHTML = statuses.map(s =>
      `<button onclick="filterOrders('${s}')" class="px-3 py-1.5 text-xs font-medium border transition-colors ${s===orderStatusFilter?'bg-stone-900 text-white border-stone-900':'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}">${s}</button>`
    ).join('');
  } catch { }
}

function filterOrders(status) { orderStatusFilter = status; loadOrders(); }

async function updateOrderStatus(id, status) {
  if (!status) return;
  try {
    await fetch(`${API}/orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
    });
    loadOrders(); loadStats();
  } catch { alert('更新失败'); }
}

// ============ Inquiries ============
async function loadInquiries() {
  try {
    const res = await fetch(`${API}/inquiries`);
    const list = await res.json();
    const tbody = document.getElementById('inquiryTableBody');
    const empty = document.getElementById('inquiryEmpty');
    if (list.length === 0) {
      tbody.innerHTML = ''; empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      tbody.innerHTML = list.map(i => `
        <tr class="border-b border-stone-100">
          <td class="px-4 py-2.5 font-mono text-[11px] text-stone-500">${i.id}</td>
          <td class="px-4 py-2.5 font-medium text-stone-800">${i.name}</td>
          <td class="px-4 py-2.5 text-[11px]">${i.phone}</td>
          <td class="px-4 py-2.5 text-[11px]">${i.company||'-'}</td>
          <td class="px-4 py-2.5 text-[11px]">${i.productName}</td>
          <td class="px-4 py-2.5 text-center">${i.quantity}</td>
          <td class="px-4 py-2.5 text-center">
            <span class="tag ${i.status==='待回复'?'tag-pending':'tag-done'}">${i.status}</span>
            ${i.status==='待回复'?`<button onclick="replyInquiry('${i.id}')" class="ml-1 text-[10px] text-stone-500 hover:text-stone-900 underline">回复</button>`:''}
          </td>
          <td class="px-4 py-2.5 text-[11px] text-stone-400">${new Date(i.createdAt).toLocaleString('zh-CN')}</td>
        </tr>
      `).join('');
    }
  } catch { }
}

async function replyInquiry(id) {
  try {
    await fetch(`${API}/inquiries/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: '已回复' })
    });
    loadInquiries(); loadStats();
  } catch { alert('操作失败'); }
}

// ============ Messages ============
async function loadMessages() {
  try {
    const res = await fetch(`${API}/messages`);
    const list = await res.json();
    const tbody = document.getElementById('messageTableBody');
    const empty = document.getElementById('messageEmpty');
    if (list.length === 0) {
      tbody.innerHTML = ''; empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      tbody.innerHTML = list.map(m => `
        <tr class="border-b border-stone-100 ${!m.read?'bg-orange-50/30':''}">
          <td class="px-4 py-2.5 font-mono text-[11px] text-stone-500">${m.id}</td>
          <td class="px-4 py-2.5 font-medium text-stone-800">${m.name}</td>
          <td class="px-4 py-2.5 text-[11px]">${m.phone}</td>
          <td class="px-4 py-2.5 text-[11px] max-w-xs">${m.content}</td>
          <td class="px-4 py-2.5 text-center">
            ${m.read?'<span class="tag tag-done">已读</span>':'<span class="tag tag-pending">未读</span> <button onclick="markRead(\''+m.id+'\')" class="ml-1 text-[10px] text-stone-500 hover:text-stone-900 underline">标为已读</button>'}
          </td>
          <td class="px-4 py-2.5 text-[11px] text-stone-400">${new Date(m.createdAt).toLocaleString('zh-CN')}</td>
        </tr>
      `).join('');
    }
  } catch { }
}

async function markRead(id) {
  try {
    await fetch(`${API}/messages/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read: true })
    });
    loadMessages(); loadStats();
  } catch { alert('操作失败'); }
}

// ============ Products Management ============
async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    const list = await res.json();

    // Flat table view
    const tbody = document.getElementById('productTableBody');
    const empty = document.getElementById('productEmpty');
    if (list.length === 0) {
      tbody.innerHTML = ''; empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      tbody.innerHTML = list.map(p => `
        <tr class="border-b border-stone-100 hover:bg-stone-50">
          <td class="px-4 py-2.5 font-mono text-[11px] text-stone-400">${p.id}</td>
          <td class="px-4 py-2.5">
            <div class="font-medium text-stone-800 text-xs">${p.name}</div>
          </td>
          <td class="px-4 py-2.5"><span class="text-[11px] text-stone-500">${p.category}</span></td>
          <td class="px-4 py-2.5 text-right font-mono font-bold text-stone-900">&yen;${p.price.toFixed(2)}</td>
          <td class="px-4 py-2.5 text-center text-[11px]">${p.stock}</td>
          <td class="px-4 py-2.5 text-center text-[11px]">${p.featured?'是':'-'}</td>
          <td class="px-4 py-2.5 text-center">
            <button onclick="editProduct(${p.id})" class="text-stone-500 hover:text-stone-900 text-[11px] mr-2 underline">编辑</button>
            <button onclick="deleteProduct(${p.id})" class="text-rust-600 hover:text-rust-800 text-[11px] underline">删除</button>
          </td>
        </tr>
      `).join('');
    }

    // Accordion view
    renderAdminAccordion(list);
  } catch { }
}

function getCatOrder(cat) {
  const order = ['螺丝螺帽','手动工具','电动工具','五金配件','管道阀门','锁具五金','建筑五金','卫浴五金'];
  const idx = order.indexOf(cat);
  return idx >= 0 ? idx : 99;
}

function renderAdminAccordion(list) {
  const groups = {};
  list.forEach(p => {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p);
  });
  const sortedCats = Object.keys(groups).sort((a, b) => getCatOrder(a) - getCatOrder(b));

  const container = document.getElementById('adminProductAccordion');
  container.innerHTML = sortedCats.map(cat => {
    const products = groups[cat];
    const catId = 'adm_' + cat.replace(/[^a-zA-Z一-龥]/g, '_');
    const isCollapsed = adminCollapsedCats[cat] !== undefined ? adminCollapsedCats[cat] : false;

    return `
      <div class="border border-stone-200 bg-white">
        <div class="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-stone-50 transition-colors" onclick="toggleAdminCat('${catId}','${cat.replace(/'/g,"\\'")}')">
          <div class="flex items-center gap-2">
            <span class="text-stone-400 text-[10px] transition-transform duration-200 inline-block ${isCollapsed?'':'rotate-90'}" id="adm_arrow_${catId}">&#9654;</span>
            <span class="text-xs font-semibold text-stone-800">${cat}</span>
            <span class="text-[10px] text-stone-400 font-mono">${products.length}</span>
          </div>
        </div>
        <div class="${isCollapsed?'hidden':''}" id="adm_content_${catId}">
          <table class="w-full text-xs">
            <tbody>
              ${products.map(p => `
                <tr class="border-t border-stone-50 hover:bg-stone-50">
                  <td class="px-4 py-2 font-mono text-[11px] text-stone-400 w-16">${p.id}</td>
                  <td class="px-4 py-2 text-xs font-medium text-stone-800">${p.name}</td>
                  <td class="px-4 py-2 text-right font-mono font-bold text-stone-900">&yen;${p.price.toFixed(2)}</td>
                  <td class="px-4 py-2 text-center text-[11px]">${p.stock}</td>
                  <td class="px-4 py-2 text-center">${p.featured?'是':'-'}</td>
                  <td class="px-4 py-2 text-center">
                    <button onclick="editProduct(${p.id})" class="text-stone-500 hover:text-stone-900 text-[11px] mr-2 underline">编辑</button>
                    <button onclick="deleteProduct(${p.id})" class="text-rust-600 hover:text-rust-800 text-[11px] underline">删除</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
}

function toggleAdminCat(catId, catName) {
  adminCollapsedCats[catName] = !adminCollapsedCats[catName];
  const content = document.getElementById('adm_content_' + catId);
  const arrow = document.getElementById('adm_arrow_' + catId);
  if (adminCollapsedCats[catName]) {
    content.classList.add('hidden');
    arrow.classList.remove('rotate-90');
  } else {
    content.classList.remove('hidden');
    arrow.classList.add('rotate-90');
  }
}

function toggleAdminProductView() {
  adminCollapsedView = !adminCollapsedView;
  document.getElementById('adminProductTable').classList.toggle('hidden', adminCollapsedView);
  document.getElementById('adminProductAccordion').classList.toggle('hidden', !adminCollapsedView);
  document.getElementById('adminViewToggle').textContent = adminCollapsedView ? '表格视图' : '折叠视图';
}

// ============ Product CRUD ============
function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('imagePreviewImg').src = e.target.result;
    document.getElementById('imagePreview').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  document.getElementById('prodImageFile').value = '';
  document.getElementById('prodImage').value = '';
  document.getElementById('imagePreview').classList.add('hidden');
  document.getElementById('imagePreviewImg').src = '';
}

function openProductForm() {
  document.getElementById('productFormTitle').textContent = '添加商品';
  ['prodId','prodName','prodCategory','prodImage','prodImageFile','prodDesc'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('prodPrice').value = '';
  document.getElementById('prodUnit').value = '个';
  document.getElementById('prodStock').value = '0';
  document.getElementById('prodFeatured').checked = false;
  document.getElementById('imagePreview').classList.add('hidden');
  document.getElementById('productModal').classList.remove('hidden');
}

async function editProduct(id) {
  try {
    const res = await fetch(`${API}/products/${id}`);
    const p = await res.json();
    document.getElementById('productFormTitle').textContent = '编辑商品';
    document.getElementById('prodId').value = p.id;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodCategory').value = p.category;
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodUnit').value = p.unit;
    document.getElementById('prodStock').value = p.stock;
    document.getElementById('prodImage').value = p.image || '';
    document.getElementById('prodImageFile').value = '';
    document.getElementById('prodDesc').value = p.desc;
    document.getElementById('prodFeatured').checked = p.featured;
    if (p.image && p.image.(p.image.startsWith('/uploads/') || p.image.startsWith('data:') || p.image.startsWith('http'))) {
      document.getElementById('imagePreviewImg').src = p.image;
      document.getElementById('imagePreview').classList.remove('hidden');
    } else {
      document.getElementById('imagePreview').classList.add('hidden');
    }
    document.getElementById('productModal').classList.remove('hidden');
  } catch { alert('加载商品信息失败'); }
}

function closeProductForm() { document.getElementById('productModal').classList.add('hidden'); }

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('prodId').value;
  let image = document.getElementById('prodImage').value;
  const fileInput = document.getElementById('prodImageFile');
  if (fileInput.files.length > 0) {
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    try {
      const uploadRes = await fetch(`${API}/upload`, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { alert(uploadData.error); return; }
      image = uploadData.url;
    } catch { alert('图片上传失败'); return; }
  }
  const body = {
    name: document.getElementById('prodName').value.trim(),
    category: document.getElementById('prodCategory').value,
    price: parseFloat(document.getElementById('prodPrice').value),
    unit: document.getElementById('prodUnit').value.trim(),
    stock: parseInt(document.getElementById('prodStock').value) || 0,
    image: image || '📦',
    desc: document.getElementById('prodDesc').value.trim(),
    featured: document.getElementById('prodFeatured').checked
  };
  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API}/products/${id}` : `${API}/products`;
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    closeProductForm();
    loadProducts();
  } catch { alert('保存失败'); }
}

async function deleteProduct(id) {
  if (!confirm('确定删除该商品？')) return;
  try {
    await fetch(`${API}/products/${id}`, { method: 'DELETE' });
    loadProducts();
  } catch { alert('删除失败'); }
}

// ============ Tab Switching ============
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tabBtn-${tab}`).classList.add('active');
}
