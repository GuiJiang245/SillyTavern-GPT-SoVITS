// static/js/events.js
(function () {
    // 模块内部变量，不再污染全局 window
    let currentAudio = null;

    window.TTS_Events = {
        init() {
            this.bindClickEvents();
            this.bindMessageEvents();
            this.bindMenuEvents();
            console.log("✅ [Events] 事件监听器已加载");
        },

        // --- 统一播放控制器 ---
        playAudio(key, audioUrl) {
            // 1. 停止当前正在播放的
            if (currentAudio) {
                currentAudio.pause();
                currentAudio = null;
            }

            // 2. 暴力重置所有动画 UI
            const resetAnim = () => {
                $('.voice-bubble').removeClass('playing');
                $('iframe').each(function() {
                    try { $(this).contents().find('.voice-bubble').removeClass('playing'); } catch(e){}
                });
            };
            resetAnim();

            // 3. 播放新音频
            if (!audioUrl) return;
            const audio = new Audio(audioUrl);
            currentAudio = audio;

            // 4. 定义动画同步函数
            const setAnim = (active) => {
                const func = active ? 'addClass' : 'removeClass';
                $(`.voice-bubble[data-key='${key}']`)[func]('playing');
                $('iframe').each(function(){
                    try { $(this).contents().find(`.voice-bubble[data-key='${key}']`)[func]('playing'); } catch(e){}
                });
            };

            setAnim(true); // 开始动画

            audio.onended = () => {
                currentAudio = null;
                setAnim(false); // 结束动画
            };

            // 错误处理
            audio.onerror = () => {
                console.error("音频播放出错");
                setAnim(false);
                currentAudio = null;
            };

            audio.play();
        },
        bindClickEvents() {
            $(document).on('click', '.voice-bubble', (e) => {
                const $btn = $(e.currentTarget); // 使用 currentTarget 确保点到的是按钮本身
                const charName = $btn.data('voice-name');
                const CACHE = window.TTS_State.CACHE;
                const Scheduler = window.TTS_Scheduler;

                // 状态 A: 已生成 (Ready)
                if ($btn.attr('data-status') === 'ready') {
                    const audioUrl = $btn.attr('data-audio-url') || $btn.data('audio-url');

                    if (!audioUrl) {
                        $btn.attr('data-status', 'error').removeClass('playing');
                        alert("音频丢失，请刷新页面或点击重试");
                        return;
                    }

                    // === 新增逻辑：如果当前正在播放，则停止 (Toggle Stop) ===
                    if ($btn.hasClass('playing')) {
                        // 1. 停止音频
                        if (currentAudio) {
                            currentAudio.pause();
                            currentAudio = null;
                        }
                        // 2. 清除主界面动画
                        $('.voice-bubble').removeClass('playing');
                        // 3. 清除 Iframe 内动画 (防止跨域报错用 try-catch)
                        $('iframe').each(function() {
                            try { $(this).contents().find('.voice-bubble').removeClass('playing'); } catch(e){}
                        });
                        return; // 直接结束，不执行后续播放逻辑
                    }
                    // ========================================================

                    // 获取 key (如果没有 data-key，尝试用 Scheduler 生成一个，兼容旧版)
                    const key = $btn.data('key') || Scheduler.getTaskKey(charName, $btn.data('text'));

                    // 【重要修复】强制将 key 写入 DOM，确保 playAudio 能通过属性选择器找到它
                    $btn.attr('data-key', key);

                    this.playAudio(key, audioUrl);
                }
                // 状态 B: 未生成或失败，尝试生成
                else if ($btn.attr('data-status') === 'waiting' || $btn.attr('data-status') === 'error') {
                    if (CACHE.settings.enabled === false) {
                        alert('TTS 插件总开关已关闭，请在配置面板中开启。');
                        return;
                    }

                    if (!CACHE.mappings[charName]) {
                        // 调用 UI 模块显示面板
                        if(window.TTS_UI) {
                            window.TTS_UI.showDashboard();
                            $('#tts-new-char').val(charName);
                            $('#tts-new-model').focus();
                        }
                        alert(`⚠️ 角色 "${charName}" 尚未绑定 TTS 模型，已自动为您填入角色名。\n请在右侧选择模型并点击“绑定”！`);
                    } else {
                        $btn.removeClass('error');
                        $btn.data('auto-play-after-gen', true); // 标记生成后自动播放
                        Scheduler.addToQueue($btn);
                        Scheduler.run();
                    }
                }
            });
            // === 【新增】右键 (PC) 或 长按 (手机) 呼出菜单 ===
            $(document).on('contextmenu', '.voice-bubble', (e) => {
                // 1. 只有已生成的语音才允许呼出菜单（如果未生成想允许重试，可以去掉这个判断）
                const $btn = $(e.currentTarget);
                if ($btn.attr('data-status') !== 'ready') return;

                e.preventDefault(); // 阻止浏览器默认的右键菜单

                const $menu = $('#tts-bubble-menu');

                // 2. 将被点击的气泡存入菜单数据中，供后续“重绘/收藏”使用
                $menu.data('target', $btn);

                // 3. 计算菜单位置 (兼容鼠标和触摸)
                let clientX = e.clientX;
                let clientY = e.clientY;
                // 兼容部分触摸事件结构
                if(e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length > 0) {
                    clientX = e.originalEvent.touches[0].clientX;
                    clientY = e.originalEvent.touches[0].clientY;
                }

                // 4. 简单的边界检测 (防止菜单超出屏幕右下角)
                let left = clientX + 10;
                let top = clientY + 10;
                if (left + 150 > $(window).width()) left = $(window).width() - 160;
                if (top + 160 > $(window).height()) top = $(window).height() - 170;

                $menu.css({ top: top + 'px', left: left + 'px' }).fadeIn(150);
            });

            // === 【新增】点击页面空白处关闭菜单 ===
            $(document).on('click', (e) => {
                // 如果点击的不是菜单本身，也不是菜单里的按钮，就关闭
                if (!$(e.target).closest('#tts-bubble-menu').length) {
                    $('#tts-bubble-menu').fadeOut(100);
                }
            });
        },

        // --- 跨窗口消息监听 (Iframe -> Main) ---
        bindMessageEvents() {
            window.addEventListener('message', (event) => {
                if (!event.data || event.data.type !== 'play_tts') return;

                const { key, text, charName, emotion } = event.data;
                const CACHE = window.TTS_State.CACHE;
                const Scheduler = window.TTS_Scheduler;

                // 1. 检查绑定
                if (!CACHE.mappings[charName]) {
                    if(window.TTS_UI) {
                        window.TTS_UI.showDashboard();
                        $('#tts-new-char').val(charName);
                        $('#tts-new-model').focus();
                    }
                    // 稍微延迟一下 alert，避免阻塞 UI 渲染
                    setTimeout(() => {
                        alert(`⚠️ 角色 "${charName}" 尚未绑定 TTS 模型。\n已为您自动填好角色名，请在右侧选择模型并点击“绑定”！`);
                    }, 100);
                    return;
                }

                // 2. 无论是否缓存，先停止当前播放 (在 playAudio 内部处理，但这里为了逻辑清晰先处理缓存播放)
                if (CACHE.audioMemory[key]) {
                    this.playAudio(key, CACHE.audioMemory[key]);
                    return;
                }

                // 3. 准备生成
                if (CACHE.settings.enabled === false) { alert('TTS 插件已关闭'); return; }

                // 尝试定位真实 DOM 按钮
                let $realBtn = null;
                $('iframe').each(function() {
                    try {
                        const b = $(this).contents().find(`.voice-bubble[data-key='${key}']`);
                        if(b.length) $realBtn = b;
                    } catch(e){}
                });
                if(!$realBtn || !$realBtn.length) $realBtn = $(`.voice-bubble[data-key='${key}']`);

                // 4. 执行调度
                if ($realBtn && $realBtn.length) {
                    $realBtn.attr('data-key', key);
                    $realBtn.removeClass('error').attr('data-status', 'waiting');
                    Scheduler.addToQueue($realBtn);
                    Scheduler.run();
                } else {
                    console.warn("[TTS] 按钮DOM丢失，等待DOM刷新后重试...");
                    // 没找到 DOM 可能是页面还在渲染，延迟重试
                    setTimeout(() => { window.postMessage(event.data, '*'); }, 200);
                }
            });
        },

        bindMenuEvents() {
            // 1. 重绘 (Re-Roll) - 真正的服务端删除
            $(document).on('click', '#tts-action-reroll', async () => {
                const $btn = $('#tts-bubble-menu').data('target');
                $('#tts-bubble-menu').fadeOut(100);

                if (!$btn || !$btn.length) return;

                // 获取生成参数（这些参数通常保存在按钮的 data 属性里，或者是生成时就需要的数据）
                // 注意：这里假设你的按钮上或者 TTS_Scheduler 里能找到 ref_audio_path 等参数
                // 如果按钮上只有 key，我们需要从 Scheduler 的任务队列或缓存的配置里反推，
                // 但最简单的办法是：在生成成功时，把关键参数（ref_audio, prompt 等）存到 $btn 的 data 属性里。

                // 这里为了演示，假设 Scheduler 生成时已经把参数绑定到了 DOM
                // 如果没有，你可能需要修改 Scheduler 在生成成功后 $btn.data('params', requestParams)
                const params = $btn.data('gen-params');

                if (!params) {
                    alert("无法获取生成参数，无法执行精准删除。\n(请确保 Scheduler 在生成成功后保存了参数)");
                    // 降级方案：仅重置 UI，不删服务器文件（虽然这样可能还是会读到缓存）
                    // 建议：修改 ui_main.js/scheduler.js 让其生成成功后 $btn.data('gen-params', 发送给API的数据)
                }

                if (!confirm("确定要删除服务端缓存并重新生成吗？")) return;

                // A. 调用 API 删除服务端文件
                try {
                    if(params) {
                        await window.TTS_API.deleteCache(params);
                        console.log("服务器缓存已删除");
                    }
                } catch(e) {
                    console.error("删除缓存失败", e);
                }

                // B. 清除前端内存缓存
                const key = $btn.data('key');
                const CACHE = window.TTS_State.CACHE;
                if (CACHE.audioMemory[key]) delete CACHE.audioMemory[key];

                // C. 重置按钮状态
                $btn.attr('data-status', 'waiting')
                    .removeClass('ready error playing')
                    .css('opacity', '0.6');

                // D. 重新加入队列
                window.TTS_Scheduler.addToQueue($btn);
                window.TTS_Scheduler.run();
            });

            // 2. 收藏 (Fav) - 带上下文
            $(document).on('click', '#tts-action-fav', async () => {
                const $btn = $('#tts-bubble-menu').data('target');
                $('#tts-bubble-menu').fadeOut(100);
                if (!$btn) return;

                // --- 核心：上下文采集 ---
                // 假设气泡结构是 .mes (SillyTavern 标准) 或类似结构
                // 我们往上找最近的 3 条消息
                let context = [];
                let $msgContainer = $btn.closest('.mes'); // 找到当前气泡容器
                if ($msgContainer.length) {
                    // 拿到之前的兄弟元素
                    let $prev = $msgContainer.prevAll('.mes').slice(0, 3);
                    // 因为 prevAll 是倒序的，我们要反转回来
                    $($prev.get().reverse()).each((i, el) => {
                        // 提取文本，去掉名字等杂质
                        let text = $(el).find('.mes_text').text() || $(el).text();
                        context.push(text.substring(0, 100) + "..."); // 截断一下防止太长
                    });
                }
                // -----------------------

                const favItem = {
                    char_name: $btn.data('voice-name') || "Unknown",
                    text: $btn.data('text'),
                    audio_url: $btn.attr('data-audio-url'),
                    context: context // 加入采集到的上下文
                };

                try {
                    await window.TTS_API.addFavorite(favItem);

                    // 提示成功
                    if(window.TTS_Utils && window.TTS_Utils.showNotification) {
                        window.TTS_Utils.showNotification("❤️ 已永久收藏", "success");
                    } else {
                        alert("❤️ 已保存到服务端收藏夹");
                    }
                } catch(e) {
                    alert("收藏失败: " + e.message);
                }
            });
        }
    };
})();


