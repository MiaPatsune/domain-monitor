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

// 自动补全
function updateAutocompleteOptions() {
  const systems = [...new Set(allDomains.map(d => d.system).filter(Boolean))];
  const systemURLs = [...new Set(allDomains.map(d => d.systemURL).filter(Boolean))];
  const accounts = [...new Set(allDomains.map(d => d.registerAccount).filter(Boolean))];
  const allGroups = new Set();
  allDomains.forEach(d => parseGroups(d.groups).forEach(g => allGroups.add(g)));

  buildAutocomplete('system', 'systemDropdown', systems);
  buildAutocomplete('systemURL', 'systemURLDropdown', systemURLs);
  buildAutocomplete('registerAccount', 'registerAccountDropdown', accounts);
  buildAutocomplete('groupsInput', 'groupsDropdown', [...allGroups], true);
}

function buildAutocomplete(inputId, dropdownId, options, isGroups = false) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  input.addEventListener('focus', () => filterDropdown(input, dropdown, options, isGroups));
  input.addEventListener('input', () => filterDropdown(input, dropdown, options, isGroups));
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
  dropdown.innerHTML = filtered.map(o => '<div class="autocomplete-dropdown-item">' + o + '</div>').join('');
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
