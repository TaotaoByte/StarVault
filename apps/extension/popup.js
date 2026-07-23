const titleInput = document.getElementById('title');
const urlInput = document.getElementById('url');
const notesInput = document.getElementById('notes');
const baseUrlInput = document.getElementById('baseUrl');
const saveBtn = document.getElementById('saveBtn');
const listBtn = document.getElementById('listBtn');
const messageEl = document.getElementById('message');
const countEl = document.getElementById('count');

const STORAGE_KEY = 'starvault_collected';
const BASE_URL_KEY = 'starvault_base_url';

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    titleInput.value = tab.title || '';
    urlInput.value = tab.url || '';
  }

  const savedBase = await chrome.storage.local.get(BASE_URL_KEY);
  if (savedBase[BASE_URL_KEY]) {
    baseUrlInput.value = savedBase[BASE_URL_KEY];
  }

  await updateCount();
}

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = 'message' + (isError ? ' error' : '');
}

async function getCollected() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
}

async function saveCollected(items) {
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
}

async function updateCount() {
  const items = await getCollected();
  countEl.textContent = `已暂存 ${items.length} 个收藏`;
}

saveBtn.addEventListener('click', async () => {
  const title = titleInput.value.trim();
  const url = urlInput.value.trim();
  const notes = notesInput.value.trim();
  const baseUrl = baseUrlInput.value.trim() || 'http://localhost:5173';

  if (!title || !url) {
    setMessage('请填写标题和 URL', true);
    return;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    setMessage('URL 格式不正确', true);
    return;
  }

  await chrome.storage.local.set({ [BASE_URL_KEY]: baseUrl });

  // 保存到扩展本地暂存
  const items = await getCollected();
  const existing = items.find(i => i.url === url);
  if (existing) {
    existing.title = title;
    existing.notes = notes;
    existing.updatedAt = new Date().toISOString();
  } else {
    items.unshift({
      id: crypto.randomUUID(),
      title,
      url,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  await saveCollected(items);
  await updateCount();

  // 打开 StarVault Web 并自动添加
  const target = `${baseUrl.replace(/\/$/, '')}/?addUrl=${encodeURIComponent(url)}&addTitle=${encodeURIComponent(title)}&addNotes=${encodeURIComponent(notes)}`;
  await chrome.tabs.create({ url: target });
  setMessage('已打开 StarVault');
});

listBtn.addEventListener('click', async () => {
  const baseUrl = baseUrlInput.value.trim() || 'http://localhost:5173';
  await chrome.storage.local.set({ [BASE_URL_KEY]: baseUrl });
  const target = `${baseUrl.replace(/\/$/, '')}/?collected=1`;
  await chrome.tabs.create({ url: target });
});

init();
