// 文件: ui_templates.js

export function getFloatingButtonHTML() {
  return `<div id="tts-manager-btn">🔊 TTS配置</div>`;
}

export function getDashboardHTML(data) {
  const { isEnabled, settings, isRemote, remoteIP, currentBase, currentCache, currentLang } = data;

  return `
        <div id="tts-dashboard-overlay" class="tts-overlay">
            <div id="tts-dashboard" class="tts-panel">
                <div class="tts-header">
                    <h3 class="tts-header-title">🎧 语音配置中心</h3>
                    <button class="tts-close" onclick="$('#tts-dashboard-overlay').remove()"
                            style="background:transparent; border:none; color:inherit; font-size:24px; padding:0 10px;">×</button>
                </div>

                <div class="tts-content">
                    <div class="tts-card">
                        <div class="tts-card-title">🔌 系统状态</div>
                        <label class="tts-switch-row">
                            <span class="tts-switch-label">启用 TTS 插件</span>
                            <input type="checkbox" id="tts-master-switch" class="tts-toggle" ${
                              isEnabled ? 'checked' : ''
                            }>
                        </label>
                        <label class="tts-switch-row">
                            <span class="tts-switch-label">预加载模型(自动生成,建议开启)</span>
                            <input type="checkbox" id="tts-toggle-auto" class="tts-toggle" ${
                              settings.auto_generate ? 'checked' : ''
                            }>
                        </label>
                    </div>

                    <div class="tts-card">
                        <div class="tts-card-title">📡 连接模式</div>
                        <label class="tts-switch-row">
                            <span class="tts-switch-label">远程模式 (局域网部署用)</span>
                            <input type="checkbox" id="tts-remote-switch" class="tts-toggle" ${
                              isRemote ? 'checked' : ''
                            }>
                        </label>
                        <div id="tts-remote-input-area" style="display:${
                          isRemote ? 'block' : 'none'
                        }; margin-top:10px; padding-top:10px; border-top:1px dashed #444;">
                            <div class="tts-input-label">电脑 IP</div>
                            <div style="display:flex; gap:8px;">
                                <input type="text" id="tts-remote-ip" class="tts-modern-input" value="${remoteIP}" placeholder="192.168.x.x">
                                <button id="tts-save-remote" class="btn-primary">保存</button>
                            </div>
                        </div>
                    </div>

                    <div class="tts-card">
                        <div class="tts-card-title">🎨 视觉体验</div>
                        <label class="tts-switch-row">
                            <span class="tts-switch-label">美化卡专用模式，非前端美化卡请勿勾选</span>
                            <input type="checkbox" id="tts-iframe-switch" class="tts-toggle" ${
                              settings.iframe_mode ? 'checked' : ''
                            }>
                        </label>

                        <div class="tts-input-row">
                            <span class="tts-input-label">气泡风格</span>
                            <div class="tts-custom-select" id="style-dropdown" style="margin-top:5px;">
                                <div class="select-trigger" data-value="default">
                                    <span><i class="fa-solid fa-leaf" style="color:#84b044;"></i> 森野·极简</span>
                                    <i class="arrow-icon">▼</i>
                                </div>
                                <div class="select-options">
                                    <div class="option-item" data-value="default"><i class="fa-solid fa-leaf" style="color:#84b044;"></i> 森野·极简</div>
                                    <div class="option-item" data-value="cyberpunk"><i class="fa-solid fa-bolt" style="color:#00ffff;"></i> 赛博·霓虹</div>
                                    <div class="option-item" data-value="ink"><i class="fa-solid fa-pen-nib" style="color:#333;"></i> 水墨·烟雨</div>
                                    <div class="option-item" data-value="kawaii"><i class="fa-solid fa-gem" style="color:#a18cd1;"></i> 幻彩·琉璃</div>
                                    <div class="option-item" data-value="bloom"><i class="fa-solid fa-spa" style="color:#ff6f61;"></i> 花信·初绽</div>
                                    <div class="option-item" data-value="rouge"><i class="fa-solid fa-wine-glass" style="color:#be3455;"></i> 魅影·微醺</div>
                                    <div class="option-item" data-value="holo"><i class="fa-solid fa-rocket" style="color:#6667ab;"></i> 星舰·光环</div>
                                    <div class="option-item" data-value="scroll"><i class="fa-solid fa-scroll" style="color:#a47764;"></i> 羊皮·史诗</div>
                                    <div class="option-item" data-value="steampunk"><i class="fa-solid fa-gear" style="color:#b8860b;"></i> 蒸汽·机械</div>
                                    <div class="option-item" data-value="tactical"><i class="fa-solid fa-crosshairs" style="color:#0f4c81;"></i> 战术·指令</div>
                                    <div class="option-item" data-value="obsidian"><i class="fa-solid fa-moon" style="color:#ffd700;"></i> 黑曜石·极夜</div>
                                    <div class="option-item" data-value="classic"><i class="fa-solid fa-compact-disc" style="color:#8b7355;"></i> 旧日·回溯</div>
                                    <div class="option-item" data-value="custom"><i class="fa-solid fa-palette" style="color:#9c27b0;"></i> 自定义</div>
                                </div>
                            </div>
                            <input type="hidden" id="style-selector" value="default">
                        </div>

                        <div id="tts-custom-theme-card" class="tts-card" style="display:none; margin-top:10px;">
                            <div class="tts-card-title">🎨 自定义主题</div>
                            <div style="font-size:11px; color:#888; padding:0 15px 6px;">调色后点击「保存为主题」即可生效</div>
                            <div class="tts-custom-theme-fields" style="padding:0 15px 12px;">
                                <div class="tts-input-row" style="align-items:center; margin-bottom:8px;">
                                    <span class="tts-switch-label" style="min-width:90px;">背景色</span>
                                    <input type="color" id="tts-custom-bg" value="#1a1a1e" style="width:40px; height:28px; padding:0; border:none; border-radius:6px; cursor:pointer;">
                                    <span id="tts-custom-bg-hex" style="font-size:11px; margin-left:8px;">#1a1a1e</span>
                                </div>
                                <div class="tts-input-row" style="align-items:center; margin-bottom:8px;">
                                    <span class="tts-switch-label" style="min-width:90px;">文字色</span>
                                    <input type="color" id="tts-custom-text" value="#e0e0e0" style="width:40px; height:28px; padding:0; border:none; border-radius:6px; cursor:pointer;">
                                    <span id="tts-custom-text-hex" style="font-size:11px; margin-left:8px;">#e0e0e0</span>
                                </div>
                                <div class="tts-input-row" style="align-items:center; margin-bottom:8px;">
                                    <span class="tts-switch-label" style="min-width:90px;">强调色</span>
                                    <input type="color" id="tts-custom-accent" value="#6667ab" style="width:40px; height:28px; padding:0; border:none; border-radius:6px; cursor:pointer;">
                                    <span id="tts-custom-accent-hex" style="font-size:11px; margin-left:8px;">#6667ab</span>
                                </div>
                                <div class="tts-input-row" style="align-items:center; margin-bottom:8px;">
                                    <span class="tts-switch-label" style="min-width:90px;">输入框背景</span>
                                    <input type="color" id="tts-custom-input-bg" value="#2a2a2e" style="width:40px; height:28px; padding:0; border:none; border-radius:6px; cursor:pointer;">
                                    <span id="tts-custom-input-bg-hex" style="font-size:11px; margin-left:8px;">#2a2a2e</span>
                                </div>
                                <div class="tts-input-row" style="align-items:center; margin-bottom:8px;">
                                    <span class="tts-switch-label" style="min-width:90px;">输入框文字</span>
                                    <input type="color" id="tts-custom-input-text" value="#ffffff" style="width:40px; height:28px; padding:0; border:none; border-radius:6px; cursor:pointer;">
                                    <span id="tts-custom-input-text-hex" style="font-size:11px; margin-left:8px;">#ffffff</span>
                                </div>
                            </div>
                            <div style="padding:0 15px 12px;">
                                <button type="button" id="tts-save-custom-theme" class="btn-primary" style="width:100%;">保存为主题</button>
                            </div>
                        </div>

                        <div class="tts-switch-row" style="flex-wrap:wrap;">
                            <span class="tts-switch-label" style="flex:0 0 auto;">来电框架</span>
                            <div class="tts-custom-select" id="frame-dropdown" style="flex:1; min-width:120px;">
                                <div class="select-trigger" data-value="modern">
                                    <span>📱 现代手机</span>
                                    <i class="arrow-icon">▼</i>
                                </div>
                                <div class="select-options">
                                    <div class="option-item frame-option" data-value="modern">📱 现代手机</div>
                                    <div class="option-item frame-option" data-value="mirror">🪞 双面镜</div>
                                    <div class="option-item frame-option" data-value="holographic">🛸 全息投影</div>
                                    <div class="option-item frame-option" data-value="jade">🧿 传音玉简</div>
                                    <div class="option-item frame-option" data-value="crystal">💎 水晶棱镜</div>
                                    <div class="option-item frame-option" data-value="cosmos">🌌 星空深渊</div>
                                </div>
                            </div>
                            <input type="hidden" id="frame-selector" value="modern">
                        </div>
                        <div style="font-size:11px; color:#888; padding:0 15px 10px;">改变手机外壳风格：魔法镜、赛博朋克、古风玉简、梦幻水晶、星空宇宙</div>

                        <div class="tts-switch-row" style="flex-wrap:wrap;">
                            <span class="tts-switch-label" style="flex:0 0 auto;">来电背景</span>
                            <div style="display:flex; gap:8px; flex:1; min-width:120px;">
                                <input type="file" id="tts-bg-upload" accept="image/*" style="display:none;">
                                <button id="tts-bg-upload-btn" class="btn-primary" style="flex:1; padding:6px 10px !important;">📷 上传</button>
                                <button id="tts-bg-clear-btn" class="btn-secondary" style="padding:6px 10px; display:flex; align-items:center; justify-content:center;">🗑️</button>
                            </div>
                        </div>
                        <div id="tts-bg-preview" style="margin:8px 15px; display:none;">
                            <img src="" alt="背景预览" style="width:100%; height:60px; object-fit:cover; border-radius:8px; border:1px solid #444;">
                        </div>

                        <div class="tts-card-title" style="margin-top:14px;">📱 App 图标</div>
                        <div style="font-size:11px; color:#888; padding:0 15px 4px;">上传整块图标图片（含背景与图案，替换整个格子），建议正方形，小于 200KB</div>
                        <div id="tts-app-icons-zone" style="padding:8px 15px;">
                            <div class="tts-app-icon-row" data-app="incoming_call"><span class="tts-switch-label" style="min-width:72px;">来电</span><input type="file" class="tts-app-icon-upload" accept="image/*" data-app="incoming_call" style="display:none;"><button type="button" class="btn-secondary tts-app-icon-btn" data-app="incoming_call">上传</button><button type="button" class="btn-secondary tts-app-icon-clear" data-app="incoming_call">清除</button><span class="tts-app-icon-preview" data-app="incoming_call" style="margin-left:8px; width:28px; height:28px; border-radius:6px; overflow:hidden; display:inline-flex; align-items:center; justify-content:center; background:#333;"></span></div>
                            <div class="tts-app-icon-row" data-app="settings"><span class="tts-switch-label" style="min-width:72px;">系统设置</span><input type="file" class="tts-app-icon-upload" accept="image/*" data-app="settings" style="display:none;"><button type="button" class="btn-secondary tts-app-icon-btn" data-app="settings">上传</button><button type="button" class="btn-secondary tts-app-icon-clear" data-app="settings">清除</button><span class="tts-app-icon-preview" data-app="settings" style="margin-left:8px; width:28px; height:28px; border-radius:6px; overflow:hidden; display:inline-flex; align-items:center; justify-content:center; background:#333;"></span></div>
                            <div class="tts-app-icon-row" data-app="favorites"><span class="tts-switch-label" style="min-width:72px;">收藏夹</span><input type="file" class="tts-app-icon-upload" accept="image/*" data-app="favorites" style="display:none;"><button type="button" class="btn-secondary tts-app-icon-btn" data-app="favorites">上传</button><button type="button" class="btn-secondary tts-app-icon-clear" data-app="favorites">清除</button><span class="tts-app-icon-preview" data-app="favorites" style="margin-left:8px; width:28px; height:28px; border-radius:6px; overflow:hidden; display:inline-flex; align-items:center; justify-content:center; background:#333;"></span></div>
                            <div class="tts-app-icon-row" data-app="eavesdrop"><span class="tts-switch-label" style="min-width:72px;">对话追踪</span><input type="file" class="tts-app-icon-upload" accept="image/*" data-app="eavesdrop" style="display:none;"><button type="button" class="btn-secondary tts-app-icon-btn" data-app="eavesdrop">上传</button><button type="button" class="btn-secondary tts-app-icon-clear" data-app="eavesdrop">清除</button><span class="tts-app-icon-preview" data-app="eavesdrop" style="margin-left:8px; width:28px; height:28px; border-radius:6px; overflow:hidden; display:inline-flex; align-items:center; justify-content:center; background:#333;"></span></div>
                        </div>
                    </div>

                    <div class="tts-card">
                        <div class="tts-card-title">📂 路径与语言配置</div>

                        <div class="tts-switch-row">
                            <span class="tts-switch-label">参考语言</span>
                            <select id="tts-lang-select" class="tts-modern-input" style="flex:1; min-width:100px;">
                                <option value="default" ${currentLang === 'default' ? 'selected' : ''}>Default</option>
                                <option value="Chinese" ${currentLang === 'Chinese' ? 'selected' : ''}>Chinese</option>
                                <option value="Japanese" ${
                                  currentLang === 'Japanese' ? 'selected' : ''
                                }>Japanese</option>
                                <option value="English" ${currentLang === 'English' ? 'selected' : ''}>English</option>
                            </select>
                        </div>
                        <div style="font-size:11px; color:#888; padding:0 15px 10px;">对应 reference_audios 下的子文件夹</div>

                        <div style="padding:0 15px 10px;">
                            <button id="tts-btn-save-paths" class="btn-primary" style="width:100%;">保存配置</button>
                        </div>
                    </div>

                    <div class="tts-card">
                        <div class="tts-card-title">🔗 角色绑定</div>
                         <div style="display:flex; gap:8px; margin-bottom:12px;">
                            <input type="text" id="tts-new-char" class="tts-modern-input" style="flex: 1; min-width: 0;" placeholder="角色名">

                            <div class="tts-custom-select" id="model-dropdown" style="flex: 2; min-width: 0;">
                                <div class="select-trigger" data-value="">
                                    <span>选择模型...</span>
                                    <i class="arrow-icon">▼</i>
                                </div>
                                <div class="select-options">
                                    <div class="option-item model-option" data-value="" disabled>加载中...</div>
                                </div>
                            </div>
                            <input type="hidden" id="model-selector" value="">
                        </div>

                        <button id="tts-btn-bind-new" class="btn-primary" style="width:100%">+ 绑定</button>
                        <div class="tts-list-zone" style="margin-top:15px;">
                            <div id="tts-mapping-list" class="tts-list-container" style="border:none; background:transparent;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}
export function getBubbleMenuHTML() {
  return `
    <div id="tts-bubble-menu" class="tts-context-menu" style="display:none;">
        <div class="menu-item" id="tts-action-download">
            <span class="icon">⬇️</span> 下载语音 (Download)
        </div>
        <div class="divider"></div>
        <div class="menu-item" id="tts-action-reroll">
            <span class="icon">🔄</span> 重绘 (Re-Roll)
        </div>
        <div class="menu-item" id="tts-action-fav">
            <span class="icon">❤️</span> 收藏 (Favorite)
        </div>
        <div class="divider"></div>
        <div class="menu-item close-item" style="color:#999; justify-content:center; font-size:12px;">
            点击外部关闭
        </div>
    </div>
    `;
}
