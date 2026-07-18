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
