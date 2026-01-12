console.log("🔵 [1] TTS_Utils.js 开始加载...");
window.TTS_Utils = window.TTS_Utils || {};

(function(scope) {
    // 1. 正则表达式
    scope.VOICE_TAG_REGEX = /(\s*)\[TTSVoice[:：]\s*([^:：]+)\s*[:：]\s*([^:：]*)\s*[:：]\s*(.*?)\]/gi;

    // 2. CSS 状态管理
    let globalStyleContent = "";

    scope.getStyleContent = function() {
        return globalStyleContent;
    };

    // 注入主页面样式
    scope.injectStyles = function() {
        if (!globalStyleContent || $('#tts-style-injection').length > 0) return;
        $('head').append(`<style id="tts-style-injection">${globalStyleContent}</style>`);
    };

    // 加载 CSS (包含回调机制)
    scope.loadGlobalCSS = async function(url, afterLoadCallback) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                globalStyleContent = await res.text();
                console.log("[TTS] Style loaded successfully.");

                // 立即注入主界面
                scope.injectStyles();

                // 执行回调 (通常用于处理 Iframe 穿透)
                if (afterLoadCallback) afterLoadCallback(globalStyleContent);
            } else {
                console.error("[TTS] Failed to load style.css. Status:", res.status);
            }
        } catch (e) {
            console.error("[TTS] CSS Load Error:", e);
        }
    };

    // 3. 通知提示
    scope.showNotification = function(msg, type = 'error') {
        let $bar = $('#tts-notification-bar');
        if ($bar.length === 0) {
            $('body').append(`<div id="tts-notification-bar"></div>`);
            $bar = $('#tts-notification-bar');
        }
        const bgColor = type === 'error' ? '#d32f2f' : '#43a047';
        $bar.text(msg).css('background', bgColor).addClass('show');
        setTimeout(() => { $bar.removeClass('show'); }, 4000);
    };

    // 4. 拖拽逻辑
    scope.makeDraggable = function($el, onClick) {
        let isDragging = false;
        let hasMoved = false;
        let startX, startY, startLeft, startTop;
        const el = $el[0];

        const start = (clientX, clientY) => {
            isDragging = true; hasMoved = false;
            startX = clientX; startY = clientY;
            const rect = el.getBoundingClientRect();
            startLeft = rect.left; startTop = rect.top;
            el.style.right = 'auto';
            el.style.left = startLeft + 'px';
            el.style.top = startTop + 'px';
            $el.css('opacity', '0.8');
        };

        const move = (clientX, clientY) => {
            if (!isDragging) return;
            const dx = clientX - startX;
            const dy = clientY - startY;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMoved = true;
            el.style.left = (startLeft + dx) + 'px';
            el.style.top = (startTop + dy) + 'px';
        };

        const end = () => {
            isDragging = false;
            $el.css('opacity', '1');
            if (!hasMoved && onClick) onClick();
        };

        $el.on('mousedown', e => { start(e.clientX, e.clientY); });
        $(document).on('mousemove', e => { if(isDragging) { e.preventDefault(); move(e.clientX, e.clientY); }});
        $(document).on('mouseup', () => { if(isDragging) end(); });
        $el.on('touchstart', e => { const touch = e.originalEvent.touches[0]; start(touch.clientX, touch.clientY); });
        $el.on('touchmove', e => { if(isDragging) { if(e.cancelable) e.preventDefault(); const touch = e.originalEvent.touches[0]; move(touch.clientX, touch.clientY); }});
        $el.on('touchend', () => { if(isDragging) end(); });
    };
    console.log("🟢 [2] TTS_Utils.js 执行完毕，对象已挂载:", window.TTS_Utils);
})(window.TTS_Utils);
