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
