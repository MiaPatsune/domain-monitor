// 01-utils.js — 工具函数
//
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
