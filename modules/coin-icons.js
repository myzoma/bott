/**
 * مدير أيقونات العملات
 * وحدة مستقلة لإدارة عرض أيقونات العملات
 */

class CoinIconsManager {
    constructor() {
        this.config = COINS_CONFIG;
        this.settings = COINS_SETTINGS;
        this.animationInterval = null;
        this.signals = { buy: [], sell: [] };
        this.isConnected = false;
        
        this.init();
    }

    /**
     * تهيئة المدير
     */
    init() {
        this.generateDynamicCSS();
        this.loadCSS();
        console.log('🪙 Coin Icons Manager initialized');
    }

    /**
     * تحميل CSS الخاص بالوحدة
     */
    loadCSS() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './modules/coin-icons/coin-icons.css';
        document.head.appendChild(link);
    }

    /**
     * إنشاء CSS ديناميكي للألوان
     */
    generateDynamicCSS() {
        const style = document.createElement('style');
        let css = '';
        
        Object.entries(this.config).forEach(([symbol, config]) => {
            css += `.${config.class} { color: ${config.color} !important; }\n`;
        });
        
        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * الحصول على رمز العملة
     */
    getCoinSymbol(fullSymbol) {
        return fullSymbol.replace('/USDT', '').toUpperCase();
    }

    /**
     * الحصول على معلومات الأيقونة
     */
    getCoinIcon(symbol) {
        const coinSymbol = this.getCoinSymbol(symbol);
        return this.config[coinSymbol] || this.settings.defaultIcon;
    }

    /**
     * خلط المصفوفة عشوائياً
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * تحديث عرض الأيقونات
     */
    updateCoinsIcons() {
        this.updateIconsList('buy');
        this.updateIconsList('sell');
    }

    /**
     * تحديث قائمة الأيقونات لنوع معين
     */
    updateIconsList(type) {
        const signals = this.signals[type] || [];
        const container = document.getElementById(`${type}CoinsIcons`);
        const countBadge = document.getElementById(`${type}Count`);
        
        if (!container || !countBadge) return;

        // تحديث العدد
        countBadge.textContent = signals.length;

        // مسح المحتوى السابق
        container.innerHTML = '';

        if (signals.length === 0) {
            container.innerHTML = '<span class="no-signals">لا توجد إشارات</span>';
            return;
        }

        // الحصول على العملات الفريدة وخلطها
        const uniqueCoins = [...new Set(signals.map(s => s.symbol))];
        const shuffledCoins = this.shuffleArray(uniqueCoins);
        const displayCoins = shuffledCoins.slice(0, this.settings.maxDisplayCoins);

        // إضافة الأيقونات
        this.renderCoinIcons(container, displayCoins, uniqueCoins.length);
    }

    /**
     * رسم أيقونات العملات
     */
    renderCoinIcons(container, displayCoins, totalCount) {
        displayCoins.forEach((symbol, index) => {
            const coinInfo = this.getCoinIcon(symbol);
            const coinSymbol = this.getCoinSymbol(symbol);
            
            const iconElement = this.createCoinIcon(coinInfo, coinSymbol, symbol, index);
            container.appendChild(iconElement);
        });

        // إضافة عداد العملات الإضافية
        const remainingCount = totalCount - displayCoins.length;
        if (remainingCount > 0) {
            const moreIcon = this.createMoreIcon(remainingCount);
            container.appendChild(moreIcon);
        }
    }

    /**
     * إنشاء عنصر أيقونة العملة
     */
    createCoinIcon(coinInfo, coinSymbol, fullSymbol, index) {
        const iconElement = document.createElement('i');
        iconElement.className = `fa ${coinInfo.icon} coin-icon ${coinInfo.class} fade-in`;
        iconElement.title = `${coinSymbol} - ${fullSymbol}`;
        iconElement.setAttribute('aria-hidden', 'true');
        iconElement.style.animationDelay = `${index * 50}ms`;
        
        // إضافة حدث النقر
        iconElement.addEventListener('click', () => {
            this.onCoinClick(fullSymbol);
        });
        
        return iconElement;
    }

    /**
     * إنشاء أيقونة العملات الإضافية
     */
    createMoreIcon(count) {
        const moreIcon = document.createElement('span');
        moreIcon.className = 'coin-icon coin-default';
        moreIcon.innerHTML = `+${count}`;
        moreIcon.title = `${count} عملة إضافية`;
        moreIcon.style.fontSize = '14px';
        moreIcon.style.fontWeight = 'bold';
        return moreIcon;
    }

    /**
     * معالج النقر على العملة
     */
    onCoinClick(symbol) {
        console.log(`🪙 Clicked on ${symbol}`);
        // يمكن إضافة المزيد من الوظائف هنا
        this.highlightCoin(symbol);
    }

    /**
     * تمييز العملة
     */
    highlightCoin(symbol) {
        const coinSymbol = this.getCoinSymbol(symbol);
        const icons = document.querySelectorAll('.coin-icon');
        
        icons.forEach(icon => {
            if (icon.title && icon.title.includes(coinSymbol)) {
                icon.classList.add('pulse');
                setTimeout(() => {
                    icon.classList.remove('pulse');
                }, 1000);
            }
        });
    }

    /**
     * بدء التحريك العشوائي
     */
    startRandomAnimation() {
        this.stopRandomAnimation(); // إيقاف أي تحريك سابق
        
        this.animationInterval = setInterval(() => {
            this.updateCoinsIcons();
        }, this.settings.shuffleInterval);
        
        console.log('🔄 Random animation started');
    }

    /**
     * إيقاف التحريك العشوائي
     */
    stopRandomAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
            console.log('⏹️ Random animation stopped');
        }
    }

    /**
     * ربط مع مدير الإشارات
     */
    connectToSignalManager(signalManager) {
        if (this.isConnected) {
            console.warn('⚠️ Already connected to Signal Manager');
            return;
        }

        this.signals = signalManager.signals;
        this.addSignalListeners(signalManager);
        this.isConnected = true;
        
        console.log('🔗 Connected to Signal Manager');
        
        // تحديث فوري
        this.updateCoinsIcons();
    }

    /**
     * إضافة مستمعين للأحداث
     */
    addSignalListeners(signalManager) {
        // حفظ الدوال الأصلية
        const originalAddSignal = signalManager.addSignal?.bind(signalManager);
        const originalRemoveSignal = signalManager.removeSignal?.bind(signalManager);

        // تعديل دالة إضافة الإشارة
        if (originalAddSignal) {
            signalManager.addSignal = (...args) => {
                const result = originalAddSignal(...args);
                this.updateCoinsIcons();
                return result;
            };
        }

        // تعديل دالة حذف الإشارة
        if (originalRemoveSignal) {
            signalManager.removeSignal = (...args) => {
                const result = originalRemoveSignal(...args);
                this.updateCoinsIcons();
                return result;
            };
        }
    }

    /**
     * قطع الاتصال
     */
    disconnect() {
        this.stopRandomAnimation();
        this.isConnected = false;
        console.log('🔌 Disconnected from Signal Manager');
    }

    /**
     * إضافة عملة جديدة
     */
    addCoin(symbol, config) {
        this.config[symbol.toUpperCase()] = config;
        this.generateDynamicCSS();
        console.log(`➕ Added new coin: ${symbol}`);
    }

    /**
     * تحديث إعدادات العرض
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        if (newSettings.shuffleInterval && this.animationInterval) {
            this.startRandomAnimation(); // إعادة تشغيل بالفترة الجديدة
        }
        
        console.log('⚙️ Settings updated');
    }

    /**
     * الحصول على إحصائيات
     */
    getStats() {
        const buyCoins = [...new Set(this.signals.buy.map(s => s.symbol))];
        const sellCoins = [...new Set(this.signals.sell.map(s => s.symbol))];
        const allCoins = [...new Set([...buyCoins, ...sellCoins])];
        
        return {
            totalCoins: allCoins.length,
            buyCoins: buyCoins.length,
            sellCoins: sellCoins.length,
            totalSignals: this.signals.buy.length + this.signals.sell.length,
            isAnimating: !!this.animationInterval,
            isConnected: this.isConnected
        };
    }
}

// تصدير للاستخدام العام
window.CoinIconsManager = CoinIconsManager;
