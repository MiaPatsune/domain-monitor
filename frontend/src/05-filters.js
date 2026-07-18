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
