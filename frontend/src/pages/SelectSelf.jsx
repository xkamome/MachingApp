import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ParticipantCard from '../components/ParticipantCard';

export default function SelectSelf() {
  const navigate = useNavigate();
  const [group, setGroup] = useState(null); // 'A' | 'B'
  const [participants, setParticipants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [code, setCode] = useState('');
  const [step, setStep] = useState('group'); // group | pick | confirm | verify
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phaseError, setPhaseError] = useState('');

  // 檢查 phase
  useEffect(() => {
    api.getPhase().then(({ phase }) => {
      if (phase === 'setup') setPhaseError('活動尚未開始，請等待工作人員指示');
      else if (phase === 'revealed') {
        // 如果已有 token，直接去看結果
        const token = localStorage.getItem('matching_token');
        if (token) navigate('/result');
      }
    }).catch(() => setPhaseError('無法連線到伺服器'));
  }, [navigate]);

  useEffect(() => {
    if (group) {
      setLoading(true);
      api.getParticipants(group)
        .then(setParticipants)
        .catch(() => setError('無法載入名單'))
        .finally(() => setLoading(false));
    }
  }, [group]);

  const handleGroupSelect = (g) => {
    setGroup(g);
    setSelected(null);
    setStep('pick');
    setError('');
  };

  const handlePickSelf = (p) => {
    setSelected(p);
    setStep('confirm');
  };

  const handleConfirm = () => {
    setStep('verify');
    setCode('');
    setError('');
  };

  const handleVerify = async () => {
    if (!code.trim()) return setError('請輸入通關密碼');
    setLoading(true);
    setError('');
    try {
      const res = await api.login(code.trim());
      if (res.participant.id !== selected.id) {
        setError('密碼與選擇的人不符，請再確認');
        setLoading(false);
        return;
      }
      localStorage.setItem('matching_token', res.token);
      localStorage.setItem('matching_me', JSON.stringify(res.participant));
      if (res.hasChosen) {
        localStorage.setItem('matching_chosen', res.chosenId);
        navigate('/waiting');
      } else {
        navigate('/choose');
      }
    } catch (e) {
      setError(e.message === 'Invalid access code' ? '密碼錯誤，請再試' : e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Phase error screen
  if (phaseError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">請稍候</h1>
        <p className="text-gray-500">{phaseError}</p>
      </div>
    );
  }

  // ── Step: choose group
  if (step === 'group') {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-5xl mb-4">💘</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">歡迎來到配對活動</h1>
          <p className="text-gray-500 text-center mb-10">請選擇你的分組</p>

          <div className="w-full space-y-4">
            <button
              onClick={() => handleGroupSelect('A')}
              className="card-press w-full py-5 rounded-2xl text-lg font-bold bg-pink-500 text-white shadow-lg active:bg-pink-600"
            >
              A 區
            </button>
            <button
              onClick={() => handleGroupSelect('B')}
              className="card-press w-full py-5 rounded-2xl text-lg font-bold bg-blue-500 text-white shadow-lg active:bg-blue-600"
            >
              B 區
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: pick yourself
  if (step === 'pick') {
    const isA = group === 'A';
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className={`px-5 pt-10 pb-5 ${isA ? 'bg-pink-500' : 'bg-blue-500'} text-white`}>
          <button onClick={() => setStep('group')} className="text-white/80 mb-3 text-sm">← 返回</button>
          <h1 className="text-xl font-bold">找到你自己</h1>
          <p className="text-white/80 text-sm mt-1">{group} 區 · 請點選你的名字</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="text-center py-10 text-gray-400">載入中...</div>
          )}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>
          )}
          {participants.map(p => (
            <ParticipantCard
              key={p.id}
              participant={p}
              selected={selected?.id === p.id}
              onClick={() => handlePickSelf(p)}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Step: confirm selection
  if (step === 'confirm') {
    const isA = group === 'A';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-4xl mb-4">{isA ? '🌸' : '💙'}</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">這是你嗎？</h1>
        <div className="w-full my-6">
          <ParticipantCard participant={selected} selected disabled />
        </div>
        <div className="w-full space-y-3">
          <button
            onClick={handleConfirm}
            className={`card-press w-full py-4 rounded-2xl text-lg font-bold text-white shadow
              ${isA ? 'bg-pink-500' : 'bg-blue-500'}`}
          >
            對！這就是我
          </button>
          <button
            onClick={() => setStep('pick')}
            className="w-full py-4 rounded-2xl text-gray-600 font-medium border border-gray-200 bg-white"
          >
            不對，重新選
          </button>
        </div>
      </div>
    );
  }

  // ── Step: enter access code
  if (step === 'verify') {
    const isA = group === 'A';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-4xl mb-4">🔑</div>
        <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">輸入你的通關密碼</h1>
        <p className="text-gray-500 text-sm text-center mb-8">工作人員有給你一組密碼</p>

        <div className="w-full space-y-4">
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={e => { setCode(e.target.value); setError(''); }}
            placeholder="輸入密碼"
            maxLength={8}
            className="w-full text-center text-2xl font-bold tracking-widest py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-pink-400 bg-white"
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={handleVerify}
            disabled={loading}
            className={`card-press w-full py-4 rounded-2xl text-lg font-bold text-white shadow
              ${isA ? 'bg-pink-500' : 'bg-blue-500'}
              ${loading ? 'opacity-60' : ''}`}
          >
            {loading ? '驗證中...' : '確認進入'}
          </button>
          <button
            onClick={() => setStep('confirm')}
            className="w-full py-3 text-gray-500 text-sm"
          >
            ← 返回
          </button>
        </div>
      </div>
    );
  }

  return null;
}
