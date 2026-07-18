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
