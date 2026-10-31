import { useState } from 'react';
import { speakText } from '../utils/srs';
import { useStore } from '../store/useStore';

export default function LearnCard({ word, onUnderstood, onMastered }) {
  const showMeaningFirst = useStore(s => s.showMeaningFirst);
  const [flipped, setFlipped] = useState(showMeaningFirst);

  const handleFlip = () => {
    if (!flipped) {
      setFlipped(true);
      speakText(word.word);
    } else {
      speakText(word.word);
    }
  };

  return (
    <div className="card learn-card">
      <div className="card-badge learn-badge">📖 Từ mới</div>
      <div className="card-topic">{word.topic}</div>

      <div className="card-word" onClick={handleFlip}>
        <span>{word.word}</span>
        <button
          className="btn-speak"
          onClick={e => { e.stopPropagation(); speakText(word.word); }}
          title="Phát âm"
        >🔊</button>
      </div>

      {!flipped && !showMeaningFirst ? (
        <div className="card-flip-hint" onClick={handleFlip}>
          <span>Bấm để xem nghĩa</span>
          <span className="flip-icon">👁</span>
        </div>
      ) : (
        <div className="card-content">
          <div className="card-vi">
            <span className="field-label">Nghĩa:</span>
            <span className="field-value vi-text">{word.vi}</span>
          </div>
          {word.en && (
            <div className="card-en">
              <span className="field-label">Definition:</span>
              <span className="field-value">{word.en}</span>
            </div>
          )}
          {word.example && (
            <div className="card-example">
              <span className="field-label">Example:</span>
              <span className="field-value example-text">"{word.example}"</span>
              <button
                className="btn-speak-sm"
                onClick={() => speakText(word.example)}
                title="Đọc câu ví dụ"
              >🔊</button>
            </div>
          )}
        </div>
      )}

      {(flipped || showMeaningFirst) && (
        <div className="card-actions">
          <button className="btn-understood" onClick={onUnderstood}>
            💡 Đã hiểu nghĩa • Tiếp tục
          </button>
          <button className="btn-mastered-quick" onClick={onMastered}>
            ✅ Đã thuộc từ này
          </button>
        </div>
      )}
    </div>
  );
}
