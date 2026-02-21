let marker;
let bookmarkElement = null;
let updateScheduled = false;

let findButton;
let overlay;
let overlayStatus;
let searchCancelled = false;
let isSearching = false;

const DEFAULTS = {
  markerColor: '#ffc107',
  markerText: '🔖 Last read here',
  maxScan: 1000,
  showFindButton: true,
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

function showOverlay(text) {
  overlayStatus.textContent = text;
  overlay.style.display = 'flex';
  overlay.style.animation = 'overlayFadeIn 0.2s ease';
  overlay.style.opacity = '1';
  findButton.style.display = 'none';
}

function hideOverlay() {
  return new Promise(resolve => {
    overlay.style.animation = 'overlayFadeOut 0.3s ease forwards';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.animation = '';
      findButton.style.display = '';
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

async function searchForBookmark() {
  if (isSearching) return;
  isSearching = true;
  searchCancelled = false;

  const originalScrollY = window.scrollY;

  showOverlay('🔖 Searching for bookmark...');

  // すでにDOMにある場合
  if (findBookmarkElement()) {
    await jumpToBookmark();
    isSearching = false;
    return;
  }

  // スクロールしながら探す
  let scanned = document.querySelectorAll('[data-cell-id]').length;

  while (scanned < settings.maxScan) {
    if (searchCancelled) break;

    window.scrollTo(0, document.body.scrollHeight);
    await waitForNewContent();

    if (findBookmarkElement()) {
      await jumpToBookmark();
      isSearching = false;
      return;
    }

    scanned = document.querySelectorAll('[data-cell-id]').length;
    overlayStatus.textContent = `🔖 Searching for bookmark... (${scanned} posts scanned)`;
  }

  // 見つからなかった or キャンセル
  const msg = searchCancelled ? 'Cancelled.' : `Bookmark not found (scanned ${scanned} posts).`;
  overlayStatus.textContent = msg;
  await new Promise(r => setTimeout(r, 1500));
  await hideOverlay();
  window.scrollTo({ top: originalScrollY, behavior: 'instant' });
  isSearching = false;
}

async function jumpToBookmark() {
  overlayStatus.textContent = '🔖 Found! Jumping...';
  await new Promise(r => setTimeout(r, 500));
  await hideOverlay();
  bookmarkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  // 設定を読み込んでから UI を初期化
  browser.storage.local.get(DEFAULTS).then(result => {
    settings = result;
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
    for (const key of ['markerColor', 'markerText', 'maxScan', 'showFindButton']) {
      if (changes[key]) updated[key] = changes[key].newValue;
    }
    if (Object.keys(updated).length > 0) applySettings(updated);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
