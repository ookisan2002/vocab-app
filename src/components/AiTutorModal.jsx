import { useState, useEffect, useRef } from 'react';
import {
  getStoredApiKey,
  saveApiKey,
  testApiKey,
  sendChatMessage,
} from '../services/geminiService';

/**
 * Helper to safely format inline markdown (code, bold, italic)
 */
function formatInline(str) {
  if (!str) return str;
  const parts = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(<code key={match.index} className="ai-inline-code">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }
  return parts.length > 0 ? parts : str;
}

/**
 * Component to render structured AI messages
 */
function FormattedMessage({ content }) {
  if (!content) return null;
  const lines = content.split('\n');

  return (
    <div className="ai-formatted-content">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="ai-blank-line" />;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="ai-bullet-item">
              <span className="ai-bullet-dot">•</span>
              <span className="ai-bullet-text">{formatInline(trimmed.substring(2))}</span>
            </div>
          );
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="ai-numbered-item">
              <span className="ai-number-prefix">{numMatch[1]}.</span>
              <span className="ai-numbered-text">{formatInline(numMatch[2])}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="ai-paragraph">
            {formatInline(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function AiTutorModal({ currentWord }) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [isConfiguringKey, setIsConfiguringKey] = useState(() => !getStoredApiKey());
  const [inputKey, setInputKey] = useState(() => getStoredApiKey());
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [keySuccess, setKeySuccess] = useState('');

  // Chat states
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Extract word details
  const wordText = typeof currentWord === 'string' ? currentWord : currentWord?.word;
  const wordVi = typeof currentWord === 'object' ? currentWord?.vi : '';
  const wordTopic = typeof currentWord === 'object' ? currentWord?.topic : '';

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen && !isConfiguringKey) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending, isOpen, isConfiguringKey]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isConfiguringKey && !isSending) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen, isConfiguringKey, isSending]);

  // Connect & verify API Key
  const handleConnectKey = async (e) => {
    if (e) e.preventDefault();
    setKeyError('');
    setKeySuccess('');

    if (!inputKey.trim()) {
      setKeyError('Vui lòng nhập API Key từ Google AI Studio.');
      return;
    }

    setIsTestingKey(true);
    try {
      await testApiKey(inputKey);
      saveApiKey(inputKey);
      setApiKey(inputKey.trim());
      setKeySuccess('Kết nối thành công! Đang chuyển vào phòng học...');
      setTimeout(() => {
        setIsConfiguringKey(false);
        setKeySuccess('');
      }, 700);
    } catch (err) {
      setKeyError(err.message || 'Không thể kết nối với API Key này. Vui lòng kiểm tra lại.');
    } finally {
      setIsTestingKey(false);
    }
  };

  // Send a message
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    if (!apiKey) {
      setIsConfiguringKey(true);
      return;
    }

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setChatError('');
    setIsSending(true);

    try {
      const reply = await sendChatMessage(apiKey, newMessages, currentWord);
      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...newMessages, assistantMsg]);
    } catch (err) {
      setChatError(err.message || 'Có lỗi xảy ra khi trò chuyện với AI.');
    } finally {
      setIsSending(false);
    }
  };

  // Quick prompt triggers
  const handleQuickPrompt = (type) => {
    let prompt = '';
    if (type === 'explain') {
      if (wordText) {
        prompt = `💡 Hãy giải thích chi tiết từ "${wordText}" (${wordVi || ''}), chỉ ra các collocations thông dụng và đặt 2 câu ví dụ chuẩn IELTS Band 7.5+.`;
      } else {
        prompt = `💡 Hãy hướng dẫn tôi cách học từ vựng để nâng band Lexical Resource trong IELTS lên 7.5+ và cho 3 ví dụ tiêu biểu.`;
      }
    } else if (type === 'writing') {
      if (wordText) {
        prompt = `📝 Hãy viết một đoạn văn ngắn chuẩn IELTS Writing Task 2 có sử dụng từ "${wordText}". Sau đó phân tích cách dùng từ trong ngữ cảnh này.`;
      } else {
        prompt = `📝 Hãy viết một đoạn văn mẫu IELTS Writing Task 2 về một chủ đề xu hướng và chỉ ra các từ vựng học thuật được dùng.`;
      }
    } else if (type === 'quiz') {
      if (wordText) {
        prompt = `🎯 Hãy đố tôi 1 câu hỏi trắc nghiệm (có 4 đáp án A, B, C, D) để kiểm tra cách dùng chính xác của từ "${wordText}". Đừng vội đưa ra đáp án, hãy chờ tôi trả lời!`;
      } else {
        prompt = `🎯 Hãy đố tôi một câu hỏi trắc nghiệm từ vựng IELTS khó (Band 7.5+) để tôi thử sức!`;
      }
    }

    if (prompt) {
      handleSendMessage(prompt);
    }
  };

  // Keyboard shortcut in chat input: Enter to send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* ─── Floating Action Button ─── */}
      <button
        type="button"
        className={`ai-fab-button ${isOpen ? 'active' : ''}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!apiKey) setIsConfiguringKey(true);
        }}
        title="IELTS AI Tutor"
        aria-label="IELTS AI Tutor"
      >
        <div className="ai-fab-icon-wrap">
          <span className="ai-fab-icon">🤖</span>
          <span className="ai-fab-pulse-ring"></span>
        </div>
        <span className="ai-fab-label">IELTS AI Tutor</span>
        {wordText && <span className="ai-fab-word-dot" title={`Đang học: ${wordText}`}></span>}
      </button>

      {/* ─── AI Tutor Window / Modal ─── */}
      {isOpen && (
        <div className="ai-modal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="ai-modal-window"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="ai-modal-header">
              <div className="ai-header-info">
                <div className="ai-avatar">🤖</div>
                <div>
                  <div className="ai-title-row">
                    <h3 className="ai-title">IELTS AI Tutor</h3>
                    <span className="ai-badge-status">
                      <span className="ai-status-dot"></span> Online
                    </span>
                  </div>
                  <p className="ai-subtitle">Trợ lý học thuật & Luyện đề IELTS</p>
                </div>
              </div>

              <div className="ai-header-actions">
                <button
                  type="button"
                  className="ai-btn-icon"
                  onClick={() => {
                    setIsConfiguringKey(!isConfiguringKey);
                    setKeyError('');
                    setKeySuccess('');
                  }}
                  title={isConfiguringKey && apiKey ? 'Quay lại Chat' : 'Cấu hình API Key'}
                >
                  {isConfiguringKey && apiKey ? '💬' : '⚙️'}
                </button>
                <button
                  type="button"
                  className="ai-btn-icon ai-btn-close"
                  onClick={() => setIsOpen(false)}
                  title="Đóng cửa sổ"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content: Either Key Configuration or Chat */}
            {isConfiguringKey ? (
              <div className="ai-config-view">
                <div className="ai-config-icon">🔑</div>
                <h4>Kết nối Google Gemini API</h4>
                <p className="ai-config-desc">
                  IELTS AI Tutor sử dụng mô hình <strong>Gemini 1.5 Flash</strong> siêu tốc và hoàn toàn <strong>miễn phí</strong> từ Google.
                </p>

                <div className="ai-guide-box">
                  <div className="ai-guide-step">
                    <span className="ai-step-num">1</span>
                    <span>
                      Truy cập{' '}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ai-link"
                      >
                        Google AI Studio ↗
                      </a>
                    </span>
                  </div>
                  <div className="ai-guide-step">
                    <span className="ai-step-num">2</span>
                    <span>Đăng nhập tài khoản Google và bấm <strong>Create API key</strong>.</span>
                  </div>
                  <div className="ai-guide-step">
                    <span className="ai-step-num">3</span>
                    <span>Sao chép key, dán vào ô bên dưới rồi nhấn <strong>Kết nối</strong>.</span>
                  </div>
                </div>

                <form onSubmit={handleConnectKey} className="ai-config-form">
                  <div className="ai-input-group">
                    <input
                      type={showKeyPassword ? 'text' : 'password'}
                      className="ai-key-input"
                      placeholder="Dán mã Gemini API Key tại đây (AIzaSy...)"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      disabled={isTestingKey}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="ai-btn-toggle-eye"
                      onClick={() => setShowKeyPassword(!showKeyPassword)}
                      tabIndex="-1"
                      title={showKeyPassword ? 'Ẩn key' : 'Hiện key'}
                    >
                      {showKeyPassword ? '👁️' : '🔒'}
                    </button>
                  </div>

                  {keyError && (
                    <div className="ai-alert ai-alert-error">
                      <span>⚠️ {keyError}</span>
                    </div>
                  )}

                  {keySuccess && (
                    <div className="ai-alert ai-alert-success">
                      <span>✨ {keySuccess}</span>
                    </div>
                  )}

                  <div className="ai-config-actions">
                    <button
                      type="submit"
                      className="ai-btn-connect"
                      disabled={isTestingKey || !inputKey.trim()}
                    >
                      {isTestingKey ? (
                        <>
                          <span className="ai-spinner-sm"></span>
                          Đang kiểm tra kết nối...
                        </>
                      ) : (
                        '🚀 Kết nối & Bắt đầu'
                      )}
                    </button>

                    {apiKey && (
                      <button
                        type="button"
                        className="ai-btn-secondary"
                        onClick={() => {
                          setInputKey(apiKey);
                          setIsConfiguringKey(false);
                          setKeyError('');
                        }}
                        disabled={isTestingKey}
                      >
                        Quay lại trò chuyện
                      </button>
                    )}
                  </div>
                </form>

                <p className="ai-config-footnote">
                  🔒 Key của bạn được lưu an toàn trên trình duyệt của máy bạn (localStorage) và chỉ gửi trực tiếp tới Google API.
                </p>
              </div>
            ) : (
              <div className="ai-chat-view">
                {/* Current Card Context Banner */}
                {wordText && (
                  <div className="ai-current-word-bar">
                    <span className="ai-word-tag">Đang xem:</span>
                    <strong className="ai-word-highlight">{wordText}</strong>
                    {wordVi && <span className="ai-word-vi">({wordVi})</span>}
                    {wordTopic && <span className="ai-topic-tag">{wordTopic}</span>}
                  </div>
                )}

                {/* Messages Body */}
                <div className="ai-messages-list">
                  {messages.length === 0 ? (
                    <div className="ai-welcome-box">
                      <div className="ai-welcome-icon">🎓</div>
                      <h4>Chào mừng bạn đến với IELTS AI Tutor!</h4>
                      <p>
                        Tôi là gia sư AI đồng hành cùng bạn chinh phục mục tiêu <strong>Band 7.0+</strong>.
                        Hãy hỏi tôi giải thích từ vựng, cung cấp collocations học thuật, viết đoạn văn mẫu hoặc đố vui nhé!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`ai-message-row ${msg.role === 'user' ? 'ai-user-row' : 'ai-assistant-row'}`}
                      >
                        {msg.role === 'assistant' && <div className="ai-bubble-avatar">🤖</div>}
                        <div className={`ai-bubble ${msg.role === 'user' ? 'ai-bubble-user' : 'ai-bubble-assistant'}`}>
                          {msg.role === 'assistant' ? (
                            <FormattedMessage content={msg.content} />
                          ) : (
                            <p className="ai-user-text">{msg.content}</p>
                          )}
                          <span className="ai-bubble-time">{msg.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Thinking Indicator */}
                  {isSending && (
                    <div className="ai-message-row ai-assistant-row">
                      <div className="ai-bubble-avatar">🤖</div>
                      <div className="ai-bubble ai-bubble-assistant ai-thinking-bubble">
                        <span className="ai-thinking-text">AI Tutor đang suy nghĩ</span>
                        <span className="ai-dot-typing">
                          <span></span>
                          <span></span>
                          <span></span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Chat Error Banner */}
                  {chatError && (
                    <div className="ai-alert ai-alert-error ai-chat-error">
                      <span>⚠️ {chatError}</span>
                      <button
                        type="button"
                        className="ai-btn-retry"
                        onClick={() => handleSendMessage()}
                      >
                        Thử lại
                      </button>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Prompts Suggestions */}
                <div className="ai-quick-prompts">
                  <div className="ai-quick-header">
                    <span>💡 Gợi ý hỏi nhanh:</span>
                  </div>
                  <div className="ai-quick-buttons">
                    <button
                      type="button"
                      className="ai-chip-btn"
                      onClick={() => handleQuickPrompt('explain')}
                      disabled={isSending}
                    >
                      💡 Giải thích từ đang xem & cho ví dụ Band 7+
                    </button>
                    <button
                      type="button"
                      className="ai-chip-btn"
                      onClick={() => handleQuickPrompt('writing')}
                      disabled={isSending}
                    >
                      📝 Viết đoạn văn Writing Task 2 chứa từ này
                    </button>
                    <button
                      type="button"
                      className="ai-chip-btn"
                      onClick={() => handleQuickPrompt('quiz')}
                      disabled={isSending}
                    >
                      🎯 Đố tôi một câu hỏi với từ này
                    </button>
                  </div>
                </div>

                {/* Chat Input Bar */}
                <div className="ai-input-bar">
                  <textarea
                    ref={inputRef}
                    rows="1"
                    className="ai-chat-input"
                    placeholder={
                      wordText
                        ? `Hỏi AI về "${wordText}" hoặc nhấn gợi ý trên...`
                        : 'Nhập câu hỏi để cùng luyện tập IELTS...'
                    }
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSending}
                  />
                  <button
                    type="button"
                    className="ai-btn-send"
                    onClick={() => handleSendMessage()}
                    disabled={isSending || !inputText.trim()}
                    title="Gửi tin nhắn (Enter)"
                  >
                    ➤
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
