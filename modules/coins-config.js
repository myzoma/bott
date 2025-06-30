// إعدادات العملات والأيقونات
const COINS_CONFIG = {
    // العملات الرئيسية
    'BTC': { icon: 'fa-btc', class: 'coin-btc', color: '#f7931a' },
    'ETH': { icon: 'fa-ethereum', class: 'coin-eth', color: '#627eea' },
    'BNB': { icon: 'fa-coins', class: 'coin-bnb', color: '#f3ba2f' },
    'ADA': { icon: 'fa-coins', class: 'coin-ada', color: '#0033ad' },
    'DOT': { icon: 'fa-circle-dot', class: 'coin-dot', color: '#e6007a' },
    'LINK': { icon: 'fa-link', class: 'coin-link', color: '#375bd2' },
    'LTC': { icon: 'fa-coins', class: 'coin-ltc', color: '#bfbbbb' },
    'XLM': { icon: 'fa-star', class: 'coin-xlm', color: '#7d00ff' },
    'VET': { icon: 'fa-v', class: 'coin-vet', color: '#15bdff' },
    'FTM': { icon: 'fa-ghost', class: 'coin-ftm', color: '#1969ff' },
    'MATIC': { icon: 'fa-shapes', class: 'coin-matic', color: '#8247e5' },
    'AVAX': { icon: 'fa-mountain', class: 'coin-avax', color: '#e84142' },
    'SOL': { icon: 'fa-sun', class: 'coin-sol', color: '#9945ff' },
    'DOGE': { icon: 'fa-dog', class: 'coin-doge', color: '#c2a633' },
    'SHIB': { icon: 'fa-dog', class: 'coin-shib', color: '#ffa409' },
    
    // عملات إضافية
    'UNI': { icon: 'fa-unicorn', class: 'coin-uni', color: '#ff007a' },
    'AAVE': { icon: 'fa-a', class: 'coin-aave', color: '#b6509e' },
    'SUSHI': { icon: 'fa-fish', class: 'coin-sushi', color: '#fa52a0' },
    'CAKE': { icon: 'fa-cake-candles', class: 'coin-cake', color: '#d1884f' },
    'ATOM': { icon: 'fa-atom', class: 'coin-atom', color: '#2e3148' },
    'NEAR': { icon: 'fa-n', class: 'coin-near', color: '#00c08b' },
    'ALGO': { icon: 'fa-a', class: 'coin-algo', color: '#000000' },
    'XRP': { icon: 'fa-x', class: 'coin-xrp', color: '#23292f' },
    'TRX': { icon: 'fa-t', class: 'coin-trx', color: '#ff060a' },
    'EOS': { icon: 'fa-e', class: 'coin-eos', color: '#443f54' }
};

// إعدادات عامة
const COINS_SETTINGS = {
    maxDisplayCoins: 8,
    animationDuration: 300,
    shuffleInterval: 10000, // 10 ثواني
    defaultIcon: { icon: 'fa-coins', class: 'coin-default', color: '#6c757d' }
};

// تصدير للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { COINS_CONFIG, COINS_SETTINGS };
}
