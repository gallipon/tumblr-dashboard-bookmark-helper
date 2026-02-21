const DEFAULTS = {
  markerColor: '#ffc107',
  markerText: '🔖 Last read here',
  maxScan: 1000,
  showFindButton: true,
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

// 保存
saveBtn.addEventListener('click', () => {
  browser.storage.local.set({
    markerColor: colorPicker.value,
    markerText: markerTextInput.value || DEFAULTS.markerText,
    maxScan: parseInt(maxScanInput.value, 10),
    showFindButton: showFindButtonInput.checked,
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
  applyPreview(DEFAULTS.markerColor, DEFAULTS.markerText);

  browser.storage.local.set(DEFAULTS).then(() => {
    status.textContent = 'Reset to default.';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
});
