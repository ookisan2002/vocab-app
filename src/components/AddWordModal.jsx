import { useState } from 'react';
import { useStore } from '../store/useStore';
import Papa from 'papaparse';

function generateId() {
  return 'c' + Date.now() + Math.random().toString(36).slice(2, 6);
}

// Parse bulk text format
function parseBulkText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const words = [];
  let currentTopic = 'Từ tự thêm';

  for (const line of lines) {
    if (line.startsWith('###')) {
      currentTopic = line.replace(/^###\s*/, '').trim();
      continue;
    }

    // Try to split on separators: —, –, -, =, :
    const sepMatch = line.match(/^(.+?)\s*[—–\-=:]\s*(.+)$/);
    if (!sepMatch) continue;

    const word = sepMatch[1].trim();
    const rest = sepMatch[2].trim();

    // Split rest by | to get vi | en | example | exampleVi
    const parts = rest.split('|').map(p => p.trim());
    const vi = parts[0] || '';
    const en = parts[1] || '';
    const example = parts[2] || '';
    const exampleVi = parts[3] || '';

    if (word && vi) {
      words.push({ id: generateId(), word, topic: currentTopic, vi, en, example, exampleVi });
    }
  }
  return words;
}

export default function AddWordModal({ onClose }) {
  const addCustomWords = useStore(s => s.addCustomWords);
  const getAllWords = useStore(s => s.getAllWords);
  const sheetsUrl = useStore(s => s.sheetsUrl);
  const setSheetsUrl = useStore(s => s.setSheetsUrl);

  const [mode, setMode] = useState('single'); // 'single' | 'bulk' | 'sheets'
  const [goStudy, setGoStudy] = useState(true);

  // Single mode
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [word, setWord] = useState('');
  const [vi, setVi] = useState('');
  const [en, setEn] = useState('');
  const [example, setExample] = useState('');
  const [exampleVi, setExampleVi] = useState('');
  const [note, setNote] = useState('');

  // Bulk mode
  const [bulkText, setBulkText] = useState('');

  // Sheets mode
  const [sheetInput, setSheetInput] = useState(sheetsUrl || '');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetPreview, setSheetPreview] = useState(null);
  const [sheetError, setSheetError] = useState('');

  const existingTopics = [...new Set(getAllWords().map(w => w.topic))];

  // Convert Google Sheets URL to CSV export URL
  const toCsvUrl = (url) => {
    try {
      // Handle https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=GID
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = url.match(/gid=(\d+)/);
      if (!match) return null;
      const sheetId = match[1];
      const gid = gidMatch ? gidMatch[1] : '0';
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    } catch { return null; }
  };

  const loadFromSheets = async () => {
    const csvUrl = toCsvUrl(sheetInput);
    if (!csvUrl) {
      setSheetError('URL không hợp lệ. Cần link Google Sheets dạng /spreadsheets/d/...');
      return;
    }
    setSheetLoading(true);
    setSheetError('');
    try {
      const resp = await fetch(csvUrl);
      if (!resp.ok) throw new Error('Không thể tải Sheet. Đảm bảo Sheet đã được "Share → Anyone with link".');
      const text = await resp.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      // Expected columns: word, topic, vi, en, example (case insensitive)
      const rows = result.data.map(row => {
        const r = {};
        Object.entries(row).forEach(([k, v]) => { r[k.toLowerCase().trim()] = v; });
        return r;
      });
      const parsed = rows
        .filter(r => r.word || r['từ'] || r['english'])
        .map(r => ({
          id: generateId(),
          word: (r.word || r['từ'] || r['english'] || '').trim(),
          topic: (r.topic || r['chủ đề'] || r['chu de'] || 'Từ Google Sheets').trim(),
          vi: (r.vi || r['nghĩa'] || r['vietnamese'] || r['nghia'] || '').trim(),
          en: (r.en || r['definition'] || r['english definition'] || '').trim(),
          example: (r.example || r['câu ví dụ'] || r['sentence'] || '').trim(),
          exampleVi: (r.examplevi || r['example_vi'] || r['dịch ví dụ'] || r['dich vi du'] || r['câu ví dụ tiếng việt'] || '').trim(),
        }))
        .filter(r => r.word && r.vi);
      setSheetPreview(parsed);
      setSheetsUrl(sheetInput);
    } catch (err) {
      setSheetError(err.message);
    }
    setSheetLoading(false);
  };

  const handleSingleSave = () => {
    const t = topic === '__custom__' ? customTopic : topic;
    if (!word.trim() || !vi.trim()) {
      alert('Vui lòng nhập Từ và Nghĩa tiếng Việt');
      return;
    }
    const newWord = {
      id: generateId(),
      word: word.trim(),
      topic: t || 'Từ tự thêm',
      vi: vi.trim(),
      en: en.trim(),
      example: example.trim(),
      exampleVi: exampleVi.trim(),
      note: note.trim(),
    };
    addCustomWords([newWord]);
    onClose(goStudy ? newWord : null);
  };

  const handleBulkSave = () => {
    const words = parseBulkText(bulkText);
    if (words.length === 0) {
      alert('Không tìm thấy từ hợp lệ nào. Định dạng: Từ — Nghĩa | Definition | Example');
      return;
    }
    addCustomWords(words);
    onClose(goStudy ? words[0] : null);
  };

  const handleSheetsSave = () => {
    if (!sheetPreview?.length) return;
    addCustomWords(sheetPreview);
    onClose(goStudy ? sheetPreview[0] : null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal bottom-sheet modal-add" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Thêm từ mới</h2>
          <button className="modal-close" onClick={() => onClose(null)}>✕</button>
        </div>

        {/* Mode tabs */}
        <div className="add-tabs">
          <button className={`add-tab ${mode === 'single' ? 'active' : ''}`} onClick={() => setMode('single')}>
            📝 Từng từ
          </button>
          <button className={`add-tab ${mode === 'bulk' ? 'active' : ''}`} onClick={() => setMode('bulk')}>
            📋 Nhập hàng loạt
          </button>
          <button className={`add-tab ${mode === 'sheets' ? 'active' : ''}`} onClick={() => setMode('sheets')}>
            📊 Google Sheets
          </button>
        </div>

        {/* Single mode */}
        {mode === 'single' && (
          <div className="add-form">
            <div className="form-row">
              <label>Chủ đề</label>
              <select value={topic} onChange={e => setTopic(e.target.value)} className="filter-select">
                <option value="">-- Chọn chủ đề --</option>
                {existingTopics.map(t => <option key={t} value={t}>{t}</option>)}
                <option value="__custom__">+ Tạo chủ đề mới</option>
              </select>
              {topic === '__custom__' && (
                <input
                  type="text"
                  placeholder="Tên chủ đề mới"
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  className="form-input"
                />
              )}
            </div>
            <div className="form-row">
              <label>Từ tiếng Anh *</label>
              <input type="text" value={word} onChange={e => setWord(e.target.value)} className="form-input" placeholder="e.g. critical thinking" />
            </div>
            <div className="form-row">
              <label>Nghĩa tiếng Việt *</label>
              <input type="text" value={vi} onChange={e => setVi(e.target.value)} className="form-input" placeholder="e.g. tư duy phản biện" />
            </div>
            <div className="form-row">
              <label>Nghĩa tiếng Anh (definition)</label>
              <input type="text" value={en} onChange={e => setEn(e.target.value)} className="form-input" placeholder="e.g. the ability to analyze..." />
            </div>
            <div className="form-row">
              <label>Câu ví dụ</label>
              <input type="text" value={example} onChange={e => setExample(e.target.value)} className="form-input" placeholder="e.g. She uses critical thinking..." />
            </div>
            <div className="form-row">
              <label>Dịch câu ví dụ (tùy chọn)</label>
              <input type="text" value={exampleVi} onChange={e => setExampleVi(e.target.value)} className="form-input" placeholder="e.g. Cô ấy áp dụng tư duy phản biện hàng ngày..." />
            </div>
            <div className="form-row">
              <label>Ghi chú</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} className="form-input" placeholder="Tùy chọn" />
            </div>
          </div>
        )}

        {/* Bulk mode */}
        {mode === 'bulk' && (
          <div className="add-form">
            <div className="bulk-hint">
              <strong>Định dạng:</strong><br />
              <code>### Tên chủ đề</code><br />
              <code>Từ tiếng Anh — Nghĩa Việt | Definition | Example sentence | Dịch câu ví dụ</code><br />
              <small>Dấu phân cách: <code>— – - = :</code> &nbsp;|&nbsp; Dấu <code>|</code> để tách definition, example và dịch ví dụ</small>
            </div>
            <textarea
              className="bulk-textarea"
              rows={10}
              placeholder={`### Technology\ncritical thinking — tư duy phản biện | the ability to analyze | She uses critical thinking daily.\nremote working — làm việc từ xa`}
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
            />
            <div className="bulk-preview">
              {bulkText && <small>Sẽ thêm ~{parseBulkText(bulkText).length} từ</small>}
            </div>
          </div>
        )}

        {/* Sheets mode */}
        {mode === 'sheets' && (
          <div className="add-form">
            <div className="bulk-hint">
              <strong>Nhập link Google Sheets (phải Share → Anyone with link can view)</strong><br />
              <small>Cột cần có: <code>word, vi</code> (bắt buộc), <code>topic, en, example</code> (tuỳ chọn)</small>
            </div>
            <div className="sheets-input-row">
              <input
                type="text"
                className="form-input"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetInput}
                onChange={e => setSheetInput(e.target.value)}
              />
              <button className="btn-load-sheet" onClick={loadFromSheets} disabled={sheetLoading}>
                {sheetLoading ? '⏳ Đang tải...' : '📥 Tải Sheet'}
              </button>
            </div>
            {sheetError && <div className="sheet-error">❌ {sheetError}</div>}
            {sheetPreview && (
              <div className="sheet-preview">
                <strong>✅ Tìm thấy {sheetPreview.length} từ:</strong>
                <div className="sheet-preview-list">
                  {sheetPreview.slice(0, 5).map(w => (
                    <div key={w.id} className="sheet-preview-item">
                      <strong>{w.word}</strong> — {w.vi}
                      <span className="word-topic-tag">{w.topic}</span>
                    </div>
                  ))}
                  {sheetPreview.length > 5 && <small>...và {sheetPreview.length - 5} từ nữa</small>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Go study option */}
        <div className="form-footer">
          <label className="checkbox-label">
            <input type="checkbox" checked={goStudy} onChange={e => setGoStudy(e.target.checked)} />
            Chuyển đến học từ vừa thêm ngay lập tức
          </label>
          <div className="form-actions">
            <button className="btn-cancel" onClick={() => onClose(null)}>Hủy</button>
            <button
              className="btn-save"
              onClick={mode === 'single' ? handleSingleSave : mode === 'bulk' ? handleBulkSave : handleSheetsSave}
            >
              ✅ Lưu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
