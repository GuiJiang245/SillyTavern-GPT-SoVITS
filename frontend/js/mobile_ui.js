/**
 * 模拟手机 UI 核心框架 (非真实移动端)
 *
 * 注意: 这是在浏览器中渲染的一个"虚拟小手机"界面，
 *       并非针对移动设备的适配代码。该模块模拟手机外壳、
 *       内置 App 路由、来电/通话等功能，用于桌面端的沉浸式交互体验。
 *
 * 负责: 渲染手机壳、处理拖拽交互、管理 App 路由
 */

// 导入 App 模块
import * as EavesdropApp from './mobile_apps/eavesdrop_app.js';
import * as FavoritesApp from './mobile_apps/favorites_app.js';
import * as IncomingCallApp from './mobile_apps/incoming_call_app.js';
import * as LlmTestApp from './mobile_apps/llm_test_app.js';
import * as PhoneCallApp from './mobile_apps/phone_call_app.js';
import * as SettingsApp from './mobile_apps/settings_app.js';

if (!window.TTS_Mobile) {
  window.TTS_Mobile = {};
}

export const TTS_Mobile = window.TTS_Mobile;

(function (scope) {
  // ==================== 状态管理 ====================
  let STATE = {
    isOpen: false,
    currentApp: null,
  };

  // ==================== 导航栏组件 ====================
  function createNavbar(title) {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const $nav = $(`
            <div class="mobile-app-navbar">
                <div class="nav-left">
                    <span style="font-size:18px; margin-right:4px;">←</span> 返回
                </div>
                <div class="nav-title">${title}</div>
                <div class="nav-right">
                    ${isMobile ? '<span class="nav-close-btn">✕</span>' : ''}
                </div>
            </div>
        `);
    // 返回按钮
    $nav.find('.nav-left').on('click touchend', function (e) {
      e.preventDefault();
      e.stopPropagation();
      $('#mobile-home-btn').trigger('click');
    });
    // 关闭按钮（手机端）
    $nav.find('.nav-close-btn').on('click touchend', function (e) {
      e.preventDefault();
      e.stopPropagation();
      closePhone();
    });
    return $nav;
  }

  // ==================== App 注册表 ====================
  // 配色参考 Pantone 年度色彩
  const APPS = {
    incoming_call: {
      name: '来电',
      icon: '<svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
      // Very Peri 长春花蓝 17-3938
      bg: 'linear-gradient(135deg, #6667ab 0%, #8889cc 100%)',
      render: async container => {
        await IncomingCallApp.render(container, createNavbar);
      },
    },
    settings: {
      name: '系统设置',
      icon: '<svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
      // Classic Blue 经典蓝 19-4052
      bg: 'linear-gradient(135deg, #0f4c81 0%, #1a6ab0 100%)',
      render: async container => {
        await SettingsApp.render(container, createNavbar);
      },
    },
    favorites: {
      name: '收藏夹',
      icon: '<svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
      // Viva Magenta 非凡洋红 18-1750
      bg: 'linear-gradient(135deg, #be3455 0%, #e05577 100%)',
      render: async container => {
        await FavoritesApp.render(container, createNavbar);
      },
    },
    llm_test: {
      // name: 'LLM测试',  // 注释掉则不在主屏显示
      icon: '🤖',
      bg: 'linear-gradient(135deg, #6667ab 0%, #8889cc 100%)',
      render: async container => {
        await LlmTestApp.render(container, createNavbar);
      },
    },
    phone_call: {
      // name: '主动电话',  // 注释掉则不在主屏显示
      icon: '📞',
      // Emerald 翡翠绿 17-5641
      bg: 'linear-gradient(135deg, #009473 0%, #00b894 100%)',
      render: async container => {
        await PhoneCallApp.render(container, createNavbar);
      },
    },
    eavesdrop: {
      name: '对话追踪',
      icon: '<svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/></svg>',
      // Mocha Mousse 摩卡慕斯 17-1230
      bg: 'linear-gradient(135deg, #a47764 0%, #c9a88e 100%)',
      render: async container => {
        await EavesdropApp.render(container, createNavbar);
      },
    },
  };

  // ==================== 初始化 ====================
  scope.init = function () {
    if ($('meta[name="viewport"]').length === 0) {
      $('head').append(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
      );
      console.log('📱 [Mobile] 已注入 Viewport 标签以适配手机屏幕');
    }

    if ($('#tts-mobile-root').length === 0) {
      injectStyles();
      renderShell();
      bindEvents();
      console.log('📱 [Mobile] 手机界面已初始化');
    }
  };

  // ==================== CSS 注入 (占位，实际由 Loader 加载) ====================
  function injectStyles() {
    console.log('📱 [Mobile] CSS 应由 Loader 加载，跳过 JS 注入');
  }

  // ==================== 渲染手机壳 ====================
  function renderShell() {
    // 获取当前时间
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    const html = `
        <div id="tts-mobile-trigger">
            <div class="trigger-bubble-inner">
                <div class="trigger-waves">
                    <span class="trigger-bar"></span>
                    <span class="trigger-bar"></span>
                    <span class="trigger-bar"></span>
                </div>
            </div>
        </div>
        <div id="tts-mobile-root" class="minimized">
            <div id="tts-mobile-power-btn" title="点击关闭"></div>
            <div class="side-btn volume-up"></div>
            <div class="side-btn volume-down"></div>
            <div class="mobile-screen">
                <div class="mobile-notch"></div>
                <div class="status-bar">
                    <span class="time">${timeStr}</span>
                    <span class="icons">
                        <span style="font-size:10px;">5G</span>
                        <span style="font-size:12px;">📶</span>
                        <span style="font-size:12px;">🔋</span>
                    </span>
                </div>
                <div id="mobile-screen-content"></div>
                <div class="mobile-home-bar" id="mobile-home-btn"></div>
            </div>
        </div>
        `;
    $('body').append(html);
    renderHomeScreen();

    // 应用已保存的框架主题
    applyStoredFrameTheme();

    // 初始化拖动功能
    initDragFunction();

    // 🔍 调试 + 修复：检查悬浮球位置，并在手机端强制居中
    setTimeout(() => {
      const $trigger = $('#tts-mobile-trigger');
      const el = $trigger[0];
      if (el) {
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        console.log('🔍 [Debug] 悬浮球调试信息:');
        console.log('  - 屏幕尺寸:', window.innerWidth, 'x', window.innerHeight);
        console.log('  - 媒体查询 max-width:768px 匹配:', isMobile);
        console.log('  - 计算样式 top:', computed.top);
        console.log('  - 计算样式 right:', computed.right);
        console.log('  - 计算样式 transform:', computed.transform);
        console.log('  - 内联样式:', el.style.cssText || '(无)');
        console.log('  - getBoundingClientRect:', JSON.stringify(rect));
        console.log('  - 预期垂直中心位置:', window.innerHeight / 2);
        console.log('  - 实际垂直中心位置:', rect.top + rect.height / 2);

        // 🔧 修复：如果是手机端且位置不对，直接用JS设置
        if (isMobile) {
          const expectedTop = (window.innerHeight - 40) / 2; // 40是悬浮球高度
          const actualCenter = rect.top + rect.height / 2;
          const expectedCenter = window.innerHeight / 2;

          if (Math.abs(actualCenter - expectedCenter) > 50) {
            console.log('🔧 [Fix] 检测到位置异常，强制修复！');
            console.log('  - 设置 top:', expectedTop + 'px');
            // 用原生 setProperty 才能覆盖 CSS 的 !important
            el.style.setProperty('top', expectedTop + 'px', 'important');
            el.style.setProperty('transform', 'none', 'important');
            el.style.setProperty('animation', 'none', 'important');
            console.log('  - 修复后内联样式:', el.style.cssText);
          }
        }
      } else {
        console.log('🔍 [Debug] 悬浮球元素未找到!');
      }
    }, 500);
  }

  // ==================== 渲染主屏幕 ====================
  function renderHomeScreen() {
    const $screen = $('#mobile-screen-content');
    $screen.empty();

    // 始终添加关闭栏：真机首次加载时 viewport 可能尚未就绪，matchMedia 会误判为桌面导致不渲染，F12 模拟则一直有
    const $closeBar = $(`
                <div class="mobile-home-close-bar">
                    <button type="button" class="home-close-btn">✕ 关闭</button>
                </div>
            `);
    $closeBar.find('.home-close-btn').on('click touchend', function (e) {
      e.preventDefault();
      e.stopPropagation();
      closePhone();
    });
    $screen.append($closeBar);

    let customIcons = {};
    try {
      const raw = localStorage.getItem('tts_custom_app_icons');
      if (raw) customIcons = JSON.parse(raw);
    } catch (e) {}
    const $grid = $(`<div class="app-grid"></div>`);
    Object.keys(APPS).forEach(key => {
      const app = APPS[key];
      if (!app.name) return; // 跳过没有 name 的应用
      const customImg = customIcons[key];
      const iconContent = customImg ? `<img src="${customImg}" alt="" class="app-icon-custom">` : app.icon;
      const iconStyle = customImg
        ? 'background:transparent; box-shadow:none;'
        : `background:${app.bg || 'rgba(255,255,255,0.2)'}`;
      const item = `
            <div class="app-icon-wrapper" data-app="${key}">
                <div class="app-icon ${customImg ? 'app-icon-is-custom' : ''}" style="${iconStyle}">
                    ${iconContent}
                </div>
                <span class="app-name">${app.name}</span>
            </div>
            `;
      $grid.append(item);
    });

    $screen.append($grid);
    STATE.currentApp = null;

    // 🎯 返回主屏时清理来电记录 App 资源(停止音频播放)
    if (IncomingCallApp.cleanup) {
      IncomingCallApp.cleanup();
    }
  }

  // ==================== 应用已保存的框架主题 ====================
  function applyStoredFrameTheme() {
    const savedTheme = localStorage.getItem('tts_frame_theme') || 'modern';
    const mobileRoot = document.getElementById('tts-mobile-root');

    if (mobileRoot) {
      mobileRoot.setAttribute('data-frame-theme', savedTheme);
      console.log('📱 [Mobile] 已应用框架主题:', savedTheme);
    }

    // 同步到 body（备用选择器）
    document.body.setAttribute('data-frame-theme', savedTheme);

    // 如果 TTS_ThemeManager 可用，调用它来确保一致性
    if (window.TTS_ThemeManager && window.TTS_ThemeManager.applyFrameTheme) {
      window.TTS_ThemeManager.applyFrameTheme(savedTheme);
    }
  }

  // ==================== 手机拖动功能 ====================
  function initDragFunction() {
    const phone = document.getElementById('tts-mobile-root');
    if (!phone) return;

    let isDragging = false;
    let startX, startY, initialX, initialY;

    // 鼠标/触摸按下
    phone.addEventListener('mousedown', startDrag);
    phone.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
      // 如果点击的是按钮、输入框等交互元素，不拖动
      if (
        e.target.closest(
          'button, input, select, .app-icon-wrapper, .option-item, .select-trigger, .mobile-home-bar, .home-close-btn, .nav-close-btn, .mobile-home-close-bar, #tts-mobile-power-btn',
        )
      ) {
        return;
      }
      // 手机端：屏幕内任意区域都不触发拖拽，否则会吃掉「点击播放」和设置页滑动
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile && e.target.closest('#mobile-screen-content')) {
        return;
      }

      isDragging = true;
      phone.style.cursor = 'grabbing';
      phone.style.transition = 'none';

      const rect = phone.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      if (e.type === 'touchstart') {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      } else {
        startX = e.clientX;
        startY = e.clientY;
      }

      e.preventDefault();
    }

    // 鼠标/触摸移动
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });

    function drag(e) {
      if (!isDragging) return;

      let currentX, currentY;
      if (e.type === 'touchmove') {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
      } else {
        currentX = e.clientX;
        currentY = e.clientY;
      }

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      let newX = initialX + deltaX;
      let newY = initialY + deltaY;

      // 边界限制
      const maxX = window.innerWidth - phone.offsetWidth;
      const maxY = window.innerHeight - phone.offsetHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      phone.style.left = newX + 'px';
      phone.style.top = newY + 'px';
      phone.style.right = 'auto';
      phone.style.bottom = 'auto';

      e.preventDefault();
    }

    // 鼠标/触摸释放
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);

    function stopDrag() {
      if (!isDragging) return;
      isDragging = false;
      phone.style.cursor = 'grab';
      phone.style.transition = '';
    }
  }

  scope.refreshHomeScreen = function () {
    renderHomeScreen();
  };

  // ==================== 打开 App ====================
  scope.openApp = function (appKey) {
    const app = APPS[appKey];
    if (!app) return;

    if (app.action) {
      app.action();
      return;
    }

    const $screen = $('#mobile-screen-content');
    $screen.empty();
    const $appContainer = $(
      `<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`,
    );

    if (app.render) {
      app.render($appContainer);
    }
    $screen.append($appContainer);
    STATE.currentApp = appKey;
  };

  // ==================== 事件绑定 ====================
  function bindEvents() {
    const $phone = $('#tts-mobile-root');
    const $trigger = $('#tts-mobile-trigger');

    let isDragging = false;
    let hasMoved = false;

    let startX, startY;
    let shiftX, shiftY;
    let winW, winH;

    const DRAG_THRESHOLD = 10;

    // 拖拽开始
    $trigger.on('mousedown touchstart', function (e) {
      if (e.type === 'touchstart' && e.touches.length > 1) return;
      if (e.cancelable) e.preventDefault();

      const point = e.type === 'touchstart' ? e.touches[0] : e;
      const rect = $trigger[0].getBoundingClientRect();

      startX = point.clientX;
      startY = point.clientY;
      shiftX = startX - rect.left;
      shiftY = startY - rect.top;

      winW = $(window).width();
      winH = $(window).height();

      isDragging = true;
      hasMoved = false;

      document.addEventListener('mousemove', onMove, { passive: false });
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchend', onUp);
    });

    function onMove(e) {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();

      const point = e.type === 'touchmove' ? e.touches[0] : e;
      const currentX = point.clientX;
      const currentY = point.clientY;
      const el = $trigger[0];

      if (!hasMoved) {
        const moveDis = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
        if (moveDis < DRAG_THRESHOLD) return;
        hasMoved = true;
        // 用 setProperty 覆盖 !important
        el.style.setProperty('position', 'fixed', 'important');
        el.style.setProperty('right', 'auto', 'important');
        el.style.setProperty('bottom', 'auto', 'important');
        el.style.setProperty('transform', 'none', 'important');
        el.style.setProperty('animation', 'none', 'important');
      }

      let newLeft = currentX - shiftX;
      let newTop = currentY - shiftY;

      newLeft = Math.max(0, Math.min(winW - 60, newLeft));
      newTop = Math.max(0, Math.min(winH - 60, newTop));

      // 用 setProperty 覆盖 !important
      el.style.setProperty('left', newLeft + 'px', 'important');
      el.style.setProperty('top', newTop + 'px', 'important');
    }

    function onUp(e) {
      isDragging = false;

      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);

      if (!hasMoved) {
        togglePhone();
      } else {
        snapToEdge();
      }
    }

    function snapToEdge() {
      const el = $trigger[0];
      const rect = el.getBoundingClientRect();
      const midX = winW / 2;
      const targetLeft = rect.left + 30 < midX ? 10 : winW - 50;

      // 用 setProperty 覆盖 !important，并用 CSS transition 做动画
      el.style.setProperty('transition', 'left 0.2s ease', 'important');
      el.style.setProperty('left', targetLeft + 'px', 'important');

      // 动画结束后移除 transition、animation 和 transform 限制
      setTimeout(() => {
        el.style.removeProperty('transition');
        // 🔧 修复：移除拖动时强制设置的样式，恢复来电震动动画
        el.style.removeProperty('animation');
        el.style.removeProperty('transform');
      }, 200);
    }

    // 电源键关闭
    $('#tts-mobile-power-btn').click(function (e) {
      e.stopPropagation();
      closePhone();
    });

    // 手机端关闭按钮：文档级委托，避免被父级 touch 拦截导致点不动
    $(document).on('touchend click', '#tts-mobile-root .home-close-btn, #tts-mobile-root .nav-close-btn', function (e) {
      e.preventDefault();
      e.stopPropagation();
      closePhone();
    });

    // 点击外部关闭
    $(document).on('click', function (e) {
      if (STATE.isOpen) {
        if ($(e.target).closest('#tts-mobile-root, #tts-mobile-trigger').length === 0) {
          closePhone();
        }
      }
    });

    // 阻止手机内部点击冒泡
    $phone.on('click', function (e) {
      e.stopPropagation();
    });

    // App 图标点击
    $phone.on('click', '.app-icon-wrapper', function () {
      const key = $(this).data('app');
      scope.openApp(key);
    });

    // Home 键
    $('#mobile-home-btn').click(function () {
      renderHomeScreen();
    });
  }

  // ==================== 手机状态切换 ====================
  function togglePhone() {
    // 优先检查来电
    if (window.TTS_IncomingCall) {
      console.log('[Mobile] 检测到来电,打开小手机并显示来电界面');
      $('#tts-mobile-trigger').removeClass('incoming-call');
      $('#tts-manager-btn').removeClass('incoming-call');

      if (!STATE.isOpen) {
        openPhone();
      }
      scope.openApp('incoming_call');
      return;
    }

    // 检查对话追踪通知
    if (window.TTS_EavesdropData) {
      console.log('[Mobile] 检测到对话追踪,打开小手机并显示监听界面');
      $('#tts-mobile-trigger').removeClass('eavesdrop-available');
      $('#tts-manager-btn').removeClass('eavesdrop-available');

      if (!STATE.isOpen) {
        openPhone();
      }
      scope.openApp('eavesdrop');
      return;
    }

    if (STATE.isOpen) closePhone();
    else openPhone();
  }

  function openPhone() {
    const rootEl = document.getElementById('tts-mobile-root');
    if (rootEl) {
      // 移除移动端隐藏标记，恢复显示
      rootEl.classList.remove('mobile-hidden');
      rootEl.style.removeProperty('display');
      rootEl.style.removeProperty('visibility');
      rootEl.style.removeProperty('opacity');
    }
    $('#tts-mobile-root').removeClass('minimized').show();
    $('#tts-mobile-trigger').fadeOut();
    STATE.isOpen = true;
    renderHomeScreen();
  }

  function closePhone() {
    // 🎯 关闭手机时清理来电记录 App 资源(停止音频播放)
    if (IncomingCallApp.cleanup) {
      IncomingCallApp.cleanup();
    }

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const rootEl = document.getElementById('tts-mobile-root');
    if (isMobile) {
      // 移动端使用 mobile-hidden + display:none!important，避免被 @media 中的 display:block!important 覆盖
      if (rootEl) {
        rootEl.classList.add('mobile-hidden');
        rootEl.style.setProperty('display', 'none', 'important');
        rootEl.style.setProperty('visibility', 'hidden', 'important');
        rootEl.style.setProperty('opacity', '0', 'important');
      }
    } else {
      $('#tts-mobile-root').addClass('minimized');
    }
    $('#tts-mobile-trigger').fadeIn();
    STATE.isOpen = false;
  }
})(window.TTS_Mobile);
