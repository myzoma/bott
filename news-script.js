async function fetchCryptoNews() {
  const newsList = document.getElementById('news');
  newsList.innerHTML = '<li style="text-align:center;">جاري جلب الأخبار...</li>';
  let allNews = [];

  // CoinGecko
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/news');
    const data = await res.json();
    if (data.data) {
      allNews = allNews.concat(
        data.data.slice(0, 10).map(a => ({
          title: a.title,
          url: a.url,
          summary: a.description?.slice(0, 120) + '...',
          source: 'CoinGecko',
          date: new Date(a.created_at).toLocaleString('ar-EG')
        }))
      );
    }
  } catch (e) {/* تجاهل الخطأ */ }

  // CryptoCompare
  try {
    const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
    const data = await res.json();
    if (data.Data) {
      allNews = allNews.concat(
        data.Data.slice(0, 10).map(a => ({
          title: a.title,
          url: a.url,
          summary: a.body.slice(0, 120) + '...',
          source: a.source_info.name,
          date: new Date(a.published_on * 1000).toLocaleString('ar-EG')
        }))
      );
    }
  } catch (e) {/* تجاهل الخطأ */ }

  // Alternative.me
  try {
    const res = await fetch('https://api.alternative.me/v1/news/');
    const data = await res.json();
    if (data.data) {
      allNews = allNews.concat(
        data.data.slice(0, 10).map(a => ({
          title: a.title,
          url: a.url,
          summary: a.description || '',
          source: 'Alternative.me',
          date: new Date(a.published_at).toLocaleString('ar-EG')
        }))
      );
    }
  } catch (e) {/* تجاهل الخطأ */ }

  // إذا لم يوجد أخبار
  if (allNews.length === 0) {
    newsList.innerHTML = '<li style="text-align:center;color:#c00;">فشل في جلب الأخبار.</li>';
    return;
  }

  // ترتيب حسب الأحدث وحذف المكرر
  const seen = new Set();
  allNews = allNews
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter(a => {
      if (seen.has(a.title)) return false;
      seen.add(a.title);
      return true;
    })
    .slice(0, 20);

  // عرض الأخبار
  newsList.innerHTML = allNews.map(news => `
    <li class="news-item">
      <div class="news-title"><a class="news-link" href="${news.url}" target="_blank">${news.title}</a></div>
      <div class="news-meta">${news.source} &mdash; ${news.date}</div>
      <div class="news-summary">${news.summary}</div>
    </li>
  `).join('');
}

// تشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', fetchCryptoNews);
