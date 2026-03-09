import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ParticipantCard from '../components/ParticipantCard';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SelectSelf() {
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [step, setStep] = useState('group'); // group | pick | confirm | email
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phaseError, setPhaseError] = useState('');

  useEffect(() => {
    api.getPhase().then(({ phase }) => {
      if (phase === 'setup') setPhaseError('活動尚未開始，請等待工作人員指示');
      else if (phase === 'revealed') {
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
    setEmail('');
    setEmailError('');
    setStep('email');
  };

  const handleEmailSubmit = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('請輸入正確的 email 格式（例：abc@example.com）');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.login(selected.id);
      localStorage.setItem('matching_token', res.token);
      localStorage.setItem('matching_me', JSON.stringify(res.participant));
      localStorage.setItem('matching_email', email.trim());
      if (res.hasChosen) {
        localStorage.setItem('matching_chosen', res.chosenId);
        navigate('/waiting');
      } else {
        navigate('/choose');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const isA = group === 'A';
  const colorMain  = isA ? 'bg-pink-500'  : 'bg-blue-500';
  const colorHover = isA ? 'active:bg-pink-600' : 'active:bg-blue-600';
  const colorFocus = isA ? 'focus:border-pink-400' : 'focus:border-blue-400';
  const groupLabel = group === 'A' ? '女生' : '男生';

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
              女生區
            </button>
            <button
              onClick={() => handleGroupSelect('B')}
              className="card-press w-full py-5 rounded-2xl text-lg font-bold bg-blue-500 text-white shadow-lg active:bg-blue-600"
            >
              男生區
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: pick yourself
  if (step === 'pick') {
    return (
      <div className="min-h-screen flex flex-col">
        <div className={`px-5 pt-10 pb-5 ${colorMain} text-white`}>
          <button onClick={() => setStep('group')} className="text-white/80 mb-3 text-sm">← 返回</button>
          <h1 className="text-xl font-bold">找到你自己</h1>
          <p className="text-white/80 text-sm mt-1">{groupLabel}區 · 請點選你的名字</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <div className="text-center py-10 text-gray-400">載入中...</div>}
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}
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

  // ── Step: confirm
  if (step === 'confirm') {
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
            className={`card-press w-full py-4 rounded-2xl text-lg font-bold text-white shadow ${colorMain} ${colorHover}`}
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

  // ── Step: email input
  if (step === 'email') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-4xl mb-4">✉️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">填入你的 email</h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          配對成功時，對方可以看到你的聯絡方式
        </p>
        <div className="w-full space-y-4">
          <div>
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError(''); }}
              placeholder="abc@example.com"
              className={`w-full px-4 py-4 border-2 rounded-2xl text-base focus:outline-none
                ${emailError ? 'border-red-400' : `border-gray-200 ${colorFocus}`}`}
              onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
              autoFocus
            />
            {emailError && <p className="text-red-500 text-xs mt-1 px-1">{emailError}</p>}
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={handleEmailSubmit}
            disabled={loading}
            className={`card-press w-full py-4 rounded-2xl text-lg font-bold text-white shadow
              ${colorMain} ${loading ? 'opacity-60' : colorHover}`}
          >
            {loading ? '登入中...' : '進入配對'}
          </button>
          <button
            onClick={() => setStep('confirm')}
            disabled={loading}
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
