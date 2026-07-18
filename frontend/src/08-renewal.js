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
