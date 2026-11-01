import { useState } from 'react';
import {
  Card,
  Tag,
  Typography,
  Button,
  Space,
  Tooltip,
  Flex,
} from 'antd';
import {
  SoundOutlined,
  EditOutlined,
  EyeOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { speakText } from '../utils/srs';
import { useStore } from '../store/useStore';
import { renderHighlightedExample } from '../utils/exampleHighlight';

// Re-export for backward compatibility and test access
export { renderHighlightedExample, getSearchRegex } from '../utils/exampleHighlight';

const { Title, Text, Paragraph } = Typography;

export default function LearnCard({ word, onUnderstood, onMastered, onEditWord }) {
  const showMeaningFirst = useStore(s => s.showMeaningFirst);
  const [flipped, setFlipped] = useState(showMeaningFirst);

  const handleFlip = () => {
    const selection = window.getSelection()?.toString();
    if (selection && selection.trim().length > 0) return;

    if (!flipped) {
      setFlipped(true);
      speakText(word.word);
    } else {
      speakText(word.word);
    }
  };

  return (
    <Card
      className="card learn-card"
      style={{
        borderRadius: 16,
        background: 'linear-gradient(135deg, #1e1b38 0%, #16132e 100%)',
        border: '1px solid rgba(124, 106, 247, 0.35)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
      }}
      styles={{ body: { padding: '24px' } }}
    >
      {/* Header row: Badge, Topic & Edit button */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Space size={8}>
          <Tag
            color="purple"
            icon={<BookOutlined />}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: '0.8rem',
              fontWeight: 700,
              margin: 0,
            }}
          >
            Từ mới
          </Tag>
          <Text
            type="secondary"
            style={{
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {word.topic}
          </Text>
        </Space>

        <Tooltip title="Chỉnh sửa từ vựng này">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEditWord?.(word);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              color: '#9fa8c7',
              borderRadius: 8,
              fontSize: '0.78rem',
            }}
          >
            Sửa từ
          </Button>
        </Tooltip>
      </Flex>

      {/* Word and Pronounce action */}
      <div
        className="card-word"
        onClick={handleFlip}
        style={{
          cursor: 'pointer',
          marginBottom: 18,
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
              fontSize: '2.2rem',
              letterSpacing: '-0.01em',
            }}
          >
            {word.word}
          </Title>
          <Tooltip title="Phát âm">
            <Button
              type="text"
              shape="circle"
              icon={<SoundOutlined style={{ fontSize: '1.25rem', color: '#a89af5' }} />}
              onClick={(e) => {
                e.stopPropagation();
                speakText(word.word);
              }}
              aria-label="Phát âm"
            />
          </Tooltip>
        </Flex>
      </div>

      {/* Card Content: Either Flip Hint or Full Details */}
      {!flipped && !showMeaningFirst ? (
        <div
          className="card-flip-hint"
          onClick={handleFlip}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '36px 20px',
            border: '2px dashed rgba(124, 106, 247, 0.35)',
            borderRadius: 12,
            color: '#a89af5',
            cursor: 'pointer',
            fontSize: '1rem',
            margin: '20px 0',
            background: 'rgba(124, 106, 247, 0.04)',
            userSelect: 'none',
          }}
        >
          <EyeOutlined style={{ fontSize: '1.5rem' }} />
          <Text strong style={{ color: '#a89af5', fontSize: '1rem' }}>
            Bấm để xem nghĩa từ
          </Text>
        </div>
      ) : (
        <Flex vertical gap={16} style={{ marginBottom: 24, userSelect: 'text' }}>
          {/* Vietnamese meaning */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <Text
              style={{
                fontSize: '0.75rem',
                color: '#9fa8c7',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Nghĩa tiếng Việt
            </Text>
            <Text strong style={{ fontSize: '1.3rem', color: '#2ed573' }}>
              {word.vi}
            </Text>
          </div>

          {/* English definition */}
          {word.en && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Text
                style={{
                  fontSize: '0.75rem',
                  color: '#9fa8c7',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                English Definition
              </Text>
              <Paragraph style={{ margin: 0, fontSize: '0.98rem', color: '#e8eaf6' }}>
                {word.en}
              </Paragraph>
            </div>
          )}

          {/* Example sentence with highlight & translation */}
          {word.example && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'rgba(124, 106, 247, 0.08)',
                border: '1px solid rgba(124, 106, 247, 0.25)',
              }}
            >
              <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                <Text
                  style={{
                    fontSize: '0.75rem',
                    color: '#a89af5',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  💬 Câu ví dụ (Example)
                </Text>
                <Button
                  size="small"
                  icon={<SoundOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    speakText(word.example);
                  }}
                  style={{
                    borderRadius: 16,
                    fontSize: '0.75rem',
                    background: 'rgba(124, 106, 247, 0.16)',
                    borderColor: 'rgba(124, 106, 247, 0.35)',
                    color: '#c4beff',
                  }}
                >
                  Nghe câu
                </Button>
              </Flex>

              <div style={{ fontSize: '0.96rem', fontStyle: 'italic', color: '#ffffff', lineHeight: 1.6 }}>
                "{renderHighlightedExample(word.example, word.word)}"
              </div>

              {word.exampleVi && (
                <Flex
                  align="start"
                  gap={8}
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Tag color="cyan" style={{ margin: 0, fontSize: '0.7rem', fontWeight: 600 }}>
                    Dịch
                  </Tag>
                  <Text type="secondary" style={{ fontSize: '0.88rem' }}>
                    {word.exampleVi}
                  </Text>
                </Flex>
              )}
            </div>
          )}
        </Flex>
      )}

      {/* Action Buttons */}
      {(flipped || showMeaningFirst) && (
        <Flex vertical gap={12}>
          <Button
            type="primary"
            size="large"
            block
            onClick={onUnderstood}
            style={{
              height: 48,
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 4px 16px rgba(124, 106, 247, 0.35)',
            }}
          >
            💡 Đã hiểu nghĩa • Tiếp tục
          </Button>

          <Button
            size="large"
            block
            onClick={onMastered}
            style={{
              height: 44,
              fontSize: '0.95rem',
              fontWeight: 600,
              background: 'rgba(46, 213, 115, 0.12)',
              borderColor: '#2ed573',
              color: '#2ed573',
            }}
          >
            ✅ Đã thuộc từ này
          </Button>
        </Flex>
      )}
    </Card>
  );
}
