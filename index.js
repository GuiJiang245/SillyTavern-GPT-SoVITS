(function () {
    // ================= 配置区域 =================
    // 1. 读取本地存储配置 (这是开关的核心，存了 IP 和 开关状态)
    const lsConfig = localStorage.getItem('tts_plugin_remote_config');
    let remoteConfig = lsConfig ? JSON.parse(lsConfig) : { useRemote: false, ip: "" };
    // 2. 动态决定 API 地址逻辑
    let apiHost = "127.0.0.1";

    if (remoteConfig.useRemote && remoteConfig.ip) {
        // A. 如果用户手动开了开关并填了 IP (针对 Termux 情况)
        apiHost = remoteConfig.ip;
    } else {
        // B. 智能自动模式 (针对 电脑本地 或 手机直接访问电脑网页 情况)
        // 如果当前浏览器地址栏是 localhost 或 127.0.0.1，就用本地
        // 如果当前地址栏是 192.168.x.x，就自动沿用这个 IP
        const current = window.location.hostname;
        apiHost = (current === 'localhost' || current === '127.0.0.1') ? '127.0.0.1' : current;
    }

    // 最终生成的 API 地址
    const MANAGER_API = `http://${apiHost}:3000`;
    // ================= 动态加载资源 =================
    const utilsURL = `${MANAGER_API}/static/js/utils.js`;
    const apiURL = `${MANAGER_API}/static/js/api.js`;
    const uiURL = `${MANAGER_API}/static/js/ui.js`;
    const stateURL = `${MANAGER_API}/static/js/state.js`;
    const schedulerURL = `${MANAGER_API}/static/js/scheduler.js`;
    const parserURL = `${MANAGER_API}/static/js/dom_parser.js`;
    // 链式加载
    $.getScript(utilsURL).done(function() {
        $.getScript(apiURL).done(function() {
            $.getScript(stateURL).done(function() {
                // 【新增】加载 Parser
                $.getScript(parserURL).done(function() {
                    $.getScript(schedulerURL).done(function() {
                        $.getScript(uiURL).done(function() {
                            console.log("✅ [Loader] 所有模块加载完毕");
                            initPlugin();
                        });
                    });
                });
            });
        });
    }).fail(function() { console.error("❌ 核心模块加载失败"); });

    // ================================================
    // 将原本 index.js 的剩余所有逻辑包裹进这个主函数
    function initPlugin() {
        // 重新获取 Utils 对象
        window.TTS_API.init(MANAGER_API);
        // 【新增】初始化 State (虽然目前里面只是打印个日志)
        window.TTS_State.init();
        window.TTS_Parser.init();
        const TTS_Utils = window.TTS_Utils;

        // 【修改】使用 Utils 加载 CSS
        TTS_Utils.loadGlobalCSS(`${MANAGER_API}/static/css/style.css`, (cssContent) => {
            // 回调：CSS加载完毕后，手动触发一次 Iframe 扫描，解决穿透时序问题
            window.TTS_Parser.scan();

            // 双重保险：强制遍历现有 iframe 注入
            $('iframe').each(function() {
                try {
                    const head = $(this).contents().find('head');
                    if (head.length > 0 && head.find('#sovits-iframe-style').length === 0) {
                        head.append(`<style id='sovits-iframe-style'>${cssContent}</style>`);
                    }
                } catch(e) {}
            });
        });
        const CACHE = window.TTS_State.CACHE;
        const CURRENT_LOADED = window.TTS_State.CURRENT_LOADED;

        async function refreshData() {
            try {
                TTS_Utils.injectStyles();

                // 1. 如果连接成功，恢复按钮样式（如果是红色的话）
                $('#tts-manager-btn').css({ 'border-color': 'rgba(255,255,255,0.3)', 'color': '#fff' }).text('🔊 TTS配置');

                const data = await window.TTS_API.getData();

                // 2. 更新核心数据
                CACHE.models = data.models;
                CACHE.mappings = data.mappings;

                // 3. 合并设置：先用现有设置，再用后端设置覆盖
                if (data.settings) CACHE.settings = { ...CACHE.settings, ...data.settings };

                // 4. 【修正后逻辑】最后读取本地存储的 iframe_mode 并覆盖（优先级最高）
                const localIframeMode = localStorage.getItem('tts_plugin_iframe_mode');
                if (localIframeMode !== null) {
                    // 只有当本地有确切记录时才覆盖
                    CACHE.settings.iframe_mode = (localIframeMode === 'true');
                }

                CACHE.pendingTasks.clear();

                // 5. 刷新 UI (下拉框和列表)
                if (window.TTS_UI) {
                    window.TTS_UI.renderModelOptions();
                    window.TTS_UI.renderDashboardList();
                }

                // 6. 自动扫描逻辑
                if (CACHE.settings.enabled !== false && CACHE.settings.auto_generate) BatchScheduler.scanAndSchedule();

            } catch (e) {
                console.error("TTS Backend Error:", e);

                // 错误处理
                TTS_Utils.showNotification("❌ 连接失败：未检测到 TTS 后端服务！请检查是否已运行 main.py", "error");
                $('#tts-manager-btn').css({ 'border-color': '#ff5252', 'color': '#ff5252' }).text('⚠️ TTS断开');
            }
        }
        // ===========================================
        // 【新增】初始化 UI 模块，移交控制权
        // ===========================================
        if (window.TTS_UI) {
            window.TTS_UI.init({
                CACHE: CACHE,
                API_URL: MANAGER_API,
                Utils: TTS_Utils,
                Callbacks: {
                    refreshData: refreshData,
                    saveSettings: saveSettings, // 注意：下面需要微调 saveSettings
                    toggleMasterSwitch: toggleMasterSwitch,
                    toggleAutoGenerate: toggleAutoGenerate
                }
            });
        }
        // 切换总开关
        async function toggleMasterSwitch(checked) {
            CACHE.settings.enabled = checked;
            // 如果开启，立即扫描一次页面
            if (checked) window.TTS_Parser.scan();

            try {
                await window.TTS_API.updateSettings({ enabled: checked });
            } catch(e) {}
        }

        async function toggleAutoGenerate(checked) {
            CACHE.settings.auto_generate = checked;
            try {
                // [修改] 使用 API 模块更新设置
                await window.TTS_API.updateSettings({ auto_generate: checked });

                // 如果开启了自动生成，且总开关没关，立即扫描一次
                if (checked && CACHE.settings.enabled !== false) {
                    BatchScheduler.scanAndSchedule();
                }
            } catch(e) {
                console.error("切换自动生成失败:", e);
            }
        }
        const BatchScheduler = window.TTS_Scheduler;


        async function saveSettings(base, cache) {
            // 如果没传参（旧逻辑），就去 DOM 找（兼容性），如果传了就用传的
            const b = base !== undefined ? base : $('#tts-base-path').val().trim();
            const c = cache !== undefined ? cache : $('#tts-cache-path').val().trim();

            try {
                // [修改] 使用 API 模块提交路径设置
                await window.TTS_API.updateSettings({
                    base_dir: b,
                    cache_dir: c
                });
                return true;
            } catch(e) {
                console.error("保存设置失败:", e);
                return false;
            }
        }

        $(document).on('click', '.voice-bubble', function() {
            const btn = $(this);
            const charName = btn.data('voice-name');

            if (btn.attr('data-status') === 'ready') {
                if (window.currentAudio) { window.currentAudio.pause(); window.currentAudio = null; $('.voice-bubble').removeClass('playing'); }

                // 优先读取属性，读取不到再读内存
                const audioUrl = btn.attr('data-audio-url') || btn.data('audio-url');

                if (!audioUrl) {
                    // 如果 URL 真的丢了（极少数情况），回退到错误状态让用户可以重试
                    btn.attr('data-status', 'error').removeClass('playing');
                    alert("音频丢失，请刷新页面或点击重试");
                    return;
                }
                const a = new Audio(audioUrl);
                window.currentAudio = a;
                btn.addClass('playing'); a.onended = () => { btn.removeClass('playing'); window.currentAudio = null; }; a.play();

            }
            else if (btn.attr('data-status') === 'waiting' || btn.attr('data-status') === 'error') {
                // 总开关拦截
                if (CACHE.settings.enabled === false) {
                    alert('TTS 插件总开关已关闭，请在配置面板中开启。');
                    return;
                }

                if (!CACHE.mappings[charName]) {
                    window.TTS_UI.showDashboard(); $('#tts-new-char').val(charName); $('#tts-new-model').focus();
                    alert(`⚠️ 角色 "${charName}" 尚未绑定 TTS 模型，已自动为您填入角色名。\n请在右侧选择模型并点击“绑定”！`);
                } else {
                    btn.removeClass('error'); btn.data('auto-play-after-gen', true);
                    BatchScheduler.addToQueue(btn); BatchScheduler.run();
                }
            }
        });


        window.addEventListener('message', function(event) {
            // 1. 安全校验
            if (!event.data || event.data.type !== 'play_tts') return;

            const { key, text, charName, emotion } = event.data;

            // 检查绑定状态
            if (!CACHE.mappings[charName]) {
                window.TTS_UI.showDashboard();
                $('#tts-new-char').val(charName);
                $('#tts-new-model').focus();
                setTimeout(() => {
                    alert(`⚠️ 角色 "${charName}" 尚未绑定 TTS 模型。\n已为您自动填好角色名，请在右侧选择模型并点击“绑定”！`);
                }, 100);
                return;
            }

            // === 【核心修复点】 ===
            // 在做任何事情之前，先停止当前音频，并强制重置所有气泡的动画
            if (window.currentAudio) {
                window.currentAudio.pause();
                window.currentAudio = null;
            }

            // 暴力重置所有气泡样式：移除 playing 类
            $('.voice-bubble').removeClass('playing'); // 主界面
            $('iframe').each(function() { // 所有 Iframe 内部
                try { $(this).contents().find('.voice-bubble').removeClass('playing'); } catch(e){}
            });
            // ===================

            // 2. 检查缓存播放
            if (CACHE.audioMemory[key]) {
                const audio = new Audio(CACHE.audioMemory[key]);
                window.currentAudio = audio;

                // 定义动画控制函数
                const setAnim = (active) => {
                    const func = active ? 'addClass' : 'removeClass';
                    // 更新主界面
                    $(`.voice-bubble[data-key='${key}']`)[func]('playing');
                    // 更新 Iframe
                    $('iframe').each(function(){
                        try { $(this).contents().find(`.voice-bubble[data-key='${key}']`)[func]('playing'); } catch(e){}
                    });
                };

                // 开始播放动画
                setAnim(true);

                audio.onended = () => {
                    window.currentAudio = null;
                    setAnim(false); // 播放结束自动重置
                };
                audio.play();
                return;
            }

            // 3. 缓存没有，准备生成
            if (CACHE.settings.enabled === false) { alert('TTS 插件已关闭'); return; }

            // 尝试定位按钮 DOM
            let $realBtn = null;
            $('iframe').each(function() {
                try {
                    const b = $(this).contents().find(`.voice-bubble[data-key='${key}']`);
                    if(b.length) $realBtn = b;
                } catch(e){}
            });
            if(!$realBtn || !$realBtn.length) $realBtn = $(`.voice-bubble[data-key='${key}']`);

            // 4. 构建虚拟按钮对象 (如果找不到真实DOM)
            const taskBtn = ($realBtn && $realBtn.length) ? $realBtn : {
                attr: (k) => (k==='data-status' ? 'waiting' : ''),
                data: (k) => {
                    if(k==='voice-name') return charName;
                    if(k==='voice-emotion') return emotion;
                    if(k==='text') return text;
                    return '';
                },
                addClass: () => {},
                removeClass: () => {},
            };

            if ($realBtn && $realBtn.length) {
                $realBtn.removeClass('error').attr('data-status', 'waiting');
            }

            // 5. 加入队列
            if ($realBtn && $realBtn.length) {
                BatchScheduler.addToQueue($realBtn);
                BatchScheduler.run();
            } else {
                console.warn("[TTS] 按钮DOM丢失，等待DOM刷新后重试...");
                setTimeout(() => { window.postMessage(event.data, '*'); }, 200);
            }
        });


        // ===========================================
        // 【新增】心跳保活机制 (彻底解决刷新丢失问题)
        // ===========================================
        function runWatchdog() {
            // 1. 检查 TTS 设置按钮是否被酒馆移除 (应对页面重绘)
            // 只有当 UI 模块加载了，且页面上找不到按钮时，才重新注入
            if (window.TTS_UI && $('#tts-manager-btn').length === 0) {
                // console.log("♻️ [TTS] 监测到 UI 丢失，正在重新挂载...");
                window.TTS_UI.init({
                    CACHE: CACHE,
                    API_URL: MANAGER_API,
                    Utils: TTS_Utils,
                    Callbacks: {
                        refreshData: refreshData,
                        saveSettings: saveSettings,
                        toggleMasterSwitch: toggleMasterSwitch,
                        toggleAutoGenerate: toggleAutoGenerate
                    }
                });
            }

            // 2. 检查 CSS 是否丢失 (应对 Iframe 重新加载)
            // 只有当 Utils 准备好，且页面上找不到样式标签时，才重新注入
            if (TTS_Utils && TTS_Utils.getStyleContent) {
                const currentCSS = TTS_Utils.getStyleContent();
                // 检查主页面
                if ($('#sovits-iframe-style-main').length === 0 && currentCSS) {
                    $('head').append(`<style id='sovits-iframe-style-main'>${currentCSS}</style>`);
                }
            }

            // 3. 只有在开启状态下，才去扫描消息气泡
            if (CACHE.settings.enabled) {
                window.TTS_Parser.scan();
            }
        }

        // ===========================================
        // 启动逻辑
        // ===========================================

        // 1. 首次加载数据
        refreshData();

        // 2. 启动心跳循环 (每 1.5 秒检查一次 UI 和 气泡)
        // 1500ms 是一个既不影响性能又能及时响应 UI 变化的平衡点
        setInterval(runWatchdog, 1500);

        // 3. 注册 DOM 监听器 (作为心跳的辅助，响应即时变化)
        // 使用 body 作为观察目标，因为 #chat 可能在启动时还不存在
        const observer = new MutationObserver((mutations) => {
            let shouldScan = false;
            // 简单的防抖逻辑：只有当有节点被添加时才触发扫描
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldScan = true;
                    break;
                }
            }
            if (shouldScan && CACHE.settings.enabled) {
                window.TTS_Parser.scan();
            }
        });

        // 监听整个 body 的子树变化
        observer.observe(document.body, { childList: true, subtree: true });

        // 4. 暴露全局刷新方法 (方便调试)
        window.refreshTTS = refreshData;

        // 5. 立即执行一次看门狗，确保刚加载时 UI 正常
        setTimeout(runWatchdog, 500);

    }
})();
