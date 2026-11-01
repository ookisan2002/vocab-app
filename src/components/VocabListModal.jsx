import { useStore } from '../store/useStore';
import { formatTimeRemaining, formatTimeAgo } from '../utils/srs';
import { useState, useEffect } from 'react';

export default function VocabListModal({ onClose, onStudyWord }) {
  const getAllWords = useStore(s => s.getAllWords);
  const progress = useStore(s => s.progress);
  const deleteCustomWord = useStore(s => s.deleteCustomWord);
  const customWords = useStore(s => s.customWords);
  const topicFilter = useStore(s => s.topicFilter);

  const [search, setSearch] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const words = getAllWords().filter(w => {
    const topicOk = topicFilter === 'all' || w.topic === topicFilter;
    const searchOk = !search || w.word.toLowerCase().includes(search.toLowerCase()) || w.vi.includes(search);
    return topicOk && searchOk;
  });

  const getStatusLabel = (ws) => {
    if (!ws || ws.status === 'unseen') return { text: 'Chưa xem', cls: 'status-unseen' };
    if (ws.status === 'learning') return { text: `⏳ Chờ hỏi (${ws.correctStreak || 0}/2)`, cls: 'status-learning' };
    if (ws.status === 'mastered') return { text: `✅ Đã thuộc (Bậc ${ws.srsStage || 1})`, cls: 'status-mastered' };
    return { text: 'Chưa xem', cls: 'status-unseen' };
  };

  const isCustom = (id) => customWords.some(w => w.id === id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal bottom-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Danh sách từ vựng</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-search">
          <input
            type="text"
            placeholder="Tìm từ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="word-list">
          {words.map(w => {
            const ws = progress[w.id];
            const status = getStatusLabel(ws);
            const timeAgo = ws?.lastReviewedAt ? formatTimeAgo(ws.lastReviewedAt) : null;
            const timeUntilReview = ws?.nextReviewAt ? ws.nextReviewAt - now : null;

            return (
              <div key={w.id} className="word-row">
                <div className="word-row-main">
                  <div className="word-row-info">
                    <span className="word-row-word">{w.word}</span>
                    <span className="word-row-vi">{w.vi}</span>
                    <span className={`word-row-status ${status.cls}`}>{status.text}</span>
                  </div>
                  {w.example && (
                    <div className="word-row-example">💬 "{w.example}"</div>
                  )}
                  <div className="word-row-times">
                    {timeAgo && <span className="time-ago">Đã học: {timeAgo}</span>}
                    {timeUntilReview !== null && ws.status === 'mastered' && (
                      <span className="time-review">
                        {timeUntilReview > 0
                          ? `Ôn lại sau ${formatTimeRemaining(timeUntilReview)}`
                          : '⚡ Cần ôn ngay!'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="word-row-actions">
                  <button
                    className="btn-study-now"
                    onClick={() => { onStudyWord(w); onClose(); }}
                  >
                    Học/Hỏi ngay
                  </button>
                  {isCustom(w.id) && (
                    <button
                      className="btn-delete"
                      onClick={() => {
                        if (confirm(`Xóa từ "${w.word}"?`)) deleteCustomWord(w.id);
                      }}
                    >🗑</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
