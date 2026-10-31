import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import {
  getStoredApiKey,
  getActiveModel,
  testApiKey,
  sendChatMessage,
} from '../services/geminiService';
import { SECURITY_BLOCKED_MESSAGE } from '../utils/securityGuard';

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
 * Component to render a code block with copy button
 */
function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="ai-code-block">
      <div className="ai-code-header">
        <span className="ai-code-lang">{language || 'text'}</span>
        <button
          type="button"
          className="ai-copy-btn"
          onClick={handleCopy}
          title="Sao chép toàn bộ khối mã"
        >
          {copied ? '✓ Đã chép!' : '📋 Copy'}
        </button>
      </div>
      <pre className="ai-code-content">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Render standard text lines (bullets, numbers, paragraphs)
 */
function renderTextLines(text, keyPrefix = '') {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={`${keyPrefix}-blank-${idx}`} className="ai-blank-line" />;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={`${keyPrefix}-bullet-${idx}`} className="ai-bullet-item">
          <span className="ai-bullet-dot">•</span>
          <span className="ai-bullet-text">{formatInline(trimmed.substring(2))}</span>
        </div>
      );
    }
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <div key={`${keyPrefix}-num-${idx}`} className="ai-numbered-item">
          <span className="ai-number-prefix">{numMatch[1]}.</span>
          <span className="ai-numbered-text">{formatInline(numMatch[2])}</span>
        </div>
      );
    }
    return (
      <p key={`${keyPrefix}-p-${idx}`} className="ai-paragraph">
        {formatInline(line)}
      </p>
    );
  });
}

/**
 * Component to render structured AI messages including code blocks
 */
function FormattedMessage({ content }) {
  if (!content) return null;

  // Split content by code blocks: ```[language]?\n[code]```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\s*?(?:\r?\n)([\s\S]*?)```/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        text: content.substring(lastIndex, match.index),
      });
    }
    segments.push({
      type: 'code',
      language: match[1]?.trim() || 'text',
      code: match[2]?.replace(/\r?\n$/, '') || '',
    });
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      text: content.substring(lastIndex),
    });
  }

  return (
    <div className="ai-formatted-content">
      {segments.map((seg, sIdx) => {
        if (seg.type === 'code') {
          return <CodeBlock key={`code-${sIdx}`} code={seg.code} language={seg.language} />;
        }
        return renderTextLines(seg.text, `seg-${sIdx}`);
      })}
    </div>
  );
}

export default function AiTutorModal({ currentWord }) {
  const user = useStore(s => s.user);
  const geminiApiKey = useStore(s => s.geminiApiKey);
  const setGeminiApiKey = useStore(s => s.setGeminiApiKey);
  const aiChatHistory = useStore(s => s.aiChatHistory);
  const setAiChatHistory = useStore(s => s.setAiChatHistory);

  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => geminiApiKey || getStoredApiKey() || '');
  const [isConfiguringKey, setIsConfiguringKey] = useState(() => !(geminiApiKey || getStoredApiKey()));
  const [inputKey, setInputKey] = useState(() => geminiApiKey || getStoredApiKey() || '');
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [keySuccess, setKeySuccess] = useState('');

  // Chat states
  const [messages, setMessages] = useState(() => (Array.isArray(aiChatHistory) && aiChatHistory.length > 0 ? aiChatHistory : []));
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Extract word details
  const wordText = typeof currentWord === 'string' ? currentWord : currentWord?.word;
  const wordVi = typeof currentWord === 'object' ? currentWord?.vi : '';
  const wordTopic = typeof currentWord === 'object' ? currentWord?.topic : '';

  // Synchronize when geminiApiKey is updated from store (e.g. Google login sync, Firestore real-time)
  useEffect(() => {
    if (geminiApiKey) {
      setApiKey(geminiApiKey);
      setInputKey(geminiApiKey);
      setIsConfiguringKey(false);
    } else {
      setApiKey('');
    }
  }, [geminiApiKey]);

  // Synchronize when aiChatHistory is updated from store
  useEffect(() => {
    if (Array.isArray(aiChatHistory)) {
      setMessages(aiChatHistory);
    }
  }, [aiChatHistory]);

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
      const testRes = await testApiKey(inputKey);
      const cleanKey = inputKey.trim();
      setApiKey(cleanKey);
      setGeminiApiKey(cleanKey);
      const activeModelName = testRes?.model || getActiveModel() || 'Gemini Flash';
      setKeySuccess(`Kết nối thành công (${activeModelName})! Đang chuyển vào phòng học...`);
      setTimeout(() => {
        setIsConfiguringKey(false);
        setKeySuccess('');
      }, 900);
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

    const activeKey = apiKey || geminiApiKey;
    if (!activeKey) {
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
    setAiChatHistory(newMessages);
    setInputText('');
    if (inputRef.current) {
      inputRef.current.style.height = '44px';
      inputRef.current.style.overflowY = 'hidden';
    }
    setChatError('');
    setIsSending(true);

    try {
      const reply = await sendChatMessage(activeKey, newMessages, currentWord);
      const isSecurityBlocked =
        reply === SECURITY_BLOCKED_MESSAGE ||
        (typeof reply === 'string' && reply.startsWith('🛡️'));

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        isSecurityBlocked,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setAiChatHistory(finalMessages);
    } catch (err) {
      setChatError(err.message || 'Có lỗi xảy ra khi trò chuyện với AI.');
    } finally {
      setIsSending(false);
    }
  };

  // Quick prompt triggers
  const handleQuickPrompt = (type) => {
    let prompt = '';
    if (type === 'format_words') {
      const topicName = wordTopic || 'IELTS Academic Core';
      prompt = `📋 Hãy gợi ý cho tôi 5 từ vựng IELTS Band 7.5+ đắt giá về chủ đề "${topicName}" theo đúng chuẩn định dạng Nhập hàng loạt của ứng dụng (đặt trong khối mã text code block) để tôi có thể copy dán trực tiếp vào app.`;
    } else if (type === 'guide') {
      prompt = `❓ Hãy hướng dẫn chi tiết cách sử dụng các tính năng trong ứng dụng VocabMaster (Thẻ học từ mới, Thẻ kiểm tra xen kẽ, cơ chế SRS tự động) và các phím tắt học tập hiệu quả.`;
    } else if (type === 'explain') {
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

  // Auto-resize textarea when user types
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    const newHeight = Math.min(target.scrollHeight, 120);
    target.style.height = `${Math.max(newHeight, 44)}px`;
    target.style.overflowY = 'hidden';
  };

  // Keyboard shortcut in chat input: Enter to send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      if (inputRef.current) {
        inputRef.current.style.height = '44px';
        inputRef.current.style.overflowY = 'hidden';
      }
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
          if (!apiKey && !geminiApiKey) setIsConfiguringKey(true);
        }}
        title={user && (apiKey || geminiApiKey) ? "IELTS AI Tutor (☁️ Đã đồng bộ Google)" : "IELTS AI Tutor"}
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
                  {user && (apiKey || geminiApiKey) && (
                    <div className="ai-synced-badge" title="Đã đồng bộ API Key theo tài khoản Google qua Cloud Firestore">
                      ☁️ Đã đồng bộ API Key theo tài khoản Google
                    </div>
                  )}
                </div>
              </div>

              <div className="ai-header-actions">
                {messages.length > 0 && !isConfiguringKey && (
                  <button
                    type="button"
                    className="ai-btn-icon"
                    onClick={() => {
                      if (confirm('Xóa lịch sử cuộc trò chuyện này?')) {
                        setMessages([]);
                        setAiChatHistory([]);
                      }
                    }}
                    title="Xóa lịch sử trò chuyện"
                  >
                    🗑️
                  </button>
                )}
                <button
                  type="button"
                  className="ai-btn-icon"
                  onClick={() => {
                    setIsConfiguringKey(!isConfiguringKey);
                    setKeyError('');
                    setKeySuccess('');
                  }}
                  title={isConfiguringKey && (apiKey || geminiApiKey) ? 'Quay lại Chat' : 'Cấu hình API Key'}
                >
                  {isConfiguringKey && (apiKey || geminiApiKey) ? '💬' : '⚙️'}
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
                  IELTS AI Tutor tự động kết nối mô hình <strong>Gemini Flash</strong> ({getActiveModel()}) siêu tốc và hoàn toàn <strong>miễn phí</strong> từ Google.
                </p>

                {user && (apiKey || geminiApiKey) && (
                  <div className="ai-synced-config-notice">
                    <span>☁️ Đã đồng bộ API Key theo tài khoản Google (<strong>{user.email}</strong>)</span>
                  </div>
                )}

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

                    {(apiKey || geminiApiKey) && (
                      <button
                        type="button"
                        className="ai-btn-secondary"
                        onClick={() => {
                          setInputKey(apiKey || geminiApiKey);
                          setIsConfiguringKey(false);
                          setKeyError('');
                        }}
                        disabled={isTestingKey}
                      >
                        Quay lại trò chuyện
                      </button>
                    )}

                    {(apiKey || geminiApiKey) && (
                      <button
                        type="button"
                        className="ai-btn-clear-key"
                        onClick={() => {
                          if (confirm('Xóa API Key khỏi ứng dụng và tài khoản Google?')) {
                            setApiKey('');
                            setInputKey('');
                            setGeminiApiKey('');
                            setIsConfiguringKey(true);
                          }
                        }}
                        disabled={isTestingKey}
                        title="Xóa API Key đã lưu"
                      >
                        Xóa Key
                      </button>
                    )}
                  </div>
                </form>

                <p className="ai-config-footnote">
                  {user ? (
                    <>☁️ Key và lịch sử học tập được đồng bộ an toàn qua tài khoản Google của bạn trên Cloud Firestore.</>
                  ) : (
                    <>🔒 Key của bạn được lưu an toàn trên trình duyệt của máy bạn (localStorage) và chỉ gửi trực tiếp tới Google API. Hãy đăng nhập Google để tự động đồng bộ sang thiết bị khác!</>
                  )}
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
                    messages.map((msg) => {
                      const isSecurityAlert =
                        msg.isSecurityBlocked ||
                        msg.content === SECURITY_BLOCKED_MESSAGE ||
                        (typeof msg.content === 'string' && msg.content.startsWith('🛡️'));

                      return (
                        <div
                          key={msg.id}
                          className={`ai-message-row ${msg.role === 'user' ? 'ai-user-row' : 'ai-assistant-row'} ${isSecurityAlert ? 'ai-row-blocked' : ''}`}
                        >
                          {msg.role === 'assistant' && (
                            <div
                              className={`ai-bubble-avatar ${isSecurityAlert ? 'ai-avatar-blocked' : ''}`}
                              title={isSecurityAlert ? 'Lá chắn An toàn & Bảo mật' : 'IELTS AI Tutor'}
                            >
                              {isSecurityAlert ? '🛡️' : '🤖'}
                            </div>
                          )}
                          <div
                            className={`ai-bubble ${msg.role === 'user' ? 'ai-bubble-user' : 'ai-bubble-assistant'} ${isSecurityAlert ? 'ai-bubble-blocked' : ''}`}
                          >
                            {isSecurityAlert && (
                              <div className="ai-security-shield-badge">
                                <span className="ai-security-shield-icon">🛡️</span>
                                <span className="ai-security-shield-title">Lá chắn An toàn & Bảo mật</span>
                              </div>
                            )}
                            {msg.role === 'assistant' ? (
                              <FormattedMessage content={msg.content} />
                            ) : (
                              <p className="ai-user-text">{msg.content}</p>
                            )}
                            <span className="ai-bubble-time">{msg.timestamp}</span>
                          </div>
                        </div>
                      );
                    })
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
                      className="ai-chip-btn ai-chip-btn-highlight"
                      onClick={() => handleQuickPrompt('format_words')}
                      disabled={isSending}
                    >
                      📋 Tạo 5 từ theo format thêm vào app
                    </button>
                    <button
                      type="button"
                      className="ai-chip-btn"
                      onClick={() => handleQuickPrompt('guide')}
                      disabled={isSending}
                    >
                      ❓ Hướng dẫn sử dụng app & phím tắt
                    </button>
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
                    className="ai-chat-input"
                    placeholder={
                      wordText
                        ? `Hỏi AI về "${wordText}" hoặc nhấn gợi ý trên...`
                        : 'Nhập câu hỏi để cùng luyện tập IELTS...'
                    }
                    value={inputText}
                    onChange={handleInputChange}
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
