import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function MatchAnimation() {
  const [hearts, setHearts] = useState([]);
  useEffect(() => {
    setHearts(Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      size: 16 + Math.random() * 24,
    })));
  }, []);
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hearts.map(h => (
        <div key={h.id} className="absolute" style={{
          left: `${h.left}%`, bottom: '-10%', fontSize: `${h.size}px`,
          animation: `float-up ${h.duration}s ${h.delay}s infinite`,
        }}>❤️</div>
      ))}
      <style>{`
        @keyframes float-up {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0.6; }
          100% { transform: translateY(-110vh) rotate(20deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function Result() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const me = localStorage.getItem('matching_me');
    if (!me) { navigate('/'); return; }
    api.getMyResult()
      .then(data => { setResult(data); setTimeout(() => setRevealed(true), 800); })
      .catch(e => {
        if (e.message === 'Results not revealed yet') navigate('/waiting');
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-5xl animate-spin">💫</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <p className="text-red-500">{error}</p>
    </div>
  );

  if (!result) return null;

  const { matched } = result;

  if (!revealed) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="text-7xl animate-pulse mb-4">💝</div>
      <h1 className="text-2xl font-bold text-gray-900">揭曉你的結果...</h1>
    </div>
  );

  // ── 配對成功
  if (matched) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-gradient-to-b from-pink-50 to-white">
        <MatchAnimation />
        <div className="relative z-10 w-full max-w-xs">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-3xl font-black text-pink-600 mb-2">恭喜配對成功！</h1>

          <div className="bg-white rounded-3xl shadow-lg p-6 w-full mb-4 border border-pink-100">
            <div className="text-4xl mb-3">💌</div>
            <p className="text-gray-700 text-base font-medium leading-relaxed">
              已將結果發送到您的電子信箱
            </p>
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              小心不要被旁邊的人看見哦 👀
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── 配對失敗
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-gray-50 to-white">
      <div className="text-7xl mb-4">💙</div>
      <h1 className="text-2xl font-bold text-gray-700 mb-2">很抱歉，這次配對沒有成功</h1>

      <div className="bg-blue-50 rounded-2xl p-6 max-w-xs mt-4 border border-blue-100">
        <div className="text-3xl mb-3">📬</div>
        <p className="text-blue-700 text-base font-medium leading-relaxed">
          但我們將意見調查送到您的電子信箱
        </p>
        <p className="text-gray-400 text-sm mt-3">
          感謝你的參與，期待下次再見 ✨
        </p>
      </div>
    </div>
  );
}
