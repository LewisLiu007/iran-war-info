// SQLite 数据库初始化与操作封装
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'data.db');
// 确保目录存在
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// 初始化表
db.exec(`
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  title TEXT,
  link TEXT UNIQUE,
  summary TEXT,
  pub_date TEXT,
  fetch_time TEXT
);
CREATE INDEX IF NOT EXISTS idx_items_pubdate ON items(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_items_sourceid ON items(source_id);
`);

// 插入或忽略重复（以link唯一标识）
const insertItem = db.prepare(`
INSERT OR IGNORE INTO items (id, source_id, title, link, summary, pub_date, fetch_time)
VALUES (@id, @source_id, @title, @link, @summary, @pub_date, @fetch_time)
`);

function addItem(item) {
  return insertItem.run(item);
}

// 获取所有新闻（可分页、可按来源筛选）
function getItems({ source_id, limit = 200, offset = 0, search } = {}) {
  let sql = 'SELECT * FROM items WHERE 1=1';
  const params = {};
  if (source_id) {
    sql += ' AND source_id = @source_id';
    params.source_id = source_id;
  }
  if (search) {
    sql += ' AND (title LIKE @search OR summary LIKE @search)';
    params.search = `%${search}%`;
  }
  sql += ' ORDER BY pub_date DESC LIMIT @limit OFFSET @offset';
  params.limit = limit;
  params.offset = offset;
  return db.prepare(sql).all(params);
}

function getItemCount() {
  return db.prepare('SELECT COUNT(*) as cnt FROM items').get().cnt;
}

module.exports = { db, addItem, getItems, getItemCount };