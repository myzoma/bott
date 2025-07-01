class CryptoLogos {
    constructor() {
        this.container = document.getElementById('cryptoContainer');
        this.loading = document.getElementById('loading');
        this.apiUrl = 'https://api.coingecko.com/api/v3/coins/markets';
        this.init();
    }

    async init() {
        try {
            await this.fetchCryptoData();
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
            this.showError();
        }
    }

    async fetchCryptoData() {
        const params = new URLSearchParams({
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 20,
            page: 1,
            sparkline: false
        });

        const response = await fetch(`${this.apiUrl}?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        this.renderCryptos(data);
    }

    renderCryptos(cryptos) {
        this.loading.style.display = 'none';
        
        cryptos.forEach(crypto => {
            const cryptoElement = this.createCryptoElement(crypto);
            this.container.appendChild(cryptoElement);
        });
    }

    createCryptoElement(crypto) {
        const div = document.createElement('div');
        div.className = 'crypto-item';
        div.setAttribute('data-crypto-id', crypto.id);
        
        div.innerHTML = `
            <img 
                src="${crypto.image}" 
                alt="${crypto.name} logo" 
                class="crypto-logo"
                onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiI+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiLz4KPHBhdGggZD0ibTMgMTIgMTgtMTJNMyAxMmwxOCAxMiIvPgo8L3N2Zz4KPC9zdmc+'"
            >
            <div class="crypto-name">${crypto.name}</div>
            <div class="crypto-symbol">${crypto.symbol.toUpperCase()}</div>
        `;
        
        return div;
    }

    showError() {
        this.loading.innerHTML = 'حدث خطأ في تحميل البيانات';
    }
}

// تشغيل التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new CryptoLogos();
});
