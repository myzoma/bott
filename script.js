class UTBotScanner {
    constructor() {
        this.isRunning = false;
        this.symbols = [];
        this.signals = { buy: [], sell: [] };
        this.pinnedSignals = new Set();
        this.signalPrices = new Map();
this.symbolsFilter = {
        minVolume: 1000,        // الحد الأدنى للحجمل
        minPrice: 0.001,        // الحد الأدنى للسعر
        maxSymbols: 100,        // العدد الأقصى للرموز
        includeStableCoins: false // تضمين العملات المستقرة
    };
}
    updateSymbolsFilter(newFilter) {
    this.symbolsFilter = { ...this.symbolsFilter, ...newFilter };
    this.loadSymbols(); // إعادة تحميل الرموز
}
        // الإعدادات
        this.atrPeriod = 5;
        this.atrMultiplier = 1.0;
        this.timeframe = '1h';
        this.sensitivity = 'normal';
        
        // متغيرات إضافية
        this.scanInterval = null;
        this.updateInterval = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSymbols();
        this.autoStart();
    }

    initializeElements() {
        // العناصر الأساسية
        this.statusEl = document.getElementById('status');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.buySignalsEl = document.getElementById('buySignals');
        this.sellSignalsEl = document.getElementById('sellSignals');
        this.lastUpdateEl = document.getElementById('lastUpdate');
        this.atrPeriodEl = document.getElementById('atrPeriod');
        this.atrMultiplierEl = document.getElementById('atrMultiplier');
        
        // التحقق من وجود العناصر
        if (!this.statusEl || !this.startBtn || !this.stopBtn) {
            console.error('عناصر HTML مطلوبة غير موجودة');
            return;
        }
        
        this.addSensitivityControl();
    }

    addSensitivityControl() {
        if (document.getElementById('sensitivity')) return;

        const sensitivityDiv = document.createElement('div');
        sensitivityDiv.className = 'setting-item';
        sensitivityDiv.innerHTML = `
            <label>
                <i class="fas fa-crosshairs"></i>
                حساسية الإشارات:
                <select id="sensitivity">
                    <option value="high">عالية (المزيد من الإشارات)</option>
                    <option value="normal" selected>عادية</option>
                    <option value="low">منخفضة (إشارات أقل وأدق)</option>
                </select>
            </label>
        `;
        
        const settingsGroup = document.querySelector('.settings-group');
        if (settingsGroup) {
            settingsGroup.appendChild(sensitivityDiv);
        }
    }

    bindEvents() {
        // أزرار التحكم
        this.startBtn?.addEventListener('click', () => this.start());
        this.stopBtn?.addEventListener('click', () => this.stop());
        
        // إعدادات المؤشر
        this.atrPeriodEl?.addEventListener('change', (e) => {
            this.atrPeriod = parseInt(e.target.value);
            this.saveSettings();
        });
        
        this.atrMultiplierEl?.addEventListener('change', (e) => {
            this.atrMultiplier = parseFloat(e.target.value);
            this.saveSettings();
        });
        
        // إعدادات الحساسية
        const sensitivityEl = document.getElementById('sensitivity');
        sensitivityEl?.addEventListener('change', (e) => {
            this.sensitivity = e.target.value;
            this.saveSettings();
        });
        
        // إعدادات الإطار الزمني
        const timeframeEl = document.getElementById('timeframe');
        timeframeEl?.addEventListener('change', (e) => {
            this.timeframe = e.target.value;
            this.saveSettings();
        });
        
        // أزرار التحكم في الأقسام
        document.addEventListener('click', (e) => {
            if (e.target.matches('.clear-signals')) {
                this.clearSignals(e.target.dataset.type);
            }
            
            if (e.target.matches('.export-signals')) {
                this.exportSignals(e.target.dataset.type);
            }
            
            if (e.target.matches('.btn-pin')) {
                this.togglePin(e.target.closest('.signal-item'));
            }
            
            if (e.target.matches('.btn-copy')) {
                this.copySignal(e.target.closest('.signal-item'));
            }
            
            if (e.target.matches('.btn-alert')) {
                this.toggleAlert(e.target.closest('.signal-item'));
            }
        });
        
        // تحديث الأسعار كل 30 ثانية
        setInterval(() => this.updatePrices(), 30000);
        
        // حفظ الإعدادات عند تغيير النافذة
        window.addEventListener('beforeunload', () => this.saveSettings());
    }

   async loadSymbols() {
    try {
        console.log('جاري تحميل الرموز من بينانس...');
        
        // الحصول على جميع الرموز النشطة من بينانس
        const response = await fetch('https://api1.binance.com/api/v3/exchangeInfo');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // فلترة الرموز النشطة مع USDT فقط
        const usdtSymbols = data.symbols
            .filter(symbol => 
                symbol.status === 'TRADING' && 
                symbol.symbol.endsWith('USDT') &&
                symbol.permissions.includes('SPOT')
            )
            .map(symbol => symbol.symbol);
        
        // ترتيب حسب الحجم (الحصول على أكثر الرموز تداولاً)
        const topSymbols = await this.getTopTradingSymbols(usdtSymbols);
        
        this.symbols = topSymbols;
        
        console.log(`✅ تم تحميل ${this.symbols.length} رمز نشط من بينانس`);
        console.log('أهم الرموز:', this.symbols.slice(0, 10));
        
    } catch (error) {
        console.error('❌ خطأ في تحميل الرموز من بينانس:', error);
        
        // استخدام قائمة احتياطية في حالة الفشل
        this.symbols = await this.getFallbackSymbols();
        console.log(`⚠️ تم استخدام القائمة الاحتياطية: ${this.symbols.length} رمز`);
    }
}
async getTopTradingSymbols(allSymbols, limit = 100) {
    try {
        console.log('جاري ترتيب الرموز حسب الحجم...');
        
        // الحصول على إحصائيات 24 ساعة لجميع الرموز
        const response = await fetch('https://api1.binance.com/api/v3/ticker/24hr');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const stats = await response.json();
        
        // فلترة وترتيب الرموز USDT حسب الحجم
        const sortedSymbols = stats
            .filter(stat => 
                allSymbols.includes(stat.symbol) &&
                parseFloat(stat.volume) > 1000 && // حجم تداول أكبر من 1000
                parseFloat(stat.count) > 100     // عدد صفقات أكبر من 100
            )
            .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, limit)
            .map(stat => stat.symbol);
        
        console.log(`📊 تم ترتيب ${sortedSymbols.length} رمز حسب الحجم`);
        return sortedSymbols;
        
    } catch (error) {
        console.error('خطأ في ترتيب الرموز:', error);
        
        // إرجاع أول رموز من القائمة الأصلية
        return allSymbols.slice(0, limit);
    }
}


    async start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.updateStatus('جاري البحث عن الإشارات...', 'running');
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        
        // بدء المسح
        await this.scanMarkets();
        
        // جدولة المسح التلقائي كل دقيقتين
        this.scanInterval = setInterval(() => {
            this.scanMarkets();
        }, 120000);
        
        // تحديث الأسعار كل 30 ثانية
        this.updateInterval = setInterval(() => {
            this.updatePrices();
        }, 30000);
    }

    stop() {
        this.isRunning = false;
        this.updateStatus('متوقف', 'stopped');
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async scanMarkets() {
        if (!this.isRunning) return;
        
        try {
            const newSignals = { buy: [], sell: [] };
            let processedCount = 0;
            
            for (const symbol of this.symbols) {
                if (!this.isRunning) break;
                
                try {
                    const signal = await this.analyzeSymbol(symbol);
                    if (signal) {
                        newSignals[signal.type].push(signal);
                        
                        // حفظ سعر الإشارة
                        this.signalPrices.set(signal.id, signal.price);
                        
                        // إشعار بالإشارة الجديدة
                        this.notifyNewSignal(signal);
                    }
                    
                    processedCount++;
                    
                    // تحديث حالة التقدم
                    const progress = Math.round((processedCount / this.symbols.length) * 100);
                    this.updateStatus(`جاري المسح... ${progress}%`, 'running');
                    
                    // تأخير قصير لتجنب حدود API
                    await this.delay(100);
                    
                } catch (error) {
                    console.warn(`خطأ في تحليل ${symbol}:`, error.message);
                }
            }
            
            // إضافة الإشارات الجديدة
            this.addNewSignals(newSignals);
            
            // تحديث العدادات
            this.updateCounters();
            
            // تحديث وقت آخر مسح
            this.updateLastScanTime();
            
            this.updateStatus(`مكتمل - تم العثور على ${newSignals.buy.length + newSignals.sell.length} إشارة جديدة`, 'completed');
            
        } catch (error) {
            console.error('خطأ في مسح الأسواق:', error);
            this.updateStatus('خطأ في المسح', 'error');
        }
    }

    async analyzeSymbol(symbol) {
        try {
            // الحصول على بيانات الشموع
            const candles = await this.getCandleData(symbol, this.timeframe, 100);
            if (!candles || candles.length < 50) return null;
            
            // حساب UTBot
            const utbotSignals = this.calculateUTBot(candles);
            if (!utbotSignals || utbotSignals.length === 0) return null;
            
            // الحصول على آخر إشارة
            const lastSignal = utbotSignals[utbotSignals.length - 1];
            const currentPrice = parseFloat(candles[candles.length - 1][4]); // سعر الإغلاق
            
            // التحقق من صحة الإشارة
            if (!this.isValidSignal(lastSignal, candles)) return null;
            
            // حساب الأهداف ووقف الخسارة
            const targets = this.calculateTargets(currentPrice, lastSignal.type, candles);
            
            // حساب قوة الإشارة
            const strength = this.calculateSignalStrength(candles, lastSignal);
            
            // تطبيق فلتر الحساسية
            if (!this.passeSensitivityFilter(strength)) return null;
            
            return {
                id: `${symbol}_${Date.now()}`,
                symbol: symbol,
                type: lastSignal.type,
                price: currentPrice,
                target: targets.target,
                stopLoss: targets.stopLoss,
                strength: strength,
                timestamp: new Date(),
                indicators: this.getIndicatorValues(candles),
                rank: this.calculateRank(strength, symbol)
            };
            
        } catch (error) {
            console.error(`خطأ في تحليل ${symbol}:`, error);
            return null;
        }
    }

    async getCandleData(symbol, interval, limit) {
        try {
            const response = await fetch(
                `https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data.map(candle => [
                parseInt(candle[0]), // وقت الفتح
                parseFloat(candle[1]), // سعر الفتح
                parseFloat(candle[2]), // أعلى سعر
                parseFloat(candle[3]), // أدنى سعر
                parseFloat(candle[4]), // سعر الإغلاق
                parseFloat(candle[5])  // الحجم
            ]);
            
        } catch (error) {
            console.error(`خطأ في الحصول على بيانات ${symbol}:`, error);
            return null;
        }
    }

    calculateUTBot(candles) {
        try {
            const signals = [];
            const atr = this.calculateATR(candles, this.atrPeriod);
            
            let upTrend = [];
            let downTrend = [];
            let trend = [];
            
            for (let i = this.atrPeriod; i < candles.length; i++) {
                const close = candles[i][4];
                const prevClose = candles[i-1][4];
                const currentATR = atr[i - this.atrPeriod];
                
                // حساب خطوط الاتجاه
                const basicUpperBand = close + (this.atrMultiplier * currentATR);
                const basicLowerBand = close - (this.atrMultiplier * currentATR);
                
                // تحديد الاتجاه
                let currentTrend;
                if (close > (upTrend[upTrend.length - 1] || 0)) {
                    currentTrend = 1; // اتجاه صاعد
                } else if (close < (downTrend[downTrend.length - 1] || Infinity)) {
                    currentTrend = -1; // اتجاه هابط
                } else {
                    currentTrend = trend[trend.length - 1] || 0;
                }
                
                upTrend.push(currentTrend === 1 ? basicLowerBand : basicUpperBand);
                downTrend.push(currentTrend === -1 ? basicUpperBand : basicLowerBand);
                trend.push(currentTrend);
                
                // اكتشاف تغيير الاتجاه
                const prevTrend = trend[trend.length - 2] || 0;
                if (currentTrend !== prevTrend && i > this.atrPeriod + 1) {
                    signals.push({
                        index: i,
                        type: currentTrend === 1 ? 'buy' : 'sell',
                        price: close,
                        atr: currentATR,
                        timestamp: candles[i][0]
                    });
                }
            }
            
            return signals;
            
        } catch (error) {
            console.error('خطأ في حساب UTBot:', error);
            return [];
        }
    }

    calculateATR(candles, period) {
        const tr = [];
        const atr = [];
        
        for (let i = 1; i < candles.length; i++) {
            const high = candles[i][2];
            const low = candles[i][3];
            const prevClose = candles[i-1][4];
            
            const trueRange = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            
            tr.push(trueRange);
        }
        
        // حساب ATR باستخدام المتوسط المتحرك
        for (let i = period - 1; i < tr.length; i++) {
            if (i === period - 1) {
                // أول قيمة ATR
                const sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
                atr.push(sum / period);
            } else {
                // ATR المنعم
                const prevATR = atr[atr.length - 1];
                const currentATR = (prevATR * (period - 1) + tr[i]) / period;
                atr.push(currentATR);
            }
        }
        
        return atr;
    }

    isValidSignal(signal, candles) {
        if (!signal || !candles) return false;
        
        // التحقق من عمر الإشارة (لا تزيد عن 5 شموع)
        const signalAge = candles.length - 1 - signal.index;
        if (signalAge > 5) return false;
        
        // التحقق من قوة الحجم
        const avgVolume = this.calculateAverageVolume(candles, 20);
        const currentVolume = candles[signal.index][5];
        if (currentVolume < avgVolume * 0.5) return false;
        
        // التحقق من عدم وجود إشارة مماثلة حديثة
        const existingSignal = this.findExistingSignal(signal.symbol, signal.type);
        if (existingSignal) return false;
        
        return true;
    }

    calculateAverageVolume(candles, period) {
        const volumes = candles.slice(-period).map(c => c[5]);
        return volumes.reduce((a, b) => a + b, 0) / volumes.length
    }

    findExistingSignal(symbol, type) {
        const signals = this.signals[type];
        return signals.find(s => s.symbol === symbol && 
            (Date.now() - s.timestamp.getTime()) < 3600000); // خلال ساعة واحدة
    }

    calculateTargets(price, type, candles) {
        const atr = this.calculateATR(candles, this.atrPeriod);
        const currentATR = atr[atr.length - 1];
        
        let target, stopLoss;
        
        if (type === 'buy') {
            target = price + (currentATR * 2.5);
            stopLoss = price - (currentATR * 1.5);
        } else {
            target = price - (currentATR * 2.5);
            stopLoss = price + (currentATR * 1.5);
        }
        
        return {
            target: parseFloat(target.toFixed(8)),
            stopLoss: parseFloat(stopLoss.toFixed(8))
        };
    }

    calculateSignalStrength(candles, signal) {
        let strength = 0;
        
        // قوة الحجم (0-2 نقاط)
        const avgVolume = this.calculateAverageVolume(candles, 20);
        const signalVolume = candles[signal.index][5];
        if (signalVolume > avgVolume * 1.5) strength += 2;
        else if (signalVolume > avgVolume) strength += 1;
        
        // قوة ATR (0-2 نقاط)
        const atr = this.calculateATR(candles, this.atrPeriod);
        const currentATR = atr[atr.length - 1];
        const avgATR = atr.slice(-10).reduce((a, b) => a + b, 0) / 10;
        if (currentATR > avgATR * 1.3) strength += 2;
        else if (currentATR > avgATR) strength += 1;
        
        // اتجاه السعر (0-1 نقطة)
        const priceChange = this.calculatePriceChange(candles, 5);
        if ((signal.type === 'buy' && priceChange > 0) || 
            (signal.type === 'sell' && priceChange < 0)) {
            strength += 1;
        }
        
        return Math.min(strength, 5); // الحد الأقصى 5 نجوم
    }

    calculatePriceChange(candles, period) {
        if (candles.length < period + 1) return 0;
        
        const currentPrice = candles[candles.length - 1][4];
        const pastPrice = candles[candles.length - 1 - period][4];
        
        return ((currentPrice - pastPrice) / pastPrice) * 100;
    }

    passeSensitivityFilter(strength) {
        switch (this.sensitivity) {
            case 'high':
                return strength >= 2;
            case 'normal':
                return strength >= 3;
            case 'low':
                return strength >= 4;
            default:
                return strength >= 3;
        }
    }

    getIndicatorValues(candles) {
        const rsi = this.calculateRSI(candles, 14);
        const currentRSI = rsi[rsi.length - 1];
        
        return {
            rsi: Math.round(currentRSI),
            trend: this.getTrendDirection(candles),
            volume: this.getVolumeStatus(candles)
        };
    }

    calculateRSI(candles, period) {
        const prices = candles.map(c => c[4]);
        const rsi = [];
        
        let gains = 0;
        let losses = 0;
        
        // حساب المتوسط الأولي
        for (let i = 1; i <= period; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0) gains += change;
            else losses -= change;
        }
        
        let avgGain = gains / period;
        let avgLoss = losses / period;
        
        rsi.push(100 - (100 / (1 + (avgGain / avgLoss))));
        
        // حساب باقي قيم RSI
        for (let i = period + 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? -change : 0;
            
            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
            
            rsi.push(100 - (100 / (1 + (avgGain / avgLoss))));
        }
        
        return rsi;
    }

    getTrendDirection(candles) {
        const sma20 = this.calculateSMA(candles, 20);
        const sma50 = this.calculateSMA(candles, 50);
        
        const current20 = sma20[sma20.length - 1];
        const current50 = sma50[sma50.length - 1];
        
        if (current20 > current50) return 'صاعد';
        else if (current20 < current50) return 'هابط';
        else return 'جانبي';
    }

    calculateSMA(candles, period) {
        const prices = candles.map(c => c[4]);
        const sma = [];
        
        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }
        
        return sma;
    }

    getVolumeStatus(candles) {
        const volumes = candles.slice(-20).map(c => c[5]);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const currentVolume = candles[candles.length - 1][5];
        
        if (currentVolume > avgVolume * 1.5) return 'مرتفع';
        else if (currentVolume > avgVolume * 0.8) return 'عادي';
        else return 'منخفض';
    }

    calculateRank(strength, symbol) {
        // ترتيب بناءً على القوة وشعبية العملة
        const popularCoins = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT'];
        let rank = strength;
        
        if (popularCoins.includes(symbol)) {
            rank += 1;
        }
        
        return Math.min(rank, 5);
    }

    addNewSignals(newSignals) {
        // إضافة إشارات الشراء
        newSignals.buy.forEach(signal => {
            if (!this.isDuplicateSignal(signal)) {
                this.signals.buy.unshift(signal);
                this.renderSignal(signal, 'buy');
            }
        });
        
        // إضافة إشارات البيع
        newSignals.sell.forEach(signal => {
            if (!this.isDuplicateSignal(signal)) {
                this.signals.sell.unshift(signal);
                this.renderSignal(signal, 'sell');
            }
        });
        
        // الحد من عدد الإشارات المحفوظة
        this.signals.buy = this.signals.buy.slice(0, 50);
        this.signals.sell = this.signals.sell.slice(0, 50);
        
        // إزالة الإشارات القديمة من DOM
        this.cleanupOldSignals();
    }

    isDuplicateSignal(newSignal) {
        const allSignals = [...this.signals.buy, ...this.signals.sell];
        return allSignals.some(signal => 
            signal.symbol === newSignal.symbol && 
            signal.type === newSignal.type &&
            Math.abs(signal.timestamp.getTime() - newSignal.timestamp.getTime()) < 300000 // 5 دقائق
        );
    }

    renderSignal(signal, type) {
        const container = type === 'buy' ? this.buySignalsEl : this.sellSignalsEl;
        if (!container) return;
        const currentPrice = await this.getCurrentPrice(signal.symbol);
    const profitLoss = currentPrice ? 
        await this.calculateCurrentProfitLoss(signal) : 0;
        const signalEl = document.createElement('div');
        signalEl.className = `signal-item ${type} new`;
        signalEl.dataset.signalId = signal.id;
        
        const profitLoss = this.calculateCurrentProfitLoss(signal);
        const timeAgo = this.getTimeAgo(signal.timestamp);
        
        signalEl.innerHTML = `
            <div class="signal-header">
                <div class="signal-symbol">
                    <i class="fab fa-bitcoin crypto-icon"></i>
                    ${signal.symbol.replace('USDT', '/USDT')}
                </div>
                <div class="signal-rank">
                    ${'★'.repeat(signal.rank)}
                </div>
            </div>
            
            <div class="price-section">
                <div class="signal-price">
                    <span>سعر الإشارة:</span>
                    <span class="price-value">$${signal.price.toFixed(6)}</span>
                </div>
                <div class="current-price">
                    <span>السعر الحالي:</span>
                    <span class="price-value" id="current-${signal.id}">$${signal.price.toFixed(6)}</span>
                    <span class="price-change ${profitLoss >= 0 ? 'profit' : 'loss'}" id="change-${signal.id}">
                        ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}%
                    </span>
                </div>
            </div>
            
            <div class="targets-section">
                <div class="signal-target">
                    <strong>الهدف:</strong>
                    <span class="target-value">$${signal.target.toFixed(6)}</span>
                    <span class="profit">+${this.calculateTargetProfit(signal)}%</span>
                </div>
                <div class="signal-stoploss">
                    <strong>وقف الخسارة:</strong>
                    <span class="stoploss-value">$${signal.stopLoss.toFixed(6)}</span>
                    <span class="loss">${this.calculateStopLossRisk(signal)}%</span>
                </div>
            </div>
            
            <div class="signal-details">
                <div class="signal-strength">
                    <span class="strength-stars">${'★'.repeat(signal.strength)}${'☆'.repeat(5-signal.strength)}</span>
                    <span class="strength-text">قوة الإشارة: ${this.getStrengthText(signal.strength)}</span>
                </div>
                <div class="signal-indicators">
                    <span class="rsi">RSI: ${signal.indicators.rsi}</span>
                    <span class="trend">الاتجاه: ${signal.indicators.trend}</span>
                    <span class="volume">الحجم: ${signal.indicators.volume}</span>
                </div>
            </div>
            
            <div class="signal-time">
                <i class="fas fa-clock"></i>
                <span>${timeAgo}</span>
            </div>
            
            <div class="signal-actions">
                <button class="btn-action btn-trade" onclick="window.open('https://www.binance.com/en/trade/${signal.symbol}', '_blank')">
                    <i class="fas fa-chart-line"></i>
                    تداول
                </button>
                <button class="btn-action btn-copy" data-signal='${JSON.stringify(signal)}'>
                    <i class="fas fa-copy"></i>
                    نسخ
                </button>
                <button class="btn-action btn-pin">
                    <i class="fas fa-thumbtack"></i>
                    تثبيت
                </button>
                <button class="btn-action btn-alert">
                    <i class="fas fa-bell"></i>
                    تنبيه
                </button>
            </div>
        `;
        
        // إضافة الإشارة في المقدمة
        container.insertBefore(signalEl, container.firstChild);
        
        // إزالة رسالة "لا توجد إشارات"
        const noSignalsEl = container.querySelector('.no-signals');
        if (noSignalsEl) {
            noSignalsEl.remove();
        }
        
        // إزالة فئة "new" بعد ثانيتين
        setTimeout(() => {
            signalEl.classList.remove('new');
        }, 2000);
    }

   async calculateCurrentProfitLoss(signal) {
    try {
        const currentPrice = await this.getCurrentPrice(signal.symbol);
        if (!currentPrice) return 0;
        
        const change = ((currentPrice - signal.price) / signal.price) * 100;
        return signal.type === 'buy' ? change : -change;
    } catch (error) {
        console.error('خطأ في حساب الربح/الخسارة:', error);
        return 0;
    }
}


    calculateTargetProfit(signal) {
        if (signal.type === 'buy') {
            return (((signal.target - signal.price) / signal.price) * 100).toFixed(2);
        } else {
            return (((signal.price - signal.target) / signal.price) * 100).toFixed(2);
        }
    }

    calculateStopLossRisk(signal) {
        if (signal.type === 'buy') {
            return (((signal.price - signal.stopLoss) / signal.price) * 100).toFixed(2);
        } else {
            return (((signal.stopLoss - signal.price) / signal.price) * 100).toFixed(2);
        }
    }

    getStrengthText(strength) {
        const texts = {
            1: 'ضعيف',
            2: 'مقبول', 
            3: 'جيد',
            4: 'قوي',
            5: 'ممتاز'
        };
        return texts[strength] || 'غير محدد';
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `منذ ${days} يوم`;
        if (hours > 0) return `منذ ${hours} ساعة`;
        if (minutes > 0) return `منذ ${minutes} دقيقة`;
        return 'الآن';
    }

    cleanupOldSignals() {
        const containers = [this.buySignalsEl, this.sellSignalsEl];
        
        containers.forEach(container => {
            if (!container) return;
            
            const signals = container.querySelectorAll('.signal-item');
            if (signals.length > 25) {
                // إزالة الإشارات الزائدة (الأقدم)
                for (let i = 25; i < signals.length; i++) {
                    if (!signals[i].classList.contains('pinned')) {
                        signals[i].remove();
                    }
                }
            }
        });
    }

  async updatePrices() {
    if (!this.isRunning) return;

    try {
        const activeSymbols = new Set();
        [...this.signals.buy, ...this.signals.sell].forEach(signal => {
            activeSymbols.add(signal.symbol);
        });

        if (activeSymbols.size === 0) return;

        // تقسيم الطلبات لتجنب حدود API
        const symbolsArray = Array.from(activeSymbols);
        const batchSize = 20; // معالجة 20 رمز في كل مرة
        
        for (let i = 0; i < symbolsArray.length; i += batchSize) {
            const batch = symbolsArray.slice(i, i + batchSize);
            const prices = await this.getCurrentPrices(batch);
            this.updatePriceDisplay(prices);
            
            // تأخير قصير بين الدفعات
            if (i + batchSize < symbolsArray.length) {
                await this.delay(200);
            }
        }
    } catch (error) {
        console.error('خطأ في تحديث الأسعار:', error);
    }
}


    async getCurrentPrices(symbols) {
        try {
            const symbolsParam = symbols.map(s => `"${s}"`).join(',');
            const response = await fetch(
                `https://api1.binance.com/api/v3/ticker/price?symbols=[${symbolsParam}]`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const prices = {};
            
            data.forEach(item => {
                prices[item.symbol] = parseFloat(item.price);
            });
            
            return prices;
            
        } catch (error) {
            console.error('خطأ في الحصول على الأسعار:', error);
            return {};
        }
    }

    updatePriceDisplay(prices) {
        [...this.signals.buy, ...this.signals.sell].forEach(signal => {
            const currentPrice = prices[signal.symbol];
            if (!currentPrice) return;
            
            const currentPriceEl = document.getElementById(`current-${signal.id}`);
            const changeEl = document.getElementById(`change-${signal.id}`);
            
            if (currentPriceEl && changeEl) {
                currentPriceEl.textContent = `$${currentPrice.toFixed(6)}`;
                
                // حساب التغيير
                const change = ((currentPrice - signal.price) / signal.price) * 100;
                const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                
                changeEl.textContent = changeText;
                changeEl.className = `price-change ${change >= 0 ? 'profit' : 'loss'}`;
            }
        });
    }

    updateCounters() {
        // تحديث عدادات الإشارات
        const buyCountEl = document.querySelector('.buy-header .count-badge');
        const sellCountEl = document.querySelector('.sell-header .count-badge');
        
        if (buyCountEl) buyCountEl.textContent = this.signals.buy.length;
        if (sellCountEl) sellCountEl.textContent = this.signals.sell.length;
        
        // تحديث الإحصائيات في الهيدر
        const totalSignalsEl = document.getElementById('totalSignals');
        const activeSignalsEl = document.getElementById('activeSignals');
        
        if (totalSignalsEl) {
            totalSignalsEl.textContent = this.signals.buy.length + this.signals.sell.length;
        }
        
        if (activeSignalsEl) {
            const activeCount = this.getActiveSignalsCount();
            activeSignalsEl.textContent = activeCount;
        }
    }

    getActiveSignalsCount() {
        const now = Date.now();
        const activeTime = 4 * 60 * 60 * 1000; // 4 ساعات
        
        return [...this.signals.buy, ...this.signals.sell].filter(signal => 
            now - signal.timestamp.getTime() < activeTime
        ).length;
    }

    updateLastScanTime() {
        if (this.lastUpdateEl) {
            const now = new Date();
            this.lastUpdateEl.textContent = now.toLocaleTimeString('ar-SA');
        }
    }

    updateStatus(message, type) {
        if (!this.statusEl) return;
        
        this.statusEl.textContent = message;
        this.statusEl.className = `status-display ${type}`;
        
        // تحديث الأيقونة
        const icon = this.statusEl.querySelector('i');
        if (icon) {
            icon.className = this.getStatusIcon(type);
        }
    }

    getStatusIcon(type) {
        const icons = {
            running: 'fas fa-spinner fa-spin',
            completed: 'fas fa-check-circle',
            stopped: 'fas fa-stop-circle',
            error: 'fas fa-exclamation-triangle'
        };
        return icons[type] || 'fas fa-info-circle';
    }

    // وظائف التفاعل
    clearSignals(type) {
        if (!confirm(`هل أنت متأكد من حذف جميع إشارات ${type === 'buy' ? 'الشراء' : 'البيع'}؟`)) {
            return;
        }
        
        this.signals[type] = [];
        const container = type === 'buy' ? this.buySignalsEl : this.sellSignalsEl;
        
        if (container) {
            container.innerHTML = `
                <div class="no-signals">
                    <div class="no-signals-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <p>لا توجد إشارات ${type === 'buy' ? 'شراء' : 'بيع'} حالياً</p>
                    <small>سيتم عرض الإشارات الجديدة هنا عند اكتشافها</small>
                </div>
            `;
        }
        
        this.updateCounters();
    }

    exportSignals(type) {
        const signals = this.signals[type];
        if (signals.length === 0) {
            alert('لا توجد إشارات للتصدير');
            return;
        }
        
        const csvContent = this.convertToCSV(signals);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `utbot_${type}_signals_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    convertToCSV(signals) {
        const headers = ['الرمز', 'النوع', 'السعر', 'الهدف', 'وقف الخسارة', 'القوة', 'الوقت'];
        const rows = signals.map(signal => [
            signal.symbol,
            signal.type === 'buy' ? 'شراء' : 'بيع',
            signal.price,
            signal.target,
            signal.stopLoss,
            signal.strength,
            signal.timestamp.toLocaleString('ar-SA')
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    togglePin(signalEl) {
        if (!signalEl) return;
        
        const signalId = signalEl.dataset.signalId;
        const pinBtn = signalEl.querySelector('.btn-pin');
        
        if (this.pinnedSignals.has(signalId)) {
            this.pinnedSignals.delete(signalId);
            signalEl.classList.remove('pinned');
            pinBtn.classList.remove('active');
            pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i> تثبيت';
        } else {
            this.pinnedSignals.add(signalId);
            signalEl.classList.add('pinned');
            pinBtn.classList.add('active');
            pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i> مثبت';
        }
    }

    copySignal(signalEl) {
        if (!signalEl) return;
        
        const copyBtn = signalEl.querySelector('.btn-copy');
        const signalData = JSON.parse(copyBtn.dataset.signal);
        
        const signalText = `
🚀 إشارة ${signalData.type === 'buy' ? 'شراء' : 'بيع'} UTBot

💰 العملة: ${signalData.symbol}
💵 السعر: $${signalData.price.toFixed(6)}
🎯 الهدف: $${signalData.target.toFixed(6)}
🛑 وقف الخسارة: $${signalData.stopLoss.toFixed(6)}
⭐ القوة: ${signalData.strength}/5
📊 RSI: ${signalData.indicators.rsi}
📈 الاتجاه: ${signalData.indicators.trend}
⏰ الوقت: ${signalData.timestamp.toLocaleString('ar-SA')}

#UTBot #TradingSignals #Crypto
        `.trim();
        
        navigator.clipboard.writeText(signalText).then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check"></i> تم النسخ';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> نسخ';
            }, 2000);
        }).catch(err => {
            console.error('خطأ في النسخ:', err);
            alert('فشل في نسخ الإشارة');
        });
    }

    toggleAlert(signalEl) {
        if (!signalEl) return;
        
        const alertBtn = signalEl.querySelector('.btn-alert');
        
        if (alertBtn.classList.contains('active')) {
            alertBtn.classList.remove('active');
            alertBtn.innerHTML = '<i class="fas fa-bell"></i> تنبيه';
        } else {
            alertBtn.classList.add('active');
            alertBtn.innerHTML = '<i class="fas fa-bell-slash"></i> إلغاء التنبيه';
            
            // طلب إذن الإشعارات
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }

    notifyNewSignal(signal) {
        // إشعار صوتي
        this.playNotificationSound();
        
        // إشعار المتصفح
        if (Notification.permission === 'granted') {
            const notification = new Notification(`إشارة ${signal.type === 'buy' ? 'شراء' : 'بيع'} جديدة`, {
                body: `${signal.symbol} - السعر: $${signal.price.toFixed(6)}`,
                icon: '/favicon.ico',
                tag: signal.id
            });
            
            setTimeout(() => notification.close(), 5000);
        }
    }

    playNotificationSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.play().catch(() => {
                // تجاهل أخطاء تشغيل الصوت
            });
        } catch (error) {
            // تجاهل أخطاء إنشاء الصوت
        }
    }

    saveSettings() {
        const settings = {
            atrPeriod: this.atrPeriod,
            atrMultiplier: this.atrMultiplier,
            timeframe: this.timeframe,
            sensitivity: this.sensitivity,
            pinnedSignals: Array.from(this.pinnedSignals)
        };
        
        localStorage.setItem('utbot_settings', JSON.stringify(settings));
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('utbot_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                
                this.atrPeriod = settings.atrPeriod || 5;
                this.atrMultiplier = settings.atrMultiplier || 1.0;
                this.timeframe = settings.timeframe || '1h';
                this.sensitivity = settings.sensitivity || 'normal';
                this.pinnedSignals = new Set(settings.pinnedSignals || []);
                
                // تحديث عناصر الواجهة
                if (this.atrPeriodEl) this.atrPeriodEl.value = this.atrPeriod;
                if (this.atrMultiplierEl) this.atrMultiplierEl.value = this.atrMultiplier;
                
                const timeframeEl = document.getElementById('timeframe');
                if (timeframeEl) timeframeEl.value = this.timeframe;
                
                const sensitivityEl = document.getElementById('sensitivity');
                if (sensitivityEl) sensitivityEl.value = this.sensitivity;
            }
        } catch (error) {
            console.error('خطأ في تحميل الإعدادات:', error);
        }
    }

    autoStart() {
        // بدء تلقائي بعد 3 ثوانٍ من التحميل
        setTimeout(() => {
            if (!this.isRunning) {
                this.start();
            }
        }, 3000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // تنظيف الموارد عند إغلاق الصفحة
    cleanup() {
        this.stop();
        this.saveSettings();
    }

    // إضافة مؤشرات تقنية إضافية
    calculateMACD(candles, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const prices = candles.map(c => c[4]);
        const emaFast = this.calculateEMA(prices, fastPeriod);
        const emaSlow = this.calculateEMA(prices, slowPeriod);
        
        const macdLine = [];
        for (let i = 0; i < emaFast.length; i++) {
            if (emaSlow[i] !== undefined) {
                macdLine.push(emaFast[i] - emaSlow[i]);
            }
        }
        
        const signalLine = this.calculateEMA(macdLine, signalPeriod);
        const histogram = [];
        
        for (let i = 0; i < macdLine.length; i++) {
            if (signalLine[i] !== undefined) {
                histogram.push(macdLine[i] - signalLine[i]);
            }
        }
        
        return { macdLine, signalLine, histogram };
    }

    calculateEMA(prices, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        
        // أول قيمة EMA هي SMA
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
        }
        ema.push(sum / period);
        
        // حساب باقي قيم EMA
        for (let i = period; i < prices.length; i++) {
            const currentEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
            ema.push(currentEMA);
        }
        
        return ema;
    }

    calculateBollingerBands(candles, period = 20, stdDev = 2) {
        const prices = candles.map(c => c[4]);
        const sma = this.calculateSMA(candles, period);
        const bands = { upper: [], middle: [], lower: [] };
        
        for (let i = period - 1; i < prices.length; i++) {
            const slice = prices.slice(i - period + 1, i + 1);
            const mean = sma[i - period + 1];
            
            // حساب الانحراف المعياري
            const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
            const standardDeviation = Math.sqrt(variance);
            
            bands.middle.push(mean);
            bands.upper.push(mean + (standardDeviation * stdDev));
            bands.lower.push(mean - (standardDeviation * stdDev));
        }
        
        return bands;
    }

    // تحسين خوارزمية UTBot مع مؤشرات إضافية
    enhancedUTBotAnalysis(candles) {
        const utbotSignals = this.calculateUTBot(candles);
        const rsi = this.calculateRSI(candles, 14);
        const macd = this.calculateMACD(candles);
        const bb = this.calculateBollingerBands(candles);
        
        return utbotSignals.map(signal => {
            const index = signal.index;
            const currentRSI = rsi[index - this.atrPeriod] || 50;
            const currentMACD = macd.histogram[index - 26] || 0;
            
            // تحسين قوة الإشارة بناءً على المؤشرات الإضافية
            let enhancedStrength = signal.strength || 3;
            
            // تأكيد RSI
            if (signal.type === 'buy' && currentRSI < 30) enhancedStrength += 1;
            if (signal.type === 'sell' && currentRSI > 70) enhancedStrength += 1;
            
            // تأكيد MACD
            if (signal.type === 'buy' && currentMACD > 0) enhancedStrength += 1;
            if (signal.type === 'sell' && currentMACD < 0) enhancedStrength += 1;
            
            return {
                ...signal,
                strength: Math.min(enhancedStrength, 5),
                rsi: Math.round(currentRSI),
                macd: currentMACD.toFixed(4)
            };
        });
    }

    // إضافة نظام تنبيهات متقدم
    setupAdvancedAlerts() {
        // تنبيه عند الوصول للهدف
        this.checkTargetAlerts();
        
        // تنبيه عند الاقتراب من وقف الخسارة
        this.checkStopLossAlerts();
        
        // تنبيه الإشارات القوية
        this.checkStrongSignalAlerts();
    }
async getCurrentPrice(symbol) {
    try {
        const response = await fetch(
            `https://api1.binance.com/api/v3/ticker/price?symbol=${symbol}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return parseFloat(data.price);
    } catch (error) {
        console.error(`خطأ في الحصول على سعر ${symbol}:`, error);
        return null;
    }
}

    async checkTargetAlerts() {
    for (const signal of [...this.signals.buy, ...this.signals.sell]) {
        const signalEl = document.querySelector(`[data-signal-id="${signal.id}"]`);
        if (!signalEl || !signalEl.querySelector('.btn-alert.active')) continue;
        
        try {
            const currentPrice = await this.getCurrentPrice(signal.symbol);
            if (!currentPrice) continue;
            
            const targetReached = signal.type === 'buy' 
                ? currentPrice >= signal.target 
                : currentPrice <= signal.target;
                
            if (targetReached) {
                this.showTargetReachedNotification(signal);
            }
        } catch (error) {
            console.error(`خطأ في فحص الهدف لـ ${signal.symbol}:`, error);
        }
    }
}

async checkStopLossAlerts() {
    for (const signal of [...this.signals.buy, ...this.signals.sell]) {
        const signalEl = document.querySelector(`[data-signal-id="${signal.id}"]`);
        if (!signalEl || !signalEl.querySelector('.btn-alert.active')) continue;
        
        try {
            const currentPrice = await this.getCurrentPrice(signal.symbol);
            if (!currentPrice) continue;
            
            const nearStopLoss = signal.type === 'buy'
                ? currentPrice <= signal.stopLoss * 1.02 // 2% من وقف الخسارة
                : currentPrice >= signal.stopLoss * 0.98;
                
            if (nearStopLoss) {
                this.showStopLossWarning(signal);
            }
        } catch (error) {
            console.error(`خطأ في فحص وقف الخسارة لـ ${signal.symbol}:`, error);
        }
    }
}

    checkStrongSignalAlerts() {
        const strongSignals = [...this.signals.buy, ...this.signals.sell]
            .filter(signal => signal.strength >= 4);
        
        if (strongSignals.length > 0 && Math.random() > 0.9) {
            this.showStrongSignalNotification(strongSignals[0]);
        }
    }

    showTargetReachedNotification(signal) {
        if (Notification.permission === 'granted') {
            new Notification('🎯 تم الوصول للهدف!', {
                body: `${signal.symbol} وصل للهدف $${signal.target.toFixed(6)}`,
                icon: '/favicon.ico'
            });
        }
        
        this.playSuccessSound();
    }

    showStopLossWarning(signal) {
        if (Notification.permission === 'granted') {
            new Notification('⚠️ تحذير وقف الخسارة', {
                body: `${signal.symbol} يقترب من وقف الخسارة`,
                icon: '/favicon.ico'
            });
        }
        
        this.playWarningSound();
    }

    showStrongSignalNotification(signal) {
        if (Notification.permission === 'granted') {
            new Notification('⭐ إشارة قوية جديدة!', {
                body: `${signal.symbol} - قوة ${signal.strength}/5`,
                icon: '/favicon.ico'
            });
        }
    }

       playSuccessSound() {
        try {
            // استخدام صوت بسيط بدلاً من base64 المعقد
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            // في حالة فشل إنشاء الصوت، لا نفعل شيئاً
            console.log('تعذر تشغيل الصوت');
        }
    }

    playWarningSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
        } catch (error) {
            console.log('تعذر تشغيل صوت التحذير');
        }
    }

    // إضافة معلومات حول الأداء
    updatePerformanceStats() {
        const performanceEl = document.getElementById('performance');
        if (!performanceEl) return;

        const totalSignals = this.signals.buy.length + this.signals.sell.length;
        const strongSignals = [...this.signals.buy, ...this.signals.sell]
            .filter(s => s.strength >= 4).length;
        
        const successRate = totalSignals > 0 ? Math.round((strongSignals / totalSignals) * 100) : 0;
        
        performanceEl.innerHTML = `
            <div class="performance-item">
                <span class="performance-label">معدل النجاح:</span>
                <span class="performance-value">${successRate}%</span>
            </div>
            <div class="performance-item">
                <span class="performance-label">الإشارات القوية:</span>
                <span class="performance-value">${strongSignals}</span>
            </div>
        `;
    }
}

// تشغيل التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    const scanner = new UTBotScanner();
    
    // تنظيف الموارد عند إغلاق الصفحة
    window.addEventListener('beforeunload', () => {
        scanner.cleanup();
    });
    
    // تحديث الإحصائيات كل دقيقة
    setInterval(() => {
        scanner.updatePerformanceStats();
    }, 60000);
    
    console.log('🚀 UTBot Scanner تم تشغيله بنجاح');
});
// إضافة أنماط CSS للتحسينات الجديدة
const additionalStyles = `
    .performance-item {
        display: flex;
        justify-content: space-between;
        margin: 5px 0;
        padding: 5px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
    }
    
    .performance-label {
        color: #bbb;
        font-size: 0.9em;
    }
    
    .performance-value {
        color: #4CAF50;
        font-weight: bold;
    }
    
    .signal-item.new {
        animation: slideInRight 0.5s ease-out;
        border-left: 4px solid #4CAF50;
    }
    
    .signal-item.pinned {
        border-left: 4px solid #FF9800;
        background: linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(255, 152, 0, 0.05));
    }
    
    .btn-action.active {
        background: #4CAF50;
        color: white;
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .status-display.running {
        color: #2196F3;
    }
    
    .status-display.completed {
        color: #4CAF50;
    }
    
    .status-display.error {
        color: #f44336;
    }
    
    .status-display.stopped {
        color: #FF9800;
    }
`;

// إضافة الأنماط للصفحة
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// تصدير الفئة للاستخدام الخارجي
window.UTBotScanner = UTBotScanner;
