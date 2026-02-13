let marker;
let bookmarkElement = null;
let updateScheduled = false;

function ensureMarker() {
  if (marker) return;

  marker = document.createElement('div');
  marker.id = 'tumblr-bookmark-marker';
  marker.textContent = '🔖 Last read here';

  marker.style.cssText = `
    position: absolute;
    background: #ffc107;
    color: #333;
    padding: 6px 10px;
    font-size: 13px;
    border-radius: 0 4px 4px 0;
    white-space: nowrap;
    pointer-events: none;
    z-index: 9999;
    display: none;
    animation: glow 2s ease-in-out infinite;
    box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
  `;

  // グローアニメーション用のスタイルを追加
  const style = document.createElement('style');
  style.textContent = `
    @keyframes glow {
      0%, 100% {
        box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
      }
      50% {
        box-shadow: 0 0 20px rgba(255, 193, 7, 0.9), 0 0 30px rgba(255, 193, 7, 0.6);
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(marker);
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
  ensureMarker();

  // 初回表示のために少し遅延
  setTimeout(updateMarker, 500);

  window.addEventListener('scroll', scheduleUpdate);

  // DOM変更を監視して bookmarkElement が追加されたら更新
  const observer = new MutationObserver(() => {
    scheduleUpdate();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
