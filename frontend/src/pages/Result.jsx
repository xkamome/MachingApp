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

function downloadMatchCard(me, partner) {
  const canvas = document.createElement('canvas');
  const W = 720, H = 480;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#fff0f7'); grad.addColorStop(1, '#ffffff');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#fbcfe8'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect?.(8, 8, W - 16, H - 16, 24); ctx.stroke();

  ctx.fillStyle = '#db2777'; ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('💕 配對成功！', W / 2, 80);

  ctx.strokeStyle = '#fce7f3'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 110); ctx.lineTo(W - 60, 110); ctx.stroke();

  ctx.fillStyle = '#6b7280'; ctx.font = '24px sans-serif';
  ctx.fillText('你的配對對象', W / 2, 165);

  ctx.fillStyle = '#111827'; ctx.font = 'bold 40px sans-serif';
  ctx.fillText(partner?.name || '', W / 2, 230);

  ctx.fillStyle = '#db2777'; ctx.font = '28px sans-serif';
  ctx.fillText(partner?.email || '', W / 2, 285);

  ctx.strokeStyle = '#fce7f3'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 320); ctx.lineTo(W - 60, 320); ctx.stroke();

  ctx.fillStyle = '#9ca3af'; ctx.font = '22px sans-serif';
  ctx.fillText(`你：${me?.name || ''}`, W / 2, 370);

  ctx.fillStyle = '#ec4899'; ctx.font = '22px sans-serif';
  ctx.fillText('去打個招呼吧 😊', W / 2, 430);

  const link = document.createElement('a');
  link.download = '配對結果.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
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

  const { matched, me, partner, reason } = result;

  if (!revealed) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="text-7xl animate-pulse mb-4">💝</div>
      <h1 className="text-2xl font-bold text-gray-900">揭曉你的結果...</h1>
    </div>
  );

  // ── 配對成功
  if (matched) {
    const meIsA = me.group_name === 'A';
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-gradient-to-b from-pink-50 to-white">
        <MatchAnimation />
        <div className="relative z-10 w-full max-w-xs">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-3xl font-black text-pink-600 mb-2">配對成功！</h1>
          <p className="text-gray-500 mb-6">你們互相選了對方</p>

          <div className="bg-white rounded-3xl shadow-lg p-6 w-full mb-4 border border-pink-100">
            <div className="flex items-center justify-center gap-4 mb-5">
              {/* 我 */}
              <div className="flex flex-col items-center">
                {me.photo ? (
                  <img src={me.photo} className={`w-16 h-16 rounded-full object-cover border-2 ${meIsA ? 'border-pink-300' : 'border-blue-300'}`} alt={me.name} />
                ) : (
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${meIsA ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                    {me.name.charAt(0)}
                  </div>
                )}
                <p className="text-sm font-semibold mt-2 text-gray-800">{me.name}</p>
              </div>

              <div className="text-2xl">💕</div>

              {/* 對方 */}
              <div className="flex flex-col items-center">
                {partner?.photo ? (
                  <img src={partner.photo} className={`w-16 h-16 rounded-full object-cover border-2 ${meIsA ? 'border-blue-300' : 'border-pink-300'}`} alt={partner.name} />
                ) : (
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${meIsA ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                    {partner?.name.charAt(0)}
                  </div>
                )}
                <p className="text-sm font-semibold mt-2 text-gray-800">{partner?.name}</p>
              </div>
            </div>

            {/* 對方的聯絡資訊 */}
            <div className="border-t border-pink-100 pt-4">
              <p className="text-xs text-gray-400 mb-1">對方的 email</p>
              <p className="text-base font-semibold text-pink-600 break-all">
                {partner?.email || '（對方未填寫 email）'}
              </p>
            </div>
          </div>

          <p className="text-pink-500 font-medium text-lg mb-6">去打個招呼吧 😊</p>

          <button
            onClick={() => downloadMatchCard(me, partner)}
            className="w-full py-3 rounded-2xl border-2 border-pink-300 text-pink-600 font-semibold text-base bg-white active:bg-pink-50 flex items-center justify-center gap-2"
          >
            📸 截圖保存配對結果
          </button>
          <p className="text-xs text-gray-400 mt-2">點擊後會下載含對方姓名和 email 的圖片</p>
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
        <p className="text-gray-500 text-sm mt-1">緣分需要時間，期待下一次的相遇 ✨</p>
      </div>
    </div>
  );
}
