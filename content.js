let marker;
let bookmarkElement = null;
let updateScheduled = false;

let findButton;
let historyButton;
let historyMenu;
let overlay;
let overlayStatus;
let searchCancelled = false;
let isSearching = false;

let bookmarkHistory = [];
let snapshotTaken = false;

const DEFAULTS = {
  markerColor: '#ffc107',
  markerText: '🔖 Last read here',
  maxScan: 1000,
  showFindButton: true,
  historyEnabled: true,
  maxHistory: 3,
};
let settings = { ...DEFAULTS };

function getLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getTextColor(bgHex) {
  return getLuminance(bgHex) > 0.35 ? '#333333' : '#ffffff';
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applySettings(changed) {
  if (changed.markerColor !== undefined) {
    settings.markerColor = changed.markerColor;
    const bgColor = changed.markerColor;
    const textColor = getTextColor(bgColor);
    const glow1 = hexToRgba(bgColor, 0.5);
    const glow2 = hexToRgba(bgColor, 0.9);
    if (marker) {
      marker.style.background = bgColor;
      marker.style.color = textColor;
    }
    if (findButton) {
      findButton.style.background = bgColor;
      findButton.style.color = textColor;
    }
    if (historyButton) {
      historyButton.style.background = bgColor;
      historyButton.style.color = textColor;
    }
    const glowStyle = document.getElementById('tumblr-bookmark-glow-style');
    if (glowStyle) glowStyle.textContent = buildGlowKeyframes(glow1, glow2);
  }

  if (changed.markerText !== undefined) {
    settings.markerText = changed.markerText;
    if (marker) marker.textContent = changed.markerText;
  }

  if (changed.maxScan !== undefined) {
    settings.maxScan = changed.maxScan;
  }

  if (changed.showFindButton !== undefined) {
    settings.showFindButton = changed.showFindButton;
    if (findButton) findButton.style.display = changed.showFindButton ? '' : 'none';
  }

  if (changed.historyEnabled !== undefined) {
    settings.historyEnabled = changed.historyEnabled;
    if (historyButton) historyButton.style.display = changed.historyEnabled ? '' : 'none';
    if (!changed.historyEnabled && historyMenu) historyMenu.style.display = 'none';
  }

  if (changed.maxHistory !== undefined) {
    settings.maxHistory = changed.maxHistory;
  }
}

function buildGlowKeyframes(glow1, glow2) {
  return `
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 10px ${glow1}; }
      50% { box-shadow: 0 0 20px ${glow2}, 0 0 30px ${glow1}; }
    }
    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes overlayFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
}

function ensureMarker() {
  if (marker) return;

  marker = document.createElement('div');
  marker.id = 'tumblr-bookmark-marker';
  marker.textContent = settings.markerText;

  marker.style.cssText = `
    position: absolute;
    background: ${settings.markerColor};
    color: ${getTextColor(settings.markerColor)};
    padding: 6px 10px;
    font-size: 13px;
    border-radius: 0 4px 4px 0;
    white-space: nowrap;
    pointer-events: none;
    z-index: 9999;
    display: none;
    animation: glow 2s ease-in-out infinite;
  `;

  const style = document.createElement('style');
  style.id = 'tumblr-bookmark-glow-style';
  style.textContent = buildGlowKeyframes(
    hexToRgba(settings.markerColor, 0.5),
    hexToRgba(settings.markerColor, 0.9)
  );
  document.head.appendChild(style);

  document.body.appendChild(marker);
}

function ensureUI() {
  if (findButton) return;

  // Find Bookmark ボタン
  findButton = document.createElement('button');
  findButton.id = 'tumblr-find-bookmark-btn';
  findButton.textContent = '🔖 Find Bookmark';
  findButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${settings.markerColor};
    color: ${getTextColor(settings.markerColor)};
    border: none;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: bold;
    border-radius: 4px;
    cursor: pointer;
    z-index: 10000;
    animation: glow 2s ease-in-out infinite;
    font-family: sans-serif;
    display: ${settings.showFindButton ? '' : 'none'};
  `;
  findButton.addEventListener('click', searchForBookmark);
  document.body.appendChild(findButton);

  // 前回のしおりボタン
  historyButton = document.createElement('button');
  historyButton.id = 'tumblr-history-btn';
  historyButton.textContent = '⏮ Previous Bookmark';
  historyButton.style.cssText = `
    position: fixed;
    bottom: 62px;
    right: 20px;
    background: ${settings.markerColor};
    color: ${getTextColor(settings.markerColor)};
    border: none;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: bold;
    border-radius: 4px;
    cursor: pointer;
    z-index: 10000;
    font-family: sans-serif;
    display: ${settings.historyEnabled ? '' : 'none'};
  `;
  historyButton.addEventListener('click', toggleHistoryMenu);
  document.body.appendChild(historyButton);

  // 履歴メニュー
  historyMenu = document.createElement('div');
  historyMenu.id = 'tumblr-history-menu';
  historyMenu.style.cssText = `
    position: fixed;
    bottom: 104px;
    right: 20px;
    background: #fff;
    color: #222;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    padding: 6px;
    z-index: 10000;
    font-family: sans-serif;
    font-size: 13px;
    min-width: 180px;
    display: none;
  `;
  document.body.appendChild(historyMenu);

  const menuStyle = document.createElement('style');
  menuStyle.id = 'tumblr-history-menu-style';
  menuStyle.textContent = `
    #tumblr-history-menu .item {
      padding: 8px 10px;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
    }
    #tumblr-history-menu .item:hover {
      background: #f0f0f0;
    }
    #tumblr-history-menu .item.empty {
      color: #999;
      cursor: default;
    }
    #tumblr-history-menu .item.empty:hover {
      background: transparent;
    }
    #tumblr-history-menu .item .time {
      color: #999;
      font-size: 11px;
      margin-left: 6px;
    }
  `;
  document.head.appendChild(menuStyle);

  // メニュー外クリックで閉じる
  document.addEventListener('click', (e) => {
    if (historyMenu.style.display === 'none') return;
    if (e.target === historyButton || historyMenu.contains(e.target)) return;
    historyMenu.style.display = 'none';
  });

  // オーバーレイ
  overlay = document.createElement('div');
  overlay.id = 'tumblr-bookmark-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.75);
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    pointer-events: all;
    font-family: sans-serif;
  `;

  overlayStatus = document.createElement('p');
  overlayStatus.style.cssText = `
    color: #fff;
    font-size: 18px;
    margin: 0 0 24px 0;
    text-align: center;
  `;

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    background: transparent;
    color: #aaa;
    border: 1px solid #aaa;
    padding: 6px 16px;
    font-size: 13px;
    border-radius: 4px;
    cursor: pointer;
  `;
  cancelBtn.addEventListener('click', () => {
    searchCancelled = true;
  });

  overlay.appendChild(overlayStatus);
  overlay.appendChild(cancelBtn);
  document.body.appendChild(overlay);
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function historyLabel(i) {
  if (i === 1) return 'Previous';
  return `${ordinal(i)} previous`;
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function buildHistoryMenu() {
  historyMenu.replaceChildren();

  // index 0 はライブのしおり相当なので 1 以降をジャンプ候補にする
  const entries = bookmarkHistory.slice(1);

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'item empty';
    empty.textContent = 'No history yet';
    historyMenu.appendChild(empty);
    return;
  }

  entries.forEach((entry, idx) => {
    const i = idx + 1;
    const item = document.createElement('div');
    item.className = 'item';

    item.appendChild(document.createTextNode(historyLabel(i)));

    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = relativeTime(entry.ts);
    item.appendChild(time);

    item.addEventListener('click', () => {
      historyMenu.style.display = 'none';
      searchForPostId(entry.postId, historyLabel(i));
    });
    historyMenu.appendChild(item);
  });
}

function toggleHistoryMenu() {
  if (historyMenu.style.display === 'none') {
    buildHistoryMenu();
    historyMenu.style.display = 'block';
  } else {
    historyMenu.style.display = 'none';
  }
}

function showOverlay(text) {
  overlayStatus.textContent = text;
  overlay.style.display = 'flex';
  overlay.style.animation = 'overlayFadeIn 0.2s ease';
  overlay.style.opacity = '1';
  findButton.style.display = 'none';
  historyButton.style.display = 'none';
  historyMenu.style.display = 'none';
}

function hideOverlay() {
  return new Promise(resolve => {
    overlay.style.animation = 'overlayFadeOut 0.3s ease forwards';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.animation = '';
      findButton.style.display = settings.showFindButton ? '' : 'none';
      historyButton.style.display = settings.historyEnabled ? '' : 'none';
      resolve();
    }, 300);
  });
}

function waitForNewContent() {
  return new Promise(resolve => {
    const beforeHeight = document.body.scrollHeight;
    const observer = new MutationObserver(() => {
      if (document.body.scrollHeight > beforeHeight) {
        observer.disconnect();
        resolve('loaded');
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve('timeout');
    }, 3000);
  });
}

// finder() は対象要素を返す（なければ null）。下方向スクロールしながら探してジャンプする汎用ロジック。
async function searchAndJump(finder, searchingLabel) {
  if (isSearching) return;
  isSearching = true;
  searchCancelled = false;

  const originalScrollY = window.scrollY;

  showOverlay(`🔖 Searching for ${searchingLabel}...`);

  // すでにDOMにある場合
  let target = finder();
  if (target) {
    await jumpToElement(target);
    isSearching = false;
    return;
  }

  // スクロールしながら探す
  let scanned = document.querySelectorAll('[data-cell-id]').length;

  while (scanned < settings.maxScan) {
    if (searchCancelled) break;

    window.scrollTo(0, document.body.scrollHeight);
    await waitForNewContent();

    target = finder();
    if (target) {
      await jumpToElement(target);
      isSearching = false;
      return;
    }

    scanned = document.querySelectorAll('[data-cell-id]').length;
    overlayStatus.textContent = `🔖 Searching for ${searchingLabel}... (${scanned} posts scanned)`;
  }

  // 見つからなかった or キャンセル
  const msg = searchCancelled ? 'Cancelled.' : `Not found (scanned ${scanned} posts).`;
  overlayStatus.textContent = msg;
  await new Promise(r => setTimeout(r, 1500));
  await hideOverlay();
  window.scrollTo({ top: originalScrollY, behavior: 'instant' });
  isSearching = false;
}

function searchForBookmark() {
  return searchAndJump(
    () => (findBookmarkElement() ? bookmarkElement : null),
    'bookmark'
  );
}

function searchForPostId(postId, label) {
  return searchAndJump(() => findPostById(postId), label);
}

async function jumpToElement(el) {
  overlayStatus.textContent = '🔖 Found! Jumping...';
  await new Promise(r => setTimeout(r, 500));
  await hideOverlay();
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function findBookmarkElement() {
  // data-cell-id に "timelineObject:title" が含まれる要素を検索
  const elements = document.querySelectorAll('[data-cell-id*="timelineObject:title"]');

  // 本物のしおりを判別:
  // - 偽物（コミュニティ推薦等）: 末尾が32文字の16進数ハッシュ (例: -1c46927f87ceb210548cf9b2ca34c9d7)
  // - 本物: 末尾がタイムスタンプ風ID (例: 696d8d99e00c56.72489508)
  const hashPattern = /-[a-f0-9]{32}$/;

  for (const el of elements) {
    const cellId = el.getAttribute('data-cell-id');
    if (cellId && !hashPattern.test(cellId)) {
      bookmarkElement = el;
      return true;
    }
  }

  return false;
}

// data-cell-id から永続ポストIDを取り出す (例: ...-post-819535168916340736-... → "819535168916340736")
function getPostId(cellId) {
  const m = cellId && cellId.match(/-post-(\d+)-/);
  return m ? m[1] : null;
}

// 指定 postId を含むセルを返す（なければ null）
function findPostById(postId) {
  const needle = `-post-${postId}-`;
  for (const el of document.querySelectorAll('[data-cell-id]')) {
    const id = el.getAttribute('data-cell-id');
    if (id && id.includes(needle)) return el;
  }
  return null;
}

// しおり直下（document順で後ろ）にある最初の通常ポストの postId を取得
function getAdjacentPostId() {
  if (!bookmarkElement) return null;
  const cells = [...document.querySelectorAll('[data-cell-id]')];
  const i = cells.indexOf(bookmarkElement);
  if (i === -1) return null;
  for (let j = i + 1; j < cells.length; j++) {
    const id = getPostId(cells[j].getAttribute('data-cell-id'));
    if (id) return id;
  }
  return null;
}

// ページ読込につき1回、現在のしおり位置を履歴に記録する
function takeSnapshot() {
  if (snapshotTaken || !settings.historyEnabled) return;
  const postId = getAdjacentPostId();
  if (!postId) return;

  snapshotTaken = true;

  // 直近と同じ位置なら記録しない（読まずに再オープンを除外）
  if (bookmarkHistory[0] && bookmarkHistory[0].postId === postId) return;

  bookmarkHistory.unshift({ postId, ts: Date.now() });
  bookmarkHistory = bookmarkHistory.slice(0, settings.maxHistory);
  browser.storage.local.set({ bookmarkHistory });
}

function updateMarker() {
  if (!marker) return;

  // bookmarkElement が見つかっていなければ検索
  if (!bookmarkElement) {
    if (!findBookmarkElement()) {
      marker.style.display = 'none';
      return;
    }
  }

  // bookmarkElement が DOM から削除されていないか確認
  if (!document.body.contains(bookmarkElement)) {
    bookmarkElement = null;
    if (!findBookmarkElement()) {
      marker.style.display = 'none';
      return;
    }
  }

  // しおりが確定したので（読込につき1回）履歴を記録
  takeSnapshot();

  const rect = bookmarkElement.getBoundingClientRect();
  const absoluteTop = window.scrollY + rect.top;

  // 現在の表示範囲(ビューポート)
  const viewportTop = window.scrollY;
  const viewportBottom = window.scrollY + window.innerHeight;

  // マーカーの絶対位置がビューポート内にあるかチェック
  const margin = 50;
  if (absoluteTop < viewportTop - margin || absoluteTop > viewportBottom + margin) {
    marker.style.display = 'none';
    return;
  }

  const feed = document.querySelector('main');
  if (!feed) {
    marker.style.display = 'none';
    return;
  }

  const feedRect = feed.getBoundingClientRect();

  // position: absolute なので、ページ全体での絶対位置を指定
  marker.style.left = `${feedRect.left - 6}px`;
  marker.style.top = `${absoluteTop}px`;
  marker.style.display = 'block';
}

function scheduleUpdate() {
  if (updateScheduled) return;
  updateScheduled = true;
  requestAnimationFrame(() => {
    updateScheduled = false;
    updateMarker();
  });
}

function init() {
  // 設定と履歴を読み込んでから UI を初期化
  browser.storage.local.get({ ...DEFAULTS, bookmarkHistory: [] }).then(result => {
    const { bookmarkHistory: hist, ...loaded } = result;
    settings = loaded;
    bookmarkHistory = hist || [];
    ensureMarker();
    ensureUI();

    // 初回表示のために少し遅延
    setTimeout(updateMarker, 500);
  });

  window.addEventListener('scroll', scheduleUpdate);

  // DOM変更を監視して bookmarkElement が追加されたら更新
  const observer = new MutationObserver(() => {
    scheduleUpdate();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 設定変更をリアルタイムで反映
  browser.storage.onChanged.addListener((changes) => {
    const updated = {};
    for (const key of ['markerColor', 'markerText', 'maxScan', 'showFindButton', 'historyEnabled', 'maxHistory']) {
      if (changes[key]) updated[key] = changes[key].newValue;
    }
    if (Object.keys(updated).length > 0) applySettings(updated);

    // 別タブで履歴が更新されたら取り込む
    if (changes.bookmarkHistory) {
      bookmarkHistory = changes.bookmarkHistory.newValue || [];
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
