const http = require('http');
const ADMIN_PWD = 'admin1234';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const r = http.request({
      host: 'localhost', port: 3001, path, method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': ADMIN_PWD,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function main() {
  // 1. 取得所有參與者
  const all = await req('GET', '/api/admin/participants');
  console.log(`目前共 ${all.length} 人，開始清理...`);

  // 保留的人（照姓名比對）
  const keep = ['林小雨', '陳美玲', '張大偉', '李建宏'];

  // 刪除不保留的
  for (const p of all) {
    if (!keep.includes(p.name)) {
      await req('DELETE', `/api/admin/participants/${p.id}`);
      console.log(`🗑  刪除 ${p.name} (${p.group_name})`);
    }
  }

  // 2. 確認剩下的
  const remaining = await req('GET', '/api/admin/participants');
  console.log('\n剩餘參與者：');
  remaining.forEach(p => console.log(` ${p.group_name} | ${p.name} | ${p.id.slice(0,8)}`));

  const 林小雨 = remaining.find(p => p.name === '林小雨');
  const 陳美玲 = remaining.find(p => p.name === '陳美玲');
  const 張大偉 = remaining.find(p => p.name === '張大偉');
  const 李建宏 = remaining.find(p => p.name === '李建宏');

  // 3. 清除所有舊 choices
  for (const p of remaining) {
    await req('DELETE', `/api/admin/choice/${p.id}`).catch(() => {});
  }
  console.log('\n舊選擇已清除');

  // 4. 設定 phase = voting 讓 choice API 接受
  await req('POST', '/api/admin/phase', { phase: 'voting' });

  // 5. 用 public API 建立選擇（需要先登入拿 token）
  function publicPost(path, body, token) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const r = http.request({
        host: 'localhost', port: 3001, path, method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      }, res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
      });
      r.on('error', reject); r.write(payload); r.end();
    });
  }

  // 林小雨 選 張大偉（互相配對）
  const r1 = await publicPost('/api/login', { participant_id: 林小雨.id });
  await publicPost('/api/choice', { chosen_id: 張大偉.id, email: 'linxiaoyu@demo.com' }, r1.token);
  console.log('✅ 林小雨 → 張大偉');

  // 張大偉 選 林小雨（互相配對）
  const r2 = await publicPost('/api/login', { participant_id: 張大偉.id });
  await publicPost('/api/choice', { chosen_id: 林小雨.id, email: 'zhangdawei@demo.com' }, r2.token);
  console.log('✅ 張大偉 → 林小雨');

  // 陳美玲 選 張大偉（不配對：張大偉選了林小雨）
  const r3 = await publicPost('/api/login', { participant_id: 陳美玲.id });
  await publicPost('/api/choice', { chosen_id: 張大偉.id, email: 'chenmeiling@demo.com' }, r3.token);
  console.log('✅ 陳美玲 → 張大偉（不配對）');

  // 李建宏 選 陳美玲（不配對：陳美玲選了張大偉）
  const r4 = await publicPost('/api/login', { participant_id: 李建宏.id });
  await publicPost('/api/choice', { chosen_id: 陳美玲.id, email: 'lijanhong@demo.com' }, r4.token);
  console.log('✅ 李建宏 → 陳美玲（不配對）');

  // 6. 改為 revealed
  await req('POST', '/api/admin/phase', { phase: 'revealed' });
  console.log('\n🎉 Phase 設為 revealed，可以看結果了！');
  console.log('\n--- 測試帳號 ---');
  console.log(`配對成功：林小雨 id=${林小雨.id}`);
  console.log(`配對失敗：陳美玲 id=${陳美玲.id}`);
}

main().catch(console.error);
