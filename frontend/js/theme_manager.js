/**
 * theme_manager.js - 主题管理器
 * 处理框架主题切换和自定义背景图片
 * 注意：事件绑定在 ui_dashboard.js 中完成
 */

const STORAGE_KEYS = {
  FRAME_THEME: 'tts_frame_theme',
  CUSTOM_BG: 'tts_call_custom_bg',
  CUSTOM_APP_ICONS: 'tts_custom_app_icons',
};

const FRAME_THEMES = {
  modern: { name: '📱 现代手机', icon: '📱' },
  mirror: { name: '🪞 双面镜', icon: '🪞' },
  holographic: { name: '🛸 全息投影', icon: '🛸' },
  jade: { name: '🧿 传音玉简', icon: '🧿' },
  crystal: { name: '💎 水晶棱镜', icon: '💎' },
  cosmos: { name: '🌌 星空深渊', icon: '🌌' },
};

/**
 * 初始化主题管理器
 */
export function initThemeManager() {
  // 加载保存的设置
  loadSavedSettings();
  console.log('[ThemeManager] 主题管理器已初始化');
}

/**
 * 加载保存的设置
 */
function loadSavedSettings() {
  // 加载框架主题
  const savedFrame = localStorage.getItem(STORAGE_KEYS.FRAME_THEME) || 'modern';
  applyFrameTheme(savedFrame);

  // 加载自定义背景
  const savedBg = localStorage.getItem(STORAGE_KEYS.CUSTOM_BG);
  if (savedBg) {
    applyCustomBackground(savedBg);
  }

  // 加载自定义主题颜色（当气泡风格为 custom 时）
  const bubbleStyle = localStorage.getItem('tts_bubble_style') || document.body.getAttribute('data-bubble-style');
  if (bubbleStyle === 'custom') {
    try {
      const raw = localStorage.getItem('tts_custom_theme');
      const o = raw ? JSON.parse(raw) : null;
      if (o) {
        document.documentElement.style.setProperty('--custom-bg', o.bg || '#1a1a1e');
        document.documentElement.style.setProperty('--custom-text', o.text || '#e0e0e0');
        document.documentElement.style.setProperty('--custom-accent', o.accent || '#6667ab');
        document.documentElement.style.setProperty('--custom-input-bg', o.inputBg || '#2a2a2e');
        document.documentElement.style.setProperty('--custom-input-text', o.inputText || '#ffffff');
      }
    } catch (e) {
      /* ignore */
    }
  }
}

/**
 * 获取包含手机根节点的文档（面板在 iframe 时手机在 parent）
 */
function getMobileRootDocument() {
  if (document.getElementById('tts-mobile-root')) return document;
  if (window.parent && window.parent.document && window.parent.document.getElementById('tts-mobile-root')) {
    return window.parent.document;
  }
  return document;
}

/**
 * 应用框架主题
 * @param {string} themeName - 主题名称
 */
export function applyFrameTheme(themeName) {
  const doc = getMobileRootDocument();
  doc.body.setAttribute('data-frame-theme', themeName);
  const mobileRoot = doc.getElementById('tts-mobile-root');
  if (mobileRoot) {
    mobileRoot.setAttribute('data-frame-theme', themeName);
  }
  localStorage.setItem(STORAGE_KEYS.FRAME_THEME, themeName);
  console.log('[ThemeManager] 框架主题已切换:', themeName);
}

/**
 * 应用自定义背景
 * @param {string} base64Image - Base64 编码的图片
 */
export function applyCustomBackground(base64Image) {
  // 设置 CSS 变量
  document.documentElement.style.setProperty('--custom-call-bg', `url(${base64Image})`);

  // 为来电容器添加标记和背景
  const selectors = [
    '.incoming-call-container',
    '.in-call-container',
    '.incoming-state',
    '.active-call-state',
    '.mobile-screen',
  ];

  document.querySelectorAll(selectors.join(',')).forEach(el => {
    const container = /** @type {HTMLElement} */ (el);
    container.setAttribute('data-custom-bg', 'true');
    container.style.backgroundImage = `url(${base64Image})`;
  });

  // 保存到 localStorage
  localStorage.setItem(STORAGE_KEYS.CUSTOM_BG, base64Image);

  console.log('[ThemeManager] 自定义背景已应用');
}

/**
 * 清除自定义背景
 */
export function clearCustomBackground() {
  // 移除 CSS 变量
  document.documentElement.style.removeProperty('--custom-call-bg');

  // 移除容器标记
  document.querySelectorAll('[data-custom-bg="true"]').forEach(el => {
    const container = /** @type {HTMLElement} */ (el);
    container.removeAttribute('data-custom-bg');
    container.style.backgroundImage = '';
  });

  // 从 localStorage 移除
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_BG);

  console.log('[ThemeManager] 自定义背景已清除');
}

/**
 * 获取当前框架主题
 * @returns {string}
 */
export function getCurrentFrameTheme() {
  return localStorage.getItem(STORAGE_KEYS.FRAME_THEME) || 'modern';
}

/**
 * 获取当前自定义背景
 * @returns {string|null}
 */
export function getCustomBackground() {
  return localStorage.getItem(STORAGE_KEYS.CUSTOM_BG);
}

/**
 * 获取自定义 App 图标（Base64）
 * @returns {Record<string, string>}
 */
export function getCustomAppIcons() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_APP_ICONS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * 设置单个 App 自定义图标
 * @param {string} appKey - incoming_call | settings | favorites | eavesdrop
 * @param {string} base64 - data:image/... Base64 字符串
 */
export function setCustomAppIcon(appKey, base64) {
  const icons = getCustomAppIcons();
  icons[appKey] = base64;
  localStorage.setItem(STORAGE_KEYS.CUSTOM_APP_ICONS, JSON.stringify(icons));
}

/**
 * 清除单个 App 自定义图标
 * @param {string} appKey
 */
export function clearCustomAppIcon(appKey) {
  const icons = getCustomAppIcons();
  delete icons[appKey];
  localStorage.setItem(STORAGE_KEYS.CUSTOM_APP_ICONS, JSON.stringify(icons));
}

/**
 * 监听 DOM 变化，自动为新创建的来电容器应用自定义背景
 */
export function observeCallContainers() {
  const customBg = getCustomBackground();
  if (!customBg) return;

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(addedNode => {
        if (addedNode.nodeType === 1) {
          const node = /** @type {HTMLElement} */ (addedNode);
          const selectors = ['.incoming-call-container', '.in-call-container', '.incoming-state', '.active-call-state'];

          // 检查子元素
          if (node.querySelectorAll) {
            node.querySelectorAll(selectors.join(',')).forEach(el => {
              const container = /** @type {HTMLElement} */ (el);
              if (!container.hasAttribute('data-custom-bg')) {
                container.setAttribute('data-custom-bg', 'true');
                container.style.backgroundImage = `url(${customBg})`;
              }
            });
          }

          // 检查节点本身
          if (node.classList) {
            for (const selector of selectors) {
              const className = selector.replace('.', '');
              if (node.classList.contains(className)) {
                if (!node.hasAttribute('data-custom-bg')) {
                  node.setAttribute('data-custom-bg', 'true');
                  node.style.backgroundImage = `url(${customBg})`;
                }
                break;
              }
            }
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

// 导出默认对象
export default {
  initThemeManager,
  applyFrameTheme,
  applyCustomBackground,
  clearCustomBackground,
  getCurrentFrameTheme,
  getCustomBackground,
  getCustomAppIcons,
  setCustomAppIcon,
  clearCustomAppIcon,
  observeCallContainers,
  FRAME_THEMES,
  STORAGE_KEYS,
};
