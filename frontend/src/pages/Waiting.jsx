import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Waiting() {
  const navigate = useNavigate();
  const me = JSON.parse(localStorage.getItem('matching_me') || 'null');
  const [stats, setStats] = useState({ total: 0, voted: 0, phase: 'voting' });
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!me) { navigate('/'); return; }

    const dotTimer = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);

    const poll = async () => {
      try {
        const data = await api.getPhase();
        setStats(data);
        if (data.phase === 'revealed') navigate('/result');
        else if (data.phase === 'setup') navigate('/');
      } catch { /* 繼續輪詢 */ }
    };

    poll();
    const pollTimer = setInterval(poll, 3000);
    return () => { clearInterval(dotTimer); clearInterval(pollTimer); };
  }, [navigate, me?.id]);

  if (!me) return null;

  const isA = me.group_name === 'A';
  const pct = stats.total > 0 ? Math.round((stats.voted / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-8">
        <div className="text-8xl animate-pulse">💝</div>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">等待揭曉中{dots}</h1>
      <p className="text-gray-500 mb-8">選擇已送出，等待工作人員公布結果</p>

      <div className="w-full max-w-xs mb-2">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>選擇進度</span>
          <span>{stats.voted} / {stats.total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-1000 ${isA ? 'bg-pink-400' : 'bg-blue-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{pct}% 已完成選擇</p>
      </div>

      <div className={`mt-8 px-5 py-4 rounded-2xl ${isA ? 'bg-pink-50' : 'bg-blue-50'}`}>
        <p className={`text-sm font-medium ${isA ? 'text-pink-600' : 'text-blue-600'}`}>
          你的選擇已經記錄在案 ✓
        </p>
        <p className="text-xs text-gray-500 mt-1">請等工作人員宣布結果</p>
      </div>
    </div>
  );
}
