// 定时抓取调度器
const fs = require('fs');
const path = require('path');
const { fetchSource } = require('./fetcher');

const sourcesPath = path.join(__dirname, '..', 'data', 'sources.json');

let intervalId = null;
let lastResults = [];
let lastFetchTime = null;

// 加载所有数据源配置
function loadSources() {
  try {
    const data = fs.readFileSync(sourcesPath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('加载sources.json失败:', e.message);
    return [];
  }
}

// 依次抓取全部来源
async function fetchAll() {
  const sources = loadSources();
  const results = [];
  for (const source of sources) {
    const r = await fetchSource(source);
    results.push({ source: source.id, ...r });
  }
  lastResults = results;
  lastFetchTime = new Date().toISOString();
  console.log(`[${lastFetchTime}] 抓取完成:`, results);
  return results;
}

// 启动定时任务，intervalMs 单位毫秒
function startScheduler(intervalMs = 60000) {
  stopScheduler();
  console.log(`[Scheduler] 启动，间隔 ${intervalMs / 1000} 秒`);
  fetchAll(); // 立即执行一次
  intervalId = setInterval(fetchAll, intervalMs);
}

function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function getLastResults() {
  return { lastFetchTime, lastResults };
}

module.exports = { startScheduler, stopScheduler, fetchAll, getLastResults, loadSources };