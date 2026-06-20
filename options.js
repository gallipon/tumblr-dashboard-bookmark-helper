const DEFAULTS = {
  markerColor: '#ffc107',
  markerText: '🔖 Last read here',
  maxScan: 1000,
  showFindButton: true,
  historyEnabled: true,
  maxHistory: 3,
  showRemainingCount: true,
  showUnreadCount: true,
  celebrateCaughtUp: true,
  keyboardShortcuts: true,
};

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

function applyPreview(bgColor, text) {
  const textColor = getTextColor(bgColor);
  const glow1 = hexToRgba(bgColor, 0.5);
  const glow2 = hexToRgba(bgColor, 0.9);
  const marker = document.getElementById('preview-marker');
  marker.style.background = bgColor;
  marker.style.color = textColor;
  marker.style.boxShadow = `0 0 14px ${glow1}, 0 0 28px ${glow2}`;
  if (text !== undefined) marker.textContent = text || DEFAULTS.markerText;
}

const colorPicker = document.getElementById('color-picker');
const colorHex = document.getElementById('color-hex');
const markerTextInput = document.getElementById('marker-text');
const maxScanInput = document.getElementById('max-scan');
const maxScanValue = document.getElementById('max-scan-value');
const showFindButtonInput = document.getElementById('show-find-button');
const toggleLabel = document.getElementById('toggle-label');
const historyEnabledInput = document.getElementById('history-enabled');
const historyLabel = document.getElementById('history-label');
const maxHistoryInput = document.getElementById('max-history');
const maxHistoryValue = document.getElementById('max-history-value');
const showRemainingCountInput = document.getElementById('show-remaining-count');
const remainingLabel = document.getElementById('remaining-label');
const showUnreadCountInput = document.getElementById('show-unread-count');
const unreadLabel = document.getElementById('unread-label');
const celebrateCaughtUpInput = document.getElementById('celebrate-caught-up');
const celebrateLabel = document.getElementById('celebrate-label');
const keyboardShortcutsInput = document.getElementById('keyboard-shortcuts');
const shortcutsLabel = document.getElementById('shortcuts-label');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const status = document.getElementById('status');

// 保存済み設定を読み込む
browser.storage.local.get(DEFAULTS).then(result => {
  colorPicker.value = result.markerColor;
  colorHex.textContent = result.markerColor;
  markerTextInput.value = result.markerText;
  maxScanInput.value = result.maxScan;
  maxScanValue.textContent = result.maxScan;
  showFindButtonInput.checked = result.showFindButton;
  toggleLabel.textContent = result.showFindButton ? 'Visible' : 'Hidden';
  historyEnabledInput.checked = result.historyEnabled;
  historyLabel.textContent = result.historyEnabled ? 'Enabled' : 'Disabled';
  maxHistoryInput.value = result.maxHistory;
  maxHistoryValue.textContent = result.maxHistory;
  showRemainingCountInput.checked = result.showRemainingCount;
  remainingLabel.textContent = result.showRemainingCount ? 'Enabled' : 'Disabled';
  showUnreadCountInput.checked = result.showUnreadCount;
  unreadLabel.textContent = result.showUnreadCount ? 'Enabled' : 'Disabled';
  celebrateCaughtUpInput.checked = result.celebrateCaughtUp;
  celebrateLabel.textContent = result.celebrateCaughtUp ? 'Enabled' : 'Disabled';
  keyboardShortcutsInput.checked = result.keyboardShortcuts;
  shortcutsLabel.textContent = result.keyboardShortcuts ? 'Enabled' : 'Disabled';
  applyPreview(result.markerColor, result.markerText);
});

// カラーピッカー
colorPicker.addEventListener('input', () => {
  colorHex.textContent = colorPicker.value;
  applyPreview(colorPicker.value, markerTextInput.value);
});

// マーカーテキスト
markerTextInput.addEventListener('input', () => {
  applyPreview(colorPicker.value, markerTextInput.value);
});

// スキャン上限スライダー
maxScanInput.addEventListener('input', () => {
  maxScanValue.textContent = maxScanInput.value;
});

// Find Bookmark トグル
showFindButtonInput.addEventListener('change', () => {
  toggleLabel.textContent = showFindButtonInput.checked ? 'Visible' : 'Hidden';
});

// 履歴トグル
historyEnabledInput.addEventListener('change', () => {
  historyLabel.textContent = historyEnabledInput.checked ? 'Enabled' : 'Disabled';
});

// 履歴件数スライダー
maxHistoryInput.addEventListener('input', () => {
  maxHistoryValue.textContent = maxHistoryInput.value;
});

// 残りポスト数カウンター トグル
showRemainingCountInput.addEventListener('change', () => {
  remainingLabel.textContent = showRemainingCountInput.checked ? 'Enabled' : 'Disabled';
});

// 未読カウンター トグル
showUnreadCountInput.addEventListener('change', () => {
  unreadLabel.textContent = showUnreadCountInput.checked ? 'Enabled' : 'Disabled';
});

// 「全部読んだ」演出 トグル
celebrateCaughtUpInput.addEventListener('change', () => {
  celebrateLabel.textContent = celebrateCaughtUpInput.checked ? 'Enabled' : 'Disabled';
});

// キーボードショートカット トグル
keyboardShortcutsInput.addEventListener('change', () => {
  shortcutsLabel.textContent = keyboardShortcutsInput.checked ? 'Enabled' : 'Disabled';
});

// 保存
saveBtn.addEventListener('click', () => {
  browser.storage.local.set({
    markerColor: colorPicker.value,
    markerText: markerTextInput.value || DEFAULTS.markerText,
    maxScan: parseInt(maxScanInput.value, 10),
    showFindButton: showFindButtonInput.checked,
    historyEnabled: historyEnabledInput.checked,
    maxHistory: parseInt(maxHistoryInput.value, 10),
    showRemainingCount: showRemainingCountInput.checked,
    showUnreadCount: showUnreadCountInput.checked,
    celebrateCaughtUp: celebrateCaughtUpInput.checked,
    keyboardShortcuts: keyboardShortcutsInput.checked,
  }).then(() => {
    status.textContent = 'Saved!';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
});

// デフォルトに戻す
resetBtn.addEventListener('click', () => {
  colorPicker.value = DEFAULTS.markerColor;
  colorHex.textContent = DEFAULTS.markerColor;
  markerTextInput.value = DEFAULTS.markerText;
  maxScanInput.value = DEFAULTS.maxScan;
  maxScanValue.textContent = DEFAULTS.maxScan;
  showFindButtonInput.checked = DEFAULTS.showFindButton;
  toggleLabel.textContent = 'Visible';
  historyEnabledInput.checked = DEFAULTS.historyEnabled;
  historyLabel.textContent = 'Enabled';
  maxHistoryInput.value = DEFAULTS.maxHistory;
  maxHistoryValue.textContent = DEFAULTS.maxHistory;
  showRemainingCountInput.checked = DEFAULTS.showRemainingCount;
  remainingLabel.textContent = 'Enabled';
  showUnreadCountInput.checked = DEFAULTS.showUnreadCount;
  unreadLabel.textContent = 'Enabled';
  celebrateCaughtUpInput.checked = DEFAULTS.celebrateCaughtUp;
  celebrateLabel.textContent = 'Enabled';
  keyboardShortcutsInput.checked = DEFAULTS.keyboardShortcuts;
  shortcutsLabel.textContent = 'Enabled';
  applyPreview(DEFAULTS.markerColor, DEFAULTS.markerText);

  browser.storage.local.set(DEFAULTS).then(() => {
    status.textContent = 'Reset to default.';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
});
