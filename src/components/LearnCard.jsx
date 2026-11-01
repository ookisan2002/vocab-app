import { useState } from 'react';
import { speakText } from '../utils/srs';
import { useStore } from '../store/useStore';
import { renderHighlightedExample } from '../utils/exampleHighlight';

// Re-export for backward compatibility and test access
export { renderHighlightedExample, getSearchRegex } from '../utils/exampleHighlight';

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
              <div className="card-example-header">
                <span className="field-label">💬 Câu ví dụ (Example)</span>
                <button
                  type="button"
                  className="btn-speak-example"
                  onClick={e => { e.stopPropagation(); speakText(word.example); }}
                  title="Nghe phát âm câu ví dụ"
                >
                  🔊 Nghe câu
                </button>
              </div>
              <div className="field-value example-text">
                "{renderHighlightedExample(word.example, word.word)}"
              </div>
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
