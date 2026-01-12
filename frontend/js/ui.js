console.log("🔵 [UI] TTS_UI.js 开始加载...");
window.TTS_UI = window.TTS_UI || {};

(function(scope) {
    // 内部变量，用于存储从 index.js 传过来的核心数据
    let CTX = {
        CACHE: null,
        API_URL: "",
        Utils: null,
        Callbacks: {} // 存放 refreshData, saveSettings 等核心函数
    };

    // 1. 初始化函数：接收 index.js 的核心数据
    scope.init = function(context) {
        CTX = context;
        console.log("✅ [UI] TTS_UI 初始化完成");

        // 初始化悬浮球
        scope.initFloatingButton();
    };

    // 2. 初始化悬浮球
    scope.initFloatingButton = function() {
        if ($('#tts-manager-btn').length === 0) {
            $('body').append(`<div id="tts-manager-btn">🔊 TTS配置</div>`);
            // 使用 Utils 的拖拽功能，点击时触发打开面板
            CTX.Utils.makeDraggable($('#tts-manager-btn'), scope.showDashboard);
        }
    };

    // 3. 渲染配置面板 (核心 UI 代码)
    scope.showDashboard = function() {
        $('#tts-dashboard-overlay').remove();

        const settings = CTX.CACHE.settings;
        const currentBase = settings.base_dir || "";
        const currentCache = settings.cache_dir || "";
        const isEnabled = settings.enabled !== false;

        // 获取远程配置
        const savedConfig = localStorage.getItem('tts_plugin_remote_config');
        const config = savedConfig ? JSON.parse(savedConfig) : { useRemote: false, ip: "" };
        const isRemote = config.useRemote;
        const remoteIP = config.ip;

        const html = `
        <div id="tts-dashboard-overlay" class="tts-overlay">
            <div id="tts-dashboard" class="tts-panel">
                <div class="tts-header">
                    <h3>🎧 TTS 角色语音配置</h3>
                    <button class="tts-close" onclick="$('#tts-dashboard-overlay').remove()">×</button>
                </div>
                <div class="tts-content">
                    <div class="tts-settings-zone" style="background:rgba(0, 0, 0, 0.15); padding:10px; border-radius:5px; margin-bottom:10px;">
                        <h4 style="margin:0 0 10px 0;">⚙️ 连接与系统设置</h4>

                        <div style="background:rgba(0,0,0,0.2); padding:8px; border-radius:4px; margin-bottom:8px; border:1px solid #555;">
                            <div style="margin-bottom:5px; font-weight:bold; color:#64b5f6;">📡 手机酒馆</div>
                            <label style="cursor:pointer; display:block; margin-bottom:5px;">
                                <input type="checkbox" id="tts-remote-switch" ${isRemote ? 'checked' : ''}>
                                开启远程连接 (手机酒馆连接到电脑Soviets模型)
                            </label>
                            <div id="tts-remote-input-area" style="display:${isRemote ? 'block' : 'none'}; margin-top:5px;">
                                <small>电脑局域网 IP:</small>
                                <div style="display:flex; gap:5px;">
                                    <input type="text" id="tts-remote-ip" value="${remoteIP}" placeholder="例如 192.168.1.10" style="flex:1;">
                                    <button id="tts-save-remote" class="btn-blue" style="padding:4px 8px;">保存并刷新</button>
                                </div>
                                <div style="font-size:11px; color:#aaa; margin-top:3px;">
                                    当前连接地址: <strong>${CTX.API_URL}</strong>
                                </div>
                            </div>
                        </div>

                        <div class="tts-settings-zone" style="background:rgba(0, 0, 0, 0.15); padding:10px; border-radius:5px; margin-bottom:10px;">
                            <h4 style="margin:0 0 10px 0;">⚙️ 功能设置</h4>
                            <div style="margin-bottom:8px;">
                                <label style="cursor:pointer; user-select:none;">
                                    <input type="checkbox" id="tts-master-switch" ${isEnabled ? 'checked' : ''}>
                                    启用插件 (TTS总开关)
                                </label>
                            </div>
                            <div style="margin-bottom:8px;">
                                <label><input type="checkbox" id="tts-toggle-auto" ${settings.auto_generate?'checked':''}> 收到消息时自动预加载语音</label>
                            </div>
                            <div style="margin-bottom:8px;">
                                <label style="cursor:pointer; color:#ffb74d;">
                                    <input type="checkbox" id="tts-iframe-switch" ${settings.iframe_mode ? 'checked' : ''}>
                                    启用美化卡/Iframe模式
                                </label>
                            </div>
                            <div class="tts-row-input">
                                <small>模型文件夹 (绝对路径):</small>
                                <input type="text" id="tts-base-path" value="${currentBase}" style="width:100%; font-family:monospace; font-size:12px;">
                            </div>
                            <div class="tts-row-input" style="margin-top:5px;">
                                <small>缓存文件夹 (绝对路径):</small>
                                <input type="text" id="tts-cache-path" value="${currentCache}" style="width:100%; font-family:monospace; font-size:12px;">
                            </div>
                            <div style="text-align:right; margin-top:5px;">
                                <button id="tts-btn-save-paths" class="btn-blue" style="padding:2px 8px; font-size:12px;">保存路径设置</button>
                            </div>
                        </div>

                        <div class="tts-row-input" style="margin-top:10px; border-top:1px solid #444; padding-top:10px;">
                            <small>🗣️ 参考音频语言:</small>
                            <select id="tts-lang-select" style="width:100%; margin-top:5px; background:#333; color:white; border:1px solid #555;">
                                <option value="default">Default (根目录)</option>
                                <option value="Chinese">Chinese (中文)</option>
                                <option value="Japanese">Japanese (日语)</option>
                                <option value="English">English (英语)</option>
                            </select>
                        </div>

                        <div class="tts-add-zone">
                            <h4>➕ 新增绑定 / 创建资源</h4>
                            <div class="tts-row">
                                <input type="text" id="tts-new-char" placeholder="SillyTavern 角色名">
                                <span class="arrow">🔗</span>
                                <select id="tts-new-model"><option disabled selected>加载模型列表...</option></select>
                                <button id="tts-btn-bind-new">绑定</button>
                            </div>
                            <div class="tts-sub-row">
                                <small>新建资源包：</small>
                                <input type="text" id="tts-create-folder-name" placeholder="文件夹名">
                                <button id="tts-btn-create-folder" class="btn-blue">创建</button>
                            </div>
                        </div>
                        <hr class="tts-divider">
                        <div class="tts-list-zone">
                            <h4>📋 已绑定列表</h4>
                            <div id="tts-mapping-list" class="tts-list-container"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('body').append(html);
        scope.renderDashboardList();
        scope.renderModelOptions();
        scope.bindEvents(); // 绑定面板上的按钮事件
    };

    // 4. 绑定事件逻辑 (从 index.js 迁移过来)
    scope.bindEvents = function() {
        // 美化卡开关
        $('#tts-iframe-switch').change(async function() {
            const isChecked = $(this).is(':checked');

            // 1. 先告诉用户正在保存
            const $label = $(this).parent();
            const originalText = $label.text();
            $label.text("正在保存设置...");

            try {
                // 2. 发送请求给后端保存
                await fetch(`${CTX.API_URL}/update_settings`, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ iframe_mode: isChecked })
                });

                // 3. 更新本地存储 (双重保险)
                CTX.CACHE.settings.iframe_mode = isChecked;
                localStorage.setItem('tts_plugin_iframe_mode', isChecked);

                alert(`已${isChecked ? '开启' : '关闭'}美化卡模式。\n页面即将刷新以应用更改...`);
                location.reload();

            } catch(e) {
                console.error("保存失败", e);
                alert("保存设置失败，请检查后端连接");
                $label.text(originalText); // 恢复文字
                $(this).prop('checked', !isChecked); // 回滚开关状态
            }
        });

        // 远程连接开关
        $('#tts-remote-switch').change(function() {
            const checked = $(this).is(':checked');
            if(checked) {
                $('#tts-remote-input-area').slideDown();
            } else {
                $('#tts-remote-input-area').slideUp();
                const ip = $('#tts-remote-ip').val().trim();
                localStorage.setItem('tts_plugin_remote_config', JSON.stringify({ useRemote: false, ip: ip }));
                location.reload();
            }
        });

        // 保存远程IP
        $('#tts-save-remote').click(function() {
            const ip = $('#tts-remote-ip').val().trim();
            if(!ip) { alert("请输入 IP 地址"); return; }
            localStorage.setItem('tts_plugin_remote_config', JSON.stringify({ useRemote: true, ip: ip }));
            alert("设置已保存，页面将刷新以连接新地址。");
            location.reload();
        });

        // 调用 index.js 传过来的回调
        $('#tts-master-switch').change(function() { CTX.Callbacks.toggleMasterSwitch($(this).is(':checked')); });
        $('#tts-toggle-auto').change(function() { CTX.Callbacks.toggleAutoGenerate($(this).is(':checked')); });
        $('#tts-lang-select').val(CTX.CACHE.settings.default_lang || 'default');

        $('#tts-lang-select').change(async function() {
            const lang = $(this).val();
            CTX.CACHE.settings.default_lang = lang;
            await fetch(`${CTX.API_URL}/update_settings`, {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ default_lang: lang })
            });
        });

        $('#tts-btn-save-paths').click(async function() {
            const btn = $(this);
            const oldText = btn.text();
            btn.text('保存中...').prop('disabled', true);
            const base = $('#tts-base-path').val().trim();
            const cache = $('#tts-cache-path').val().trim();

            // 调用 index.js 的 saveSettings
            const success = await CTX.Callbacks.saveSettings(base, cache);
            if(success) {
                alert('设置已保存！');
                CTX.Callbacks.refreshData().then(() => scope.renderModelOptions());
            } else {
                alert('保存失败，请检查控制台。');
            }
            btn.text(oldText).prop('disabled', false);
        });

        $('#tts-btn-bind-new').click(async function() {
            const charName = $('#tts-new-char').val().trim();
            const modelName = $('#tts-new-model').val();
            if(!charName || !modelName) { alert('请填写角色名并选择模型'); return; }
            await fetch(`${CTX.API_URL}/bind_character`, {
                method: 'POST', body: JSON.stringify({ char_name: charName, model_folder: modelName }),
                headers: {'Content-Type':'application/json'}
            });
            await CTX.Callbacks.refreshData();
            scope.renderDashboardList();
            $('#tts-new-char').val('');
        });

        $('#tts-btn-create-folder').click(async function() {
            const fName = $('#tts-create-folder-name').val().trim();
            if(!fName) return;
            const res = await fetch(`${CTX.API_URL}/create_model_folder`, {
                method: 'POST', body: JSON.stringify({ folder_name: fName }),
                headers: {'Content-Type':'application/json'}
            });
            if(res.ok) { alert('创建成功！'); CTX.Callbacks.refreshData().then(scope.renderModelOptions); $('#tts-create-folder-name').val(''); }
            else alert('创建失败，可能文件夹已存在。');
        });
    };

    // 5. 渲染下拉框
    scope.renderModelOptions = function() {
        const $select = $('#tts-new-model');
        const currentVal = $select.val();
        $select.empty().append('<option disabled value="">选择模型...</option>');
        const models = CTX.CACHE.models;
        if (Object.keys(models).length === 0) { $select.append('<option disabled>暂无模型文件夹</option>'); return; }
        Object.keys(models).forEach(k => { $select.append(`<option value="${k}">${k}</option>`); });
        if(currentVal) $select.val(currentVal);
        else $select.find('option:first').next().prop('selected', true);
    };

    // 6. 渲染已绑定列表
    scope.renderDashboardList = function() {
        const c = $('#tts-mapping-list').empty();
        const mappings = CTX.CACHE.mappings;
        if (Object.keys(mappings).length === 0) { c.append('<div class="tts-empty">暂无绑定记录</div>'); return; }
        Object.keys(mappings).forEach(k => {
            c.append(`
                <div class="tts-list-item">
                    <span class="col-name">${k}</span>
                    <span class="col-model">➡ ${mappings[k]}</span>
                    <div class="col-action"><button class="btn-red" onclick="window.TTS_UI.handleUnbind('${k}')">解绑</button></div>
                </div>
            `);
        });
    };

    // 7. 解绑操作 (挂在 scope 上供 HTML onclick 调用)
    scope.handleUnbind = async function(c) {
        await fetch(`${CTX.API_URL}/unbind_character`, {
            method: 'POST', body: JSON.stringify({ char_name: c }), headers: {'Content-Type':'application/json'}
        });
        await CTX.Callbacks.refreshData();
        scope.renderDashboardList();
        // 重置按钮状态
        $(`.voice-bubble[data-voice-name="${c}"]`).attr('data-status', 'waiting').removeClass('error playing ready');
    };

})(window.TTS_UI);
