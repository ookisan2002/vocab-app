import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  FloatButton,
  Button,
  Input,
  Select,
  Collapse,
  Space,
  Tag,
  Badge,
  Avatar,
  Tooltip,
  Popconfirm,
  Typography,
  Flex,
  Alert,
  Spin,
  message as antMessage,
} from 'antd';
import {
  RobotOutlined,
  SendOutlined,
  SettingOutlined,
  DeleteOutlined,
  CopyOutlined,
  CheckOutlined,
  SafetyCertificateOutlined,
  CloudSyncOutlined,
  RocketOutlined,
  KeyOutlined,
  PlusOutlined,
  MessageOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';
import {
  getStoredApiKey,
  getActiveModel,
  setActiveConfig,
  testApiKey,
  sendChatMessage,
  CANDIDATE_CONFIGS,
  formatSessionTitle,
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
      antMessage.success('Đã sao chép khối mã!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div
      className="ai-code-block"
      style={{
        margin: '10px 0',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#0d0d17',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Flex
        className="ai-code-header"
        justify="space-between"
        align="center"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '4px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <Typography.Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
          {language || 'text'}
        </Typography.Text>
        <Button
          className="ai-copy-btn"
          type="text"
          size="small"
          icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
          onClick={handleCopy}
          style={{ fontSize: 12 }}
        >
          {copied ? 'Đã chép' : 'Copy'}
        </Button>
      </Flex>
      <pre
        style={{
          margin: 0,
          padding: 12,
          overflowX: 'auto',
          fontSize: 13,
          color: '#e2e8f0',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: '100%',
          boxSizing: 'border-box',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
      >
        <code
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
          }}
        >
          {code}
        </code>
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
      return <div key={`${keyPrefix}-blank-${idx}`} style={{ height: 8 }} />;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={`${keyPrefix}-bullet-${idx}`} style={{ display: 'flex', gap: 6, margin: '2px 0' }}>
          <span style={{ color: '#7c6af7' }}>•</span>
          <span>{formatInline(trimmed.substring(2))}</span>
        </div>
      );
    }
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <div key={`${keyPrefix}-num-${idx}`} style={{ display: 'flex', gap: 6, margin: '2px 0' }}>
          <span style={{ color: '#7c6af7', fontWeight: 600 }}>{numMatch[1]}.</span>
          <span>{formatInline(numMatch[2])}</span>
        </div>
      );
    }
    return (
      <p key={`${keyPrefix}-p-${idx}`} style={{ margin: '4px 0', lineHeight: 1.6 }}>
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
    <div
      className="ai-formatted-content"
      style={{
        fontSize: '0.92rem',
        color: '#f1f5f9',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        minWidth: 0,
        maxWidth: '100%',
        userSelect: 'text',
        WebkitUserSelect: 'text',
      }}
    >
      {segments.map((seg, sIdx) => {
        if (seg.type === 'code') {
          return <CodeBlock key={`code-${sIdx}`} code={seg.code} language={seg.language} />;
        }
        return renderTextLines(seg.text, `seg-${sIdx}`);
      })}
    </div>
  );
}

const EMPTY_ARRAY = [];
const EMPTY_MESSAGES = [];

export default function AiTutorModal({ currentWord }) {
  const user = useStore(s => s.user);
  const geminiApiKey = useStore(s => s.geminiApiKey);
  const setGeminiApiKey = useStore(s => s.setGeminiApiKey);
  const geminiModelConfig = useStore(s => s.geminiModelConfig);
  const setGeminiModelConfig = useStore(s => s.setGeminiModelConfig);
  const chatSessions = useStore(s => s.chatSessions) || EMPTY_ARRAY;
  const activeSessionId = useStore(s => s.activeSessionId);
  const setActiveSessionId = useStore(s => s.setActiveSessionId);
  const createChatSession = useStore(s => s.createChatSession);
  const deleteChatSession = useStore(s => s.deleteChatSession);
  const updateActiveSessionMessages = useStore(s => s.updateActiveSessionMessages);

  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => geminiApiKey || getStoredApiKey() || '');
  const [isConfiguringKey, setIsConfiguringKey] = useState(() => !(geminiApiKey || getStoredApiKey()));
  const [inputKey, setInputKey] = useState(() => geminiApiKey || getStoredApiKey() || '');
  const [selectedModel, setSelectedModel] = useState(() => geminiModelConfig?.model || getActiveModel() || 'gemini-1.5-flash');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [keySuccess, setKeySuccess] = useState('');

  // Sidebar & Chat states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [isPromptsOpen, setIsPromptsOpen] = useState(true);

  const chatContainerRef = useRef(null);
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  // Lock body scroll when modal is open (Scroll Chaining Prevention)
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow || '';
      };
    }
  }, [isOpen]);

  // Smooth scroll to bottom helper
  const scrollToBottom = (smooth = true) => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // Extract word details
  const wordText = typeof currentWord === 'string' ? currentWord : currentWord?.word;
  const wordVi = typeof currentWord === 'object' ? currentWord?.vi : '';
  const wordTopic = typeof currentWord === 'object' ? currentWord?.topic : '';

  // Synchronize when geminiApiKey is updated from store
  useEffect(() => {
    if (geminiApiKey) {
      setApiKey(geminiApiKey);
      setInputKey(geminiApiKey);
      setIsConfiguringKey(false);
    } else {
      setApiKey('');
    }
  }, [geminiApiKey]);

  // Active session and messages
  const activeSession = useMemo(() => {
    if (!activeSessionId) return null;
    return chatSessions.find(s => s.id === activeSessionId) || null;
  }, [chatSessions, activeSessionId]);

  const currentMessages = useMemo(() => {
    return activeSession ? (activeSession.messages || EMPTY_MESSAGES) : EMPTY_MESSAGES;
  }, [activeSession]);

  const displayMessages = useMemo(() => {
    if (!isSending) return currentMessages;
    return [
      ...currentMessages,
      { id: '__thinking__', role: 'thinking' },
    ];
  }, [currentMessages, isSending]);

  // Filter sessions by search text (title or content)
  const filteredSessions = useMemo(() => {
    if (!searchText.trim()) return chatSessions;
    const term = searchText.toLowerCase().trim();
    return chatSessions.filter(session => {
      const titleMatch = (session.title || '').toLowerCase().includes(term);
      const messageMatch = (session.messages || []).some(m =>
        (m.content || '').toLowerCase().includes(term)
      );
      return titleMatch || messageMatch;
    });
  }, [chatSessions, searchText]);

  // Auto-scroll chat to bottom on new message or session switch
  useEffect(() => {
    if (displayMessages.length > 0) {
      scrollToBottom(true);
      const timer = setTimeout(() => scrollToBottom(false), 80);
      return () => clearTimeout(timer);
    }
  }, [displayMessages.length, activeSessionId]);

  // Focus input when chat opens or switches
  useEffect(() => {
    if (isOpen && !isConfiguringKey && !isSending) {
      setTimeout(() => {
        inputRef.current?.focus?.();
      }, 200);
    }
  }, [isOpen, isConfiguringKey, isSending, activeSessionId]);

  // Connect & verify API Key
  const handleConnectKey = async (e) => {
    if (e?.preventDefault) e.preventDefault();
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

      const workingConfig = {
        model: testRes?.model || selectedModel || 'gemini-1.5-flash',
        apiVersion: testRes?.apiVersion || 'v1',
      };
      setActiveConfig(workingConfig.model, workingConfig.apiVersion);
      setGeminiModelConfig(workingConfig);
      setSelectedModel(workingConfig.model);

      const activeModelName = workingConfig.model;
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

  const handleModelChange = (modelName) => {
    setSelectedModel(modelName);
    const matched = CANDIDATE_CONFIGS.find(c => c.model === modelName);
    const apiVersion = matched ? matched.apiVersion : 'v1';
    setActiveConfig(modelName, apiVersion);
    setGeminiModelConfig({ model: modelName, apiVersion });
    antMessage.info(`Đã đổi mô hình sang ${modelName}`);
  };

  const handleClearKey = () => {
    setApiKey('');
    setInputKey('');
    setGeminiApiKey('');
    setGeminiModelConfig(null);
    setIsConfiguringKey(true);
    antMessage.success('Đã xóa API Key!');
  };

  // Switch to new empty chat draft
  const handleNewChat = () => {
    setActiveSessionId(null);
    setInputText('');
    setChatError('');
    setIsConfiguringKey(false);
    if (window.innerWidth < 680) {
      setIsSidebarOpen(false);
    }
  };

  // Select an existing session
  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
    setInputText('');
    setChatError('');
    setIsConfiguringKey(false);
    if (window.innerWidth < 680) {
      setIsSidebarOpen(false);
    }
  };

  // Delete a session
  const handleDeleteSession = (sessionId) => {
    deleteChatSession(sessionId);
    antMessage.success('Đã xóa đoạn chat');
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

    setInputText('');
    setChatError('');
    setIsSending(true);

    let messagesForAi = [];
    if (!activeSessionId) {
      // First message in a new session: auto-name by timestamp (HH:mm - DD/MM/YYYY)
      const newTitle = formatSessionTitle(new Date());
      createChatSession(userMsg, newTitle);
      messagesForAi = [userMsg];
    } else {
      const updated = [...currentMessages, userMsg];
      updateActiveSessionMessages(updated);
      messagesForAi = updated;
    }

    try {
      const reply = await sendChatMessage(activeKey, messagesForAi, currentWord);
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

      updateActiveSessionMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err?.message || '';
      const isModelUnavailable =
        errMsg.includes('404') ||
        errMsg.toLowerCase().includes('not found') ||
        errMsg.toLowerCase().includes('không tìm thấy model') ||
        errMsg.toLowerCase().includes('is not supported for generatecontent') ||
        errMsg.toLowerCase().includes('model');

      if (isModelUnavailable) {
        try {
          console.info('[AiTutorModal] Model không khả dụng, đang tự động dò tìm model mới...');
          const testRes = await testApiKey(activeKey);
          if (testRes?.model) {
            const workingConfig = {
              model: testRes.model,
              apiVersion: testRes.apiVersion || 'v1',
            };
            setActiveConfig(workingConfig.model, workingConfig.apiVersion);
            setGeminiModelConfig(workingConfig);
            setSelectedModel(workingConfig.model);

            const retryReply = await sendChatMessage(activeKey, messagesForAi, currentWord, true);
            const isSecurityBlocked =
              retryReply === SECURITY_BLOCKED_MESSAGE ||
              (typeof retryReply === 'string' && retryReply.startsWith('🛡️'));

            const assistantMsg = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: retryReply,
              isSecurityBlocked,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            updateActiveSessionMessages(prev => [...prev, assistantMsg]);
            return;
          }
        } catch (reconnectErr) {
          console.error('[AiTutorModal] Tự động kết nối lại thất bại:', reconnectErr);
        }
      }

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
      prompt = `📋 Hãy gợi ý 5 từ vựng IELTS Band 7.5+ đắt giá về chủ đề "${topicName}" theo đúng chuẩn định dạng Nhập hàng loạt của ứng dụng (đặt trong 1 khối mã text code block duy nhất) để tôi copy dán trực tiếp. Đi thẳng vào nội dung, không chào hỏi, không dạo đầu.`;
    } else if (type === 'guide') {
      prompt = `❓ Hướng dẫn thật súc tích cách dùng các tính năng chính trong ứng dụng VocabMaster (Thẻ học từ mới, Thẻ kiểm tra xen kẽ, cơ chế SRS tự động) và các phím tắt. Đi thẳng vào nội dung, không chào hỏi, không dạo đầu.`;
    } else if (type === 'explain') {
      if (wordText) {
        prompt = `💡 Giải thích từ "${wordText}" (${wordVi || ''}): 1 dòng nghĩa cốt lõi, 2-3 collocations tự nhiên kèm nghĩa, 1-2 câu ví dụ ngữ cảnh IELTS Band 7.5+ kèm dịch câu. Đi thẳng vào nội dung, không chào hỏi, không dạo đầu.`;
      } else {
        prompt = `💡 Hướng dẫn ngắn gọn cách học từ vựng nâng band Lexical Resource lên 7.5+ và cho 3 ví dụ tiêu biểu. Đi thẳng vào nội dung, không chào hỏi, không dạo đầu.`;
      }
    } else if (type === 'writing') {
      if (wordText) {
        prompt = `📝 Viết trực tiếp 1 đoạn văn ngắn chuẩn IELTS Writing Task 2 có sử dụng và in đậm từ "${wordText}", kèm 1-2 lưu ý ngắn về cách dùng. Đi thẳng vào nội dung, không chào hỏi, không dạo đầu.`;
      } else {
        prompt = `📝 Viết trực tiếp 1 đoạn văn mẫu ngắn IELTS Writing Task 2 về một chủ đề xu hướng và in đậm các từ vựng học thuật. Đi thẳng vào nội dung, không chào hỏi, không dạo đầu.`;
      }
    } else if (type === 'quiz') {
      if (wordText) {
        prompt = `🎯 Đố tôi 1 câu hỏi trắc nghiệm 4 lựa chọn A, B, C, D về cách dùng chính xác của từ "${wordText}". Đưa trực tiếp câu hỏi và 4 đáp án, chưa đưa giải thích hay đáp án vội. Đi thẳng vào nội dung, không chào hỏi, không dạo đầu.`;
      } else {
        prompt = `🎯 Đố tôi 1 câu hỏi trắc nghiệm từ vựng IELTS Band 7.5+ (gồm câu hỏi và 4 lựa chọn A, B, C, D, chưa đưa đáp án vội). Đi thẳng vào nội dung, không chào hỏi, không dạo đầu.`;
      }
    }

    if (prompt) {
      handleSendMessage(prompt);
    }
  };

  // Keyboard shortcut: Enter to send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const modelOptions = useMemo(() => [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Khuyên dùng - Siêu tốc & Ổn định)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Thế hệ mới)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Tư duy & Phân tích chuyên sâu)' },
  ], []);

  // Render individual message item in chat
  const renderMessageItem = (msg) => {
    if (msg.role === 'thinking') {
      return (
        <div key={msg.id} className="ai-message-row" style={{ padding: '6px 16px', width: '100%' }}>
          <Flex justify="flex-start" gap={10} style={{ marginBottom: 10 }}>
            <Avatar size={32} icon={<RobotOutlined />} style={{ backgroundColor: '#1f1b3c', flexShrink: 0, userSelect: 'none', WebkitUserSelect: 'none' }} />
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '10px 16px',
                borderRadius: '16px 16px 16px 4px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              <Space size={8}>
                <Spin size="small" />
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  AI Tutor đang suy nghĩ...
                </Typography.Text>
              </Space>
            </div>
          </Flex>
        </div>
      );
    }

    if (msg.role === 'user') {
      return (
        <div key={msg.id} className="ai-message-row" style={{ padding: '6px 16px', width: '100%' }}>
          <Flex justify="flex-end" style={{ marginBottom: 8, width: '100%' }}>
            <div
              className="ai-message-bubble"
              style={{
                maxWidth: '82%',
                minWidth: 0,
                background: '#7c6af7',
                color: '#ffffff',
                padding: '10px 14px',
                borderRadius: '16px 16px 4px 16px',
                boxShadow: '0 2px 8px rgba(124, 106, 247, 0.25)',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
            >
              <Typography.Text style={{ color: '#ffffff', whiteSpace: 'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text' }}>
                {msg.content}
              </Typography.Text>
              <div className="ai-message-time" style={{ textAlign: 'right', fontSize: 10, opacity: 0.7, marginTop: 4, userSelect: 'none', WebkitUserSelect: 'none' }}>
                {msg.timestamp}
              </div>
            </div>
          </Flex>
        </div>
      );
    }

    const isSecurityAlert =
      msg.isSecurityBlocked ||
      msg.content === SECURITY_BLOCKED_MESSAGE ||
      (typeof msg.content === 'string' && msg.content.startsWith('🛡️'));

    return (
      <div key={msg.id} className="ai-message-row" style={{ padding: '6px 16px', width: '100%' }}>
        <Flex justify="flex-start" gap={10} style={{ marginBottom: 12, width: '100%', minWidth: 0 }}>
          <Avatar
            size={32}
            icon={isSecurityAlert ? <SafetyCertificateOutlined /> : <RobotOutlined />}
            style={{
              backgroundColor: isSecurityAlert ? '#ff4d4f' : '#1f1b3c',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              flexShrink: 0,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          />
          <div
            className="ai-message-bubble"
            style={{
              maxWidth: '85%',
              minWidth: 0,
              background: isSecurityAlert ? 'rgba(255, 77, 79, 0.08)' : 'rgba(255, 255, 255, 0.04)',
              border: isSecurityAlert ? '1px solid rgba(255, 77, 79, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              padding: '12px 16px',
              borderRadius: '16px 16px 16px 4px',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              userSelect: 'text',
              WebkitUserSelect: 'text',
            }}
          >
            {isSecurityAlert && (
              <Tag color="error" icon={<SafetyCertificateOutlined />} style={{ marginBottom: 8, userSelect: 'none', WebkitUserSelect: 'none' }}>
                Lá chắn An toàn & Bảo mật
              </Tag>
            )}
            <FormattedMessage content={msg.content} />
            <div className="ai-message-time" style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.45)', marginTop: 6, userSelect: 'none', WebkitUserSelect: 'none' }}>
              {msg.timestamp}
            </div>
          </div>
        </Flex>
      </div>
    );
  };

  return (
    <>
      {/* ─── Floating Action Button ─── */}
      <FloatButton
        type="primary"
        icon={<RobotOutlined style={{ fontSize: 22 }} />}
        tooltip={user && (apiKey || geminiApiKey) ? 'IELTS AI Tutor (☁️ Đã đồng bộ Google)' : 'IELTS AI Tutor'}
        badge={wordText ? { dot: true, color: '#52c41a' } : undefined}
        onClick={() => {
          setIsOpen(true);
          if (!apiKey && !geminiApiKey) setIsConfiguringKey(true);
        }}
        style={{
          right: 24,
          bottom: 24,
          width: 54,
          height: 54,
        }}
      />

      {/* ─── AI Tutor Modal Window ─── */}
      <Modal
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        footer={null}
        width={920}
        style={{ top: 20, maxWidth: 'calc(100vw - 24px)' }}
        styles={{
          body: {
            height: '80vh',
            maxHeight: '760px',
            minHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
          },
        }}
        title={
          <Flex align="center" justify="space-between" style={{ width: '100%', paddingRight: 28 }}>
            <Space align="center" size={10}>
              <Avatar style={{ backgroundColor: '#7c6af7' }} icon={<RobotOutlined />} size={36} />
              <div>
                <Space size={6} align="center">
                  <Typography.Text strong style={{ fontSize: 16 }}>
                    IELTS AI Tutor
                  </Typography.Text>
                  <Badge status="processing" text={<span style={{ fontSize: 12, color: '#52c41a' }}>Online</span>} />
                </Space>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  Trợ lý học thuật & Luyện đề IELTS
                </Typography.Text>
              </div>
            </Space>

            <Space size={8}>
              <Tooltip title={isConfiguringKey && (apiKey || geminiApiKey) ? 'Quay lại Chat' : 'Cài đặt Gemini API & Model'}>
                <Button
                  type={isConfiguringKey ? 'primary' : 'text'}
                  icon={<SettingOutlined />}
                  onClick={() => {
                    setIsConfiguringKey(!isConfiguringKey);
                    setKeyError('');
                    setKeySuccess('');
                  }}
                />
              </Tooltip>
            </Space>
          </Flex>
        }
      >
        {/* Context bar when viewing a word */}
        {wordText && !isConfiguringKey && (
          <div
            style={{
              padding: '8px 16px',
              background: 'rgba(124, 106, 247, 0.08)',
              borderBottom: '1px solid rgba(124, 106, 247, 0.16)',
            }}
          >
            <Space size={8} wrap>
              <Tag color="purple">Đang học</Tag>
              <Typography.Text strong style={{ color: '#a78bfa' }}>
                {wordText}
              </Typography.Text>
              {wordVi && <Typography.Text type="secondary">({wordVi})</Typography.Text>}
              {wordTopic && <Tag color="blue">{wordTopic}</Tag>}
            </Space>
          </div>
        )}

        {/* View 1: Settings Panel */}
        {isConfiguringKey ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              <Collapse
                defaultActiveKey={['config']}
                items={[
                  {
                    key: 'config',
                    label: (
                      <Space>
                        <KeyOutlined style={{ color: '#7c6af7' }} />
                        <Typography.Text strong>Cài đặt Gemini API & Model</Typography.Text>
                      </Space>
                    ),
                    children: (
                      <Space orientation="vertical" size={14} style={{ width: '100%' }}>
                        <Alert
                          type="info"
                          showIcon
                          title="IELTS AI Tutor kết nối mô hình Gemini Flash siêu tốc và hoàn toàn miễn phí từ Google AI Studio."
                        />

                        {user && (apiKey || geminiApiKey) && (
                          <Alert
                            type="success"
                            showIcon
                            icon={<CloudSyncOutlined />}
                            title={`Đã đồng bộ API Key theo tài khoản Google (${user.email})`}
                          />
                        )}

                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '12px 16px',
                            borderRadius: 8,
                            fontSize: 13,
                          }}
                        >
                          <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
                            Hướng dẫn lấy API Key miễn phí (1 phút):
                          </Typography.Text>
                          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
                            <li>
                              Truy cập{' '}
                              <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#7c6af7', textDecoration: 'underline' }}
                              >
                                Google AI Studio ↗
                              </a>
                            </li>
                            <li>Đăng nhập tài khoản Google và bấm <strong>Create API key</strong>.</li>
                            <li>Sao chép key, dán vào ô bên dưới rồi nhấn <strong>Kiểm tra & Kết nối</strong>.</li>
                          </ol>
                        </div>

                        <div>
                          <Typography.Text style={{ display: 'block', marginBottom: 6 }}>
                            Google Gemini API Key:
                          </Typography.Text>
                          <Input.Password
                            placeholder="AIzaSy..."
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            disabled={isTestingKey}
                            size="large"
                          />
                        </div>

                        <div>
                          <Typography.Text style={{ display: 'block', marginBottom: 6 }}>
                            Mô hình AI ưu tiên (Gemini Model):
                          </Typography.Text>
                          <Select
                            value={selectedModel}
                            onChange={handleModelChange}
                            options={modelOptions}
                            style={{ width: '100%' }}
                            size="large"
                          />
                        </div>

                        {keyError && <Alert type="error" showIcon title={keyError} />}
                        {keySuccess && <Alert type="success" showIcon title={keySuccess} />}

                        <Flex justify="space-between" align="center" wrap="wrap" gap={8} style={{ marginTop: 8 }}>
                          <Button
                            type="primary"
                            icon={<RocketOutlined />}
                            loading={isTestingKey}
                            disabled={!inputKey.trim()}
                            onClick={handleConnectKey}
                            size="large"
                          >
                            Kiểm tra & Kết nối
                          </Button>

                          <Space>
                            {(apiKey || geminiApiKey) && (
                              <Button
                                onClick={() => {
                                  setInputKey(apiKey || geminiApiKey);
                                  setIsConfiguringKey(false);
                                  setKeyError('');
                                }}
                                disabled={isTestingKey}
                              >
                                Quay lại chat
                              </Button>
                            )}

                            {(apiKey || geminiApiKey) && (
                              <Popconfirm
                                title="Xóa API Key?"
                                description="Xóa API Key khỏi ứng dụng và tài khoản Google?"
                                onConfirm={handleClearKey}
                                okText="Xóa"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true }}
                              >
                                <Button danger disabled={isTestingKey}>
                                  Xóa Key
                                </Button>
                              </Popconfirm>
                            )}
                          </Space>
                        </Flex>
                      </Space>
                    ),
                  },
                ]}
              />

              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center' }}>
                {user ? (
                  <>☁️ Key và lịch sử học tập được đồng bộ bảo mật qua Cloud Firestore theo tài khoản Google của bạn.</>
                ) : (
                  <>🔒 Key được lưu an toàn trên trình duyệt của bạn (localStorage) và chỉ gửi trực tiếp tới máy chủ Google API.</>
                )}
              </Typography.Text>
            </Space>
          </div>
        ) : (
          /* View 2: Multi-Session 2-Column Chat Layout */
          <div className="ai-modal-layout">
            {/* ─── Column 1: Sidebar (Chat Sessions) ─── */}
            <div
              className={`ai-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}
              style={{
                width: isSidebarOpen ? 260 : 0,
                minWidth: isSidebarOpen ? 260 : 0,
                maxWidth: 260,
              }}
            >
              <div className="ai-sidebar-header">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  block
                  onClick={handleNewChat}
                  style={{
                    background: 'linear-gradient(135deg, #7c6af7 0%, #5b52e0 100%)',
                    border: 'none',
                    height: 38,
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(124, 106, 247, 0.3)',
                  }}
                >
                  Đoạn chat mới
                </Button>
                <Input.Search
                  placeholder="Tìm kiếm đoạn chat..."
                  allowClear
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ marginTop: 10 }}
                />
              </div>

              <div className="ai-sidebar-list">
                {filteredSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'rgba(255, 255, 255, 0.4)', fontSize: 13 }}>
                    {searchText ? 'Không tìm thấy đoạn chat nào' : 'Chưa có đoạn chat nào'}
                  </div>
                ) : (
                  filteredSessions.map(session => {
                    const isActive = session.id === activeSessionId;
                    const msgCount = session.messages?.length || 0;
                    return (
                      <div
                        key={session.id}
                        className={`ai-session-item ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelectSession(session.id)}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <Flex align="center" gap={6}>
                            <MessageOutlined style={{ color: isActive ? '#a78bfa' : '#94a3b8', fontSize: 13, flexShrink: 0 }} />
                            <Typography.Text
                              strong={isActive}
                              ellipsis
                              style={{
                                color: isActive ? '#ffffff' : '#cbd5e1',
                                fontSize: 13,
                                display: 'block',
                              }}
                            >
                              {session.title || 'Đoạn chat'}
                            </Typography.Text>
                          </Flex>
                          <Flex justify="space-between" align="center" style={{ marginTop: 4 }}>
                            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                              {msgCount} tin nhắn
                            </Typography.Text>
                            {session.createdAt && (
                              <Typography.Text type="secondary" style={{ fontSize: 10, opacity: 0.6 }}>
                                {new Date(session.createdAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                              </Typography.Text>
                            )}
                          </Flex>
                        </div>

                        <Popconfirm
                          title="Xóa đoạn chat?"
                          description="Bạn có chắc chắn muốn xóa đoạn chat này?"
                          onConfirm={(e) => {
                            e?.stopPropagation?.();
                            handleDeleteSession(session.id);
                          }}
                          onCancel={(e) => e?.stopPropagation?.()}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                            className="ai-session-delete-btn"
                          />
                        </Popconfirm>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ─── Column 2: Main Chat View ─── */}
            <div className="ai-chat-main">
              {/* Header Bar */}
              <div className="ai-chat-header">
                <Space size={10} align="center" style={{ minWidth: 0, flex: 1 }}>
                  <Tooltip title={isSidebarOpen ? 'Thu gọn danh sách' : 'Mở danh sách đoạn chat'}>
                    <Button
                      type="text"
                      icon={isSidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                  </Tooltip>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Flex align="center" gap={8}>
                      <Typography.Text
                        strong
                        ellipsis
                        style={{ fontSize: 15, color: '#f1f5f9', maxWidth: 300 }}
                      >
                        {activeSession ? activeSession.title : 'Đoạn chat mới'}
                      </Typography.Text>
                      <Tag color="purple" style={{ margin: 0 }}>
                        {activeSession ? `${currentMessages.length} tin nhắn` : 'Mới'}
                      </Tag>
                    </Flex>
                  </div>
                </Space>

                <Space size={8}>
                  {activeSession && currentMessages.length > 0 && (
                    <Popconfirm
                      title="Xóa đoạn chat này?"
                      description="Bạn có chắc chắn muốn xóa toàn bộ tin nhắn trong đoạn chat này?"
                      onConfirm={() => {
                        handleDeleteSession(activeSession.id);
                      }}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="Xóa đoạn chat hiện tại">
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                  )}
                </Space>
              </div>

              {/* Native Smooth Scroll Messages Container */}
              <div className="ai-messages-container" ref={chatContainerRef}>
                {displayMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', margin: 'auto' }}>
                    <Avatar size={54} icon={<RobotOutlined />} style={{ backgroundColor: '#7c6af7', marginBottom: 16 }} />
                    <Typography.Title level={4} style={{ margin: '0 0 8px 0', color: '#f1f5f9' }}>
                      Chào mừng bạn đến với IELTS AI Tutor!
                    </Typography.Title>
                    <Typography.Paragraph type="secondary" style={{ maxWidth: 460, margin: '0 auto 16px auto', fontSize: 13 }}>
                      Tôi là gia sư AI đồng hành cùng bạn nâng band Lexical Resource lên <strong>Band 7.5+</strong>. Hãy hỏi tôi về collocations, ví dụ học thuật, đoạn văn mẫu hoặc các câu hỏi đố vui nhé!
                    </Typography.Paragraph>
                    <Tag color="purple" style={{ padding: '4px 10px', fontSize: 12 }}>
                      💬 Nhập tin nhắn bên dưới để bắt đầu đoạn chat mới
                    </Tag>
                  </div>
                ) : (
                  <>
                    {displayMessages.map(msg => renderMessageItem(msg))}
                    <div ref={chatBottomRef} style={{ height: 1 }} />
                  </>
                )}
              </div>

              {/* Chat Error Banner */}
              {chatError && (
                <Alert
                  type="error"
                  showIcon
                  title={chatError}
                  action={
                    <Button size="small" onClick={() => handleSendMessage()}>
                      Thử lại
                    </Button>
                  }
                  style={{ margin: '8px 14px', flexShrink: 0 }}
                />
              )}

              {/* Quick Prompts Suggestions */}
              <div
                style={{
                  padding: '6px 16px 8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  background: 'rgba(0, 0, 0, 0.15)',
                  flexShrink: 0,
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              >
                <Flex justify="space-between" align="center" style={{ marginBottom: isPromptsOpen ? 6 : 0 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    💡 Gợi ý hỏi nhanh:
                  </Typography.Text>
                  <Button
                    type="text"
                    size="small"
                    onClick={() => setIsPromptsOpen(!isPromptsOpen)}
                    style={{ fontSize: 11, padding: '0 6px', height: 20, color: 'rgba(255, 255, 255, 0.45)' }}
                  >
                    {isPromptsOpen ? 'Thu gọn ▲' : 'Mở rộng ▼'}
                  </Button>
                </Flex>
                {isPromptsOpen && (
                  <Space wrap size={[6, 6]}>
                    <Button
                      type="dashed"
                      size="small"
                      onClick={() => handleQuickPrompt('format_words')}
                      disabled={isSending}
                    >
                      📋 5 từ chuẩn format
                    </Button>
                    <Button
                      type="dashed"
                      size="small"
                      onClick={() => handleQuickPrompt('guide')}
                      disabled={isSending}
                    >
                      ❓ Hướng dẫn sử dụng app
                    </Button>
                    <Button
                      type="dashed"
                      size="small"
                      onClick={() => handleQuickPrompt('explain')}
                      disabled={isSending}
                    >
                      💡 Phân tích từ đang xem Band 7+
                    </Button>
                    <Button
                      type="dashed"
                      size="small"
                      onClick={() => handleQuickPrompt('writing')}
                      disabled={isSending}
                    >
                      📝 Viết Task 2 với từ này
                    </Button>
                    <Button
                      type="dashed"
                      size="small"
                      onClick={() => handleQuickPrompt('quiz')}
                      disabled={isSending}
                    >
                      🎯 Đố tôi câu hỏi trắc nghiệm
                    </Button>
                  </Space>
                )}
              </div>

              {/* Chat Input Bar */}
              <div
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  background: '#16142a',
                  flexShrink: 0,
                }}
              >
                <Flex gap={8} align="flex-end">
                  <Input.TextArea
                    ref={inputRef}
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    placeholder={
                      wordText
                        ? `Hỏi AI về "${wordText}" hoặc chọn gợi ý trên... (Enter để gửi)`
                        : 'Nhập câu hỏi để cùng luyện tập IELTS... (Enter để gửi)'
                    }
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSending}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={isSending}
                    disabled={!inputText.trim() || isSending}
                    onClick={() => handleSendMessage()}
                  />
                </Flex>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}