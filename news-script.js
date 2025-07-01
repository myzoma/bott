// نسخة محسنة من السكربت مع دعم أفضل لجلب الأخبار
class EnhancedCryptoNews {
    constructor() {
        this.newsContent = document.getElementById('newsContent');
        this.newsGrid = document.getElementById('newsGrid');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.currentSource = document.getElementById('currentSource');
        this.isPaused = false;
        this.allNews = [];
        this.filteredNews = [];
        this.currentFilter = 'all';
        this.refreshInterval = null;
        
        this.init();
    }

    async init() {
        await this.loadRealNews();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    async loadRealNews() {
        try {
            this.showLoading();
            
            // جلب الأخبار من مصادر متعددة
            const newsPromises = [
                this.fetchFromPHPProxy(),
                this.fetchFromPublicAPIs(),
                this.fetchFromAlternativeSources()
            ];

            const results = await Promise.allSettled(newsPromises);
            
            // دمج النتائج الناجحة
            this.allNews = [];
            results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
                    this.allNews = [...this.allNews, ...result.value];
                }
            });

            // في حالة عدم وجود أخبار، استخدم البيانات الاحتياطية
            if (this.allNews.length === 0) {
                this.allNews = await this.getFallbackNews();
            }

            // ترتيب الأخبار حسب التاريخ
            this.allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
            
            // إزالة المكررات
            this.allNews = this.removeDuplicates(this.allNews);
            
            // الحد من عدد الأخبار
            this.allNews = this.allNews.slice(0, CONFIG.MAX_NEWS_ITEMS || 50);
            
            this.filteredNews = this.allNews;
            this.updateTicker();
            this.updateNewsGrid();
            this.updateSourceInfo();
            
        } catch (error) {
            console.error('خطأ في تحميل الأخبار:', error);
            this.showError('فشل في تحميل الأخبار. يرجى المحاولة مرة أخرى.');
        }
    }

    async fetchFromPHPProxy() {
        const newsFeeds = [
            { url: 'https://cointelegraph.com/rss', source: 'CoinTelegraph' },
            { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
            { url: 'https://news.bitcoin.com/feed/', source: 'Bitcoin.com' },
            { url: 'https://decrypt.co/feed', source: 'Decrypt' }
        ];

        const allNews = [];
        
        for (const feed of newsFeeds) {
            try {
                const response = await fetch(`proxy.php?url=${encodeURIComponent(feed.url)}&source=${encodeURIComponent(feed.source)}`);
                const data = await response.json();
                
                if (data.status === 'success' && data.items) {
                    const formattedNews = data.items.map(item => ({
                        title: item.title,
                        summary: item.description,
                        source: item.source,
                        publishedAt: item.pubDate,
                        url: item.link,
                        id: item.guid || item.link
                    }));
                    
                    allNews.push(...formattedNews);
                }
            } catch (error) {
                console.error(`خطأ في جلب أخبار ${feed.source}:`, error);
            }
        }
        
        return allNews;
    }

    async fetchFromPublicAPIs() {
        const allNews = [];
        
        try {
            // استخدام CoinGecko للأخبار (مجاني)
            const response = await fetch('https://api.coingecko.com/api/v3/news');
            const data = await response.json();
            
            if (data && data.data) {
                const coinGeckoNews = data.data.slice(0, 10).map(article => ({
                    title: article.title,
                    summary: article.description.substring(0, 200) + '...',
                    source: 'CoinGecko News',
                    publishedAt: article.created_at,
                    url: article.url,
                    image: article.thumb_2x,
                    id: article.id
                }));
                
                allNews.push(...coinGeckoNews);
            }
        } catch (error) {
            console.error('خطأ في CoinGecko News:', error);
        }

        try {
            // استخدام CryptoCompare (يتطلب API key مجاني)
            const response = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
            const data = await response.json();
            
            if (data.Response === 'Success' && data.Data) {
                const cryptoCompareNews = data.Data.slice(0, 10).map(article => ({
                    title: article.title,
                    summary: article.body.substring(0, 200) + '...',
                    source: article.source_info.name,
                    publishedAt: new Date(article.published_on * 1000).toISOString(),
                    url: article.url,
                    image: article.imageurl,
                    id: article.id
                }));
                
                allNews.push(...cryptoCompareNews);
            }
        } catch (error) {
            console.error('خطأ في CryptoCompare:', error);
        }
        
        return allNews;
    }

    async fetchFromAlternativeSources() {
        // مصادر بديلة أو محلية
        try {
            // يمكن إضافة مصادر أخرى هنا
            const response = await fetch('https://api.alternative.me/v1/news/');
            const data = await response.json();
            
            if (data && data.data) {
                return data.data.slice(0, 10).map(article => ({
                    title: article.title,
                    summary: article.description || 'لا يوجد وصف متاح',
                    source: 'Alternative.me',
                    publishedAt: article.published_at,
                    url: article.url,
                    id: article.id
                }));
            }
        } catch (error) {
            console.error('خطأ في Alternative sources:', error);
        }
        
        return [];
    }

    async getFallbackNews() {
        // أخبار احتياطية في حالة فشل جميع المصادر
        return [
            {
                title: "Bitcoin يواصل تقلباته وسط ترقب المستثمرين",
                summary: "تشهد عملة البيتكوين تقلبات مستمرة في الأسعار وسط ترقب المستثمرين للتطورات الجديدة في السوق والقرارات التنظيمية المرتقبة...",
                source: "تحديث تلقائي",
                publishedAt: new Date().toISOString(),
                url: "#",
                id: "fallback-1"
            },
            {
                title: "Ethereum تستعد لتحديثات جديدة لتحسين الأداء",
                summary: "يعمل مطورو شبكة الإيثيريوم على تحديثات جديدة تهدف إلى تحسين سرعة المعاملات وتقليل الرسوم، مما قد يعزز من اعتماد الشبكة...",
                source: "تحديث تلقائي",
                publishedAt: new Date(Date.now() - 3600000).toISOString(),
                url: "#",
                id: "fallback-2"
            },
            {
                title: "نمو متزايد في اعتماد العملات الرقمية عالمياً",
                summary: "تشير التقارير الحديثة إلى نمو متزايد في اعتماد العملات الرقمية على مستوى العالم، مع دخول المزيد من المؤسسات والشركات إلى هذا المجال...",
                source: "تحديث تلقائي",
                publishedAt: new Date(Date.now() - 7200000).toISOString(),
                url: "#",
                id: "fallback-3"
            }
        ];
    }

    removeDuplicates(news) {
        const seen = new Set();
        return news.filter(article => {
            const key = article.title.toLowerCase().trim();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

     updateTicker() {
        if (this.allNews.length === 0) {
            this.newsContent.innerHTML = '<span class="loading">لا توجد أخبار متاحة حالياً</span>';
            return;
        }

        const tickerItems = this.allNews.slice(0, 15).map(news => {
            const timeAgo = this.getTimeAgo(news.publishedAt);
            return `
                <span class="news-item" onclick="window.open('${news.url}', '_blank')" title="${news.summary}">
                    ${news.title}
                    <span class="source-badge">${news.source}</span>
                    <span class="time-badge">${timeAgo}</span>
                </span>
            `;
        }).join('');

        this.newsContent.innerHTML = tickerItems;
        
        // إعادة تشغيل الأنيميشن
        this.newsContent.style.animation = 'none';
        this.newsContent.offsetHeight; // trigger reflow
        this.newsContent.style.animation = null;
    }

    updateNewsGrid() {
        if (this.filteredNews.length === 0) {
            this.newsGrid.innerHTML = '<div class="error-message">لا توجد أخبار متاحة للعرض حسب الفلتر المحدد</div>';
            return;
        }

        const newsCards = this.filteredNews.map(news => {
            const timeAgo = this.getTimeAgo(news.publishedAt);
            const imageHtml = news.image ? 
                `<img src="${news.image}" alt="${news.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 10px; margin-bottom: 15px;" onerror="this.style.display='none'">` : '';
            
            return `
                <div class="news-card" data-source="${news.source.toLowerCase()}">
                    ${imageHtml}
                    <div class="news-meta">
                        <span class="source">${news.source}</span>
                        <span class="publish-time">${timeAgo}</span>
                    </div>
                    <h3>${news.title}</h3>
                    <p class="news-summary">${news.summary}</p>
                    <div class="card-actions">
                        <a href="${news.url}" target="_blank" class="read-more">اقرأ المزيد</a>
                        <button class="share-btn" onclick="navigator.share ? navigator.share({title: '${news.title.replace(/'/g, "\\'")}', url: '${news.url}'}) : this.copyToClipboard('${news.url}')">مشاركة</button>
                    </div>
                </div>
            `;
        }).join('');

        this.newsGrid.innerHTML = newsCards;
    }

    updateSourceInfo() {
        const sources = [...new Set(this.allNews.map(news => news.source))];
        const sourceText = `المصادر: ${sources.join(', ')} | آخر تحديث: ${new Date().toLocaleString('ar-SA')}`;
        this.currentSource.textContent = sourceText;
    }

    setupEventListeners() {
        this.pauseBtn.addEventListener('click', () => {
            this.togglePause();
        });

        this.refreshBtn.addEventListener('click', () => {
            this.refreshBtn.style.transform = 'rotate(360deg)';
            this.refreshBtn.style.transition = 'transform 0.5s ease';
            setTimeout(() => {
                this.refreshBtn.style.transform = '';
                this.refreshBtn.style.transition = '';
            }, 500);
            this.loadRealNews();
        });

        // فلترة الأخبار حسب المصدر
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const source = e.target.dataset.source;
                this.filterNews(source);
            });
        });

        // إيقاف التمرير عند hover على الشريط
        this.newsContent.addEventListener('mouseenter', () => {
            if (!this.isPaused) {
                this.newsContent.style.animationPlayState = 'paused';
            }
        });

        this.newsContent.addEventListener('mouseleave', () => {
            if (!this.isPaused) {
                this.newsContent.style.animationPlayState = 'running';
            }
        });

        // البحث في الأخبار
        this.setupSearch();
    }

    setupSearch() {
        // إضافة مربع البحث إذا لم يكن موجوداً
        if (!document.getElementById('searchBox')) {
            const searchContainer = document.createElement('div');
            searchContainer.className = 'search-container';
            searchContainer.innerHTML = `
                <input type="text" id="searchBox" placeholder="ابحث في الأخبار..." class="search-input">
                <button id="clearSearch" class="clear-search">✕</button>
            `;
            
            document.querySelector('.news-details').insertBefore(searchContainer, document.querySelector('.filter-tabs'));
        }

        const searchBox = document.getElementById('searchBox');
        const clearSearch = document.getElementById('clearSearch');

        searchBox.addEventListener('input', (e) => {
            this.searchNews(e.target.value);
        });

        clearSearch.addEventListener('click', () => {
            searchBox.value = '';
            this.searchNews('');
        });
    }

    searchNews(query) {
        if (!query.trim()) {
            this.filteredNews = this.allNews;
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredNews = this.allNews.filter(news => 
                news.title.toLowerCase().includes(searchTerm) ||
                news.summary.toLowerCase().includes(searchTerm) ||
                news.source.toLowerCase().includes(searchTerm)
            );
        }
        this.updateNewsGrid();
    }

    filterNews(source) {
        this.currentFilter = source;
        
        if (source === 'all') {
            this.filteredNews = this.allNews;
        } else {
            this.filteredNews = this.allNews.filter(news => 
                news.source.toLowerCase().includes(source.toLowerCase())
            );
        }
        
        this.updateNewsGrid();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const content = this.newsContent;
        
        if (this.isPaused) {
            content.classList.add('paused');
            content.style.animationPlayState = 'paused';
            this.pauseBtn.textContent = '▶️';
            this.pauseBtn.title = 'تشغيل';
        } else {
            content.classList.remove('paused');
            content.style.animationPlayState = 'running';
            this.pauseBtn.textContent = '⏸️';
            this.pauseBtn.title = 'إيقاف مؤقت';
        }
    }

    startAutoRefresh() {
        // تحديث الأخبار كل 10 دقائق
        this.refreshInterval = setInterval(() => {
            if (!this.isPaused) {
                this.loadRealNews();
            }
        }, CONFIG.REFRESH_INTERVAL || 600000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    showLoading() {
        this.newsContent.innerHTML = '<span class="loading">🔄 جاري تحميل آخر الأخبار...</span>';
        this.newsGrid.innerHTML = `
            <div class="loading-grid">
                <div class="loading-card"></div>
                <div class="loading-card"></div>
                <div class="loading-card"></div>
            </div>
        `;
    }

    showError(message) {
        this.newsContent.innerHTML = `<span class="loading" style="color: #dc3545;">❌ ${message}</span>`;
        this.newsGrid.innerHTML = `
            <div class="error-message">
                <h3>⚠️ خطأ في التحميل</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-btn">إعادة المحاولة</button>
            </div>
        `;
    }

    getTimeAgo(dateString) {
        const now = new Date();
        const publishDate = new Date(dateString);
        const diffInMinutes = Math.floor((now - publishDate) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'الآن';
        if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `منذ ${diffInDays} يوم`;
        
        const diffInWeeks = Math.floor(diffInDays / 7);
        if (diffInWeeks < 4) return `منذ ${diffInWeeks} أسبوع`;
        
        return publishDate.toLocaleDateString('ar-SA');
    }

    // تنظيف الموارد عند إغلاق الصفحة
    destroy() {
        this.stopAutoRefresh();
    }
}

// إضافة CSS للبحث والتحسينات الإضافية
const additionalCSS = `
.search-container {
    margin-bottom: 20px;
    position: relative;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
}

.search-input {
    width: 100%;
    padding: 12px 40px 12px 20px;
    border: 2px solid #ddd;
    border-radius: 25px;
    font-size: 16px;
    outline: none;
    transition: border-color 0.3s ease;
}

.search-input:focus {
    border-color: #FF6B35;
}

.clear-search {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    font-size: 18px;
    color: #999;
    cursor: pointer;
    padding: 5px;
}

.clear-search:hover {
    color: #FF6B35;
}

.loading-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 25px;
}

.loading-card {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    height: 200px;
    border-radius: 15px;
}

@keyframes loading {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}

.card-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
}

.share-btn {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    color: #495057;
    padding: 6px 12px;
    border-radius: 15px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.3s ease;
}

.share-btn:hover {
    background: #e9ecef;
    transform: scale(1.05);
}

.retry-btn {
    background: linear-gradient(45deg, #FF6B35, #F7931E);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    margin-top: 15px;
    transition: transform 0.3s ease;
}

.retry-btn:hover {
    transform: scale(1.05);
}

@media (max-width: 768px) {
    .search-container {
        margin: 0 0 20px 0;
    }
    
    .card-actions {
        flex-direction: column;
        gap: 10px;
    }
    
    .card-actions .read-more,
    .card-actions .share-btn {
        width: 100%;
        text-align: center;
    }
}
`;

// إضافة CSS الإضافي
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// تشغيل التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.cryptoNewsApp = new EnhancedCryptoNews();
});

// تنظيف الموارد عند إغلاق الصفحة
window.addEventListener('beforeunload', () => {
    if (window.cryptoNewsApp) {
        window.cryptoNewsApp.destroy();
    }
});
