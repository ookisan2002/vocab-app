import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  Flex,
  Typography,
  Button,
  Space,
  Tag,
  Popconfirm,
  Input,
  Progress,
  Modal,
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  SendOutlined,
  UndoOutlined,
  DeleteOutlined,
  BulbOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

export default function ExamRoom({
  questions = [],
  timerMode = 'none',
  onSubmitExam,
  onExitExam,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [reorderState, setReorderState] = useState(() => {
    const initialReorder = {};
    questions.forEach((q) => {
      if (q.type === 'reorder') {
        const tokens = (q.scrambledTokens || []).map((tok, idx) => ({
          id: `${q.id}_t_${idx}`,
          text: tok,
        }));
        initialReorder[q.id] = {
          poolTokens: tokens,
          selectedTokens: [],
        };
      }
    });
    return initialReorder;
  });
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    return timerMode === 'countdown' ? questions.length * 90 : 0;
  });

  const timerRef = useRef(null);
  const hasAutoSubmitted = useRef(false);

  // Countdown timer
  useEffect(() => {
    if (timerMode !== 'countdown') return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!hasAutoSubmitted.current) {
            hasAutoSubmitted.current = true;
            Modal.warning({
              title: 'Hết giờ làm bài!',
              content: 'Thời gian thi đã kết thúc. Bài làm của bạn đang được tự động gửi đến AI để chấm điểm.',
              okText: 'Xem kết quả',
              onOk: () => onSubmitExam(userAnswers),
            });
            onSubmitExam(userAnswers);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerMode, onSubmitExam, userAnswers]);

  const currentQ = questions[currentIndex] || null;

  // Format countdown mm:ss
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Answer status checks
  const isQuestionAnswered = (q) => {
    if (!q) return false;
    const ans = userAnswers[q.id];
    if (ans === undefined || ans === null) return false;
    if (typeof ans === 'string') return ans.trim().length > 0;
    return Boolean(ans);
  };

  const answeredCount = useMemo(() => {
    return questions.filter((q) => {
      const ans = userAnswers[q.id];
      if (ans === undefined || ans === null) return false;
      if (typeof ans === 'string') return ans.trim().length > 0;
      return Boolean(ans);
    }).length;
  }, [questions, userAnswers]);

  const unansweredCount = questions.length - answeredCount;

  // Handlers for question types
  const handleSelectOption = (opt) => {
    if (!currentQ) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: opt,
    }));
  };

  // Reorder handlers
  const handleSelectPoolToken = (tokenObj) => {
    if (!currentQ) return;
    const qId = currentQ.id;
    const cur = reorderState[qId] || { poolTokens: [], selectedTokens: [] };

    const nextPool = cur.poolTokens.filter((t) => t.id !== tokenObj.id);
    const nextSelected = [...cur.selectedTokens, tokenObj];

    setReorderState((prev) => ({
      ...prev,
      [qId]: {
        poolTokens: nextPool,
        selectedTokens: nextSelected,
      },
    }));

    const answerSentence = nextSelected.map((t) => t.text).join(' ');
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: answerSentence,
    }));
  };

  const handleRemoveSelectedToken = (tokenObj) => {
    if (!currentQ) return;
    const qId = currentQ.id;
    const cur = reorderState[qId] || { poolTokens: [], selectedTokens: [] };

    const nextSelected = cur.selectedTokens.filter((t) => t.id !== tokenObj.id);
    const nextPool = [...cur.poolTokens, tokenObj];

    setReorderState((prev) => ({
      ...prev,
      [qId]: {
        poolTokens: nextPool,
        selectedTokens: nextSelected,
      },
    }));

    const answerSentence = nextSelected.map((t) => t.text).join(' ');
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: answerSentence,
    }));
  };

  const handleResetReorder = () => {
    if (!currentQ) return;
    const qId = currentQ.id;
    const tokens = (currentQ.scrambledTokens || []).map((tok, idx) => ({
      id: `${currentQ.id}_t_${idx}`,
      text: tok,
    }));
    setReorderState((prev) => ({
      ...prev,
      [qId]: {
        poolTokens: tokens,
        selectedTokens: [],
      },
    }));
    setUserAnswers((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
  };

  const handleRemoveLastToken = () => {
    if (!currentQ) return;
    const qId = currentQ.id;
    const cur = reorderState[qId];
    if (!cur || cur.selectedTokens.length === 0) return;

    const last = cur.selectedTokens[cur.selectedTokens.length - 1];
    handleRemoveSelectedToken(last);
  };

  // Translation text handler
  const handleTranslateChange = (e) => {
    if (!currentQ) return;
    const val = e.target.value;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: val,
    }));
  };

  const handleFinalSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onSubmitExam(userAnswers);
  };

  if (!currentQ) {
    return null;
  }

  // Type metadata
  const typeMeta = {
    fill_blank: { label: 'Điền từ vào chỗ trống', color: 'blue' },
    reorder: { label: 'Sắp xếp câu học thuật', color: 'green' },
    translate: { label: 'Dịch câu Việt -> Anh', color: 'purple' },
  }[currentQ.type] || { label: 'Kiểm tra', color: 'default' };

  return (
    <div className="exam-room-container" style={{ maxWidth: 880, margin: '0 auto', padding: '16px 8px 48px' }}>
      {/* Top Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }} wrap="wrap" gap={12}>
        <Flex align="center" gap={12}>
          <Popconfirm
            title="Thoát phòng thi?"
            description="Toàn bộ tiến trình làm bài hiện tại sẽ bị hủy và không được lưu."
            okText="Thoát"
            cancelText="Làm tiếp"
            okButtonProps={{ danger: true }}
            onConfirm={onExitExam}
          >
            <Button
              danger
              icon={<CloseOutlined />}
              style={{ borderRadius: 10, background: 'rgba(240, 82, 82, 0.1)' }}
            >
              Thoát
            </Button>
          </Popconfirm>

          <Space size={6}>
            <Text strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>
              IELTS Exam Arena
            </Text>
            <Tag color={typeMeta.color} style={{ borderRadius: 10, margin: 0, fontWeight: 600 }}>
              {typeMeta.label}
            </Tag>
          </Space>
        </Flex>

        {/* Timer or Progress indicator */}
        <Flex align="center" gap={12}>
          {timerMode === 'countdown' && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 12,
                background: secondsRemaining <= 60 ? 'rgba(240, 82, 82, 0.2)' : 'rgba(124, 106, 247, 0.15)',
                border: secondsRemaining <= 60 ? '1px solid rgba(240, 82, 82, 0.5)' : '1px solid rgba(124, 106, 247, 0.3)',
                color: secondsRemaining <= 60 ? '#f05252' : '#a89af5',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              <ClockCircleOutlined style={{ fontSize: '1.1rem' }} />
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          )}

          <div
            style={{
              padding: '6px 14px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#c5cae9',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            Đã làm: <strong style={{ color: '#2ed573' }}>{answeredCount}</strong>/{questions.length} câu
          </div>
        </Flex>
      </Flex>

      {/* Question Navigator Bar */}
      <Card
        size="small"
        style={{
          borderRadius: 16,
          background: 'rgba(22, 20, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 20,
        }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Flex vertical gap={8}>
          <Flex justify="space-between" align="center">
            <Text style={{ fontSize: '0.82rem', color: '#9fa8c7' }}>
              Danh sách câu hỏi:
            </Text>
            <Progress
              percent={Math.round((answeredCount / questions.length) * 100)}
              size="small"
              strokeColor="#2ed573"
              railColor="rgba(255, 255, 255, 0.08)"
              style={{ width: 140, margin: 0 }}
            />
          </Flex>

          <Flex gap={8} wrap="wrap">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = isQuestionAnswered(q);

              let btnBg = 'rgba(255, 255, 255, 0.04)';
              let btnBorder = '1px solid rgba(255, 255, 255, 0.1)';
              let btnColor = '#9fa8c7';

              if (isAnswered) {
                btnBg = 'rgba(46, 213, 115, 0.15)';
                btnBorder = '1px solid rgba(46, 213, 115, 0.4)';
                btnColor = '#2ed573';
              }
              if (isCurrent) {
                btnBg = 'rgba(124, 106, 247, 0.35)';
                btnBorder = '2px solid #7c6af7';
                btnColor = '#ffffff';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: btnBg,
                    border: btnBorder,
                    color: btnColor,
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: isCurrent ? '0 0 12px rgba(124, 106, 247, 0.5)' : 'none',
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </Flex>
        </Flex>
      </Card>

      {/* Main Question Card */}
      <Card
        style={{
          borderRadius: 20,
          background: 'rgba(22, 20, 42, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          marginBottom: 20,
        }}
        styles={{ body: { padding: '28px 32px' } }}
      >
        <Flex vertical gap={24}>
          {/* Question Header */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
            <Space size={10}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #7c6af7 0%, #5b52e0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                {currentIndex + 1}
              </div>
              <Text strong style={{ color: '#ffffff', fontSize: '1.05rem' }}>
                Câu hỏi {currentIndex + 1} / {questions.length}
              </Text>
            </Space>

            <Space size={8}>
              <Tag color="cyan" style={{ borderRadius: 10, fontSize: '0.8rem', padding: '2px 8px' }}>
                Từ mục tiêu: <strong>{currentQ.targetWord}</strong>
              </Tag>
              {isQuestionAnswered(currentQ) && (
                <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: 10 }}>
                  Đã làm
                </Tag>
              )}
            </Space>
          </Flex>

          {/* DẠNG 1: FILL_BLANK */}
          {currentQ.type === 'fill_blank' && (
            <Flex vertical gap={20}>
              {/* Question prompt */}
              <div
                style={{
                  padding: '20px 24px',
                  borderRadius: 16,
                  background: 'rgba(15, 17, 23, 0.75)',
                  border: '1px solid rgba(124, 106, 247, 0.25)',
                  fontSize: '1.15rem',
                  lineHeight: 1.7,
                  color: '#ffffff',
                  letterSpacing: '0.01em',
                }}
              >
                {currentQ.prompt.split('___').map((part, pIdx, arr) => (
                  <span key={pIdx}>
                    {part}
                    {pIdx < arr.length - 1 && (
                      <span
                        style={{
                          display: 'inline-block',
                          minWidth: 90,
                          padding: '0 10px',
                          margin: '0 4px',
                          borderBottom: '3px solid #7c6af7',
                          color: userAnswers[currentQ.id] ? '#7c6af7' : '#9fa8c7',
                          fontWeight: 700,
                          textAlign: 'center',
                        }}
                      >
                        {userAnswers[currentQ.id] || '_______'}
                      </span>
                    )}
                  </span>
                ))}
              </div>

              {/* 4 Options */}
              <Flex vertical gap={12}>
                <Text style={{ fontSize: '0.85rem', color: '#9fa8c7' }}>
                  Chọn từ thích hợp nhất để hoàn thành câu:
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  {(currentQ.options || []).map((opt, optIdx) => {
                    const isSelected = userAnswers[currentQ.id] === opt;
                    const letter = String.fromCharCode(65 + optIdx); // A, B, C, D

                    return (
                      <div
                        key={opt}
                        onClick={() => handleSelectOption(opt)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '14px 18px',
                          borderRadius: 14,
                          background: isSelected ? 'rgba(124, 106, 247, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          border: isSelected ? '2px solid #7c6af7' : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 4px 16px rgba(124, 106, 247, 0.3)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: isSelected ? '#7c6af7' : 'rgba(255, 255, 255, 0.08)',
                            color: '#ffffff',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                          }}
                        >
                          {letter}
                        </div>
                        <Text strong style={{ fontSize: '1.02rem', color: isSelected ? '#ffffff' : '#e8eaf6' }}>
                          {opt}
                        </Text>
                      </div>
                    );
                  })}
                </div>
              </Flex>
            </Flex>
          )}

          {/* DẠNG 2: REORDER */}
          {currentQ.type === 'reorder' && (
            <Flex vertical gap={20}>
              {/* Meaning prompt */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 14,
                  background: 'rgba(15, 17, 23, 0.75)',
                  border: '1px solid rgba(46, 213, 115, 0.25)',
                }}
              >
                <Text type="secondary" style={{ fontSize: '0.82rem', display: 'block', marginBottom: 4 }}>
                  Nghĩa tiếng Việt của câu:
                </Text>
                <Text style={{ fontSize: '1.05rem', color: '#e8eaf6', fontWeight: 500 }}>
                  {currentQ.viMeaning}
                </Text>
              </div>

              {/* Selected Tokens (Answer Area) */}
              <Flex vertical gap={8}>
                <Flex justify="space-between" align="center">
                  <Text style={{ fontSize: '0.85rem', color: '#9fa8c7' }}>
                    Câu trả lời của bạn (Nhấn vào thẻ từ để bỏ ra):
                  </Text>
                  <Space size={8}>
                    <Button
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={handleRemoveLastToken}
                      disabled={!(reorderState[currentQ.id]?.selectedTokens?.length > 0)}
                      style={{ borderRadius: 8 }}
                    >
                      Xóa từ cuối
                    </Button>
                    <Button
                      size="small"
                      icon={<UndoOutlined />}
                      onClick={handleResetReorder}
                      disabled={!(reorderState[currentQ.id]?.selectedTokens?.length > 0)}
                      style={{ borderRadius: 8 }}
                    >
                      Làm lại
                    </Button>
                  </Space>
                </Flex>

                <div
                  style={{
                    minHeight: 70,
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: 'rgba(15, 17, 23, 0.85)',
                    border: '2px dashed rgba(124, 106, 247, 0.4)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  {(!reorderState[currentQ.id]?.selectedTokens || reorderState[currentQ.id]?.selectedTokens.length === 0) ? (
                    <Text type="secondary" style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>
                      Nhấn vào các thẻ từ bên dưới theo đúng thứ tự để tạo thành câu hoàn chỉnh...
                    </Text>
                  ) : (
                    reorderState[currentQ.id]?.selectedTokens.map((tok) => (
                      <span
                        key={tok.id}
                        onClick={() => handleRemoveSelectedToken(tok)}
                        style={{
                          display: 'inline-block',
                          padding: '6px 14px',
                          borderRadius: 10,
                          background: tok.text.toLowerCase().includes(currentQ.targetWord.toLowerCase())
                            ? 'linear-gradient(135deg, #7c6af7 0%, #5b52e0 100%)'
                            : 'rgba(124, 106, 247, 0.25)',
                          border: '1px solid rgba(124, 106, 247, 0.5)',
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          userSelect: 'none',
                        }}
                      >
                        {tok.text} ✕
                      </span>
                    ))
                  )}
                </div>
              </Flex>

              {/* Pool of Available Tokens */}
              <Flex vertical gap={8}>
                <Text style={{ fontSize: '0.85rem', color: '#9fa8c7' }}>
                  Kho thẻ từ khả dụng (Nhấn để đưa vào câu):
                </Text>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: '14px',
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {(reorderState[currentQ.id]?.poolTokens || []).map((tok) => (
                    <span
                      key={tok.id}
                      onClick={() => handleSelectPoolToken(tok)}
                      style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        borderRadius: 10,
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#e8eaf6',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tok.text}
                    </span>
                  ))}
                </div>
              </Flex>
            </Flex>
          )}

          {/* DẠNG 3: TRANSLATE */}
          {currentQ.type === 'translate' && (
            <Flex vertical gap={20}>
              {/* Vietnamese Prompt */}
              <div
                style={{
                  padding: '20px 24px',
                  borderRadius: 16,
                  background: 'rgba(15, 17, 23, 0.75)',
                  border: '1px solid rgba(124, 106, 247, 0.3)',
                }}
              >
                <Text type="secondary" style={{ fontSize: '0.82rem', display: 'block', marginBottom: 4 }}>
                  Câu tiếng Việt cần dịch sang tiếng Anh học thuật:
                </Text>
                <Text style={{ fontSize: '1.15rem', color: '#ffffff', fontWeight: 600, lineHeight: 1.6 }}>
                  {currentQ.viPrompt}
                </Text>
              </div>

              {/* Requirement Hint Badge */}
              <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
                <Space size={8}>
                  <BulbOutlined style={{ color: '#f5a623' }} />
                  <Text style={{ fontSize: '0.88rem', color: '#e8eaf6' }}>
                    Từ vựng bắt buộc phải dùng:{' '}
                    <strong style={{ color: '#2ed573', fontSize: '0.95rem' }}>
                      {currentQ.targetWord}
                    </strong>
                  </Text>
                </Space>

                {/* Target word status indicator */}
                {userAnswers[currentQ.id]?.toLowerCase().includes(currentQ.targetWord.toLowerCase()) ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    Đã xuất hiện từ &quot;{currentQ.targetWord}&quot;
                  </Tag>
                ) : (
                  <Tag color="warning">
                    Chưa xuất hiện từ &quot;{currentQ.targetWord}&quot;
                  </Tag>
                )}
              </Flex>

              {/* Textarea */}
              <TextArea
                rows={4}
                value={userAnswers[currentQ.id] || ''}
                onChange={handleTranslateChange}
                placeholder={`Nhập bản dịch tiếng Anh của bạn tại đây (đảm bảo sử dụng từ "${currentQ.targetWord}")...`}
                style={{
                  borderRadius: 14,
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  padding: '14px 16px',
                  background: 'rgba(15, 17, 23, 0.85)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                }}
              />
            </Flex>
          )}

          {/* Bottom Navigation & Submit */}
          <Flex justify="space-between" align="center" style={{ marginTop: 12 }} wrap="wrap" gap={12}>
            <Button
              icon={<LeftOutlined />}
              onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
              disabled={currentIndex === 0}
              style={{ borderRadius: 10 }}
            >
              Câu trước
            </Button>

            <Space size={10}>
              {currentIndex < questions.length - 1 ? (
                <Button
                  type="primary"
                  icon={<RightOutlined />}
                  onClick={() => setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1))}
                  style={{
                    borderRadius: 10,
                    background: '#7c6af7',
                    fontWeight: 600,
                  }}
                >
                  Câu tiếp theo
                </Button>
              ) : null}

              {/* Submit Button */}
              <Popconfirm
                title={unansweredCount > 0 ? `Bạn còn ${unansweredCount} câu chưa hoàn thành!` : 'Xác nhận nộp bài thi?'}
                description={
                  unansweredCount > 0
                    ? `Bạn có chắc chắn muốn nộp bài thi ngay không? Những câu chưa làm sẽ bị tính 0 điểm.`
                    : 'Bài thi sẽ được gửi đến AI để chấm điểm và phân tích kết quả.'
                }
                okText="Nộp bài ngay"
                cancelText="Xem lại"
                onConfirm={handleFinalSubmit}
                okButtonProps={{ type: 'primary', danger: unansweredCount > 0 }}
              >
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  style={{
                    borderRadius: 10,
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #2ed573 0%, #10ac84 100%)',
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(46, 213, 115, 0.4)',
                  }}
                >
                  Nộp bài thi ({answeredCount}/{questions.length})
                </Button>
              </Popconfirm>
            </Space>
          </Flex>
        </Flex>
      </Card>
    </div>
  );
}
