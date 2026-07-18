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

  document.getElementById('summary').innerHTML = `
    <div class="summary-card" data-group="全部" style="--color: #186db3">
      <h3>域名总数</h3><p>${total}</p>
    </div>
    <div class="summary-card" data-group="一级域名" style="--color: #27ae60">
      <h3>一级域名</h3><p>${primary}</p>
    </div>
    <div class="summary-card" data-group="二级域名" style="--color: #8e44ad">
      <h3>二级域名</h3><p>${secondary}</p>
    </div>
    <div class="summary-card" style="--color: ${expiringCount > 0 ? '#e74c3c' : '#95a5a6'}" data-group="即将到期">
      <h3>即将到期</h3><p>${expiringCount}</p>
    </div>
  `;

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

    const adminActions = IS_ADMIN ? `
      <div class="card-actions">
        <div class="card-action-icons">
          <i class="fas fa-edit card-action-icon edit-icon" data-domain="${safeDomain}" title="编辑"></i>
          <i class="fas fa-sync-alt card-action-icon renew-icon" data-domain="${safeDomain}" title="续费"></i>
          <i class="fas fa-copy card-action-icon copy-icon" data-domain="${safeDomain}" title="克隆"></i>
        </div>
        <input type="checkbox" class="card-checkbox" data-domain="${safeDomain}" ${isChecked}>
      </div>` : '';

    return `
      <div class="domain-card" data-domain="${safeDomain}">
        <div class="card-header">
          <span class="${maskPrefix}">${safeDomainText}</span>
          <span class="card-status" style="--status-color:${STATUS_COLORS[status]}">${statusText}</span>
        </div>
        <div class="group-tags-container">${groupTags}</div>
        <div class="card-info">
          <p><strong>注册时间:</strong> ${formatDate(d.registrationDate)}</p>
          <p><strong>到期时间:</strong> ${formatDate(d.expirationDate)}</p>
          <p><strong>注册商:</strong> ${d.systemURL ? '<a href="' + safeSystemURL + '" target="_blank" rel="noopener noreferrer">' + safeSystem + '</a>' : safeSystem}</p>
          <p><strong>账号:</strong> ${safeAccount}</p>
        </div>
        <div class="card-footer">
          <div class="progress-bar-container">
            <div class="progress-bar" style="width:${progress}%;--status-color:${STATUS_COLORS[status]}"></div>
            <span class="progress-percent-display">${progress}%</span>
          </div>
          <div class="progress-text">${daysText}</div>
        </div>
        ${adminActions}
      </div>`;
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
