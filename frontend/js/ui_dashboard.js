// 文件: ui_dashboard.js
if (!window.TTS_UI) {
  window.TTS_UI = {};
}

export const TTS_UI = window.TTS_UI;

(function (scope) {
  // 绑定面板内的所有事件
  scope.bindDashboardEvents = function () {
    const CTX = scope.CTX;

    // Iframe 模式切换
    $('#tts-iframe-switch').change(async function () {
      const isChecked = $(this).is(':checked');
      const $label = $(this).parent();
      const originalText = $label.text();
      $label.text('正在保存设置...');

      try {
        await window.TTS_API.updateSettings({ iframe_mode: isChecked });
        CTX.CACHE.settings.iframe_mode = isChecked;
        localStorage.setItem('tts_plugin_iframe_mode', isChecked);
        alert(`${isChecked ? '开启' : '关闭'}美化卡模式。\n页面即将刷新...`);
        location.reload();
      } catch (e) {
        console.error('保存失败', e);
        alert('保存失败');
        $label.text(originalText);
        $(this).prop('checked', !isChecked);
      }
    });

    // 下拉菜单回显逻辑 - 使用 html() 以保留 Font Awesome 图标
    const currentStyle =
      (CTX.CACHE.settings && CTX.CACHE.settings.bubble_style) ||
      document.body.getAttribute('data-bubble-style') ||
      'default';
    const $targetOption = $(`#style-dropdown .option-item[data-value="${currentStyle}"]`);
    if ($targetOption.length > 0) {
      $('#style-dropdown .select-trigger span').html($targetOption.html());
      $('#style-dropdown .select-trigger').attr('data-value', currentStyle);
      $('#style-selector').val(currentStyle);
    }
    if (currentStyle === 'custom') {
      $('#tts-custom-theme-card').show();
      applySavedCustomTheme();
    } else {
      $('#tts-custom-theme-card').hide();
    }

    // 更新框架主题 UI
    const currentFrame = localStorage.getItem('tts_frame_theme') || 'modern';
    const $targetFrame = $(`#frame-dropdown .option-item[data-value="${currentFrame}"]`);
    if ($targetFrame.length > 0) {
      $('#frame-dropdown .select-trigger span').html($targetFrame.html());
      $('#frame-dropdown .select-trigger').attr('data-value', currentFrame);
      $('#frame-selector').val(currentFrame);
    }

    // 更新自定义背景预览
    const customBg = localStorage.getItem('tts_call_custom_bg');
    if (customBg) {
      $('#tts-bg-preview').show();
      $('#tts-bg-preview img').attr('src', customBg);
    } else {
      $('#tts-bg-preview').hide();
    }

    // 远程连接开关
    $('#tts-remote-switch').change(function () {
      const checked = $(this).is(':checked');
      if (checked) $('#tts-remote-input-area').slideDown();
      else {
        $('#tts-remote-input-area').slideUp();
        const ip = $('#tts-remote-ip').val().trim();
        localStorage.setItem('tts_plugin_remote_config', JSON.stringify({ useRemote: false, ip: ip }));
        location.reload();
      }
    });

    $('#tts-save-remote').click(function () {
      const ip = $('#tts-remote-ip').val().trim();
      if (!ip) {
        alert('请输入 IP 地址');
        return;
      }
      localStorage.setItem('tts_plugin_remote_config', JSON.stringify({ useRemote: true, ip: ip }));
      alert('设置已保存,即将刷新');
      location.reload();
    });

    $('#tts-master-switch').change(function () {
      CTX.Callbacks.toggleMasterSwitch($(this).is(':checked'));
    });
    $('#tts-toggle-auto').change(function () {
      CTX.Callbacks.toggleAutoGenerate($(this).is(':checked'));
    });

    $('#tts-lang-select').val(CTX.CACHE.settings.default_lang || 'default');
    $('#tts-lang-select').change(async function () {
      const lang = $(this).val();
      CTX.CACHE.settings.default_lang = lang;
      await window.TTS_API.updateSettings({ default_lang: lang });
    });

    $('#tts-btn-save-paths').click(async function () {
      const btn = $(this);
      const oldText = btn.text();
      btn.text('保存中..').prop('disabled', true);
      const base = $('#tts-base-path').val().trim();
      const cache = $('#tts-cache-path').val().trim();

      const success = await CTX.Callbacks.saveSettings(base, cache);
      if (success) {
        alert('设置已保存！');
        CTX.Callbacks.refreshData().then(() => scope.renderModelOptions());
      } else {
        alert('保存失败,请检查控制台');
      }
      btn.text(oldText).prop('disabled', false);
    });

    // 绑定新角色
    $('#tts-btn-bind-new').click(async function () {
      const charName = $('#tts-new-char').val().trim();
      const modelName = $('#model-selector').val() || $('#model-dropdown .select-trigger').attr('data-value') || '';
      if (!charName || !modelName) {
        alert('请填写角色名并选择模型');
        return;
      }

      try {
        await window.TTS_API.bindCharacter(charName, modelName);
        await CTX.Callbacks.refreshData();
        scope.renderDashboardList();
        $('#tts-new-char').val('');
      } catch (e) {
        console.error(e);
        alert('绑定失败,请检查后端日志');
      }
    });

    // 创建新文件夹 (原代码中有逻辑但HTML中好像没这个按钮，保留逻辑以防万一)
    $('#tts-btn-create-folder').click(async function () {
      const fName = $('#tts-create-folder-name').val().trim();
      if (!fName) return;
      try {
        await window.TTS_API.createModelFolder(fName);
        alert('创建成功');
        CTX.Callbacks.refreshData().then(scope.renderModelOptions);
        $('#tts-create-folder-name').val('');
      } catch (e) {
        console.error(e);
        alert('创建失败,可能文件夹已存在');
      }
    });

    // 下拉菜单交互逻辑 - 所有下拉菜单通用
    $('.tts-custom-select .select-trigger')
      .off('click')
      .on('click', function (e) {
        e.stopPropagation();
        // 先关闭其他下拉
        $('.tts-custom-select').not($(this).parent()).removeClass('open');
        $(this).parent().toggleClass('open');
      });

    function applySavedCustomTheme() {
      try {
        const raw = localStorage.getItem('tts_custom_theme');
        const o = raw ? JSON.parse(raw) : null;
        if (!o) return;
        const root = document.documentElement;
        root.style.setProperty('--custom-bg', o.bg || '#1a1a1e');
        root.style.setProperty('--custom-text', o.text || '#e0e0e0');
        root.style.setProperty('--custom-accent', o.accent || '#6667ab');
        root.style.setProperty('--custom-input-bg', o.inputBg || '#2a2a2e');
        root.style.setProperty('--custom-input-text', o.inputText || '#ffffff');
        $('#tts-custom-bg').val(o.bg || '#1a1a1e');
        $('#tts-custom-text').val(o.text || '#e0e0e0');
        $('#tts-custom-accent').val(o.accent || '#6667ab');
        $('#tts-custom-input-bg').val(o.inputBg || '#2a2a2e');
        $('#tts-custom-input-text').val(o.inputText || '#ffffff');
        $('#tts-custom-bg-hex').text(o.bg || '#1a1a1e');
        $('#tts-custom-text-hex').text(o.text || '#e0e0e0');
        $('#tts-custom-accent-hex').text(o.accent || '#6667ab');
        $('#tts-custom-input-bg-hex').text(o.inputBg || '#2a2a2e');
        $('#tts-custom-input-text-hex').text(o.inputText || '#ffffff');
      } catch (e) {
        console.warn('applySavedCustomTheme', e);
      }
    }

    // 气泡风格选项点击 - 使用 html() 以保留 Font Awesome 图标
    $('#style-dropdown .option-item')
      .off('click')
      .on('click', async function (e) {
        e.stopPropagation();
        const val = $(this).attr('data-value');
        const html = $(this).html();
        const $container = $(this).closest('.tts-custom-select');

        // 1. UI 立即反馈：更新显示（保留图标）
        $container.find('.select-trigger span').html(html);
        $container.find('.select-trigger').attr('data-value', val);
        $('#style-selector').val(val);
        $container.removeClass('open');

        if (val === 'custom') {
          $('#tts-custom-theme-card').show();
          applySavedCustomTheme();
        } else {
          $('#tts-custom-theme-card').hide();
        }

        // 2. 立即让 Body 变身
        document.body.setAttribute('data-bubble-style', val);

        // 3. 写入 localStorage
        localStorage.setItem('tts_bubble_style', val);
        console.log('[UI] 皮肤已更新为:', val);

        try {
          if (CTX.CACHE && CTX.CACHE.settings) {
            CTX.CACHE.settings.bubble_style = val;
          }
          if (window.TTS_API && window.TTS_API.updateSettings) {
            await window.TTS_API.updateSettings({ bubble_style: val });
          }
        } catch (err) {
          console.error('样式保存失败', err);
        }
      });

    // 框架主题选项点击 - 更新 UI 并立即应用主题到手机
    $('#frame-dropdown .option-item')
      .off('click')
      .on('click', function (e) {
        e.stopPropagation();
        const val = $(this).attr('data-value');
        const html = $(this).html();
        const $container = $(this).closest('.tts-custom-select');

        // UI 更新（保留图标）
        $container.find('.select-trigger span').html(html);
        $container.find('.select-trigger').attr('data-value', val);
        $('#frame-selector').val(val);
        $container.removeClass('open');

        // 立即应用到 #tts-mobile-root 和 body，并持久化（支持面板在 iframe 时从 parent 取 root）
        localStorage.setItem('tts_frame_theme', val);
        const doc = document.getElementById('tts-mobile-root') ? document : window.parent && window.parent.document;
        const targetDoc = doc || document;
        const root = targetDoc.getElementById('tts-mobile-root');
        if (targetDoc.body) targetDoc.body.setAttribute('data-frame-theme', val);
        if (root) {
          root.setAttribute('data-frame-theme', val);
        }
        if (window.TTS_ThemeManager && window.TTS_ThemeManager.applyFrameTheme) {
          window.TTS_ThemeManager.applyFrameTheme(val);
        }
      });

    $('#model-dropdown .option-item.model-option')
      .off('click')
      .on('click', function (e) {
        e.stopPropagation();
        const val = $(this).attr('data-value');
        if (!val) return;
        const text = $(this).text();
        const $container = $(this).closest('.tts-custom-select');
        $container.find('.select-trigger span').text(text);
        $container.find('.select-trigger').attr('data-value', val);
        $('#model-selector').val(val);
        $container.removeClass('open');
      });

    // 背景上传按钮
    $('#tts-bg-upload-btn')
      .off('click')
      .on('click', function () {
        $('#tts-bg-upload').trigger('click');
      });

    // 背景文件选择
    $('#tts-bg-upload')
      .off('change')
      .on('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
          alert('图片文件过大，请选择小于 2MB 的图片');
          return;
        }

        const reader = new FileReader();
        reader.onload = function (event) {
          const base64 = event.target.result;

          if (window.TTS_ThemeManager && window.TTS_ThemeManager.applyCustomBackground) {
            window.TTS_ThemeManager.applyCustomBackground(base64);
          } else {
            localStorage.setItem('tts_call_custom_bg', base64);
          }

          $('#tts-bg-preview').show();
          $('#tts-bg-preview img').attr('src', base64);
          console.log('[UI] 自定义背景已上传');
        };
        reader.readAsDataURL(file);
      });

    // 清除背景按钮
    $('#tts-bg-clear-btn')
      .off('click')
      .on('click', function () {
        if (window.TTS_ThemeManager && window.TTS_ThemeManager.clearCustomBackground) {
          window.TTS_ThemeManager.clearCustomBackground();
        } else {
          localStorage.removeItem('tts_call_custom_bg');
        }
        $('#tts-bg-preview').hide();
        $('#tts-bg-preview img').attr('src', '');
        $('#tts-bg-upload').val('');
        console.log('[UI] 自定义背景已清除');
      });

    // App 图标：加载已保存的预览
    const customIcons =
      window.TTS_ThemeManager && window.TTS_ThemeManager.getCustomAppIcons
        ? window.TTS_ThemeManager.getCustomAppIcons()
        : (function () {
            try {
              const raw = localStorage.getItem('tts_custom_app_icons');
              return raw ? JSON.parse(raw) : {};
            } catch (e) {
              return {};
            }
          })();
    ['incoming_call', 'settings', 'favorites', 'eavesdrop'].forEach(function (appKey) {
      const src = customIcons[appKey];
      const $preview = $(`.tts-app-icon-preview[data-app="${appKey}"]`);
      if (src && $preview.length) {
        $preview
          .css('background', 'none')
          .html('<img src="' + src + '" alt="" style="width:100%; height:100%; object-fit:cover;">');
      }
    });

    // App 图标：上传按钮 -> 触发 file input
    $('.tts-app-icon-btn')
      .off('click')
      .on('click', function () {
        const appKey = $(this).data('app');
        $(`.tts-app-icon-upload[data-app="${appKey}"]`).trigger('click');
      });
    // App 图标：文件选择
    $('.tts-app-icon-upload')
      .off('change')
      .on('change', function (e) {
        const appKey = $(this).data('app');
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 200 * 1024) {
          alert('图片请小于 200KB');
          return;
        }
        const reader = new FileReader();
        reader.onload = function (ev) {
          const base64 = String((ev.target && ev.target.result) || '');
          if (window.TTS_ThemeManager && window.TTS_ThemeManager.setCustomAppIcon) {
            window.TTS_ThemeManager.setCustomAppIcon(appKey, base64);
          } else {
            const icons = (function () {
              try {
                const raw = localStorage.getItem('tts_custom_app_icons');
                return raw ? JSON.parse(raw) : {};
              } catch (e) {
                return {};
              }
            })();
            icons[appKey] = base64;
            localStorage.setItem('tts_custom_app_icons', JSON.stringify(icons));
          }
          const $preview = $(`.tts-app-icon-preview[data-app="${appKey}"]`);
          $preview
            .css('background', 'none')
            .html('<img src="' + base64 + '" alt="" style="width:100%; height:100%; object-fit:cover;">');
          if (window.TTS_Mobile && window.TTS_Mobile.refreshHomeScreen) {
            window.TTS_Mobile.refreshHomeScreen();
          }
        };
        reader.readAsDataURL(file);
        $(this).val('');
      });
    // App 图标：清除
    $('.tts-app-icon-clear')
      .off('click')
      .on('click', function () {
        const appKey = $(this).data('app');
        if (window.TTS_ThemeManager && window.TTS_ThemeManager.clearCustomAppIcon) {
          window.TTS_ThemeManager.clearCustomAppIcon(appKey);
        } else {
          const icons = (function () {
            try {
              const raw = localStorage.getItem('tts_custom_app_icons');
              return raw ? JSON.parse(raw) : {};
            } catch (e) {
              return {};
            }
          })();
          delete icons[appKey];
          localStorage.setItem('tts_custom_app_icons', JSON.stringify(icons));
        }
        const $preview = $(`.tts-app-icon-preview[data-app="${appKey}"]`);
        $preview.css('background', '#333').empty();
        if (window.TTS_Mobile && window.TTS_Mobile.refreshHomeScreen) {
          window.TTS_Mobile.refreshHomeScreen();
        }
      });

    // 自定义主题：颜色选择器变更时更新 hex 显示
    $('#tts-custom-bg, #tts-custom-text, #tts-custom-accent, #tts-custom-input-bg, #tts-custom-input-text')
      .off('input change')
      .on('input change', function () {
        const v = $(this).val();
        const id = $(this).attr('id');
        if (id === 'tts-custom-bg') $('#tts-custom-bg-hex').text(v);
        else if (id === 'tts-custom-text') $('#tts-custom-text-hex').text(v);
        else if (id === 'tts-custom-accent') $('#tts-custom-accent-hex').text(v);
        else if (id === 'tts-custom-input-bg') $('#tts-custom-input-bg-hex').text(v);
        else if (id === 'tts-custom-input-text') $('#tts-custom-input-text-hex').text(v);
      });

    // 自定义主题：保存为主题
    $('#tts-save-custom-theme')
      .off('click')
      .on('click', function () {
        const o = {
          bg: $('#tts-custom-bg').val() || '#1a1a1e',
          text: $('#tts-custom-text').val() || '#e0e0e0',
          accent: $('#tts-custom-accent').val() || '#6667ab',
          inputBg: $('#tts-custom-input-bg').val() || '#2a2a2e',
          inputText: $('#tts-custom-input-text').val() || '#ffffff',
        };
        localStorage.setItem('tts_custom_theme', JSON.stringify(o));
        const root = document.documentElement;
        root.style.setProperty('--custom-bg', o.bg);
        root.style.setProperty('--custom-text', o.text);
        root.style.setProperty('--custom-accent', o.accent);
        root.style.setProperty('--custom-input-bg', o.inputBg);
        root.style.setProperty('--custom-input-text', o.inputText);
        document.body.setAttribute('data-bubble-style', 'custom');
        localStorage.setItem('tts_bubble_style', 'custom');
        if (CTX.CACHE && CTX.CACHE.settings) CTX.CACHE.settings.bubble_style = 'custom';
        const $customOption = $('#style-dropdown .option-item[data-value="custom"]');
        if ($customOption.length) {
          $('#style-dropdown .select-trigger span').html($customOption.html());
          $('#style-dropdown .select-trigger').attr('data-value', 'custom');
          $('#style-selector').val('custom');
        }
        console.log('[UI] 自定义主题已保存并应用');
      });

    $(document)
      .off('click.closeDropdown')
      .on('click.closeDropdown', function () {
        $('.tts-custom-select').removeClass('open');
      });
  };
  // ===========================================
  // ⬇️ 渲染模型下拉菜单 (适配)
  // ===========================================
  scope.renderModelOptions = function () {
    const CTX = scope.CTX;
    const $container = $('#model-dropdown');
    const $options = $container.find('.select-options');
    const $trigger = $container.find('.select-trigger');
    const currentVal = $('#model-selector').val() || $trigger.attr('data-value') || '';

    $options.empty();

    const models = CTX && CTX.CACHE && CTX.CACHE.models ? CTX.CACHE.models : {};

    if (Object.keys(models).length === 0) {
      $options.append('<div class="option-item model-option" data-value="">暂无模型文件</div>');
      $trigger.find('span').text('暂无模型');
      $trigger.attr('data-value', '');
      $('#model-selector').val('');
      return;
    }

    Object.keys(models).forEach(k => {
      $options.append(`<div class="option-item model-option" data-value="${k}">${k}</div>`);
    });

    const firstKey = Object.keys(models)[0];
    const displayVal = currentVal && models.hasOwnProperty(currentVal) ? currentVal : firstKey;
    $trigger.find('span').text(displayVal);
    $trigger.attr('data-value', displayVal);
    $('#model-selector').val(displayVal);
  };

  // ===========================================
  // ⬇️ 渲染绑定列表 (适配)
  // ===========================================
  scope.renderDashboardList = function () {
    const CTX = scope.CTX;
    const c = $('#tts-mapping-list').empty();

    const mappings = CTX && CTX.CACHE && CTX.CACHE.mappings ? CTX.CACHE.mappings : {};

    if (Object.keys(mappings).length === 0) {
      c.append('<div class="tts-empty">暂无绑定记录</div>');
      return;
    }

    Object.keys(mappings).forEach(k => {
      // 注意：HTML 里的 onclick 必须指向全局 window.TTS_UI.handleUnbind
      // 确保 ui_main.js 已经暴露了这个方法
      c.append(`
                <div class="tts-list-item">
                    <span class="col-name">${k}</span>
                    <span class="col-model">${mappings[k]}</span>
                    <div class="col-action">
                        <button class="btn-red" onclick="window.TTS_UI.handleUnbind('${k}')">解绑</button>
                    </div>
                </div>
            `);
    });
  };
})(window.TTS_UI);
