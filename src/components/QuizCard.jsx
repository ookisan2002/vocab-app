import { useState, useEffect } from 'react';
import {
  Card,
  Tag,
  Typography,
  Button,
  Progress,
  Alert,
  Flex,
  Space,
  Tooltip,
} from 'antd';
import {
  SoundOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowRightOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons';
import { speakText } from '../utils/srs';
import { renderHighlightedExample } from '../utils/exampleHighlight';

const { Title, Text, Paragraph } = Typography;

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
  const correctOption = question.options.find(o => o.correct);

  return (
    <Card
      className="card quiz-card"
      style={{
        borderRadius: 16,
        background: 'linear-gradient(135deg, #2a200a 0%, #1f1500 100%)',
        border: '1px solid rgba(245, 166, 35, 0.35)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
      }}
      styles={{ body: { padding: '24px' } }}
    >
      {/* Header row: Badge, Direction and Step Progress */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Space size={8}>
          <Tag
            color="warning"
            icon={<FieldTimeOutlined />}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: '0.8rem',
              fontWeight: 700,
              margin: 0,
            }}
          >
            🎯 Kiểm tra {isEnToVi ? '1/2' : '2/2'}
          </Tag>
          <Text
            style={{
              fontSize: '0.8rem',
              color: '#f5a623',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {isEnToVi ? 'Tiếng Anh → Tiếng Việt' : 'Tiếng Việt → Tiếng Anh'}
          </Text>
        </Space>

        <div style={{ width: 60 }}>
          <Progress
            percent={isEnToVi ? 50 : 100}
            size="small"
            showInfo={false}
            strokeColor="#f5a623"
            trailColor="rgba(255, 255, 255, 0.1)"
          />
        </div>
      </Flex>

      {/* Quiz Prompt */}
      <div
        className="quiz-prompt"
        style={{
          marginBottom: 20,
          userSelect: 'text',
        }}
      >
        <Flex align="center" gap={12} wrap="wrap">
          <Title
            level={2}
            style={{
              margin: 0,
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '2rem',
              letterSpacing: '-0.01em',
            }}
          >
            {question.prompt}
          </Title>
          {isEnToVi && (
            <Tooltip title="Phát âm">
              <Button
                type="text"
                shape="circle"
                icon={<SoundOutlined style={{ fontSize: '1.25rem', color: '#f5a623' }} />}
                onClick={() => speakText(question.prompt)}
                aria-label="Phát âm"
              />
            </Tooltip>
          )}
        </Flex>
      </div>

      {/* 4 Quiz Options */}
      <Flex vertical gap={10} style={{ marginBottom: 20 }} className="quiz-options">
        {question.options.map((opt, i) => {
          let btnStyle = {
            height: 'auto',
            minHeight: 50,
            padding: '12px 16px',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.96rem',
            textAlign: 'left',
            whiteSpace: 'normal',
            transition: 'all 0.2s',
          };

          let icon = null;

          if (answered) {
            if (opt.correct) {
              btnStyle = {
                ...btnStyle,
                background: 'rgba(46, 213, 115, 0.2)',
                borderColor: '#2ed573',
                color: '#2ed573',
                fontWeight: 600,
              };
              icon = <CheckCircleOutlined style={{ fontSize: '1.2rem', color: '#2ed573' }} />;
            } else if (selected === opt) {
              btnStyle = {
                ...btnStyle,
                background: 'rgba(255, 71, 87, 0.2)',
                borderColor: '#ff4757',
                color: '#ff4757',
                fontWeight: 600,
              };
              icon = <CloseCircleOutlined style={{ fontSize: '1.2rem', color: '#ff4757' }} />;
            } else {
              btnStyle = {
                ...btnStyle,
                opacity: 0.45,
              };
            }
          } else {
            btnStyle = {
              ...btnStyle,
              background: 'rgba(255, 255, 255, 0.04)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
              color: '#e8eaf6',
            };
          }

          return (
            <Button
              key={opt.id}
              className="quiz-option"
              onClick={() => handleSelect(opt)}
              disabled={answered}
              style={btnStyle}
              block
            >
              <Flex align="center" gap={12} style={{ width: '100%' }}>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: answered && opt.correct ? '#2ed573' : (answered && selected === opt ? '#ff4757' : 'rgba(255, 255, 255, 0.1)'),
                    color: answered && (opt.correct || selected === opt) ? '#000000' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, wordBreak: 'break-word' }}>{opt.text}</span>
                {icon}
              </Flex>
            </Button>
          );
        })}
      </Flex>

      {/* Answer feedback alert */}
      {answered && (
        <Alert
          type={selected?.correct ? 'success' : 'error'}
          showIcon
          style={{
            borderRadius: 12,
            borderWidth: 1,
            marginBottom: 8,
          }}
          title={
            <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
              <Text strong style={{ fontSize: '1.05rem', color: selected?.correct ? '#2ed573' : '#ff4757' }}>
                {selected?.correct ? 'Chính xác! Làm tốt lắm.' : 'Chưa chính xác!'}
              </Text>
              <Button
                size="small"
                icon={<SoundOutlined />}
                onClick={() => speakText(word.word)}
                style={{
                  borderRadius: 8,
                  fontSize: '0.78rem',
                }}
              >
                Nghe từ
              </Button>
            </Flex>
          }
          description={
            <Flex vertical gap={12} style={{ marginTop: 8 }}>
              {!selected?.correct && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 71, 87, 0.1)',
                    border: '1px solid rgba(255, 71, 87, 0.25)',
                  }}
                >
                  <Text style={{ fontSize: '0.82rem', color: '#ff8585', display: 'block' }}>
                    Đáp án đúng là:
                  </Text>
                  <Text strong style={{ fontSize: '1.1rem', color: '#ffb8b8' }}>
                    {correctOption?.text}
                  </Text>
                </div>
              )}

              {/* Meanings */}
              <Flex vertical gap={4}>
                <Text style={{ fontSize: '0.88rem' }}>
                  <Text type="secondary" strong style={{ textTransform: 'uppercase', fontSize: '0.75rem', marginRight: 6 }}>
                    Nghĩa:
                  </Text>
                  <Text strong>{word.vi}</Text>
                </Text>
                {word.en && (
                  <Text style={{ fontSize: '0.88rem' }}>
                    <Text type="secondary" strong style={{ textTransform: 'uppercase', fontSize: '0.75rem', marginRight: 6 }}>
                      Definition:
                    </Text>
                    <span>{word.en}</span>
                  </Text>
                )}
              </Flex>

              {/* Example */}
              {word.example && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
                    <Text type="secondary" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      💬 Câu ví dụ:
                    </Text>
                    <Button
                      size="small"
                      icon={<SoundOutlined />}
                      onClick={() => speakText(word.example)}
                      style={{
                        borderRadius: 12,
                        fontSize: '0.72rem',
                        height: 24,
                        padding: '0 8px',
                      }}
                    >
                      Nghe câu
                    </Button>
                  </Flex>

                  <div style={{ fontSize: '0.92rem', fontStyle: 'italic', color: '#ffffff', lineHeight: 1.5 }}>
                    "{renderHighlightedExample(word.example, word.word)}"
                  </div>

                  {word.exampleVi && (
                    <Flex align="start" gap={6} style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                      <Tag color="cyan" style={{ margin: 0, fontSize: '0.68rem', fontWeight: 600 }}>
                        Dịch
                      </Tag>
                      <Text type="secondary" style={{ fontSize: '0.84rem' }}>
                        {word.exampleVi}
                      </Text>
                    </Flex>
                  )}
                </div>
              )}

              {!selected?.correct && (
                <Paragraph type="secondary" style={{ margin: 0, fontSize: '0.78rem', fontStyle: 'italic' }}>
                  Streak đặt lại về 0/2 — hệ thống sẽ sớm hỏi lại từ này!
                </Paragraph>
              )}

              {/* Next Button */}
              <div style={{ marginTop: 4 }}>
                <Button
                  type="primary"
                  size="large"
                  className="btn-quiz-next"
                  onClick={onNext}
                  block
                  icon={<ArrowRightOutlined />}
                  style={{
                    height: 48,
                    fontWeight: 700,
                    fontSize: '1rem',
                    boxShadow: '0 4px 16px rgba(124, 106, 247, 0.4)',
                  }}
                >
                  Tiếp tục câu tiếp theo ➔
                </Button>
                <div style={{ textAlign: 'center', marginTop: 6 }}>
                  <Text type="secondary" style={{ fontSize: '0.75rem' }}>
                    (hoặc nhấn phím Enter / Phím cách)
                  </Text>
                </div>
              </div>
            </Flex>
          }
        />
      )}
    </Card>
  );
}
