// ===== 配置区：填入你的 LeanCloud 凭据 =====
const LC_CONFIG = {
  appId:   'YOUR_APP_ID',
  appKey:  'YOUR_APP_KEY',
  apiBase: 'https://YOUR_SERVER/1.1',
};

// 邀请码 → 显示姓名（管理员维护，增加同事时在此添加）
// 供 index.html 在 saveProfile() 中校验邀请码是否合法
const MEMBERS = {
  'AKSA01': '张三',
  'AKSA02': '李四',
  // 继续添加...
};
// ===== 配置区结束 =====

function lcFetch(path, options = {}) {
  return fetch(LC_CONFIG.apiBase + path, {
    ...options,
    headers: {
      'X-LC-Id':       LC_CONFIG.appId,
      'X-LC-Key':      LC_CONFIG.appKey,
      'Content-Type':  'application/json',
      ...(options.headers || {}),
    },
  });
}

function getTodayStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

async function hasCheckedInToday(code) {
  const where = encodeURIComponent(JSON.stringify({ code, date: getTodayStr() }));
  const res = await lcFetch(`/classes/checkins?where=${where}&limit=1`);
  if (!res.ok) throw new Error('query failed: ' + res.status);
  const data = await res.json();
  return data.results && data.results.length > 0;
}

async function checkInToLeanCloud(code, name) {
  if (await hasCheckedInToday(code)) return;
  const res = await lcFetch('/classes/checkins', {
    method: 'POST',
    body: JSON.stringify({ code, name, date: getTodayStr() }),
  });
  if (!res.ok) throw new Error('write failed: ' + res.status);
}

async function getLeaderboard() {
  const res = await lcFetch('/classes/checkins?limit=1000');
  if (!res.ok) throw new Error('read failed: ' + res.status);
  const { results } = await res.json();
  const counts = {};
  for (const item of results) {
    if (!counts[item.code]) counts[item.code] = { name: item.name, days: 0 };
    counts[item.code].days += 1;
  }
  return Object.values(counts).sort((a, b) => b.days - a.days).slice(0, 20);
}
