export default function ParticipantCard({ participant, selected, onClick, disabled }) {
  const { name, bio, photo, group_name } = participant;
  const isA = group_name === 'A';

  const borderColor = selected
    ? (isA ? 'border-pink-500 ring-2 ring-pink-400' : 'border-blue-500 ring-2 ring-blue-400')
    : 'border-gray-200';

  const avatarBg = isA ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        card-press w-full flex items-center gap-3 p-3 rounded-2xl border-2 bg-white
        shadow-sm text-left transition-all
        ${borderColor}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-gray-50'}
        ${selected ? 'shadow-md' : ''}
      `}
    >
      {/* 頭像 */}
      <div className="shrink-0">
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow"
          />
        ) : (
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${avatarBg}`}>
            {name.charAt(0)}
          </div>
        )}
      </div>

      {/* 資訊 */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-base truncate">{name}</p>
        {bio && <p className="text-gray-500 text-sm mt-0.5 line-clamp-2">{bio}</p>}
      </div>

      {/* 選中標記 */}
      {selected && (
        <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm
          ${isA ? 'bg-pink-500' : 'bg-blue-500'}`}>
          ✓
        </div>
      )}
    </button>
  );
}
