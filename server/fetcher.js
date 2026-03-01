// 数据抓取器：支持RSS、Nitter RSS、HTML爬虫等
const RSSParser = require('rss-parser');
const got = require('got');
const cheerio = require('cheerio');
const { nanoid } = require('nanoid');
const { addItem } = require('./db');

const rssParser = new RSSParser({ timeout: 15000 });

// RSS/Nitter 通用抓取
async function fetchRss(source) {
  try {
    const feed = await rssParser.parseURL(source.url);
    const now = new Date().toISOString();
    let count = 0;
    for (const item of feed.items || []) {
      const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : now;
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
  } catch (e) {
    return { ok: false, error: e.message };
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