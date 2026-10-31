import { useStore } from '../store/useStore';

export default function HistoryBar() {
  const history = useStore(s => s.history);

  const icons = {
    seen: '📖',
    correct: '⚡',
    wrong: '❌',
    mastered: '✅',
  };

  const labels = {
    seen: (h) => `Đã xem: ${h.word}`,
    correct: (h) => `Đúng ${h.streak}/2: ${h.word}`,
    wrong: (h) => `Nhầm: ${h.word}`,
    mastered: (h) => `Đã thuộc: ${h.word}`,
  };

  if (history.length === 0) return null;

  return (
    <div className="history-bar">
      <span className="history-label">Lịch sử:</span>
      <div className="history-items">
        {history.map((h, i) => (
          <span key={i} className={`history-item history-${h.type}`}>
            {icons[h.type]} {labels[h.type]?.(h) || h.word}
          </span>
        ))}
      </div>
    </div>
  );
}
