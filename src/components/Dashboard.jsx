import { useMemo } from 'react';
import { useStore } from '../store/useStore';

export default function Dashboard() {
  const getAllWords = useStore(s => s.getAllWords);
  const progress = useStore(s => s.progress);
  const topicFilter = useStore(s => s.topicFilter);
  const sessionCorrect = useStore(s => s.sessionCorrect);
  const sessionTotal = useStore(s => s.sessionTotal);

  const stats = useMemo(() => {
    const words = getAllWords().filter(w =>
      topicFilter === 'all' || w.topic === topicFilter
    );
    let unseen = 0, learning = 0, mastered = 0;
    words.forEach(w => {
      const ws = progress[w.id];
      if (!ws || ws.status === 'unseen') unseen++;
      else if (ws.status === 'learning') learning++;
      else if (ws.status === 'mastered') mastered++;
    });
    const total = words.length;
    const accuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : null;
    return { unseen, learning, mastered, total, accuracy };
  }, [getAllWords, progress, topicFilter, sessionCorrect, sessionTotal]);

  const masteredPct = stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0;
  const learningPct = stats.total > 0 ? (stats.learning / stats.total) * 100 : 0;

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card stat-unseen">
          <span className="stat-icon">📚</span>
          <span className="stat-num">{stats.unseen}</span>
          <span className="stat-label">Chưa xem</span>
        </div>
        <div className="stat-card stat-learning">
          <span className="stat-icon">⏳</span>
          <span className="stat-num">{stats.learning}</span>
          <span className="stat-label">Chờ hỏi</span>
        </div>
        <div className="stat-card stat-mastered">
          <span className="stat-icon">✅</span>
          <span className="stat-num">{stats.mastered}</span>
          <span className="stat-label">Đã thuộc</span>
        </div>
        <div className="stat-card stat-accuracy">
          <span className="stat-icon">🎯</span>
          <span className="stat-num">
            {stats.accuracy !== null ? `${stats.accuracy}%` : '—'}
          </span>
          <span className="stat-label">Nhớ đúng</span>
        </div>
      </div>

      <div className="progress-bar-wrap">
        <div className="progress-bar">
          <div
            className="pb-mastered"
            style={{ width: `${masteredPct}%` }}
            title={`Đã thuộc: ${stats.mastered}`}
          />
          <div
            className="pb-learning"
            style={{ width: `${learningPct}%`, left: `${masteredPct}%` }}
            title={`Chờ hỏi: ${stats.learning}`}
          />
        </div>
        <span className="progress-label">{stats.mastered}/{stats.total} từ</span>
      </div>
    </div>
  );
}
