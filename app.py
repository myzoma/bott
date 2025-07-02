from flask import Flask, render_template, jsonify
import feedparser
import requests
from datetime import datetime
import threading
import time

app = Flask(__name__)

# قائمة مصادر RSS للعملات الرقمية
RSS_FEEDS = {
    'CoinDesk': 'https://feeds.feedburner.com/CoinDesk',
    'Cointelegraph': 'https://cointelegraph.com/rss',
    'Bitcoin News': 'https://bitcoinnews.com/feed/',
    'CryptoNews': 'https://cryptonews.com/news/feed/',
    'NewsBTC': 'https://www.newsbtc.com/feed/',
    'CoinGape': 'https://coingape.com/feed/',
    'Decrypt': 'https://decrypt.co/feed'
}

# متغير لتخزين الأخبار
news_cache = []
last_update = None

def fetch_news_from_feed(feed_name, feed_url):
    """جلب الأخبار من مصدر RSS واحد"""
    try:
        feed = feedparser.parse(feed_url)
        articles = []
        
        for entry in feed.entries[:5]:  # أخذ أول 5 أخبار من كل مصدر
            article = {
                'title': entry.title,
                'link': entry.link,
                'description': entry.get('description', ''),
                'published': entry.get('published', ''),
                'source': feed_name,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            articles.append(article)
        
        return articles
    except Exception as e:
        print(f"خطأ في جلب الأخبار من {feed_name}: {str(e)}")
        return []

def update_news():
    """تحديث جميع الأخبار"""
    global news_cache, last_update
    
    all_news = []
    
    for feed_name, feed_url in RSS_FEEDS.items():
        print(f"جاري جلب الأخبار من {feed_name}...")
        articles = fetch_news_from_feed(feed_name, feed_url)
        all_news.extend(articles)
    
    # ترتيب الأخبار حسب التاريخ
    news_cache = sorted(all_news, key=lambda x: x['timestamp'], reverse=True)
    last_update = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    print(f"تم تحديث {len(news_cache)} خبر")

def background_update():
    """تحديث الأخبار في الخلفية كل 30 دقيقة"""
    while True:
        update_news()
        time.sleep(1800)  # 30 دقيقة

@app.route('/')
def index():
    """الصفحة الرئيسية"""
    return render_template('index.html', news=news_cache[:20], last_update=last_update)

@app.route('/api/news')
def api_news():
    """API لجلب الأخبار بصيغة JSON"""
    return jsonify({
        'news': news_cache[:20],
        'last_update': last_update,
        'total_articles': len(news_cache)
    })

@app.route('/api/refresh')
def refresh_news():
    """تحديث الأخبار يدوياً"""
    update_news()
    return jsonify({
        'status': 'success',
        'message': 'تم تحديث الأخبار بنجاح',
        'total_articles': len(news_cache),
        'last_update': last_update
    })

if __name__ == '__main__':
    # تحديث الأخبار عند بدء التشغيل
    update_news()
    
    # بدء تحديث الأخبار في الخلفية
    update_thread = threading.Thread(target=background_update, daemon=True)
    update_thread.start()
    
    app.run(debug=True, host='0.0.0.0', port=5000)
