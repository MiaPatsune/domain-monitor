export const HTML_JS = `
// 00-config.js — 全局常量和状态
//
const PAGE_SIZE = 12; // 每页卡片数
let allDomains = [];
let currentPage = 1;
let currentGroup = '全部';
let searchQuery = '';
let selectedDomains = new Set();
let isSelectAll = false;

const STATUS_COLORS = {
  expired: '#e74c3c',
  critical: '#e67e22',
  warning: '#f39c12',
  normal: '#27ae60',
  unknown: '#95a5a6',
};

function getDomainStatus(expirationDate) {
  if (!expirationDate) return 'unknown';
  const now = Date.now();
  const exp = Date.parse(expirationDate);
  if (isNaN(exp)) return 'unknown';
  const daysLeft = Math.ceil((exp - now) / 86400000);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 15) return 'critical';
  if (daysLeft <= 60) return 'warning';
  return 'normal';
}

function getStatusText(status) {
  const map = { expired: '已过期', critical: '即将到期', warning: '临近到期', normal: '正常', unknown: '未知' };
  return map[status] || '未知';
}

// 01-utils.js — 工具函数
//
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  if (str == null) return '';
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function daysRemaining(expirationDate) {
  if (!expirationDate) return null;
  const exp = Date.parse(expirationDate);
  if (isNaN(exp)) return null;
  return Math.ceil((exp - Date.now()) / 86400000);
}

function calculateProgress(registrationDate, expirationDate) {
  if (!registrationDate || !expirationDate) return 0;
  const reg = Date.parse(registrationDate);
  const exp = Date.parse(expirationDate);
  if (isNaN(reg) || isNaN(exp) || exp <= reg) return 0;
  const total = exp - reg;
  const elapsed = Date.now() - reg;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

function parseGroups(groupStr) {
  if (!groupStr) return [];
  return groupStr.split(',').map(g => g.trim()).filter(Boolean);
}

function isPrimaryDomain(domain) {
  const parts = domain.split('.');
  return parts.length <= 2;
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// 02-api.js — 数据操作 API
//
async function fetchDomains() {
  try {
    const res = await fetch('/api/domains');
    if (!res.ok) throw new Error('获取域名列表失败');
    allDomains = await res.json();
    renderAll();
  } catch (err) {
    showToast('获取域名列表失败: ' + err.message, 'error');
  }
}

async function saveDomain(domainData) {
  const res = await fetch('/api/domains', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(domainData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '保存失败');
  return data;
}

async function deleteDomains(domains) {
  const res = await fetch('/api/domains', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(domains),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '删除失败');
  return data;
}

async function renewDomain(domain, duration, unit) {
  const res = await fetch('/api/domains', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, duration, unit }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '续费失败');
  return data;
}

async function importDomains(domains) {
  const res = await fetch('/api/domains', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(domains),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '导入失败');
  return data;
}

async function queryWhoisAPI(domain) {
  const res = await fetch('/api/whois/' + encodeURIComponent(domain));
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'WHOIS 查询失败');
  }
  const data = await res.json();
  return data.data;
}

// 03-ui.js — 渲染函数
//
function getFilteredDomains() {
  let filtered = [...allDomains];

  // 分组筛选
  if (currentGroup === '一级域名') {
    filtered = filtered.filter(d => isPrimaryDomain(d.domain));
  } else if (currentGroup === '二级域名') {
    filtered = filtered.filter(d => !isPrimaryDomain(d.domain));
  } else if (currentGroup === '未分组') {
    filtered = filtered.filter(d => !d.groups || d.groups.trim() === '');
  } else if (currentGroup === '即将到期') {
    // 特殊筛选：30天内到期
    filtered = filtered.filter(d => {
      const daysLeft = daysRemaining(d.expirationDate);
      return daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
    });
  } else if (currentGroup !== '全部') {
    filtered = filtered.filter(d => {
      const groups = parseGroups(d.groups);
      return groups.includes(currentGroup);
    });
  }

  // 搜索
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(d =>
      (d.domain || '').toLowerCase().includes(q) ||
      (d.system || '').toLowerCase().includes(q) ||
      (d.registerAccount || '').toLowerCase().includes(q) ||
      (d.groups || '').toLowerCase().includes(q)
    );
  }

  return filtered;
}

function renderSummary() {
  const total = allDomains.length;
  const primary = allDomains.filter(d => isPrimaryDomain(d.domain)).length;
  const secondary = total - primary;

  let expiringCount = 0;
  allDomains.forEach(d => {
    const daysLeft = daysRemaining(d.expirationDate);
    if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 30) expiringCount++;
  });

  document.getElementById('summary').innerHTML = \`
    <div class="summary-card" data-group="全部" style="--color: #186db3">
      <h3>域名总数</h3><p>\${total}</p>
    </div>
    <div class="summary-card" data-group="一级域名" style="--color: #27ae60">
      <h3>一级域名</h3><p>\${primary}</p>
    </div>
    <div class="summary-card" data-group="二级域名" style="--color: #8e44ad">
      <h3>二级域名</h3><p>\${secondary}</p>
    </div>
    <div class="summary-card" style="--color: \${expiringCount > 0 ? '#e74c3c' : '#95a5a6'}" data-group="即将到期">
      <h3>即将到期</h3><p>\${expiringCount}</p>
    </div>
  \`;

  // 点击 summary card 筛选
  document.querySelectorAll('.summary-card[data-group]').forEach(card => {
    card.addEventListener('click', () => {
      const group = card.dataset.group;
      currentGroup = group;
      currentPage = 1;
      updateActiveTab(group);
      renderAll();
    });
  });
}

function renderDomainCards(domains) {
  const container = document.getElementById('domainList');
  if (domains.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#999;font-size:1.1rem;">暂无域名数据</div>';
    return;
  }

  container.innerHTML = domains.map(d => {
    const status = getDomainStatus(d.expirationDate);
    const statusText = getStatusText(status);
    const progress = calculateProgress(d.registrationDate, d.expirationDate);
    const groups = parseGroups(d.groups);
    const daysLeft = daysRemaining(d.expirationDate);
    const daysText = daysLeft !== null ? (daysLeft < 0 ? '已过期 ' + Math.abs(daysLeft) + ' 天' : '剩余 ' + daysLeft + ' 天') : '';

    const groupTags = groups.length > 0
      ? groups.map(g => '<span class="group-tag">' + escapeHtml(g) + '</span>').join('')
      : '<span class="group-tag tag-ungrouped">未分组</span>';

    const isChecked = selectedDomains.has(d.domain) ? 'checked' : '';
    const maskPrefix = IS_ADMIN ? '' : 'card-domain-masked';
    const safeDomain = escapeAttr(d.domain);
    const safeDomainText = escapeHtml(d.domain);
    const safeSystem = escapeHtml(d.system || '-');
    const safeSystemURL = escapeAttr(d.systemURL || '');
    const safeAccount = escapeHtml(d.registerAccount || '-');

    const adminActions = IS_ADMIN ? \`
      <div class="card-actions">
        <div class="card-action-icons">
          <i class="fas fa-edit card-action-icon edit-icon" data-domain="\${safeDomain}" title="编辑"></i>
          <i class="fas fa-sync-alt card-action-icon renew-icon" data-domain="\${safeDomain}" title="续费"></i>
          <i class="fas fa-copy card-action-icon copy-icon" data-domain="\${safeDomain}" title="克隆"></i>
        </div>
        <input type="checkbox" class="card-checkbox" data-domain="\${safeDomain}" \${isChecked}>
      </div>\` : '';

    return \`
      <div class="domain-card" data-domain="\${safeDomain}">
        <div class="card-header">
          <span class="\${maskPrefix}">\${safeDomainText}</span>
          <span class="card-status" style="--status-color:\${STATUS_COLORS[status]}">\${statusText}</span>
        </div>
        <div class="group-tags-container">\${groupTags}</div>
        <div class="card-info">
          <p><strong>注册时间:</strong> \${formatDate(d.registrationDate)}</p>
          <p><strong>到期时间:</strong> \${formatDate(d.expirationDate)}</p>
          <p><strong>注册商:</strong> \${d.systemURL ? '<a href="' + safeSystemURL + '" target="_blank" rel="noopener noreferrer">' + safeSystem + '</a>' : safeSystem}</p>
          <p><strong>账号:</strong> \${safeAccount}</p>
        </div>
        <div class="card-footer">
          <div class="progress-bar-container">
            <div class="progress-bar" style="width:\${progress}%;--status-color:\${STATUS_COLORS[status]}"></div>
            <span class="progress-percent-display">\${progress}%</span>
          </div>
          <div class="progress-text">\${daysText}</div>
        </div>
        \${adminActions}
      </div>\`;
  }).join('');

  // 绑定卡片事件
  bindCardEvents();
}

function bindCardEvents() {
  if (!IS_ADMIN) return;

  // Checkbox
  document.querySelectorAll('.card-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.stopPropagation();
      const domain = cb.dataset.domain;
      if (cb.checked) selectedDomains.add(domain);
      else selectedDomains.delete(domain);
    });
  });

  // Edit
  document.querySelectorAll('.edit-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const domain = icon.dataset.domain;
      const d = allDomains.find(item => item.domain === domain);
      if (d) openEditForm(d);
    });
  });

  // Renew
  document.querySelectorAll('.renew-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      openRenewModal(icon.dataset.domain);
    });
  });

  // Clone
  document.querySelectorAll('.copy-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const domain = icon.dataset.domain;
      const d = allDomains.find(item => item.domain === domain);
      if (d) {
        const clone = { ...d, domain: '', registrationDate: '', expirationDate: '' };
        openEditForm(clone);
      }
    });
  });

  // Card click → copy domain
  document.querySelectorAll('.card-domain').forEach(el => {
    el.addEventListener('click', () => {
      navigator.clipboard.writeText(el.textContent.trim()).then(() => {
        showToast('域名已复制到剪贴板', 'success');
      }).catch(() => {});
    });
  });
}

function renderPagination(filtered) {
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const container = document.getElementById('pagination');
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    const show = i <= 3 || i >= totalPages - 2 || Math.abs(i - currentPage) <= 1;
    if (show) {
      html += '<button class="page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
    } else if (i === 4 || i === totalPages - 3) {
      html += '<span class="page-dots">...</span>';
    }
  }
  container.innerHTML = html;

  container.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      renderAll();
    });
  });
}

function updateActiveTab(group) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.group === group);
  });
  // 动态添加自定义分组标签
  ensureGroupTabs();
}

function ensureGroupTabs() {
  const tabsContainer = document.getElementById('groupTabs');
  const fixedGroups = new Set(['全部', '一级域名', '二级域名', '未分组', '即将到期']);

  // 移除不再存在的自定义分组标签
  const currentGroups = new Set();
  allDomains.forEach(d => parseGroups(d.groups).forEach(g => currentGroups.add(g)));

  tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
    const group = btn.dataset.group;
    if (!fixedGroups.has(group) && !currentGroups.has(group)) {
      btn.remove();
      // 如果当前选中的分组被移除了，回到"全部"
      if (currentGroup === group) {
        currentGroup = '全部';
      }
    }
  });

  // 添加新的自定义分组标签
  const existingGroups = new Set();
  tabsContainer.querySelectorAll('.tab-btn').forEach(btn => existingGroups.add(btn.dataset.group));

  currentGroups.forEach(g => {
    if (!existingGroups.has(g)) {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.dataset.group = g;
      btn.textContent = g;
      btn.addEventListener('click', () => {
        currentGroup = g;
        currentPage = 1;
        updateActiveTab(g);
        renderAll();
      });
      tabsContainer.appendChild(btn);
    }
  });
}

function renderAll() {
  const filtered = getFilteredDomains();
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageDomains = filtered.slice(start, start + PAGE_SIZE);

  renderDomainCards(pageDomains);
  renderPagination(filtered);
  renderSummary();
  updateActiveTab(currentGroup);
}

// 04-form.js — 表单逻辑（添加 / 编辑域名）
//
function openEditForm(domainData) {
  const modal = document.getElementById('domainFormModal');
  modal.style.display = 'block';

  document.getElementById('editOriginalDomain').value = domainData.domain || '';
  document.getElementById('domain').value = domainData.domain || '';
  document.getElementById('registrationDate').value = domainData.registrationDate ? formatDate(domainData.registrationDate) : '';
  document.getElementById('expirationDate').value = domainData.expirationDate ? formatDate(domainData.expirationDate) : '';
  document.getElementById('system').value = domainData.system || '';
  document.getElementById('systemURL').value = domainData.systemURL || '';
  document.getElementById('registerAccount').value = domainData.registerAccount || '';
  document.getElementById('renewalPeriod').value = domainData.renewalPeriod || '';

  if (domainData.renewalUnit) {
    document.getElementById('renewalUnit').value = domainData.renewalUnit;
  }

  // 分组标签
  const groups = parseGroups(domainData.groups);
  document.getElementById('groups').value = groups.join(',');
  renderGroupTags(groups);

  // 清除 WHOIS 警告
  document.getElementById('domainFillWarning').innerHTML = '';

  // 更新自动补全选项
  updateAutocompleteOptions();
}

function openAddForm() {
  openEditForm({ domain: '', registrationDate: '', expirationDate: '', system: '', systemURL: '', registerAccount: '', groups: '', renewalPeriod: '', renewalUnit: 'year' });
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const originalDomain = document.getElementById('editOriginalDomain').value;
  const domain = document.getElementById('domain').value.trim();
  const registrationDate = document.getElementById('registrationDate').value;
  const expirationDate = document.getElementById('expirationDate').value;
  const system = document.getElementById('system').value.trim();
  const systemURL = document.getElementById('systemURL').value.trim();
  const registerAccount = document.getElementById('registerAccount').value.trim();
  const groups = document.getElementById('groups').value;
  const renewalPeriod = document.getElementById('renewalPeriod').value;
  const renewalUnit = document.getElementById('renewalUnit').value;

  if (!domain) { showToast('请输入域名', 'warning'); return; }
  if (!registrationDate) { showToast('请选择注册时间', 'warning'); return; }

  const data = { domain, registrationDate, expirationDate, system, systemURL, registerAccount, groups };
  if (renewalPeriod) { data.renewalPeriod = parseInt(renewalPeriod); data.renewalUnit = renewalUnit; }
  if (originalDomain) data.originalDomain = originalDomain;

  // 如果没有到期时间，尝试 WHOIS 自动填充
  if (!expirationDate && isPrimaryDomain(domain)) {
    document.getElementById('domainFillWarning').innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在查询 WHOIS 信息...';
    try {
      const whois = await queryWhoisAPI(domain);
      if (whois) {
        if (!data.registrationDate) {
          document.getElementById('registrationDate').value = formatDate(whois.creationDate);
          data.registrationDate = formatDate(whois.creationDate);
        }
        document.getElementById('expirationDate').value = formatDate(whois.expiryDate);
        data.expirationDate = formatDate(whois.expiryDate);
        if (!data.system) { document.getElementById('system').value = whois.registrar || ''; data.system = whois.registrar || ''; }
        if (!data.systemURL) { document.getElementById('systemURL').value = whois.registrarUrl || ''; data.systemURL = whois.registrarUrl || ''; }
        document.getElementById('domainFillWarning').innerHTML = '<span style="color:#27ae60"><i class="fas fa-check-circle"></i> WHOIS 信息已自动填充</span>';
      }
    } catch (err) {
      document.getElementById('domainFillWarning').innerHTML = '<span style="color:#e74c3c"><i class="fas fa-exclamation-triangle"></i> WHOIS 查询失败，请手动填写</span>';
    }
  }

  if (!expirationDate && !data.expirationDate) {
    showToast('请填写到期时间', 'warning');
    document.getElementById('expirationDate').focus();
    return;
  }

  const submitBtn = document.querySelector('#domainForm button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';

  try {
    await saveDomain(data);
    document.getElementById('domainFormModal').style.display = 'none';
    showToast(originalDomain ? '域名已更新' : '域名已添加', 'success');
    await fetchDomains();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa fa-save"></i> 保存';
  }
}

// 自动补全：全局存储选项，避免重复绑定事件
let autocompleteData = {
  system: [],
  systemURL: [],
  registerAccount: [],
  groups: [],
};

function updateAutocompleteOptions() {
  autocompleteData.system = [...new Set(allDomains.map(d => d.system).filter(Boolean))];
  autocompleteData.systemURL = [...new Set(allDomains.map(d => d.systemURL).filter(Boolean))];
  autocompleteData.registerAccount = [...new Set(allDomains.map(d => d.registerAccount).filter(Boolean))];
  const allGroups = new Set();
  allDomains.forEach(d => parseGroups(d.groups).forEach(g => allGroups.add(g)));
  autocompleteData.groups = [...allGroups];
}

function initAutocomplete() {
  buildAutocomplete('system', 'systemDropdown', 'system', false);
  buildAutocomplete('systemURL', 'systemURLDropdown', 'systemURL', false);
  buildAutocomplete('registerAccount', 'registerAccountDropdown', 'registerAccount', false);
  buildAutocomplete('groupsInput', 'groupsDropdown', 'groups', true);
}

function buildAutocomplete(inputId, dropdownId, dataKey, isGroups = false) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  input.addEventListener('focus', () => filterDropdown(input, dropdown, autocompleteData[dataKey] || [], isGroups));
  input.addEventListener('input', () => filterDropdown(input, dropdown, autocompleteData[dataKey] || [], isGroups));
  input.addEventListener('blur', () => setTimeout(() => { dropdown.style.display = 'none'; }, 200));

  dropdown.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const item = e.target.closest('.autocomplete-dropdown-item');
    if (item) {
      if (isGroups) {
        addGroupTag(item.textContent);
        input.value = '';
      } else {
        input.value = item.textContent;
      }
      dropdown.style.display = 'none';
    }
  });
}

function filterDropdown(input, dropdown, options, isGroups) {
  const val = input.value.toLowerCase();
  const filtered = options.filter(o => o.toLowerCase().includes(val));
  if (filtered.length === 0) { dropdown.style.display = 'none'; return; }
  dropdown.innerHTML = filtered.map(o => '<div class="autocomplete-dropdown-item">' + escapeHtml(o) + '</div>').join('');
  dropdown.style.display = 'block';
}

// 分组标签操作
function initGroupsInput() {
  const input = document.getElementById('groupsInput');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      const val = input.value.trim();
      if (val) addGroupTag(val);
      input.value = '';
    }
    if (e.key === 'Backspace' && input.value === '') {
      const tags = document.querySelectorAll('#groupsTagList .group-tag');
      if (tags.length > 0) {
        const lastTag = tags[tags.length - 1];
        const text = lastTag.querySelector('span').textContent;
        removeGroupTag(text);
      }
    }
  });
}

function addGroupTag(text) {
  const current = document.getElementById('groups').value;
  const groups = current ? current.split(',').map(g => g.trim()).filter(Boolean) : [];
  if (!groups.includes(text)) groups.push(text);
  document.getElementById('groups').value = groups.join(',');
  renderGroupTags(groups);
}

function removeGroupTag(text) {
  const current = document.getElementById('groups').value;
  const groups = current ? current.split(',').map(g => g.trim()).filter(Boolean) : [];
  const updated = groups.filter(g => g !== text);
  document.getElementById('groups').value = updated.join(',');
  renderGroupTags(updated);
}

function renderGroupTags(groups) {
  const list = document.getElementById('groupsTagList');
  if (!list) return;
  if (groups.length === 0) {
    list.classList.remove('has-tags');
    list.innerHTML = '';
    return;
  }
  list.classList.add('has-tags');
  list.innerHTML = groups.map(g =>
    '<span class="group-tag"><span>' + g + '</span><span class="group-tag-remove" data-group="' + g + '">&times;</span></span>'
  ).join('');

  list.querySelectorAll('.group-tag-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeGroupTag(btn.dataset.group);
    });
  });
}

// 05-filters.js — 筛选与搜索
//
function initFilters() {
  // 分组标签点击
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentGroup = btn.dataset.group;
      currentPage = 1;
      updateActiveTab(currentGroup);
      renderAll();
    });
  });

  // 搜索
  const searchBox = document.getElementById('searchBox');
  if (searchBox) {
    let debounceTimer;
    searchBox.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = searchBox.value.trim();
        currentPage = 1;
        renderAll();
      }, 300);
    });
  }
}

// 06-init.js — 事件绑定和初始化
//
function init() {
  // 登录按钮（公开页）
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', () => { window.location.href = '/login'; });

  if (!IS_ADMIN) {
    // 公开页：使用服务端注入的脱敏数据
    if (INITIAL_DOMAINS && Array.isArray(INITIAL_DOMAINS)) {
      allDomains = INITIAL_DOMAINS;
      renderAll();
    }
    return;
  }

  // 退出
  document.getElementById('logoutBtn').addEventListener('click', () => { window.location.href = '/logout'; });

  // 添加域名
  document.getElementById('addDomainBtn').addEventListener('click', openAddForm);

  // 关闭弹窗
  document.querySelector('#domainFormModal .close-btn').addEventListener('click', () => {
    document.getElementById('domainFormModal').style.display = 'none';
  });
  window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('domainFormModal')) {
      document.getElementById('domainFormModal').style.display = 'none';
    }
  });

  // 表单提交
  document.getElementById('domainForm').addEventListener('submit', handleFormSubmit);

  // 全选
  document.getElementById('selectAllBtn').addEventListener('click', () => {
    isSelectAll = !isSelectAll;
    const filtered = getFilteredDomains();
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageDomains = filtered.slice(start, start + PAGE_SIZE);

    if (isSelectAll) {
      pageDomains.forEach(d => selectedDomains.add(d.domain));
    } else {
      pageDomains.forEach(d => selectedDomains.delete(d.domain));
    }
    renderAll();
  });

  // 批量删除
  document.getElementById('batchDeleteBtn').addEventListener('click', async () => {
    if (selectedDomains.size === 0) { showToast('请先选择要删除的域名', 'warning'); return; }
    showConfirm('确认删除选中的 ' + selectedDomains.size + ' 个域名？', async () => {
      try {
        await deleteDomains([...selectedDomains]);
        selectedDomains.clear();
        isSelectAll = false;
        showToast('删除成功', 'success');
        await fetchDomains();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // 导出
  document.getElementById('exportDataBtn').addEventListener('click', () => {
    if (allDomains.length === 0) { showToast('没有数据可导出', 'warning'); return; }
    downloadJSON(allDomains, 'domain-backup-' + new Date().toISOString().split('T')[0] + '.json');
    showToast('数据已导出', 'success');
  });

  // 导入
  document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  document.getElementById('importFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showConfirm('导入将覆盖现有数据，确认继续？', async () => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('文件格式不正确，需要 JSON 数组');
        await importDomains(data);
        showToast('成功导入 ' + data.length + ' 个域名', 'success');
        await fetchDomains();
      } catch (err) {
        showToast('导入失败: ' + err.message, 'error');
      }
    });
    e.target.value = '';
  });

  // 初始化筛选器
  initFilters();
  initGroupsInput();
  initAutocomplete();
  initRenewal();

  // 加载数据
  fetchDomains();
}

document.addEventListener('DOMContentLoaded', init);

// 07-modal.js — 自定义 Toast / Confirm 弹窗
//
let toastOverlay = null;
let confirmCallback = null;

function ensureToastOverlay() {
  if (toastOverlay) return toastOverlay;
  toastOverlay = document.createElement('div');
  toastOverlay.className = 'toast-overlay';
  toastOverlay.style.display = 'flex';
  toastOverlay.innerHTML = '<div class="toast-card"></div>';
  document.body.appendChild(toastOverlay);
  return toastOverlay;
}

function showToast(message, type = 'info') {
  const overlay = ensureToastOverlay();
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const colors = { success: '#27ae60', error: '#e74c3c', warning: '#f39c12', info: '#186db3' };

  overlay.querySelector('.toast-card').innerHTML = \`
    <div class="toast-icon"><i class="fas \${icons[type] || icons.info}" style="color:\${colors[type] || colors.info}"></i></div>
    <div class="toast-message">\${message}</div>
    <div class="toast-actions">
      <button class="toast-btn toast-btn-primary" id="toastOkBtn">确定</button>
    </div>
  \`;
  overlay.style.display = 'flex';

  document.getElementById('toastOkBtn').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
}

function showConfirm(message, onConfirm) {
  const overlay = ensureToastOverlay();
  overlay.querySelector('.toast-card').innerHTML = \`
    <div class="toast-icon"><i class="fas fa-question-circle" style="color:#f39c12"></i></div>
    <div class="toast-message">\${message}</div>
    <div class="toast-actions">
      <button class="toast-btn toast-btn-cancel" id="confirmCancelBtn">取消</button>
      <button class="toast-btn toast-btn-primary" id="confirmOkBtn">确定</button>
    </div>
  \`;
  overlay.style.display = 'flex';

  document.getElementById('confirmCancelBtn').addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  document.getElementById('confirmOkBtn').addEventListener('click', async () => {
    overlay.style.display = 'none';
    if (onConfirm) await onConfirm();
  });
}

// 08-renewal.js — 续费弹窗
//
let currentRenewDomain = '';

function openRenewModal(domain) {
  currentRenewDomain = domain;
  document.getElementById('renewDomainName').textContent = domain;
  document.getElementById('renewDuration').value = '1';
  document.getElementById('renewUnitSelect').value = 'year';
  document.getElementById('renewOverlay').style.display = 'flex';
}

function initRenewal() {
  if (!IS_ADMIN) return;

  document.getElementById('renewCancelBtn').addEventListener('click', () => {
    document.getElementById('renewOverlay').style.display = 'none';
  });

  document.getElementById('renewConfirmBtn').addEventListener('click', async () => {
    const duration = parseInt(document.getElementById('renewDuration').value);
    const unit = document.getElementById('renewUnitSelect').value;

    if (!duration || duration < 1) { showToast('请输入有效时长', 'warning'); return; }

    try {
      await renewDomain(currentRenewDomain, duration, unit);
      document.getElementById('renewOverlay').style.display = 'none';
      showToast(currentRenewDomain + ' 已续费 ' + duration + (unit === 'year' ? ' 年' : ' 月'), 'success');
      await fetchDomains();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // 点击遮罩关闭
  document.getElementById('renewOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('renewOverlay')) {
      document.getElementById('renewOverlay').style.display = 'none';
    }
  });
}

`;
