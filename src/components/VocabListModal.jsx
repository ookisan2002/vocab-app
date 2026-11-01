import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { formatTimeRemaining, formatTimeAgo } from '../utils/srs';
import EditWordModal from './EditWordModal';

export default function VocabListModal({ onClose, onStudyWord, onEditWord }) {
  const getAllWords = useStore(s => s.getAllWords);
  const progress = useStore(s => s.progress);
  const editedWords = useStore(s => s.editedWords);
  const deletedWordIds = useStore(s => s.deletedWordIds);
  const deleteWord = useStore(s => s.deleteWord);
  const restoreAllDefaults = useStore(s => s.restoreAllDefaults);
  const topicFilter = useStore(s => s.topicFilter);

  const [search, setSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [localEditingWord, setLocalEditingWord] = useState(null);

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

  const hasModifications =
    (Array.isArray(deletedWordIds) && deletedWordIds.length > 0) ||
    (editedWords && Object.keys(editedWords).length > 0);

  const handleEdit = (w) => {
    if (onEditWord) {
      onEditWord(w);
    } else {
      setLocalEditingWord(w);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal bottom-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title-group">
            <h2>📋 Danh sách từ vựng ({words.length})</h2>
            {hasModifications && (
              <button
                type="button"
                className="btn-restore-defaults"
                onClick={() => {
                  if (confirm('Khôi phục lại toàn bộ từ mặc định về trạng thái ban đầu? (Sẽ hoàn tác các từ mặc định đã chỉnh sửa hoặc đã xóa)')) {
                    restoreAllDefaults();
                  }
                }}
                title="Khôi phục các từ mặc định về ban đầu"
              >
                🔄 Khôi phục từ gốc
              </button>
            )}
          </div>
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
            const isEdited = !!editedWords?.[w.id];

            return (
              <div key={w.id} className="word-row">
                <div className="word-row-main">
                  <div className="word-row-info">
                    <span className="word-row-word">{w.word}</span>
                    <span className="word-row-vi">{w.vi}</span>
                    <span className={`word-row-status ${status.cls}`}>{status.text}</span>
                    {isEdited && <span className="badge-edited">Đã sửa</span>}
                  </div>
                  {w.example && (
                    <div className="word-row-example">
                      <div>💬 "{w.example}"</div>
                      {w.exampleVi && <div className="word-row-example-vi">↳ {w.exampleVi}</div>}
                    </div>
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
                    type="button"
                    className="btn-study-now"
                    onClick={() => { onStudyWord(w); onClose(); }}
                  >
                    Học/Hỏi ngay
                  </button>
                  <button
                    type="button"
                    className="btn-edit"
                    onClick={() => handleEdit(w)}
                    title={`Chỉnh sửa từ "${w.word}"`}
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => {
                      if (confirm(`Xóa từ "${w.word}" khỏi danh sách?`)) {
                        deleteWord(w.id);
                      }
                    }}
                    title={`Xóa từ "${w.word}" khỏi danh sách`}
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {localEditingWord && (
        <EditWordModal
          word={localEditingWord}
          isOpen={!!localEditingWord}
          onClose={() => setLocalEditingWord(null)}
        />
      )}
    </div>
  );
}
