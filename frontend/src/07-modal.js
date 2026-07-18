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

  overlay.querySelector('.toast-card').innerHTML = `
    <div class="toast-icon"><i class="fas ${icons[type] || icons.info}" style="color:${colors[type] || colors.info}"></i></div>
    <div class="toast-message">${message}</div>
    <div class="toast-actions">
      <button class="toast-btn toast-btn-primary" id="toastOkBtn">确定</button>
    </div>
  `;
  overlay.style.display = 'flex';

  document.getElementById('toastOkBtn').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
}

function showConfirm(message, onConfirm) {
  const overlay = ensureToastOverlay();
  overlay.querySelector('.toast-card').innerHTML = `
    <div class="toast-icon"><i class="fas fa-question-circle" style="color:#f39c12"></i></div>
    <div class="toast-message">${message}</div>
    <div class="toast-actions">
      <button class="toast-btn toast-btn-cancel" id="confirmCancelBtn">取消</button>
      <button class="toast-btn toast-btn-primary" id="confirmOkBtn">确定</button>
    </div>
  `;
  overlay.style.display = 'flex';

  document.getElementById('confirmCancelBtn').addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  document.getElementById('confirmOkBtn').addEventListener('click', async () => {
    overlay.style.display = 'none';
    if (onConfirm) await onConfirm();
  });
}
