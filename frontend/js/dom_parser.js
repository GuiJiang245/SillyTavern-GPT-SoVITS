// static/js/dom_parser.js
(function () {
    const BARS_HTML = `<span class='sovits-voice-waves'><span class='sovits-voice-bar'></span><span class='sovits-voice-bar'></span><span class='sovits-voice-bar'></span></span>`;

    window.TTS_Parser = {
        init() {
            console.log("✅ [Parser] DOM 解析器已加载");
        },

        // 原 processMessageContent 的逻辑
        scan() {
            // 引用全局变量
            const CACHE = window.TTS_State.CACHE;
            const TTS_Utils = window.TTS_Utils;
            const Scheduler = window.TTS_Scheduler;

            // 1. 总开关拦截
            if (CACHE.settings.enabled === false) return;

            // 2. 获取当前模式
            const isIframeMode = CACHE.settings.iframe_mode === true;
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

                        // 注入 CSS
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

                        // 查找目标文本节点
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

                        // 执行替换
                        targets.each(function() {
                            const $p = $(this);
                            if ($p.html().indexOf("voice-bubble") !== -1) return;

                            if (TTS_Utils.VOICE_TAG_REGEX.test($p.html())) {
                                const newHtml = $p.html().replace(TTS_Utils.VOICE_TAG_REGEX, (match, spaceChars, name, emotion, text) => {
                                    const cleanName = name.trim();
                                    const cleanText = text.replace(/<[^>]+>|&lt;[^&]+&gt;/g, '').trim();
                                    const key = Scheduler.getTaskKey(cleanName, cleanText);

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
                                // 替换完立即触发调度
                                if (CACHE.settings.auto_generate) setTimeout(() => Scheduler.scanAndSchedule(), 100);
                            }
                        });
                    } catch (e) { }
                });

            } else {
                // ========================================
                // 模式 B: 普通卡 (mes_text)
                // ========================================
                if (currentCSS && $('#sovits-iframe-style-main').length === 0) {
                    $('head').append(`<style id='sovits-iframe-style-main'>${currentCSS}</style>`);
                }

                $('.mes_text').each(function() {
                    const $this = $(this);
                    if ($this.find('iframe').length > 0) return;
                    if ($this.attr('data-voice-processed') === 'true' || $this.find('.voice-bubble').length > 0) return;

                    const html = $this.html();
                    if (TTS_Utils.VOICE_TAG_REGEX.test(html)) {
                        TTS_Utils.VOICE_TAG_REGEX.lastIndex = 0;
                        const newHtml = html.replace(TTS_Utils.VOICE_TAG_REGEX, (match, spaceChars, name, emotion, text) => {
                            const cleanName = name.trim();
                            const cleanText = text.replace(/<[^>]+>|&lt;[^&]+&gt;/g, '').trim();
                            const key = Scheduler.getTaskKey(cleanName, cleanText);

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
                        if (CACHE.settings.auto_generate) setTimeout(() => Scheduler.scanAndSchedule(), 100);
                    }
                });
            }
        }
    };
})();
