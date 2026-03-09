import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api';

const PHASES = [
  { key: 'setup', label: '準備中', desc: '使用者無法登入', color: 'bg-gray-400' },
  { key: 'voting', label: '投票中', desc: '開放選擇', color: 'bg-green-500' },
  { key: 'locked', label: '已鎖定', desc: '停止接受選擇', color: 'bg-yellow-500' },
  { key: 'revealed', label: '已揭曉', desc: '結果公開', color: 'bg-pink-500' },
];

// ── 登入頁
function AdminLogin({ onLogin }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!pwd) return;
    setLoading(true);
    localStorage.setItem('admin_pwd', pwd);
    try {
      await adminApi.getStats();
      onLogin();
    } catch {
      setError('密碼錯誤');
      localStorage.removeItem('admin_pwd');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-4xl mb-4">🔐</div>
      <h1 className="text-xl font-bold mb-6">管理者後台</h1>
      <div className="w-full space-y-3">
        <input
          type="password"
          value={pwd}
          onChange={e => { setPwd(e.target.value); setError(''); }}
          placeholder="管理密碼"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-400"
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-pink-500 text-white font-bold"
        >
          {loading ? '驗證中...' : '進入後台'}
        </button>
      </div>
    </div>
  );
}

// ── 狀態標籤
function PhaseBadge({ phase }) {
  const p = PHASES.find(x => x.key === phase) || PHASES[0];
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-white text-sm font-medium ${p.color}`}>
      {p.label}
    </span>
  );
}

// ── 新增/批次新增參與者表單
function AddParticipantForm({ onAdded }) {
  const [mode, setMode] = useState('single'); // single | batch
  const [form, setForm] = useState({ name: '', group_name: 'A', bio: '', access_code: '', photo: '' });
  const [batchText, setBatchText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, photo: ev.target.result }));
      setPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSingle = async () => {
    if (!form.name) return setError('姓名為必填');
    setLoading(true); setError('');
    try {
      await adminApi.addParticipant(form);
      setForm({ name: '', group_name: 'A', bio: '', access_code: '', photo: '' });
      setPreview('');
      onAdded();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatch = async () => {
    setLoading(true); setError('');
    try {
      // 解析 JSON 或 CSV 格式
      let participants;
      try {
        participants = JSON.parse(batchText);
      } catch {
        // 嘗試 CSV: name,group,bio,access_code 每行一人
        participants = batchText.trim().split('\n').map(line => {
          const [name, group_name, bio, access_code] = line.split(',').map(s => s.trim());
          return { name, group_name, bio: bio || '', access_code };
        });
      }
      const res = await adminApi.batchAdd(participants);
      const msg = `成功新增 ${res.inserted.length} 人` + (res.errors.length ? `，${res.errors.length} 筆失敗` : '');
      setError(msg);
      setBatchText('');
      onAdded();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-800 mb-3">新增參與者</h3>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setMode('single')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'single' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          單筆新增
        </button>
        <button onClick={() => setMode('batch')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'batch' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          批次新增
        </button>
      </div>

      {mode === 'single' ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="姓名 *" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <select value={form.group_name} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="A">A 區</option>
              <option value="B">B 區</option>
            </select>
          </div>
          <input value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            placeholder="簡介（選填）" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={form.access_code} onChange={e => setForm(f => ({ ...f, access_code: e.target.value }))}
            placeholder="識別碼（選填，留空自動產生）" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />

          {/* 照片上傳 */}
          <div className="flex items-center gap-3">
            <label className="flex-1 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 cursor-pointer text-center">
              {preview ? '已選照片' : '上傳照片（選填）'}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
            {preview && <img src={preview} className="w-10 h-10 rounded-full object-cover" alt="preview" />}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleSingle} disabled={loading}
            className="w-full py-2 bg-pink-500 text-white rounded-lg font-medium text-sm">
            {loading ? '新增中...' : '新增'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            格式：每行一人<br />
            <code className="bg-gray-100 px-1 rounded">姓名,分組(A或B),簡介</code>（識別碼自動產生）<br />
            或貼上 JSON 陣列
          </p>
          <textarea
            value={batchText}
            onChange={e => setBatchText(e.target.value)}
            placeholder={`範例：\n小明,A,喜歡打球\n小美,B,愛看電影`}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-32 resize-none font-mono"
          />
          {error && <p className="text-sm text-gray-600">{error}</p>}
          <button onClick={handleBatch} disabled={loading}
            className="w-full py-2 bg-pink-500 text-white rounded-lg font-medium text-sm">
            {loading ? '處理中...' : '批次新增'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── 主 Admin 頁面
export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('admin_pwd'));
  const [tab, setTab] = useState('dashboard'); // dashboard | participants | log
  const [stats, setStats] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [logs, setLogs] = useState([]);
  const [previewResult, setPreviewResult] = useState(null);
  const [phaseLoading, setPhaseLoading] = useState(false);
  const [filterGroup, setFilterGroup] = useState('all');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([adminApi.getStats(), adminApi.getParticipants()]);
      setStats(s);
      setParticipants(p);
    } catch (e) {
      if (e.message === 'Unauthorized') {
        localStorage.removeItem('admin_pwd');
        setLoggedIn(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [loggedIn, refresh]);

  useEffect(() => {
    if (tab === 'log' && loggedIn) {
      adminApi.getAuditLog().then(setLogs).catch(() => {});
    }
  }, [tab, loggedIn]);

  const handlePhaseChange = async (phase) => {
    setPhaseLoading(true); setError('');
    try {
      await adminApi.setPhase(phase);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setPhaseLoading(false);
    }
  };

  const handleResetChoice = async (id, name) => {
    if (!window.confirm(`確定要重設 ${name} 的選擇嗎？`)) return;
    try {
      await adminApi.resetChoice(id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const handlePreview = async (id) => {
    try {
      const res = await adminApi.preview(id);
      setPreviewResult(res);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteParticipant = async (id, name) => {
    if (!window.confirm(`確定要刪除 ${name} 嗎？`)) return;
    try {
      await adminApi.deleteParticipant(id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!loggedIn) {
    return <AdminLogin onLogin={() => setLoggedIn(true)} />;
  }

  const filtered = filterGroup === 'all' ? participants : participants.filter(p => p.group_name === filterGroup);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">管理者後台</h1>
            {stats && <PhaseBadge phase={stats.phase} />}
          </div>
          <button
            onClick={() => { localStorage.removeItem('admin_pwd'); setLoggedIn(false); }}
            className="text-gray-400 text-sm"
          >
            登出
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-200">
        {[
          { key: 'dashboard', label: '儀表板' },
          { key: 'participants', label: '➕ 名單管理' },
          { key: 'log', label: '記錄' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors
              ${tab === t.key ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-red-50 text-red-600 p-3 rounded-xl text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">關閉</button>
        </div>
      )}

      <div className="p-4 space-y-4">

        {/* ── 儀表板 */}
        {tab === 'dashboard' && (
          <>
            {/* 統計卡片 */}
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-pink-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-pink-600">{stats.votedA}/{stats.totalA}</p>
                  <p className="text-xs text-gray-500 mt-1">A 區已選</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-blue-600">{stats.votedB}/{stats.totalB}</p>
                  <p className="text-xs text-gray-500 mt-1">B 區已選</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-4 text-center col-span-2">
                  <p className="text-2xl font-black text-green-600">{stats.mutualMatches}</p>
                  <p className="text-xs text-gray-500 mt-1">目前互選配對數</p>
                </div>
              </div>
            )}

            {/* 快捷入口 */}
            <button
              onClick={() => setTab('participants')}
              className="card-press w-full py-4 rounded-2xl bg-pink-500 text-white font-bold text-base shadow flex items-center justify-center gap-2"
            >
              ➕ 新增 / 管理參與者名單
            </button>

            {/* Phase 控制 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3">控制活動狀態</h3>
              <div className="grid grid-cols-2 gap-2">
                {PHASES.map(p => (
                  <button
                    key={p.key}
                    onClick={() => handlePhaseChange(p.key)}
                    disabled={phaseLoading || stats?.phase === p.key}
                    className={`py-3 rounded-xl text-sm font-medium transition-all
                      ${stats?.phase === p.key
                        ? 'bg-gray-900 text-white shadow-inner'
                        : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                      }
                      ${phaseLoading ? 'opacity-50' : ''}`}
                  >
                    {p.label}
                    <br/>
                    <span className="text-xs opacity-70">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 選擇狀況列表 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3">所有人的選擇</h3>
              <div className="space-y-2">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-white text-xs
                      ${p.group_name === 'A' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                      {p.group_name}
                    </span>
                    <span className="font-medium text-gray-800 min-w-0 truncate">{p.name}</span>
                    <span className="text-gray-400 shrink-0">→</span>
                    {p.chosen_name ? (
                      <>
                        <span className="text-green-600 font-medium min-w-0 truncate">{p.chosen_name}</span>
                        <button
                          onClick={() => handlePreview(p.id)}
                          className="shrink-0 text-xs text-blue-500 underline"
                        >
                          預覽
                        </button>
                        <button
                          onClick={() => handleResetChoice(p.id, p.name)}
                          className="shrink-0 text-xs text-red-400 underline"
                        >
                          重設
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 italic">未選</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 預覽結果彈窗 */}
            {previewResult && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
                onClick={() => setPreviewResult(null)}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-center mb-4">預覽結果</h3>
                  <p className="text-center text-lg font-bold mb-2">
                    {previewResult.me?.name}
                  </p>
                  <div className="text-center text-4xl my-3">
                    {previewResult.matched ? '💕' : '💔'}
                  </div>
                  <p className={`text-center font-bold text-lg ${previewResult.matched ? 'text-pink-600' : 'text-gray-500'}`}>
                    {previewResult.reason === 'no_choice'
                      ? '未選擇'
                      : previewResult.matched
                        ? `配對成功！對象：${previewResult.partner?.name}`
                        : `未配對成功（選了 ${previewResult.partner?.name}）`
                    }
                  </p>
                  <button
                    onClick={() => setPreviewResult(null)}
                    className="mt-4 w-full py-2 bg-gray-100 rounded-xl text-gray-600 font-medium"
                  >
                    關閉
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── 名單管理 */}
        {tab === 'participants' && (
          <>
            <AddParticipantForm onAdded={refresh} />

            {/* 篩選器 */}
            <div className="flex gap-2">
              {['all', 'A', 'B'].map(g => (
                <button key={g} onClick={() => setFilterGroup(g)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium
                    ${filterGroup === g ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                  {g === 'all' ? '全部' : `${g} 區`}
                </button>
              ))}
            </div>

            {/* 參與者列表 */}
            <div className="space-y-2">
              {filtered.map(p => (
                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    {p.photo ? (
                      <img src={p.photo} className="w-10 h-10 rounded-full object-cover" alt={p.name} />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                        ${p.group_name === 'A' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{p.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white
                          ${p.group_name === 'A' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                          {p.group_name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">密碼：{p.access_code}</p>
                      {p.bio && <p className="text-xs text-gray-400 truncate">{p.bio}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteParticipant(p.id, p.name)}
                      className="shrink-0 text-red-400 text-xs underline"
                    >
                      刪除
                    </button>
                  </div>
                  {p.chosen_name && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        選擇了 <span className="font-medium text-gray-700">{p.chosen_name}</span>
                      </p>
                      <button
                        onClick={() => handleResetChoice(p.id, p.name)}
                        className="text-xs text-red-400 underline"
                      >
                        重設選擇
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-gray-400 py-6">尚無參與者</p>
              )}
            </div>
          </>
        )}

        {/* ── 審計記錄 */}
        {tab === 'log' && (
          <div className="space-y-2">
            <button onClick={() => adminApi.getAuditLog().then(setLogs)}
              className="w-full py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">
              重新整理
            </button>
            {logs.map(log => (
              <div key={log.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                    {log.action}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(log.created_at).toLocaleString('zh-TW')}
                  </span>
                </div>
                {log.admin_note && (
                  <p className="text-sm text-gray-700 mt-1">{log.admin_note}</p>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-center text-gray-400 py-6">尚無記錄</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
