// 数据抓取器：支持RSS、Nitter RSS、HTML爬虫等
const RSSParser = require('rss-parser');
const got = require('got').default;
const cheerio = require('cheerio');
const { nanoid } = require('nanoid');
const { addItem } = require('./db');

const rssParser = new RSSParser({ timeout: 15000 });

// RSS/Nitter 通用抓取
async function fetchRss(source) {
  const now = new Date().toISOString();
  // Prefer fetching with got (custom UA/headers) then parseString; fallback to parseURL
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (compatible; IranWarInfoBot/1.0; +https://github.com/LewisLiu007/iran-war-info)',
    Accept:
      'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.1',
    ...(source.headers || {})
  };
  try {
    const res = await got(source.url, {
      timeout: { request: 15000 },
      http2: false,
      followRedirect: true,
      headers
    });
    const feed = await rssParser.parseString(res.body);
    let count = 0;
    for (const item of (feed.items || [])) {
      const pubDateRaw = item.isoDate || item.pubDate;
      const pubDate = pubDateRaw ? new Date(pubDateRaw).toISOString() : now;
      const result = addItem({
        id: nanoid(),
        source_id: source.id,
        title: item.title || '',
        link: item.link || '',
        summary: item.contentSnippet || item.content || '',
        pub_date: pubDate,
        fetch_time: now
      });
      if (result.changes > 0) count++;
    }
    return { ok: true, count };
  } catch (e1) {
    try {
      const feed = await rssParser.parseURL(source.url);
      let count = 0;
      for (const item of (feed.items || [])) {
        const pubDateRaw = item.isoDate || item.pubDate;
        const pubDate = pubDateRaw ? new Date(pubDateRaw).toISOString() : now;
        const result = addItem({
          id: nanoid(),
          source_id: source.id,
          title: item.title || '',
          link: item.link || '',
          summary: item.contentSnippet || item.content || '',
          pub_date: pubDate,
          fetch_time: now
        });
        if (result.changes > 0) count++;
      }
      return { ok: true, count };
    } catch (e2) {
      return { ok: false, error: e1.message || e2.message };
    }
  }
}

// HTML 爬虫示例（可扩展）
async function fetchHtml(source) {
  try {
    const res = await got(source.url, { timeout: { request: 15000 } });
    const $ = cheerio.load(res.body);
    // 根据source.selector等自定义爬取规则
    // 示例：提取所有<a>的href和文本
    const now = new Date().toISOString();
    let count = 0;
    $(source.selector || 'a').each((_, el) => {
      const link = $(el).attr('href');
      const title = $(el).text();
      if (link && title) {
        const result = addItem({
          id: nanoid(),
          source_id: source.id,
          title: title.trim(),
          link: link.startsWith('http') ? link : source.url + link,
          summary: '',
          pub_date: now,
          fetch_time: now
        });
        if (result.changes > 0) count++;
      }
    });
    return { ok: true, count };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// 统一抓取入口
async function fetchSource(source) {
  if (!source.enabled) return { ok: false, error: 'disabled' };
  switch (source.type) {
    case 'rss':
    case 'nitter':
      return fetchRss(source);
    case 'html':
      return fetchHtml(source);
    default:
      return { ok: false, error: 'unknown type' };
  }
}

module.exports = { fetchSource };