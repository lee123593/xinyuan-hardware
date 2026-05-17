// ============ 商家后台逻辑 ============
const API = '/api';
const ADMIN_PWD = '123';
let currentTab = 'orders';
let orderStatusFilter = '全部';

function login(e) {
  e.preventDefault();
  const pwd = document.getElementById('pwd').value;
  if (pwd === ADMIN_PWD) {
    sessionStorage.setItem('xinyuan_admin', '1');
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadAll();
  } else {
    alert('密码错误');
  }
}

function logout() {
  sessionStorage.removeItem('xinyuan_admin');
  location.reload();
}

// 自动登录检测
(function checkAuth() {
  if (sessionStorage.getItem('xinyuan_admin') === '1') {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadAll();
  }
})();

async function loadAll() {
  await Promise.all([loadStats(), loadOrders(), loadInquiries(), loadMessages()]);
}

// ============ 统计 ============
async function loadStats() {
  try {
    const res = await fetch(`${API}/stats`);
    const s = await res.json();
    document.getElementById('statCards').innerHTML = `
      <div class="bg-white rounded-xl shadow p-4 text-center"><div class="text-2xl font-bold text-steel-900">${s.totalOrders}</div><div class="text-xs text-steel-500 mt-1">总订单</div></div>
      <div class="bg-white rounded-xl shadow p-4 text-center"><div class="text-2xl font-bold text-rust-600">${s.pendingOrders}</div><div class="text-xs text-steel-500 mt-1">待处理</div></div>
      <div class="bg-white rounded-xl shadow p-4 text-center"><div class="text-2xl font-bold text-green-600">¥${s.totalSales.toFixed(0)}</div><div class="text-xs text-steel-500 mt-1">销售额</div></div>
      <div class="bg-white rounded-xl shadow p-4 text-center"><div class="text-2xl font-bold text-blue-600">${s.unreadMessages}</div><div class="text-xs text-steel-500 mt-1">未读留言</div></div>
      <div class="bg-white rounded-xl shadow p-4 text-center"><div class="text-2xl font-bold text-purple-600">${s.pendingInquiries}</div><div class="text-xs text-steel-500 mt-1">待回复询价</div></div>
    `;
  } catch { }
}

// ============ 订单 ============
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
        <tr class="border-b border-steel-100 hover:bg-steel-50">
          <td class="px-4 py-3 font-mono text-xs">${o.id}</td>
          <td class="px-4 py-3">
            <div class="font-semibold">${o.customer.name}</div>
            <div class="text-xs text-steel-500">${o.customer.phone}</div>
          </td>
          <td class="px-4 py-3 text-xs">${o.items.map(i => `${i.name}×${i.qty}`).join('<br>')}</td>
          <td class="px-4 py-3 text-right font-semibold text-rust-600">¥${o.total.toFixed(2)}</td>
          <td class="px-4 py-3 text-center"><span class="status-badge status-${o.status}">${o.status}</span></td>
          <td class="px-4 py-3 text-xs text-steel-500">${new Date(o.createdAt).toLocaleString('zh-CN')}</td>
          <td class="px-4 py-3 text-center">
            <select onchange="updateOrderStatus('${o.id}', this.value)" class="border border-steel-300 rounded px-2 py-1 text-xs focus:outline-none">
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

    // 状态筛选项
    const statuses = ['全部', '待处理', '处理中', '已发货', '已完成'];
    document.getElementById('orderStatusFilter').innerHTML = statuses.map(s =>
      `<button onclick="filterOrders('${s}')" class="px-3 py-1.5 rounded-full text-xs font-semibold transition ${s === orderStatusFilter ? 'bg-steel-900 text-white' : 'bg-white border border-steel-300 text-steel-600 hover:border-steel-500'}">${s}</button>`
    ).join('');
  } catch { }
}

function filterOrders(status) {
  orderStatusFilter = status;
  loadOrders();
}

async function updateOrderStatus(id, status) {
  if (!status) return;
  try {
    await fetch(`${API}/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadOrders();
    loadStats();
  } catch { alert('更新失败'); }
}

// ============ 询价 ============
async function loadInquiries() {
  try {
    const res = await fetch(`${API}/inquiries`);
    const list = await res.json();
    const tbody = document.getElementById('inquiryTableBody');
    const empty = document.getElementById('inquiryEmpty');
    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      tbody.innerHTML = list.map(i => `
        <tr class="border-b border-steel-100 hover:bg-steel-50">
          <td class="px-4 py-3 font-mono text-xs">${i.id}</td>
          <td class="px-4 py-3 font-semibold">${i.name}</td>
          <td class="px-4 py-3 text-xs">${i.phone}</td>
          <td class="px-4 py-3 text-xs">${i.company || '-'}</td>
          <td class="px-4 py-3 text-xs">${i.productName}</td>
          <td class="px-4 py-3 text-center text-xs">${i.quantity}</td>
          <td class="px-4 py-3 text-center">
            <span class="status-badge status-${i.status}">${i.status}</span>
            ${i.status === '待回复' ? `<button onclick="replyInquiry('${i.id}')" class="ml-2 text-xs text-blue-600 hover:underline">标记已回复</button>` : ''}
          </td>
          <td class="px-4 py-3 text-xs text-steel-500">${new Date(i.createdAt).toLocaleString('zh-CN')}</td>
        </tr>
      `).join('');
    }
  } catch { }
}

async function replyInquiry(id) {
  try {
    await fetch(`${API}/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: '已回复' })
    });
    loadInquiries();
    loadStats();
  } catch { alert('操作失败'); }
}

// ============ 留言 ============
async function loadMessages() {
  try {
    const res = await fetch(`${API}/messages`);
    const list = await res.json();
    const tbody = document.getElementById('messageTableBody');
    const empty = document.getElementById('messageEmpty');
    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      tbody.innerHTML = list.map(m => `
        <tr class="border-b border-steel-100 hover:bg-steel-50 ${!m.read ? 'bg-rust-50' : ''}">
          <td class="px-4 py-3 font-mono text-xs">${m.id}</td>
          <td class="px-4 py-3 font-semibold">${m.name}</td>
          <td class="px-4 py-3 text-xs">${m.phone}</td>
          <td class="px-4 py-3 text-xs max-w-xs">${m.content}</td>
          <td class="px-4 py-3 text-center">
            ${m.read ? '<span class="status-badge status-已完成">已读</span>' : `<span class="status-badge status-待处理">未读</span> <button onclick="markRead('${m.id}')" class="ml-2 text-xs text-blue-600 hover:underline">标为已读</button>`}
          </td>
          <td class="px-4 py-3 text-xs text-steel-500">${new Date(m.createdAt).toLocaleString('zh-CN')}</td>
        </tr>
      `).join('');
    }
  } catch { }
}

async function markRead(id) {
  try {
    await fetch(`${API}/messages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true })
    });
    loadMessages();
    loadStats();
  } catch { alert('操作失败'); }
}

// ============ 标签切换 ============
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tabBtn-${tab}`).classList.add('active');
}
