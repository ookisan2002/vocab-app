import { useState, useMemo } from 'react';
import {
  Card,
  Flex,
  Typography,
  Button,
  Space,
  Tag,
  Progress,
  Row,
  Col,
  Statistic,
  Segmented,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  RiseOutlined,
  FallOutlined,
  BulbOutlined,
  StarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useStore } from '../../store/useStore';

const { Title, Text, Paragraph } = Typography;

export default function ExamResult({
  results = [],
  savedRecord,
  onViewHistory,
  onRetakeExam,
  onBackToStudy,
}) {
  const getAllWords = useStore(s => s.getAllWords);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'pass' | 'fail'

  const allWords = useMemo(() => getAllWords(), [getAllWords]);
  const wordMap = useMemo(() => {
    const map = {};
    allWords.forEach(w => {
      map[w.id] = w;
      map[w.word.toLowerCase()] = w;
    });
    return map;
  }, [allWords]);

  const total = results.length;
  const passCount = results.filter(r => r.isPass).length;
  const failCount = total - passCount;
  const accuracyPct = total > 0 ? Math.round((passCount / total) * 100) : 0;
  const avgScore = total > 0
    ? (results.reduce((acc, cur) => acc + (cur.score || 0), 0) / total).toFixed(1)
    : '0.0';

  // Estimated IELTS Band
  const getEstimatedBand = () => {
    if (accuracyPct === 100) return { band: '8.5 - 9.0', level: 'Expert (Thành thạo tối đa)', color: '#2ed573' };
    if (accuracyPct >= 80) return { band: '7.5 - 8.0', level: 'Advanced (Cao cấp học thuật)', color: '#7c6af7' };
    if (accuracyPct >= 70) return { band: '7.0', level: 'Good (Khá & Ứng dụng tốt)', color: '#1e90ff' };
    if (accuracyPct >= 55) return { band: '6.0 - 6.5', level: 'Competent (Đạt chuẩn cơ bản)', color: '#f5a623' };
    return { band: '5.0 - 5.5', level: 'Modest (Cần củng cố thêm)', color: '#f05252' };
  };

  const estBand = getEstimatedBand();

  // Words breakdown
  const passedWords = results.filter(r => r.isPass).map(r => {
    const w = wordMap[r.wordId] || wordMap[r.targetWord?.toLowerCase()];
    return {
      word: r.targetWord,
      vi: w?.vi || '',
      phonetic: w?.phonetic || '',
      score: r.score,
    };
  });

  const failedWords = results.filter(r => !r.isPass).map(r => {
    const w = wordMap[r.wordId] || wordMap[r.targetWord?.toLowerCase()];
    return {
      word: r.targetWord,
      vi: w?.vi || '',
      phonetic: w?.phonetic || '',
      score: r.score,
    };
  });

  // Filtered results for detail list
  const filteredResults = useMemo(() => {
    if (filterTab === 'pass') return results.filter(r => r.isPass);
    if (filterTab === 'fail') return results.filter(r => !r.isPass);
    return results;
  }, [results, filterTab]);

  return (
    <div className="exam-result-container" style={{ maxWidth: 880, margin: '0 auto', padding: '16px 8px 60px' }}>
      {/* Top Header Controls */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 20 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={onBackToStudy}
          style={{ borderRadius: 10, background: 'rgba(255, 255, 255, 0.05)' }}
        >
          Quay lại học từ vựng
        </Button>
        <Space wrap>
          {onViewHistory && (
            <Button
              icon={<ClockCircleOutlined />}
              onClick={() => onViewHistory(savedRecord)}
              style={{
                borderRadius: 10,
                background: 'rgba(124, 106, 247, 0.15)',
                border: '1px solid rgba(124, 106, 247, 0.4)',
                color: '#c5cae9',
              }}
            >
              Xem trong lịch sử
            </Button>
          )}
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={onRetakeExam}
            style={{
              borderRadius: 10,
              background: 'linear-gradient(135deg, #7c6af7 0%, #5b52e0 100%)',
              fontWeight: 600,
            }}
          >
            Làm bài kiểm tra mới
          </Button>
        </Space>
      </Flex>

      {/* Hero Overview Banner */}
      <Card
        style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(22, 20, 42, 0.98) 100%)',
          border: '1px solid rgba(124, 106, 247, 0.35)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          marginBottom: 24,
        }}
        styles={{ body: { padding: '28px 32px' } }}
      >
        <Row gutter={[24, 24]} align="middle">
          {/* Left Column: Progress circle & Band */}
          <Col xs={24} md={10} style={{ textAlign: 'center' }}>
            <Progress
              type="circle"
              percent={accuracyPct}
              strokeColor={{
                '0%': '#7c6af7',
                '100%': '#2ed573',
              }}
              railColor="rgba(255, 255, 255, 0.08)"
              size={140}
              format={() => (
                <Flex vertical align="center" justify="center">
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                    {accuracyPct}%
                  </span>
                  <Text type="secondary" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                    Tỷ lệ Pass
                  </Text>
                </Flex>
              )}
            />
            <div style={{ marginTop: 14 }}>
              <Tag
                color="purple"
                style={{
                  fontSize: '0.85rem',
                  padding: '4px 14px',
                  borderRadius: 14,
                  fontWeight: 700,
                  border: `1px solid ${estBand.color}`,
                  color: '#ffffff',
                }}
              >
                Ước tính: Band {estBand.band}
              </Tag>
              <Text type="secondary" style={{ display: 'block', fontSize: '0.8rem', marginTop: 4 }}>
                {estBand.level}
              </Text>
            </div>
          </Col>

          {/* Right Column: Key Statistics */}
          <Col xs={24} md={14}>
            <Flex vertical gap={16}>
              <div>
                <Title level={3} style={{ margin: 0, color: '#ffffff', fontWeight: 700 }}>
                  Tổng Kết Kết Quả Bài Thi
                </Title>
                <Paragraph style={{ margin: '4px 0 0', color: '#9fa8c7', fontSize: '0.9rem' }}>
                  Tiến độ các từ vựng đã được hệ thống tự động cập nhật vào chu kỳ ôn tập SRS.
                </Paragraph>
              </div>

              <Row gutter={[12, 12]}>
                <Col span={8}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'rgba(46, 213, 115, 0.1)',
                      border: '1px solid rgba(46, 213, 115, 0.3)',
                      textAlign: 'center',
                    }}
                  >
                    <Statistic
                      title={<span style={{ color: '#2ed573', fontSize: '0.78rem' }}>Đạt (Pass)</span>}
                      value={passCount}
                      suffix={`/${total}`}
                      prefix={<CheckCircleOutlined style={{ color: '#2ed573' }} />}
                      styles={{ content: { color: '#2ed573', fontWeight: 700, fontSize: '1.4rem' } }}
                    />
                  </div>
                </Col>

                <Col span={8}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'rgba(240, 82, 82, 0.1)',
                      border: '1px solid rgba(240, 82, 82, 0.3)',
                      textAlign: 'center',
                    }}
                  >
                    <Statistic
                      title={<span style={{ color: '#f05252', fontSize: '0.78rem' }}>Chưa đạt</span>}
                      value={failCount}
                      suffix={`/${total}`}
                      prefix={<CloseCircleOutlined style={{ color: '#f05252' }} />}
                      styles={{ content: { color: '#f05252', fontWeight: 700, fontSize: '1.4rem' } }}
                    />
                  </div>
                </Col>

                <Col span={8}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'rgba(124, 106, 247, 0.1)',
                      border: '1px solid rgba(124, 106, 247, 0.3)',
                      textAlign: 'center',
                    }}
                  >
                    <Statistic
                      title={<span style={{ color: '#a89af5', fontSize: '0.78rem' }}>Điểm TB</span>}
                      value={avgScore}
                      suffix="/10"
                      prefix={<StarOutlined style={{ color: '#7c6af7' }} />}
                      styles={{ content: { color: '#a89af5', fontWeight: 700, fontSize: '1.4rem' } }}
                    />
                  </div>
                </Col>
              </Row>
            </Flex>
          </Col>
        </Row>
      </Card>

      {/* Vocabulary Progression: Promoted vs Demoted */}
      <Card
        style={{
          borderRadius: 20,
          background: 'rgba(22, 20, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 24,
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <Flex vertical gap={20}>
          <Title level={4} style={{ margin: 0, color: '#ffffff', fontWeight: 700 }}>
            Biến Động Trạng Thái Từ Vựng Sau Bài Thi
          </Title>

          {/* Promoted Section */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 16,
              background: 'rgba(46, 213, 115, 0.06)',
              border: '1px solid rgba(46, 213, 115, 0.25)',
            }}
          >
            <Flex align="center" gap={8} style={{ marginBottom: 10 }}>
              <RiseOutlined style={{ color: '#2ed573', fontSize: '1.1rem' }} />
              <Text strong style={{ color: '#2ed573', fontSize: '0.95rem' }}>
                Thăng hạng &quot;Đã kiểm tra&quot; (tested) — Giãn cách 14 ngày ôn lại ({passedWords.length} từ)
              </Text>
            </Flex>
            <Paragraph style={{ margin: '0 0 12px', color: '#9fa8c7', fontSize: '0.82rem' }}>
              Các từ này đã qua bài kiểm tra năng lực xuất sắc và sẽ tạm thời không xuất hiện trong vòng quay thẻ học flashcard thông thường trong 14 ngày tới.
            </Paragraph>

            {passedWords.length === 0 ? (
              <Text type="secondary" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                Không có từ nào đạt bài kiểm tra lần này.
              </Text>
            ) : (
              <Flex gap={8} wrap="wrap">
                {passedWords.map((pw, i) => (
                  <Tag
                    key={i}
                    color="success"
                    style={{
                      padding: '4px 12px',
                      borderRadius: 10,
                      fontSize: '0.88rem',
                      fontWeight: 600,
                    }}
                  >
                    {pw.word} {pw.vi ? `(${pw.vi})` : ''} • {pw.score}/10
                  </Tag>
                ))}
              </Flex>
            )}
          </div>

          {/* Demoted Section */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 16,
              background: 'rgba(245, 166, 35, 0.06)',
              border: '1px solid rgba(245, 166, 35, 0.25)',
            }}
          >
            <Flex align="center" gap={8} style={{ marginBottom: 10 }}>
              <FallOutlined style={{ color: '#f5a623', fontSize: '1.1rem' }} />
              <Text strong style={{ color: '#f5a623', fontSize: '0.95rem' }}>
                Chuyển về &quot;Đang học&quot; (learning) — Cần ôn lại flashcard ({failedWords.length} từ)
              </Text>
            </Flex>
            <Paragraph style={{ margin: '0 0 12px', color: '#9fa8c7', fontSize: '0.82rem' }}>
              Các từ này chưa đạt bài kiểm tra và đã được tự động đưa về vòng quay học flashcard thông thường để bạn ôn luyện và củng cố lại.
            </Paragraph>

            {failedWords.length === 0 ? (
              <Text style={{ color: '#2ed573', fontSize: '0.88rem' }}>
                Xuất sắc! Không có từ nào bị hạ bậc trong đợt thi này.
              </Text>
            ) : (
              <Flex gap={8} wrap="wrap">
                {failedWords.map((fw, i) => (
                  <Tag
                    key={i}
                    color="warning"
                    style={{
                      padding: '4px 12px',
                      borderRadius: 10,
                      fontSize: '0.88rem',
                      fontWeight: 600,
                    }}
                  >
                    {fw.word} {fw.vi ? `(${fw.vi})` : ''} • {fw.score}/10
                  </Tag>
                ))}
              </Flex>
            )}
          </div>
        </Flex>
      </Card>

      {/* Detailed Question Review */}
      <Card
        style={{
          borderRadius: 20,
          background: 'rgba(22, 20, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <Flex vertical gap={20}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            <Title level={4} style={{ margin: 0, color: '#ffffff', fontWeight: 700 }}>
              Chi Tiết Từng Câu Hỏi &amp; Nhận Xét AI
            </Title>

            <Segmented
              value={filterTab}
              onChange={setFilterTab}
              options={[
                { label: `Tất cả (${total})`, value: 'all' },
                { label: `Đạt (${passCount})`, value: 'pass' },
                { label: `Chưa đạt (${failCount})`, value: 'fail' },
              ]}
              style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: 10 }}
            />
          </Flex>

          <Flex vertical gap={16}>
            {filteredResults.map((r, idx) => {
              const typeLabel = {
                fill_blank: 'Điền từ',
                reorder: 'Sắp xếp câu',
                translate: 'Dịch câu',
              }[r.type] || r.type;

              return (
                <div
                  key={r.questionId || idx}
                  style={{
                    padding: '20px 22px',
                    borderRadius: 16,
                    background: r.isPass ? 'rgba(46, 213, 115, 0.04)' : 'rgba(240, 82, 82, 0.04)',
                    border: r.isPass ? '1px solid rgba(46, 213, 115, 0.25)' : '1px solid rgba(240, 82, 82, 0.25)',
                  }}
                >
                  <Flex vertical gap={14}>
                    {/* Header */}
                    <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                      <Space size={8}>
                        <Tag color={r.isPass ? 'success' : 'error'} style={{ borderRadius: 8, fontWeight: 700 }}>
                          {r.isPass ? 'ĐẠT' : 'CHƯA ĐẠT'} • {r.score}/10
                        </Tag>
                        <Tag color="purple" style={{ borderRadius: 8 }}>
                          {typeLabel}
                        </Tag>
                        <Text strong style={{ color: '#ffffff', fontSize: '1.02rem' }}>
                          Từ mục tiêu: <span style={{ color: '#7c6af7' }}>{r.targetWord}</span>
                        </Text>
                      </Space>
                    </Flex>

                    {/* Question Prompt */}
                    <div style={{ color: '#e8eaf6', fontSize: '0.95rem', lineHeight: 1.6 }}>
                      <Text type="secondary" style={{ fontSize: '0.82rem', display: 'block', marginBottom: 2 }}>
                        Đề bài:
                      </Text>
                      {r.prompt}
                    </div>

                    {/* User answer vs Correct answer */}
                    <Flex vertical gap={6}>
                      <div style={{ fontSize: '0.9rem' }}>
                        <Text type="secondary">Câu trả lời của bạn: </Text>
                        <Text strong style={{ color: r.isPass ? '#2ed573' : '#f05252' }}>
                          {r.userAnswer || '(Để trống)'}
                        </Text>
                      </div>

                      {(!r.isPass || r.type === 'translate') && r.correctAnswer && (
                        <div style={{ fontSize: '0.9rem' }}>
                          <Text type="secondary">Đáp án / Câu mẫu chuẩn: </Text>
                          <Text strong style={{ color: '#2ed573' }}>
                            {r.correctAnswer}
                          </Text>
                        </div>
                      )}
                    </Flex>

                    {/* AI Feedback & Grammar Notes */}
                    {(r.feedback || r.explanation || r.betterAlternative) && (
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: 12,
                          background: 'rgba(15, 17, 23, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <Flex vertical gap={6}>
                          {r.feedback && (
                            <Flex align="start" gap={8}>
                              <BulbOutlined style={{ color: '#f5a623', marginTop: 3 }} />
                              <Text style={{ color: '#c5cae9', fontSize: '0.88rem' }}>
                                <strong>Nhận xét AI:</strong> {r.feedback}
                              </Text>
                            </Flex>
                          )}

                          {r.explanation && (
                            <Text style={{ color: '#9fa8c7', fontSize: '0.85rem' }}>
                              <strong>Giải thích:</strong> {r.explanation}
                            </Text>
                          )}

                          {r.betterAlternative && r.betterAlternative !== r.correctAnswer && (
                            <Text style={{ color: '#a89af5', fontSize: '0.85rem' }}>
                              <strong>Diễn đạt nâng Band 8.5+:</strong> {r.betterAlternative}
                            </Text>
                          )}
                        </Flex>
                      </div>
                    )}
                  </Flex>
                </div>
              );
            })}
          </Flex>
        </Flex>
      </Card>

      {/* Bottom Sticky CTA */}
      <Flex justify="center" wrap="wrap" gap={16} style={{ marginTop: 24 }}>
        <Button
          size="large"
          onClick={onBackToStudy}
          style={{ borderRadius: 12, height: 48, padding: '0 24px' }}
        >
          Quay lại học từ vựng
        </Button>
        {onViewHistory && (
          <Button
            size="large"
            icon={<ClockCircleOutlined />}
            onClick={() => onViewHistory(savedRecord)}
            style={{
              borderRadius: 12,
              height: 48,
              padding: '0 24px',
              background: 'rgba(124, 106, 247, 0.15)',
              border: '1px solid rgba(124, 106, 247, 0.4)',
              color: '#c5cae9',
              fontWeight: 600,
            }}
          >
            Lưu &amp; Xem trong lịch sử
          </Button>
        )}
        <Button
          type="primary"
          size="large"
          icon={<ReloadOutlined />}
          onClick={onRetakeExam}
          style={{
            borderRadius: 12,
            height: 48,
            padding: '0 28px',
            background: 'linear-gradient(135deg, #7c6af7 0%, #5b52e0 100%)',
            fontWeight: 700,
          }}
        >
          Làm bài kiểm tra mới
        </Button>
      </Flex>
    </div>
  );
}
