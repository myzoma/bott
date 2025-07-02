#!/usr/bin/env python3
"""
إصدار سطر الأوامر لعرض أخبار العملات الرقمية
"""

import feedparser
import argparse
from datetime import datetime
import sys

RSS_FEEDS = {
    'CoinDesk': 'https://feeds.feedburner.com/CoinDesk',
    'Cointelegraph': 'https://cointelegraph.com/rss',
    'Bitcoin News': 'https://bitcoinnews.com/feed/',
    'CryptoNews': 'https://cryptonews.com/news/feed/',
    'NewsBTC': 'https://www.newsbtc.com/feed/'
}

def fetch_and_display_news(source=None, limit=10):
    """جلب وعرض الأخبار"""
    
    feeds_to_process = RSS_FEEDS if not source else {source: RSS_FEEDS.get(source)}
    
    if source and source not in RSS_FEEDS:
        print(f"❌ المصدر '{source}' غير متوفر")
        print("المصادر المتاحة:")
        for feed_name in RSS_FEEDS.keys():
            print(f"  - {feed_name}")
        return
    
    print("🔄 جاري جلب الأخبار...")
    print("=" * 80)
    
    all_articles = []
    
    for feed_name, feed_url in feeds_to_process.items():
        try:
            print(f"📡 جلب الأخبار من {feed_name}...")
            feed = feedparser.parse(feed_url)
            
            for entry in feed.entries[:limit]:
                article = {
                    'title': entry.title,
                    'link': entry.link,
                    'description': entry.get('description', ''),
                    'published': entry.get('published', ''),
                    'source': feed_name
                }
                all_articles.append(article)
                
        except Exception as e:
            print(f"❌ خطأ في جلب الأخبار من {feed_name}: {str(e)}")
    
    # عرض الأخبار
    print("\n" + "=" * 80)
    print("📰 أخبار العملات الرقمية")
    print("=" * 80)
    
    for i, article in enumerate(all_articles[:limit], 1):
        print(f"\n{i}. 📌 {article['source']}")
        print(f"   📰 {article['title']}")
        print(f"   🔗 {article['link']}")
        if article['published']:
            print(f"   📅 {article['published']}")
        print("-" * 80)

def main():
    parser = argparse.ArgumentParser(description='عرض أخبار العملات الرقمية')
    parser.add_argument('--source', '-s', help='مصدر محدد للأخبار')
    parser.add_argument('--limit', '-l', type=int, default=10, help='عدد الأخبار المراد عرضها')
    parser.add_argument('--list-sources', action='store_true', help='عرض قائمة المصادر المتاحة')
    
    args = parser.parse_args()
    
    if args.list_sources:
        print("📋 المصادر المتاحة:")
        for feed_name in RSS_FEEDS.keys():
            print(f"  - {feed_name}")
        return
    
    fetch_and_display_news(args.source, args.limit)

if __name__ == '__main__':
    main()
