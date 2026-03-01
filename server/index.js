// Express服务器入口
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { getItems, getItemCount } = require('./db');
const { startScheduler, getLastResults, loadSources, fetchAll } = require('./scheduler');

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// 静态资源目录
app.use(express.static(path.join(__dirname, '..', 'public')));

// 获取所有新闻
app.get('/api/items', (req, res) => {
  const { source_id, limit, offset, search } = req.query;
  const items = getItems({
    source_id,
    limit: limit ? parseInt(limit, 10) : 200,
    offset: offset ? parseInt(offset, 10) : 0,
    search
  });
  res.json({ items, total: getItemCount() });
});

// 获取所有数据源配置
app.get('/api/sources', (req, res) => {
  res.json(loadSources());
});

// 健康检查与抓取状态
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ...getLastResults() });
});

// 手动触发一次全量抓取
app.post('/api/fetch', async (req, res) => {
  const results = await fetchAll();
  res.json({ ok: true, results });
});

// 配置刷新间隔（单位：秒，最小10秒）
let refreshInterval = parseInt(process.env.REFRESH_INTERVAL, 10) || 60;
app.get('/api/config', (req, res) => {
  res.json({ refreshInterval });
});
app.post('/api/config', (req, res) => {
  const { refreshInterval: newInterval } = req.body;
  if (typeof newInterval === 'number' && newInterval >= 10) {
    refreshInterval = newInterval;
    startScheduler(refreshInterval * 1000);
    res.json({ ok: true, refreshInterval });
  } else {
    res.status(400).json({ ok: false, error: '刷新间隔需≥10秒' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器启动: http://localhost:${PORT}`);
  startScheduler(refreshInterval * 1000);
});