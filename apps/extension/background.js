chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'starvault-collect-page',
    title: '收藏页面到 StarVault',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'starvault-collect-link',
    title: '收藏链接到 StarVault',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const baseUrl = await getBaseUrl();
  let url = tab?.url || '';
  let title = tab?.title || '';

  if (info.menuItemId === 'starvault-collect-link' && info.linkUrl) {
    url = info.linkUrl;
    title = info.linkUrl;
  }

  if (!url) return;

  const target = `${baseUrl}/?addUrl=${encodeURIComponent(url)}&addTitle=${encodeURIComponent(title)}`;
  await chrome.tabs.create({ url: target });
});

async function getBaseUrl() {
  const result = await chrome.storage.local.get('starvault_base_url');
  return (result['starvault_base_url'] || 'http://localhost:5173').replace(/\/$/, '');
}
