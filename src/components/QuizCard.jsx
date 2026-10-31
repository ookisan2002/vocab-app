import { useState, useEffect } from 'react';
import { speakText } from '../utils/srs';

export default function QuizCard({ question, word, onAnswer, onNext }) {
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    setSelected(null);
    setAnswered(false);
  }, [question]);

  const handleSelect = (opt) => {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
    const correct = opt.correct;
    if (correct) {
      speakText(word.word);
    }
    // Update store state immediately
    onAnswer(correct);
  };

  const isEnToVi = question.direction === 'en->vi';

  return (
    <div className="card quiz-card">
      <div className="card-badge quiz-badge">
        🎯 Kiểm tra {isEnToVi ? '1/2' : '2/2'}
      </div>

      <div className="quiz-direction">
        {isEnToVi ? 'Tiếng Anh → Tiếng Việt' : 'Tiếng Việt → Tiếng Anh'}
      </div>

      <div className="quiz-prompt">
        <span>{question.prompt}</span>
        {isEnToVi && (
          <button
            className="btn-speak"
            onClick={() => speakText(question.prompt)}
            title="Phát âm"
          >🔊</button>
        )}
      </div>

      <div className="quiz-options">
        {question.options.map((opt, i) => {
          let cls = 'quiz-option';
          if (answered) {
            if (opt.correct) cls += ' correct';
            else if (selected === opt) cls += ' wrong';
            else cls += ' dimmed';
          }
          return (
            <button
              key={opt.id}
              className={cls}
              onClick={() => handleSelect(opt)}
              disabled={answered}
            >
              <span className="opt-num">{i + 1}</span>
              <span className="opt-text">{opt.text}</span>
              {answered && opt.correct && <span className="opt-tick">✓</span>}
              {answered && selected === opt && !opt.correct && <span className="opt-cross">✗</span>}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={`quiz-feedback ${selected?.correct ? 'feedback-correct' : 'feedback-wrong'}`}>
          <div className="feedback-top">
            {selected?.correct ? (
              <strong>✅ Chính xác!</strong>
            ) : (
              <div>
                <strong>❌ Sai rồi! Đáp án đúng là:</strong>
                <div className="feedback-correct-ans">
                  {question.options.find(o => o.correct)?.text}
                </div>
              </div>
            )}
            <button
              className="btn-speak-inline"
              onClick={() => speakText(word.word)}
              title="Nghe lại phát âm"
            >
              🔊 Nghe từ
            </button>
          </div>

          <div className="feedback-meaning">
            <span className="field-label">Nghĩa tiếng Việt:</span> {word.vi}
          </div>
          {word.en && (
            <div className="feedback-meaning">
              <span className="field-label">Definition:</span> {word.en}
            </div>
          )}
          {word.example && (
            <div className="feedback-example">
              <span className="field-label">Example:</span> "{word.example}"
              <button
                className="btn-speak-sm"
                onClick={() => speakText(word.example)}
                title="Đọc câu ví dụ"
              >🔊</button>
            </div>
          )}

          {!selected?.correct && (
            <div className="feedback-note">Streak đặt lại về 0/2 — hệ thống sẽ sớm hỏi lại từ này!</div>
          )}

          <div className="quiz-next-action">
            <button className="btn-quiz-next" onClick={onNext}>
              Tiếp tục câu tiếp theo ➔
            </button>
            <span className="quiz-next-hint">(hoặc nhấn phím Enter / Phím cách)</span>
          </div>
        </div>
      )}
    </div>
  );
}
