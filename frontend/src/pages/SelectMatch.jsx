import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ParticipantCard from '../components/ParticipantCard';

export default function SelectMatch() {
  const navigate = useNavigate();
  const me = JSON.parse(localStorage.getItem('matching_me') || 'null');
  const [participants, setParticipants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState('pick');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!me) { navigate('/'); return; }
    api.getPhase().then(({ phase }) => {
      if (phase === 'revealed') navigate('/result');
      else if (phase === 'setup') navigate('/');
    });
    const otherGroup = me.group_name === 'A' ? 'B' : 'A';
    api.getParticipants(otherGroup)
      .then(setParticipants)
      .catch(() => setError('無法載入名單'));
  }, [navigate, me?.id]);

  const handleSubmit = async () => {
    if (!selected) return;
    const email = localStorage.getItem('matching_email') || '';
    setLoading(true);
    setError('');
    try {
      await api.submitChoice(selected.id, email);
      localStorage.setItem('matching_chosen', selected.id);
      setStep('done');
      setTimeout(() => navigate('/waiting'), 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!me) return null;

  const isA = me.group_name === 'A';
  const otherGroupLabel = isA ? '男生' : '女生';
  const colorMain  = isA ? 'bg-pink-500'  : 'bg-blue-500';
  const colorHover = isA ? 'active:bg-pink-600' : 'active:bg-blue-600';

  if (step === 'pick') {
    return (
      <div className="min-h-screen flex flex-col">
        <div className={`px-5 pt-10 pb-5 ${colorMain} text-white`}>
          <h1 className="text-xl font-bold">你想配對誰？</h1>
          <p className="text-white/80 text-sm mt-1">
            {otherGroupLabel}區 · 只能選一位，選好後無法更改
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}
          {participants.length === 0 && !error && (
            <div className="text-center py-10 text-gray-400">載入中...</div>
          )}
          {participants.map(p => (
            <ParticipantCard
              key={p.id}
              participant={p}
              selected={selected?.id === p.id}
              onClick={() => setSelected(p)}
            />
          ))}
        </div>
        <div className="p-4 bg-white border-t border-gray-100 safe-bottom">
          <button
            onClick={() => selected && setStep('confirm')}
            disabled={!selected}
            className={`card-press w-full py-4 rounded-2xl text-lg font-bold text-white shadow transition-opacity
              ${colorMain} ${!selected ? 'opacity-40' : colorHover}`}
          >
            {selected ? `選擇 ${selected.name}` : '請先選一個人'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-4xl mb-4">💭</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">確定要選這位嗎？</h1>
        <p className="text-gray-500 text-sm text-center mb-6">送出後無法更改哦</p>
        <div className="w-full mb-6">
          <ParticipantCard participant={selected} selected disabled />
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="w-full space-y-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`card-press w-full py-4 rounded-2xl text-lg font-bold text-white shadow
              ${colorMain} ${loading ? 'opacity-60' : colorHover}`}
          >
            {loading ? '送出中...' : '就是他/她！'}
          </button>
          <button
            onClick={() => { setStep('pick'); setError(''); }}
            className="w-full py-4 rounded-2xl text-gray-600 font-medium border border-gray-200 bg-white"
          >
            再想想
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-6xl mb-4 animate-bounce">💌</div>
      <h1 className="text-xl font-bold text-gray-900 text-center">選擇已送出！</h1>
      <p className="text-gray-500 mt-2 text-center">跳轉到等待頁面...</p>
    </div>
  );
}
