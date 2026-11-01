import { useState } from 'react';
import { useStore } from '../store/useStore';

function EditWordForm({ word, onClose, onSaved }) {
  const updateWord = useStore(s => s.updateWord);
  const getAllWords = useStore(s => s.getAllWords);

  const [wordText, setWordText] = useState(word.word || '');
  const [topic, setTopic] = useState(word.topic || '');
  const [vi, setVi] = useState(word.vi || '');
  const [en, setEn] = useState(word.en || '');
  const [example, setExample] = useState(word.example || '');
  const [exampleVi, setExampleVi] = useState(word.exampleVi || '');

  // Extract unique topics for autocomplete suggestions
  const existingTopics = Array.from(new Set(getAllWords().map(w => w.topic).filter(Boolean)));

  const handleSave = (e) => {
    e?.preventDefault?.();
    if (!wordText.trim() || !vi.trim()) {
      alert('Vui lòng nhập Từ vựng tiếng Anh và Nghĩa tiếng Việt!');
      return;
    }

    const updatedFields = {
      word: wordText.trim(),
      topic: topic.trim() || 'Chung',
      vi: vi.trim(),
      en: en.trim(),
      example: example.trim(),
      exampleVi: exampleVi.trim(),
    };

    updateWord(word.id, updatedFields);
    onSaved?.(updatedFields);
    onClose();
  };

  return (
    <div className="modal-overlay modal-edit-overlay" onClick={onClose}>
      <div className="modal modal-edit" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Chỉnh sửa từ vựng</h2>
          <button type="button" className="modal-close" onClick={onClose} title="Đóng">✕</button>
        </div>

        <form onSubmit={handleSave} className="edit-modal-form">
          <div className="form-row">
            <label htmlFor="edit-word">Từ vựng / Collocation tiếng Anh *</label>
            <input
              id="edit-word"
              type="text"
              value={wordText}
              onChange={e => setWordText(e.target.value)}
              placeholder="e.g. acquire a language"
              className="form-input"
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <label htmlFor="edit-topic">Chủ đề (Topic)</label>
            <input
              id="edit-topic"
              type="text"
              list="edit-topic-list"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Chọn hoặc nhập chủ đề..."
              className="form-input"
            />
            <datalist id="edit-topic-list">
              {existingTopics.map(t => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div className="form-row">
            <label htmlFor="edit-vi">Nghĩa tiếng Việt *</label>
            <input
              id="edit-vi"
              type="text"
              value={vi}
              onChange={e => setVi(e.target.value)}
              placeholder="e.g. tiếp thu / học một ngôn ngữ"
              className="form-input"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="edit-en">Định nghĩa tiếng Anh (English Definition)</label>
            <textarea
              id="edit-en"
              value={en}
              onChange={e => setEn(e.target.value)}
              placeholder="e.g. to learn a language naturally through exposure"
              className="form-input form-textarea"
              rows={2}
            />
          </div>

          <div className="form-row">
            <label htmlFor="edit-example">Câu ví dụ tiếng Anh (Example sentence)</label>
            <textarea
              id="edit-example"
              value={example}
              onChange={e => setExample(e.target.value)}
              placeholder="e.g. Children can acquire a second language with remarkable speed."
              className="form-input form-textarea"
              rows={2}
            />
          </div>

          <div className="form-row">
            <label htmlFor="edit-example-vi">Dịch nghĩa câu ví dụ (Example translation)</label>
            <textarea
              id="edit-example-vi"
              value={exampleVi}
              onChange={e => setExampleVi(e.target.value)}
              placeholder="e.g. Trẻ em có thể tiếp thu ngôn ngữ thứ hai với tốc độ đáng kinh ngạc."
              className="form-input form-textarea"
              rows={2}
            />
          </div>

          <div className="edit-modal-footer">
            <button type="button" className="btn-cancel-edit" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-save-edit">
              💾 Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditWordModal({ word, isOpen, onClose, onSaved }) {
  if (!isOpen || !word) return null;

  return (
    <EditWordForm
      key={word.id}
      word={word}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
