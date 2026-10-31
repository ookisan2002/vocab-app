import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { DEFAULT_VOCAB } from '../data/defaultVocab';
import { SRS_MODES, INTERLEAVE_MODES } from '../utils/srs';

export default function FilterBar() {
  const getAllWords = useStore(s => s.getAllWords);
  const topicFilter = useStore(s => s.topicFilter);
  const setTopicFilter = useStore(s => s.setTopicFilter);
  const srsMode = useStore(s => s.srsMode);
  const setSrsMode = useStore(s => s.setSrsMode);
  const interleaveMode = useStore(s => s.interleaveMode);
  const setInterleaveMode = useStore(s => s.setInterleaveMode);
  const showMeaningFirst = useStore(s => s.showMeaningFirst);
  const setShowMeaningFirst = useStore(s => s.setShowMeaningFirst);

  const topics = useMemo(() => {
    const all = getAllWords().map(w => w.topic);
    return ['all', ...new Set(all)];
  }, [getAllWords]);

  return (
    <div className="filter-bar">
      {/* Topic filter */}
      <div className="filter-group">
        <label className="filter-label">Chủ đề</label>
        <select
          value={topicFilter}
          onChange={e => setTopicFilter(e.target.value)}
          className="filter-select"
        >
          {topics.map(t => (
            <option key={t} value={t}>{t === 'all' ? '🌐 Tất cả' : t}</option>
          ))}
        </select>
      </div>

      {/* SRS Mode */}
      <div className="filter-group">
        <label className="filter-label">Chu kỳ ôn</label>
        <select
          value={srsMode}
          onChange={e => setSrsMode(e.target.value)}
          className="filter-select"
        >
          {Object.entries(SRS_MODES).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Interleave mode */}
      <div className="filter-group">
        <label className="filter-label">Tần suất hỏi</label>
        <select
          value={interleaveMode}
          onChange={e => setInterleaveMode(e.target.value)}
          className="filter-select"
        >
          {Object.entries(INTERLEAVE_MODES).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Card mode */}
      <div className="filter-group">
        <label className="filter-label">Thẻ học</label>
        <div className="toggle-btns">
          <button
            className={`toggle-btn ${showMeaningFirst ? 'active' : ''}`}
            onClick={() => setShowMeaningFirst(true)}
          >Hiện nghĩa</button>
          <button
            className={`toggle-btn ${!showMeaningFirst ? 'active' : ''}`}
            onClick={() => setShowMeaningFirst(false)}
          >Lật thẻ</button>
        </div>
      </div>
    </div>
  );
}
