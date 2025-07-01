async function fetchCryptoNews() {
  const newsList = document.getElementById('news');
  newsList.innerHTML = '<li style="text-align:center;">جاري جلب الأخبار...</li>';
  let allNews = [];

  // CoinGecko فقط (يدعم CORS)
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/news');
    const data = await res.json();
    if (data.data) {
      allNews = data.data.slice(0, 15).map(a => ({
        title: a.title,
        url: a.url,
        summary: a.description?.slice(0, 120) + '...',
        source: 'CoinGecko',
        date: new Date(a.created_at).toLocaleString('ar-EG')
      }));
    }
  } catch (e) {
    newsList.innerHTML = '<li style="text-align:center;color:#c00;">فشل في جلب الأخبار.</li>';
    return;
  }

  if (allNews.length === 0) {
    newsList.innerHTML = '<li style="text-align:center;color:#c00;">لا توجد أخبار متاحة.</li>';
    return;
  }

  newsList.innerHTML = allNews.map(news => `
    <li class="news-item">
      <div class="news-title"><a class="news-link" href="${news.url}" target="_blank">${news.title}</a></div>
      <div class="news-meta">${news.source} &mdash; ${news.date}</div>
      <div class="news-summary">${news.summary}</div>
    </li>
  `).join('');
}
document.addEventListener('DOMContentLoaded', fetchCryptoNews);
