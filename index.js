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
    const uiURL = `${MANAGER_API}/static/js/ui.js`; // 新增
    // 链式加载： Utils -> UI -> Init
    $.getScript(utilsURL)
        .done(function() {
        console.log("✅ [Loader] utils.js 加载成功");
        // 加载 UI
        $.getScript(uiURL)
            .done(function() {
            console.log("✅ [Loader] ui.js 加载成功");
            initPlugin(); // 全部加载完才启动
        })
            .fail(function() { console.error("❌ 无法加载 ui.js"); });
    })
        .fail(function() {
        // 备用尝试 (兼容旧路径)
        $.getScript(`${MANAGER_API}/static/utils.js`).done(() => initPlugin());
    });


    // ================= 动态加载 Utils =================
    console.log("🔵 [Loader] 正在从 Python 后端加载 utils.js ...");

    // 使用 jQuery 动态加载脚本
    $.getScript(utilsURL)
        .done(function() {
        console.log("✅ [Loader] utils.js 加载成功，启动主逻辑。");
        initPlugin(); // 加载成功后，才运行原来的逻辑
    })
        .fail(function(jqxhr, settings, exception) {
        console.error("❌ [Loader] 无法加载 utils.js，请检查 manager.py 是否运行，以及文件路径是否正确。");
        console.error("尝试的地址:", utilsURL);
        // 备用尝试：如果文件不在 js 子文件夹里，尝试直接在 static 下找
        $.getScript(`${MANAGER_API}/static/utils.js`).done(() => initPlugin());
    });

    // ================================================
    // 将原本 index.js 的剩余所有逻辑包裹进这个主函数
    function initPlugin() {
        // 重新获取 Utils 对象 (此时它肯定存在了)
        const TTS_Utils = window.TTS_Utils;

        // 【修改】使用 Utils 加载 CSS
        TTS_Utils.loadGlobalCSS(`${MANAGER_API}/static/css/style.css`, (cssContent) => {
            // 回调：CSS加载完毕后，手动触发一次 Iframe 扫描，解决穿透时序问题
            processMessageContent();

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
        // ... CACHE 和 CURRENT_LOADED 定义 ...
        // ===========================================

        let CACHE = {
            models: {}, mappings: {}, settings: { auto_generate: true, enabled: true },
            audioMemory: {}, pendingTasks: new Set()
        };

        let CURRENT_LOADED = { gpt_path: null, sovits_path: null };

        async function refreshData() {
            try {
                TTS_Utils.injectStyles();
                // 尝试连接后端
                const res = await fetch(`${MANAGER_API}/get_data`);

                // 1. 如果连接成功，恢复按钮样式（如果是红色的话）
                $('#tts-manager-btn').css({ 'border-color': 'rgba(255,255,255,0.3)', 'color': '#fff' }).text('🔊 TTS配置');

                const data = await res.json();

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
            if (checked) processMessageContent();

            try {
                await fetch(`${MANAGER_API}/update_settings`, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ enabled: checked })
                });
            } catch(e) {}
        }

        async function toggleAutoGenerate(checked) {
            CACHE.settings.auto_generate = checked;
            try {
                await fetch(`${MANAGER_API}/update_settings`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ auto_generate: checked }) });
                if (checked && CACHE.settings.enabled !== false) BatchScheduler.scanAndSchedule();
            } catch(e) {}
        }

        const BatchScheduler = {
            queue: [], isRunning: false,
            updateStatus($btn, status) {
                $btn.attr('data-status', status).removeClass('playing loading error');
                if (status === 'queued' || status === 'generating') $btn.addClass('loading');
                else if (status === 'error') $btn.addClass('error');
            },
            getTaskKey(charName, text) { return `${charName}_${text}`; },
            // === 新增：模型完整性校验函数 ===
            validateModel(modelName, config) {
                let missing = [];
                if (!config.gpt_path) missing.push("GPT权重");
                if (!config.sovits_path) missing.push("SoVITS权重");

                // 检查是否有任意一种语言的音频
                const langs = config.languages || {};
                if (Object.keys(langs).length === 0) {
                    missing.push("参考音频(reference_audios)");
                }

                if (missing.length > 0) {
                    TTS_Utils.showNotification(`❌ 模型 "${modelName}" 缺失: ${missing.join(', ')}`, 'error');
                    return false;
                }
                return true;
            },
            scanAndSchedule() {
                // 如果总开关关闭，不执行扫描
                if (CACHE.settings.enabled === false) return;

                const $lastMessage = $('.mes_text').last();
                $lastMessage.find('.voice-bubble[data-status="waiting"]').each((_, btn) => {
                    const charName = $(btn).data('voice-name');
                    if (CACHE.mappings[charName]) {
                        this.addToQueue($(btn));
                    }
                });
                if (!this.isRunning && this.queue.length > 0) this.run();
            },
            addToQueue($btn) {
                if ($btn.attr('data-status') !== 'waiting') return;
                const charName = $btn.data('voice-name');
                const text = $btn.data('text');
                const key = this.getTaskKey(charName, text);
                if (CACHE.audioMemory[key]) { $btn.data('audio-url', CACHE.audioMemory[key]); this.updateStatus($btn, 'ready'); return; }
                if (CACHE.pendingTasks.has(key)) { this.updateStatus($btn, 'queued'); return; }
                this.updateStatus($btn, 'queued'); CACHE.pendingTasks.add(key);
                this.queue.push({ charName, emotion: $btn.data('voice-emotion'), text, key, $btn });
            },
            async run() {
                if (CACHE.settings.enabled === false) { this.isRunning = false; this.queue = []; return; }

                this.isRunning = true;
                let groups = {}; let unboundTasks = [];
                while(this.queue.length > 0) {
                    const task = this.queue.shift();
                    if (CACHE.audioMemory[task.key]) { this.finishTask(task.key, CACHE.audioMemory[task.key]); continue; }
                    const mName = CACHE.mappings[task.charName];
                    if (!mName) { unboundTasks.push(task); continue; }
                    if (!groups[mName]) groups[mName] = [];
                    groups[mName].push(task);
                }
                unboundTasks.forEach(t => { this.updateStatus(t.$btn, 'error'); CACHE.pendingTasks.delete(t.key); });

                for (const modelName of Object.keys(groups)) {
                    const tasks = groups[modelName];
                    const modelConfig = CACHE.models[modelName];
                    // 如果模型配置不存在，或者 校验缺失文件
                    if (!modelConfig || !this.validateModel(modelName, modelConfig)) {
                        console.warn(`[TTS] Model ${modelName} is missing files. Skipping generation.`);
                        // 将该组所有任务标记为 Error，并不发送请求
                        tasks.forEach(t => {
                            this.updateStatus(t.$btn, 'error');
                            CACHE.pendingTasks.delete(t.key);
                        });
                        continue; // 直接跳过，不执行后面的 switchModel 和 processSingleTask
                    }
                    const checkPromises = tasks.map(async (task) => {
                        if (CACHE.audioMemory[task.key]) return { task, cached: true };
                        const cached = await this.checkCache(task, modelConfig);
                        return { task, cached };
                    });
                    const results = await Promise.all(checkPromises);
                    const tasksToGenerate = [];
                    for (const res of results) {
                        if (res.cached) await this.processSingleTask(res.task, modelConfig);
                        else tasksToGenerate.push(res.task);
                    }
                    if (tasksToGenerate.length > 0) {
                        try {
                            await this.switchModel(modelConfig);
                            for (const task of tasksToGenerate) await this.processSingleTask(task, modelConfig);
                        } catch (e) { tasksToGenerate.forEach(t => { this.updateStatus(t.$btn, 'error'); CACHE.pendingTasks.delete(t.key); }); }
                    }
                }
                this.isRunning = false;
                if (this.queue.length > 0) this.run();
            },
            finishTask(key, audioUrl) {
                CACHE.audioMemory[key] = audioUrl;
                CACHE.pendingTasks.delete(key);

                // 定义通用的更新逻辑
                const applyUpdate = ($el) => {
                    // 1. 尝试获取 key
                    let elKey = $el.attr('data-key');
                    // 2. 如果是普通卡没有 data-key，则通过内容计算
                    if (!elKey) {
                        elKey = this.getTaskKey($el.data('voice-name'), $el.data('text'));
                    }

                    // 3. 如果 Key 匹配，且状态不是 ready，则进行更新
                    if (elKey === key && $el.attr('data-status') !== 'ready') {
                        // 写入音频 URL
                        $el.attr('data-audio-url', audioUrl);

                        // 【关键】：更新状态，这会自动移除 .loading 类（参见 updateStatus 函数）
                        this.updateStatus($el, 'ready');

                        // 如果是自动播放触发的，点击它
                        if ($el.data('auto-play-after-gen')) {
                            $el.click();
                            $el.removeData('auto-play-after-gen');
                        }
                    }
                };

                // 范围 A: 更新主界面 (普通卡)
                $('.voice-bubble').each((_, el) => applyUpdate($(el)));

                // 范围 B: 更新 Iframe 内部 (美化卡修复核心)
                $('iframe').each(function() {
                    try {
                        $(this).contents().find('.voice-bubble').each((_, el) => applyUpdate($(el)));
                    } catch(e) {}
                });
            },
            async checkCache(task, modelConfig) {
                try {
                    // === 修改：获取当前设置的语言 ===
                    const currentLang = CACHE.settings.default_lang || 'default';

                    // 从 models[name].languages 中尝试获取
                    // 如果找不到选定的语言，回退到 'default'，如果还没有，取第一个可用的语言
                    let availableLangs = modelConfig.languages || {};
                    let targetRefs = availableLangs[currentLang];

                    if (!targetRefs) {
                        if (availableLangs['default']) targetRefs = availableLangs['default'];
                        else {
                            const keys = Object.keys(availableLangs);
                            if (keys.length > 0) targetRefs = availableLangs[keys[0]];
                        }
                    }

                    if (!targetRefs || targetRefs.length === 0) return false;

                    // 在目标语言列表中查找情感
                    let ref = targetRefs.find(r => r.emotion === task.emotion);
                    // 如果找不到对应情感，找该语言下的 default
                    if (!ref) ref = targetRefs.find(r => r.emotion === 'default');
                    // 如果还找不到，取该语言下的第一个
                    if (!ref) ref = targetRefs[0];

                    if (!ref) return false;
                    // === 修改结束 ===

                    const params = new URLSearchParams({ text: task.text, text_lang: "zh", ref_audio_path: ref.path, prompt_text: ref.text, prompt_lang: "zh", streaming_mode: "true", check_only: "true" });
                    const res = await fetch(`${MANAGER_API}/tts_proxy?${params}`);
                    return (await res.json()).cached === true;
                } catch { return false; }
            },
            async  switchModel(config) {
                if (CURRENT_LOADED.gpt_path === config.gpt_path && CURRENT_LOADED.sovits_path === config.sovits_path) return;

                // 修改：不再请求 SOVITS_API，而是请求 MANAGER_API 的代理接口
                const safeSwitch = async (endpoint, path) => {
                    // 注意这里使用的是 MANAGER_API
                    await fetch(`${MANAGER_API}/${endpoint}?weights_path=${path}`);
                };

                if (CURRENT_LOADED.gpt_path !== config.gpt_path) {
                    await safeSwitch('proxy_set_gpt_weights', config.gpt_path);
                    CURRENT_LOADED.gpt_path = config.gpt_path;
                }
                if (CURRENT_LOADED.sovits_path !== config.sovits_path) {
                    await safeSwitch('proxy_set_sovits_weights', config.sovits_path);
                    CURRENT_LOADED.sovits_path = config.sovits_path;
                }
            },
            async processSingleTask(task, modelConfig) {
                const { text, emotion, key, $btn } = task;

                // === 修改：同样的逻辑获取 ref ===
                const currentLang = CACHE.settings.default_lang || 'default';
                let availableLangs = modelConfig.languages || {};
                let targetRefs = availableLangs[currentLang];

                if (!targetRefs) {
                    // 找不到指定语言，尝试回退
                    if (availableLangs['default']) targetRefs = availableLangs['default'];
                    else {
                        const keys = Object.keys(availableLangs);
                        if (keys.length > 0) targetRefs = availableLangs[keys[0]];
                    }
                }

                if (!targetRefs) throw new Error("No ref audios found in any language");

                let ref = targetRefs.find(r => r.emotion === emotion);
                if (!ref) ref = targetRefs.find(r => r.emotion === 'default');
                if (!ref) ref = targetRefs[0];

                if (!ref) throw new Error("No ref audio");
                // === 修改结束 ===

                try {
                    let promptLangCode = "zh";
                    if (currentLang === "Japanese" || currentLang === "日语") promptLangCode = "ja";
                    if (currentLang === "English" || currentLang === "英语") promptLangCode = "en";

                    const params = new URLSearchParams({
                        text: text,
                        text_lang: promptLangCode, // 目标生成的文本语言，通常保持 zh 或根据实际情况
                        ref_audio_path: ref.path,
                        prompt_text: ref.text,
                        prompt_lang: promptLangCode, // 参考音频的语言
                        streaming_mode: "true"
                    });
                    const response = await fetch(`${MANAGER_API}/tts_proxy?${params}`);
                    if (!response.ok) throw new Error("Err");
                    const blob = await response.blob();
                    this.finishTask(key, URL.createObjectURL(blob));
                } catch (e) { this.updateStatus($btn, 'error'); CACHE.pendingTasks.delete(key); }
            }
        };

        // index.js 中原来的 saveSettings 改为接收参数
        async function saveSettings(base, cache) {
            // 如果没传参（旧逻辑），就去 DOM 找（兼容性），如果传了就用传的
            const b = base !== undefined ? base : $('#tts-base-path').val().trim();
            const c = cache !== undefined ? cache : $('#tts-cache-path').val().trim();

            try {
                await fetch(`${MANAGER_API}/update_settings`, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ base_dir: b, cache_dir: c })
                });
                return true;
            } catch(e) { console.error(e); return false; }
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

        // ===========================================
        // 最终完整版：新UI容器 + 旧版波动条 + 双端统一样式
        // ===========================================
        function processMessageContent() {
            // 1. 总开关拦截
            if (CACHE.settings.enabled === false) return;

            // 定义旧版波动条的 HTML 结构
            const BARS_HTML = `<span class='sovits-voice-waves'><span class='sovits-voice-bar'></span><span class='sovits-voice-bar'></span><span class='sovits-voice-bar'></span></span>`;

            // 2. 获取当前模式
            const isIframeMode = CACHE.settings.iframe_mode === true;
            // 【修正】获取 CSS 内容
            const currentCSS = TTS_Utils.getStyleContent();

            if (isIframeMode) {
                // ========================================
                // 模式 A: 美化卡 (Iframe)
                // ========================================
                $('iframe').each(function() {
                    try {
                        const $iframe = $(this);
                        const doc = $iframe.contents();
                        const head = doc.find('head');
                        const body = doc.find('body');

                        // 【修正】这里原来的 GLOBAL_STYLE_CONTENT 改为了 currentCSS
                        if (currentCSS && head.length > 0 && head.find('#sovits-iframe-style').length === 0) {
                            head.append(`<style id='sovits-iframe-style'>${currentCSS}</style>`);
                        }

                        // [B] 绑定事件 (保持不变)
                        if (!body.data('tts-event-bound')) {
                            body.on('click', '.voice-bubble', function(e) {
                                e.stopPropagation();
                                const $this = $(this);
                                const payload = {
                                    type: 'play_tts',
                                    key: $this.attr('data-key'),
                                    text: $this.attr('data-text'),
                                    charName: $this.attr('data-voice-name'),
                                    emotion: $this.attr('data-voice-emotion')
                                };
                                window.top.postMessage(payload, '*');
                            });
                            body.data('tts-event-bound', true);
                        }

                        // (查找目标的逻辑保持不变...)
                        const targets = body.find('*').filter(function() {
                            if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(this.tagName)) return false;
                            if ($(this).find('.voice-bubble').length > 0) return false;

                            let hasTargetText = false;
                            $(this).contents().each(function() {
                                if (this.nodeType === 3 && this.nodeValue && this.nodeValue.indexOf("[TTSVoice") !== -1) {
                                    hasTargetText = true;
                                    return false;
                                }
                            });
                            return hasTargetText;
                        });

                        targets.each(function() {
                            const $p = $(this);
                            if ($p.html().indexOf("voice-bubble") !== -1) return;

                            if (TTS_Utils.VOICE_TAG_REGEX.test($p.html())) {
                                const newHtml = $p.html().replace(TTS_Utils.VOICE_TAG_REGEX, (match, spaceChars, name, emotion, text) => {
                                    const cleanName = name.trim();
                                    const cleanText = text.replace(/<[^>]+>|&lt;[^&]+&gt;/g, '').trim();
                                    const key = BatchScheduler.getTaskKey(cleanName, cleanText);

                                    let status = 'waiting';
                                    let dataUrlAttr = '';
                                    let loadingClass = '';
                                    if (CACHE.audioMemory[key]) {
                                        status = 'ready';
                                        dataUrlAttr = `data-audio-url='${CACHE.audioMemory[key]}'`;
                                    } else if (CACHE.pendingTasks.has(key)) {
                                        status = 'queued';
                                        loadingClass = 'loading';
                                    }

                                    const d = Math.max(1, Math.ceil(cleanText.length * 0.25));
                                    const bubbleWidth = Math.min(220, 75 + d * 10);

                                    return `${spaceChars}<span class='voice-bubble ${loadingClass}'
                                    style='width: ${bubbleWidth}px; justify-content: space-between;'
                                    data-key='${key}'
                                    data-status='${status}' ${dataUrlAttr} data-text='${cleanText}'
                                    data-voice-name='${cleanName}' data-voice-emotion='${emotion.trim()}'>
                                    ${BARS_HTML}
                                    <span class='sovits-voice-duration'>${d}"</span>
                                </span>`;
                                });
                                $p.html(newHtml);
                                if (CACHE.settings.auto_generate) setTimeout(() => BatchScheduler.scanAndSchedule(), 100);
                            }
                        });
                    } catch (e) { }
                });

            } else {
                // ========================================
                // 模式 B: 普通卡 (mes_text)
                // ========================================

                // 【修正】这里原来的 GLOBAL_STYLE_CONTENT 改为了 currentCSS
                if (currentCSS && $('#sovits-iframe-style-main').length === 0) {
                    $('head').append(`<style id='sovits-iframe-style-main'>${currentCSS}</style>`);
                }

                $('.mes_text').each(function() {
                    // (普通卡的替换逻辑保持不变...)
                    const $this = $(this);
                    if ($this.find('iframe').length > 0) return;
                    if ($this.attr('data-voice-processed') === 'true' || $this.find('.voice-bubble').length > 0) return;

                    const html = $this.html();
                    if (TTS_Utils.VOICE_TAG_REGEX.test(html)) {
                        TTS_Utils.VOICE_TAG_REGEX.lastIndex = 0;
                        const newHtml = html.replace(TTS_Utils.VOICE_TAG_REGEX, (match, spaceChars, name, emotion, text) => {
                            const cleanName = name.trim();
                            const cleanText = text.replace(/<[^>]+>|&lt;[^&]+&gt;/g, '').trim();
                            const key = BatchScheduler.getTaskKey(cleanName, cleanText);

                            let status = 'waiting';
                            let dataUrlAttr = '';
                            let loadingClass = '';
                            if (CACHE.audioMemory[key]) {
                                status = 'ready';
                                dataUrlAttr = `data-audio-url='${CACHE.audioMemory[key]}'`;
                            } else if (CACHE.pendingTasks.has(key)) {
                                status = 'queued';
                                loadingClass = 'loading';
                            }

                            const d = Math.max(1, Math.ceil(cleanText.length * 0.25));
                            const bubbleWidth = Math.min(220, 60 + d * 10);

                            return `${spaceChars}<span class="voice-bubble ${loadingClass}"
                            style="width: ${bubbleWidth}px"
                            data-status="${status}" ${dataUrlAttr} data-text="${cleanText}"
                            data-voice-name="${cleanName}" data-voice-emotion="${emotion.trim()}">
                            ${BARS_HTML}
                            <span class="sovits-voice-duration">${d}"</span>
                        </span>`;
                        });

                        $this.html(newHtml);
                        $this.attr('data-voice-processed', 'true');
                        if (CACHE.settings.auto_generate) setTimeout(() => BatchScheduler.scanAndSchedule(), 100);
                    }
                });
            }
        }

        // ===========================================
        // 核心监听器：处理播放 + 跨窗口生成 (最终修复版)
        // ===========================================
        // ===========================================
        // 核心监听器：处理播放 + 跨窗口生成 (修复动画重置版)
        // ===========================================
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



        // 初始运行
        setTimeout(processMessageContent, 5000);


        setInterval(processMessageContent, 1000);
        if (typeof refreshData !== 'undefined') {
            window.refreshTTS = refreshData;
        }
        const observer = new MutationObserver(() => processMessageContent());
        const chatContainer = document.querySelector('#chat') || document.body;
        if (chatContainer) observer.observe(chatContainer, { childList: true, subtree: true });
        refreshData();
        window.refreshTTS = refreshData;
    }
})();
