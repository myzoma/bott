/**
 * نقطة دخول وحدة أيقونات العملات
 */

// تحميل الملفات المطلوبة
async function loadCoinIconsModule() {
    try {
        // تحميل الإعدادات
        await loadScript('./modules/coin-icons/coins-config.js');
        
        // تحميل المدير
        await loadScript('./modules/coin-icons/coin-icons.js');
        
        console.log('✅ Coin Icons Module loaded successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to load Coin Icons Module:', error);
        return false;
    }
}

// دالة مساعدة لتحميل السكريبت
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// تصدير
window.loadCoinIconsModule = loadCoinIconsModule;
