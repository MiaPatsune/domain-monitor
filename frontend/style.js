export const HTML_CSS = `
:root {
  --primary: #1a73e8;
  --primary-light: #e8f0fe;
  --primary-hover: #1557b0;
  --primary-bg: rgba(26,115,232,0.12);
  --danger: #ea4335;
  --danger-hover: #d33426;
  --success: #34a853;
  --text: #2c3e50;
  --text-secondary: #5f6368;
  --text-light: #80868b;
  --border: rgba(255,255,255,0.5);
  --glass-bg: rgba(255,255,255,0.45);
  --glass-border: rgba(255,255,255,0.6);
  --glass-shadow: 0 8px 32px rgba(31,38,135,0.12);
  --body-bg: #e9eef5;
  --header-gradient: linear-gradient(135deg, rgba(26,115,232,0.85) 0%, rgba(66,133,244,0.85) 100%);
}

* { font-family: "PingFang SC","Microsoft YaHei",sans-serif; margin: 0; padding: 0; box-sizing: border-box; }

body {
  min-height: 100vh;
}

/* ===== Header (毛玻璃) ===== */
.header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 22px 32px; max-width: 1200px; margin: 20px auto 0;
  background: var(--header-gradient);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 18px;
  color: #fff; box-shadow: 0 8px 32px rgba(26,115,232,0.25);
}
.header h1 { color: #fff; font-size: 1.5rem; display: flex; align-items: center; gap: 10px; font-weight: 600; }
.action-buttons { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.action-btn {
  padding: 9px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.3);
  cursor: pointer; font-size: 0.85rem; font-weight: 500;
  transition: all 0.2s; backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #fff;
}
.add-btn, .login-btn { background: rgba(255,255,255,0.25); }
.add-btn:hover, .login-btn:hover { background: rgba(255,255,255,0.4); border-color: rgba(255,255,255,0.5); }
.logout-btn, .del-btn { background: rgba(255,255,255,0.2); }
.logout-btn:hover, .del-btn:hover { background: rgba(234,67,53,0.4); border-color: rgba(234,67,53,0.6); }
.select-btn { background: rgba(255,255,255,0.2); }
.select-btn:hover { background: rgba(255,255,255,0.35); }
.export-btn, .import-btn { background: rgba(255,255,255,0.2); }
.export-btn:hover, .import-btn:hover { background: rgba(255,255,255,0.35); }

/* ===== Summary Cards (毛玻璃) ===== */
.summary-container { display: flex; justify-content: space-around; max-width: 1200px; margin: 0 auto; padding: 20px 0; gap: 16px; }
.summary-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 22px 24px; text-align: center; flex: 1;
  box-shadow: var(--glass-shadow); cursor: pointer;
  transition: all 0.25s ease;
  position: relative; overflow: hidden;
}
.summary-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
}
.summary-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(31,38,135,0.18); border-color: var(--primary); }
.summary-card.active {
  background: rgba(26,115,232,0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  color: #fff; border-color: rgba(255,255,255,0.4);
  box-shadow: 0 8px 32px rgba(26,115,232,0.4);
}
.summary-card h3 { margin: 0 0 6px; font-size: 0.9rem; font-weight: 500; color: var(--text-secondary); }
.summary-card.active h3 { color: rgba(255,255,255,0.9); }
.summary-card p { margin: 0; font-size: 2rem; font-weight: 700; color: var(--primary); }
.summary-card.active p { color: #fff; }

/* ===== Controls (毛玻璃) ===== */
.controls-container {
  display: flex; justify-content: space-between; align-items: center; padding: 14px 20px;
  border-radius: 16px; max-width: 1160px; margin: 0 auto 20px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  position: relative; overflow: hidden;
}
.controls-container::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
}
.tabs-container { display: flex; flex-wrap: wrap; gap: 6px; }
.tab-btn {
  padding: 7px 16px; border: 1px solid rgba(255,255,255,0.6);
  border-radius: 20px; cursor: pointer; font-size: 0.85rem;
  transition: all 0.2s; background: rgba(255,255,255,0.4);
  color: var(--text-secondary);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.tab-btn:hover { border-color: var(--primary); color: var(--primary); background: rgba(255,255,255,0.6); }
.tab-btn.active {
  background: rgba(26,115,232,0.85); color: #fff; border-color: rgba(26,115,232,0.5);
  box-shadow: 0 4px 12px rgba(26,115,232,0.25);
}
.search-container {
  display: flex; align-items: center; border: 1px solid var(--glass-border);
  border-radius: 10px; padding: 6px 12px;
  background: rgba(255,255,255,0.4);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s;
}
.search-container:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(26,115,232,0.1); }
#searchBox { border: none; outline: none; padding: 4px; font-size: 0.9rem; background: transparent; color: var(--text); width: 200px; }

/* ===== Domain Grid ===== */
.domain-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); max-width: 1200px; margin: 0 auto; gap: 18px; padding: 0 0 24px; }
.domain-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 16px; padding: 20px;
  box-shadow: var(--glass-shadow);
  transition: all 0.25s ease; display: flex; flex-direction: column; position: relative;
  overflow: hidden;
}
.domain-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent);
}
.domain-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(31,38,135,0.18); border-color: var(--primary); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.5); }
.card-domain { font-size: 1.05rem; font-weight: 600; color: var(--primary); cursor: pointer; word-break: break-all; }
.card-domain:hover { color: var(--primary-hover); text-decoration: underline; }
.card-domain-masked { font-size: 1.05rem; font-weight: 600; color: var(--text-secondary); word-break: break-all; }
.card-status { padding: 3px 10px; margin-left: 8px; border-radius: 20px; color: #fff; font-size: 0.7rem; font-weight: 500; background: var(--status-color); white-space: nowrap; backdrop-filter: blur(10px); }

.group-tag {
  display: inline-block; padding: 2px 10px; margin: 1px 2px; border-radius: 20px;
  color: var(--primary); font-size: 0.7rem;
  background: rgba(26,115,232,0.15);
  border: 1px solid rgba(26,115,232,0.2);
  white-space: nowrap;
  backdrop-filter: blur(8px);
}
.group-tag.tag-ungrouped { background: rgba(150,150,150,0.2); color: var(--text-light); border-color: rgba(150,150,150,0.3); }
.group-tags-container { display: inline-flex; flex-wrap: wrap; gap: 3px; }

.card-info p { margin: 5px 0; font-size: 0.82rem; color: var(--text-secondary); }
.card-info p strong { color: var(--text); font-weight: 500; }
.card-info a { color: var(--primary); text-decoration: none; }
.card-info a:hover { text-decoration: underline; }
.card-footer { margin-top: auto; padding-top: 10px; }

.progress-bar-container {
  background: rgba(255,255,255,0.4);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  border-radius: 6px; overflow: hidden; height: 8px; position: relative;
  border: 1px solid rgba(255,255,255,0.5);
}
.progress-bar { height: 100%; background: var(--status-color); transition: width 0.5s ease; border-radius: 6px; }
.progress-text { font-size: 0.78rem; text-align: center; margin-top: 6px; color: var(--text-light); font-weight: 500; }

.card-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.5); }
.card-action-icons { display: flex; gap: 6px; }
.card-action-icon {
  cursor: pointer; font-size: 0.95rem; padding: 6px 8px; border-radius: 8px;
  transition: all 0.15s; color: var(--text-light);
}
.card-action-icon:hover { background: rgba(255,255,255,0.5); color: var(--primary); backdrop-filter: blur(8px); }
.card-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary); flex-shrink: 0; }
.edit-icon:hover { color: var(--primary); }
.renew-icon:hover { color: var(--success); }
.delete-icon:hover { color: var(--danger); }
.copy-icon:hover { color: #7c4dff; }

/* ===== Pagination (毛玻璃) ===== */
.pagination { display: flex; justify-content: center; align-items: center; max-width: 1200px; margin: 0 auto; padding: 20px 0; }
.page-btn {
  background: var(--glass-bg);
  backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
  border: 1px solid var(--glass-border); color: var(--text-secondary);
  padding: 8px 14px; margin: 0 3px; cursor: pointer; border-radius: 10px;
  font-size: 0.9rem; transition: all 0.15s;
}
.page-btn:hover { border-color: var(--primary); color: var(--primary); background: rgba(255,255,255,0.6); }
.page-btn.active {
  background: rgba(26,115,232,0.85); color: #fff; border-color: rgba(26,115,232,0.5);
  box-shadow: 0 4px 12px rgba(26,115,232,0.25);
}
.page-dots { padding: 8px 4px; color: var(--text-light); }

/* ===== Modal (毛玻璃) ===== */
.modal {
  position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%;
  overflow: auto;
  background: rgba(15,23,42,0.4);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  display: none;
}
.modal-content {
  background: rgba(255,255,255,0.75);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 18px; margin: 4% auto; padding: 28px;
  width: 90%; max-width: 520px; position: relative;
  box-shadow: 0 16px 48px rgba(0,0,0,0.2);
  overflow: hidden;
}
.modal-content::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent);
}
.close-btn { color: var(--text-light); float: right; font-size: 24px; cursor: pointer; line-height: 1; }
.close-btn:hover { color: var(--text); }
.modal-content h2 { margin-bottom: 18px; color: var(--text); font-size: 1.25rem; font-weight: 600; }
.modal-content label { display: block; margin-top: 10px; font-weight: 500; font-size: 0.85rem; color: var(--text-secondary); }
.modal-content input[type="text"],
.modal-content input[type="date"],
.modal-content input[type="url"],
.modal-content select,
.renewal-group input {
  width: 100%; padding: 10px 12px; margin: 4px 0 12px;
  border: 1px solid rgba(255,255,255,0.6); border-radius: 10px; font-size: 0.9rem;
  box-sizing: border-box; transition: border-color 0.2s; color: var(--text);
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.modal-content input:focus, .modal-content select:focus {
  border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px rgba(26,115,232,0.1);
  background: rgba(255,255,255,0.7);
}
.renewal-group { display: flex; gap: 10px; }
.renewal-group input[type="number"] { flex: 1; }
.renewal-group select { width: 100px; flex-shrink: 0; }
.form-warning { font-size: 0.82rem; color: #f9ab00; margin-bottom: 8px; min-height: 20px; }
.modal-content button[type="submit"] {
  background: linear-gradient(135deg, rgba(26,115,232,0.9), rgba(66,133,244,0.9));
  color: #fff; padding: 12px 20px; border: 1px solid rgba(255,255,255,0.3);
  border-radius: 10px; cursor: pointer; width: 100%; font-size: 0.95rem;
  font-weight: 500; margin-top: 8px; transition: all 0.2s;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(26,115,232,0.25);
}
.modal-content button[type="submit"]:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(26,115,232,0.35); }

/* Autocomplete */
.autocomplete-field { position: relative; }
.autocomplete-field input { width: 100%; padding-right: 30px !important; }
.autocomplete-arrow, .groups-arrow { position: absolute; right: 12px; top: 38%; pointer-events: none; color: var(--text-light); font-size: 0.7rem; }
.autocomplete-dropdown {
  display: none; position: absolute; top: 100%; left: 0; right: 0;
  max-height: 160px; overflow-y: auto;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border); border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.12); z-index: 10;
}
.autocomplete-dropdown-item { padding: 8px 14px; cursor: pointer; font-size: 0.85rem; color: var(--text); }
.autocomplete-dropdown-item:hover { background: var(--primary-light); color: var(--primary); }

/* Groups */
.groups-field { margin-bottom: 10px; }
.groups-tag-list { display: none; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.groups-tag-list.has-tags { display: flex; margin-bottom: 6px; }
.groups-tag-list .group-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; font-size: 0.75rem; border-radius: 20px; }
.group-tag-remove { cursor: pointer; opacity: 0.6; font-size: 0.9rem; }
.group-tag-remove:hover { opacity: 1; }
.groups-input-wrap { position: relative; }

/* Toast (毛玻璃) */
.toast-overlay {
  display: none; position: fixed; z-index: 2000; left: 0; top: 0; width: 100%; height: 100%;
  background: rgba(15,23,42,0.3);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  justify-content: center; align-items: center;
}
.toast-card {
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.6);
  border-radius: 18px; padding: 32px 36px 24px;
  max-width: 400px; width: 85%; text-align: center;
  box-shadow: 0 16px 48px rgba(0,0,0,0.18);
  animation: toastIn 0.25s ease; position: relative; overflow: hidden;
}
.toast-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent);
}
@keyframes toastIn { from { opacity: 0; transform: scale(0.92) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
.toast-icon { font-size: 2.8rem; margin-bottom: 14px; }
.toast-message { font-size: 1rem; color: var(--text); margin-bottom: 22px; line-height: 1.6; }
.toast-actions { display: flex; gap: 12px; justify-content: center; }
.toast-btn { padding: 10px 32px; border: none; border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.15s; }
.toast-btn-primary { background: linear-gradient(135deg, rgba(26,115,232,0.9), rgba(66,133,244,0.9)); color: #fff; box-shadow: 0 4px 12px rgba(26,115,232,0.25); }
.toast-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(26,115,232,0.35); }
.toast-btn-cancel { background: rgba(241,243,244,0.8); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.5); backdrop-filter: blur(10px); }
.toast-btn-cancel:hover { background: rgba(232,234,237,0.9); }

.renew-line { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px; font-size: 1rem; color: var(--text); }
.renew-line input[type="number"] { width: 160px; padding: 8px 12px; border: 1px solid rgba(255,255,255,0.6); border-radius: 8px; text-align: center; background: rgba(255,255,255,0.5); backdrop-filter: blur(8px); }
.renew-line select { width: 80px; padding: 8px 12px; border: 1px solid rgba(255,255,255,0.6); border-radius: 8px; background: rgba(255,255,255,0.5); backdrop-filter: blur(8px); }

/* Footer */
.footer { text-align: center; padding: 12px 0 24px; color: var(--text-light); font-size: 0.8rem; }
.footer p { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; }
.footer a { color: var(--primary); text-decoration: none; }
.footer a:hover { text-decoration: underline; }

/* ===== Mobile ===== */
@media (max-width: 768px) {
  .header { flex-direction: column; padding: 20px; margin: 10px 10px 0; border-radius: 16px; }
  .header h1 { font-size: 1.3rem; margin-bottom: 12px; }
  .action-buttons { width: 100%; justify-content: center; }
  .action-btn { flex: 1; text-align: center; font-size: 0.78rem; padding: 8px 10px; }
  .summary-container { flex-direction: column; padding: 12px 10px; }
  .summary-card { padding: 16px 18px; }
  .summary-card p { font-size: 1.5rem; }
  .controls-container { flex-direction: column; padding: 12px; margin: 0 10px 12px; }
  #searchBox { width: 100%; }
  .search-container { width: 100%; margin-top: 10px; }
  .domain-grid { grid-template-columns: 1fr; padding: 0 10px 20px; gap: 12px; }
  .modal-content { width: 95%; margin: 8% auto; padding: 20px; }
}
`;
