// التطبيق الرئيسي
class CryptoNewsApp {
    constructor() {
        this.newsService = new NewsService();
        this.currentNews = [];
        this.filteredNews = [];
        this.displayedCount = 0;
        this.isLoading = false;
        
        this.init();
    }

    // تهيئة التطبيق
    async init() {
        this.setupEventListeners();
        this.showLoading();
        
        // تحميل الأخبار المحفوظة أولاً
        const cachedNews = this.newsService.loadFromLocalStorage();
        if (cachedNews.length > 0) {
            this.currentNews = cachedNews;
            this.filteredNews = [...cachedNews];
            this.renderNews();
            this.updateStats();
        }
        
        // جلب أخبار جديدة
        await this.refreshNews();
        
        // تحديث تلقائي
        this.startAutoRefresh();
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // زر التحديث
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshNews();
        });

        // البحث
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // فلتر المصدر
        const sourceFilter = document.getElementById('sourceFilter');
        sourceFilter.addEventListener('change', (e) => {
            this.handleSourceFilter(e.target.value);
        });

        // تحميل المزيد
        document.getElementById('loadMoreBtn').addEventListener('click', () => {
            this.loadMore();
        });

        // التمرير اللانهائي
        window.addEventListener('scroll', () => {
            this.handleScroll();
        });
    }

    // عرض شاشة التحميل
    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'block';
        document.getElementById('newsContainer').style.display = 'none';
    }

    // إخفاء شاشة التحميل
    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('newsContainer').style.display = 'block';
    }

    // تحديث الأخبار
    async refreshNews() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const refreshBtn = document.getElementById('refreshBtn');
        const originalHTML = refreshBtn.innerHTML;
        
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
        refreshBtn.disabled = true;

        try {
            this.currentNews = await this.newsService.fetchAllNews();
            this.filteredNews = [...this.currentNews];
            this.displayedCount = 0;
            
            this.renderNews();
            this.updateStats();
            this.updateSourceFilter();
            
            // إشعار نجاح
            this.showNotification('تم تحديث الأخبار بنجاح!', 'success');
            
        } catch (error) {
            console.error('خطأ في التحديث:', error);
            this.showNotification('حدث خطأ في تحديث الأخبار', 'error');
        } finally {
            this.isLoading = false;
            refreshBtn.innerHTML = originalHTML;
            refreshBtn.disabled = false;
            this.hideLoading();
        }
    }

    // عرض الأخبار
    renderNews(append = false) {
        const container = document.getElementById('newsContainer');
        
        if (!append) {
            container.innerHTML = '';
            this.displayedCount = 0;
        }

        const newsToShow = this.filteredNews.slice(
            this.displayedCount, 
            this.displayedCount + CONFIG.ITEMS_PER_PAGE
        );

        if (newsToShow.length === 0 && !append) {
            this.showEmptyState();
            return;
        }

        newsToShow.forEach(item => {
            const newsElement = this.createNewsElement(item);
            container.appendChild(newsElement);
        });

        this.displayedCount += newsToShow.length;
        
        // إظهار/إخفاء زر "تحميل المزيد"
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        loadMoreBtn.style.display = 
            this.displayedCount < this.filteredNews.length ? 'block' : 'none';
    }

    // إنشاء عنصر خبر
    createNewsElement(item) {
        const article = document.createElement('article');
        article.className = 'news-item fade-in';
        article.innerHTML = `
            <div class="news-source" style="background-color: ${item.sourceColor}">
                ${item.source}
            </div>
            <h2 class="news-title">
                <a href="${item.link}" target="_blank" rel="noopener noreferrer">
                    ${item.title}
                </a>
            </h2>
            ${item.description ? `<p class="news-description">${item.description}</p>` : ''}
            ${item.thumbnail ? `<img src="${item.thumbnail}" alt="صورة الخبر" class="news-thumbnail" loading="lazy">` : ''}
            <div class="news-meta">
                <div class="news-date">
                    <i class="fas fa-clock"></i>
                    <span>${this.formatDate(item.pubDate)}</span>
                </div>
                <div class="news-actions">
                    <button class="btn btn-outline-primary btn-sm" onclick="navigator.share({title: '${item.title}', url: '${item.link}'}).catch(() => navigator.clipboard.writeText('${item.link}'))">
                        <i class="fas fa-share-alt"></i>
                        مشاركة
                    </button>
                </div>
            </div>
        `;
        
        return article;
    }

  // Service Worker للعمل دون اتصال
const CACHE_NAME = 'crypto-news-v1';
const urlsToCache = [
    '/',
    '/index.html',
    'css/style.css',
    'app.js',
    'newsService.js',
    'config.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // إرجاع الملف من الكاش إذا وُجد
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});
