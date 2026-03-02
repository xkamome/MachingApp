import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

// 愛心爆炸元件（預留動畫位置）
function MatchAnimation() {
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    // 產生隨機飄動愛心
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      size: 16 + Math.random() * 24,
    }));
    setHearts(items);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hearts.map(h => (
        <div
          key={h.id}
          className="absolute animate-bounce opacity-60"
          style={{
            left: `${h.left}%`,
            bottom: '-10%',
            fontSize: `${h.size}px`,
            animationDuration: `${h.duration}s`,
            animationDelay: `${h.delay}s`,
            animation: `float-up ${h.duration}s ${h.delay}s infinite`,
          }}
        >
          ❤️
        </div>
      ))}
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
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
      .then(data => {
        setResult(data);
        // 短暫延遲後揭曉，增加戲劇感
        setTimeout(() => setRevealed(true), 800);
      })
      .catch(e => {
        if (e.message === 'Results not revealed yet') {
          navigate('/waiting');
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-5xl animate-spin">💫</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!result) return null;

  const { matched, me, partner, reason } = result;

  // ── 等待揭曉動畫
  if (!revealed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-7xl animate-pulse mb-4">💝</div>
        <h1 className="text-2xl font-bold text-gray-900">揭曉你的結果...</h1>
      </div>
    );
  }

  // ── 配對成功！
  if (matched) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-gradient-to-b from-pink-50 to-white">
        <MatchAnimation />
        <div className="relative z-10">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-3xl font-black text-pink-600 mb-2">配對成功！</h1>
          <p className="text-gray-500 mb-8">你們互相選了對方</p>

          {/* 配對資訊 */}
          <div className="bg-white rounded-3xl shadow-lg p-6 w-full max-w-xs mb-6">
            <div className="flex items-center justify-center gap-4">
              {/* 我 */}
              <div className="flex flex-col items-center">
                {me.photo ? (
                  <img src={me.photo} className="w-16 h-16 rounded-full object-cover border-2 border-pink-300" alt={me.name} />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center text-2xl font-bold text-pink-600">
                    {me.name.charAt(0)}
                  </div>
                )}
                <p className="text-sm font-semibold mt-2 text-gray-800">{me.name}</p>
              </div>

              <div className="text-2xl">💕</div>

              {/* 對方 */}
              <div className="flex flex-col items-center">
                {partner?.photo ? (
                  <img src={partner.photo} className="w-16 h-16 rounded-full object-cover border-2 border-blue-300" alt={partner.name} />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                    {partner?.name.charAt(0)}
                  </div>
                )}
                <p className="text-sm font-semibold mt-2 text-gray-800">{partner?.name}</p>
              </div>
            </div>
          </div>

          <p className="text-pink-500 font-medium text-lg">恭喜！去打個招呼吧 😊</p>
        </div>
      </div>
    );
  }

  // ── 配對失敗
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-gray-50 to-white">
      <div className="text-7xl mb-4">💙</div>
      <h1 className="text-2xl font-bold text-gray-700 mb-2">這次緣分未到</h1>

      {reason === 'no_choice' ? (
        <p className="text-gray-500 mb-6">你這次沒有送出選擇</p>
      ) : (
        <p className="text-gray-500 mb-6">
          你選了 <span className="font-semibold">{partner?.name}</span>，<br/>
          但這次你們的心意沒有交會
        </p>
      )}

      <div className="bg-blue-50 rounded-2xl p-5 max-w-xs">
        <p className="text-blue-600 text-sm font-medium">別灰心！</p>
        <p className="text-gray-500 text-sm mt-1">
          緣分需要時間，期待下一次的相遇 ✨
        </p>
      </div>
    </div>
  );
}
