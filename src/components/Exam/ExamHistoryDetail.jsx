import { useState, useMemo } from 'react';
import {
  Card,
  Flex,
  Typography,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Segmented,
} from 'antd';
import {
  ArrowLeftOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
  CalendarOutlined,
  RobotOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function ExamHistoryDetail({ record, onBackToList }) {
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'fail' | 'pass'

  const feedbackItems = useMemo(() => record?.feedbackItems || [], [record?.feedbackItems]);
  const passItems = useMemo(() => feedbackItems.filter(item => item.isPass), [feedbackItems]);
  const failItems = useMemo(() => feedbackItems.filter(item => !item.isPass), [feedbackItems]);

  const filteredItems = useMemo(() => {
    if (filterMode === 'fail') return failItems;
    if (filterMode === 'pass') return passItems;
    return feedbackItems;
  }, [feedbackItems, failItems, passItems, filterMode]);

  if (!record) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Text type="secondary">Không tìm thấy thông tin bài thi.</Text>
        <div style={{ marginTop: 16 }}>
          <Button onClick={onBackToList}>Quay lại danh sách</Button>
        </div>
      </div>
    );
  }

  const accuracy = record.accuracy ?? (feedbackItems.length > 0 ? Math.round((passItems.length / feedbackItems.length) * 100) : 0);
  const accuracyColor = accuracy >= 80 ? '#2ed573' : accuracy >= 60 ? '#f5a623' : '#f05252';

  return (
    <div className="exam-history-detail" style={{ maxWidth: 880, margin: '0 auto', padding: '8px 0 60px' }}>
      {/* Top Bar Navigation */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={onBackToList}
          style={{
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          Quay lại danh sách lịch sử
        </Button>

        <Tag
          icon={<CalendarOutlined />}
          style={{
            borderRadius: 10,
            padding: '4px 12px',
            fontSize: '0.85rem',
            background: 'rgba(255, 255, 255, 0.06)',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            color: '#c5cae9',
          }}
        >
          {record.formattedDate || new Date(record.timestamp).toLocaleString('vi-VN')}
        </Tag>
      </Flex>

      {/* Overview Banner */}
      <Card
        style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(22, 20, 42, 0.98) 100%)',
          border: '1px solid rgba(124, 106, 247, 0.35)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          marginBottom: 24,
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <Row gutter={[20, 20]} align="middle">
          <Col xs={24} md={14}>
            <Flex vertical gap={6}>
              <Title level={3} style={{ margin: 0, color: '#ffffff', fontWeight: 700 }}>
                {record.title || 'Chi Tiết Bài Thi & Nhận Xét AI'}
              </Title>
              <Paragraph style={{ margin: 0, color: '#9fa8c7', fontSize: '0.88rem' }}>
                Hệ thống lưu trữ 4 phần ngữ cảnh khép kín: Đề bài gốc, câu trả lời, nhận xét AI và mẫu Band 8.5+.
              </Paragraph>
            </Flex>
          </Col>

          <Col xs={24} md={10}>
            <Row gutter={[12, 12]}>
              <Col span={8}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: `${accuracyColor}15`,
                    border: `1px solid ${accuracyColor}40`,
                    textAlign: 'center',
                  }}
                >
                  <Statistic
                    title={<span style={{ color: accuracyColor, fontSize: '0.75rem' }}>Độ chính xác</span>}
                    value={accuracy}
                    suffix="%"
                    styles={{ content: { color: accuracyColor, fontWeight: 700, fontSize: '1.25rem' } }}
                  />
                </div>
              </Col>

              <Col span={8}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(46, 213, 115, 0.1)',
                    border: '1px solid rgba(46, 213, 115, 0.3)',
                    textAlign: 'center',
                  }}
                >
                  <Statistic
                    title={<span style={{ color: '#2ed573', fontSize: '0.75rem' }}>Đạt (Pass)</span>}
                    value={record.passCount ?? passItems.length}
                    suffix={`/${record.totalQuestions ?? feedbackItems.length}`}
                    styles={{ content: { color: '#2ed573', fontWeight: 700, fontSize: '1.25rem' } }}
                  />
                </div>
              </Col>

              <Col span={8}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(124, 106, 247, 0.1)',
                    border: '1px solid rgba(124, 106, 247, 0.3)',
                    textAlign: 'center',
                  }}
                >
                  <Statistic
                    title={<span style={{ color: '#a89af5', fontSize: '0.75rem' }}>IELTS Band</span>}
                    value={record.estimatedBand || '7.0'}
                    prefix={<TrophyOutlined style={{ color: '#f5a623', fontSize: '0.9rem' }} />}
                    styles={{ content: { color: '#a89af5', fontWeight: 700, fontSize: '1.25rem' } }}
                  />
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Filter and Content Header */}
      <Card
        style={{
          borderRadius: 20,
          background: 'rgba(22, 20, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <Flex vertical gap={20}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            <div>
              <Title level={4} style={{ margin: 0, color: '#ffffff', fontWeight: 700 }}>
                Thẻ Ngữ Cảnh 4 Phần Khép Kín ({filteredItems.length})
              </Title>
              <Text type="secondary" style={{ fontSize: '0.82rem' }}>
                Đối chiếu câu trả lời với tiêu chuẩn ngôn ngữ học thuật Band 8.5+
              </Text>
            </div>

            <Segmented
              value={filterMode}
              onChange={setFilterMode}
              options={[
                { label: `Tất cả (${feedbackItems.length})`, value: 'all' },
                { label: `Cần cải thiện (${failItems.length})`, value: 'fail' },
                { label: `Đạt chuẩn (${passItems.length})`, value: 'pass' },
              ]}
              style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: 10 }}
            />
          </Flex>

          {/* Cards List */}
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: '#9fa8c7' }}>
              Không có câu hỏi nào trong danh mục lọc này.
            </div>
          ) : (
            <Flex vertical gap={18}>
              {filteredItems.map((item, idx) => {
                const isPass = Boolean(item.isPass);
                const score = item.score !== undefined ? item.score : (isPass ? 10 : 0);

                return (
                  <div
                    key={item.wordId ? `${item.wordId}_${idx}` : idx}
                    style={{
                      borderRadius: 16,
                      background: isPass ? 'rgba(46, 213, 115, 0.035)' : 'rgba(240, 82, 82, 0.035)',
                      border: isPass ? '1px solid rgba(46, 213, 115, 0.25)' : '1px solid rgba(240, 82, 82, 0.25)',
                      padding: '20px 22px',
                    }}
                  >
                    <Flex vertical gap={14}>
                      {/* PHẦN 1: TỪ VỰNG MỤC TIÊU & STATUS */}
                      <Flex justify="space-between" align="center" wrap="wrap" gap={10}>
                        <Space size={10} wrap>
                          <Text
                            strong
                            style={{
                              color: '#7c6af7',
                              fontSize: '1.2rem',
                              letterSpacing: '0.3px',
                            }}
                          >
                            {item.targetWord}
                          </Text>

                          {item.wordVi && (
                            <Text style={{ color: '#c5cae9', fontSize: '0.92rem' }}>
                              ({item.wordVi})
                            </Text>
                          )}

                          {item.typeName && (
                            <Tag color="purple" style={{ borderRadius: 8, fontSize: '0.78rem' }}>
                              {item.typeName}
                            </Tag>
                          )}
                        </Space>

                        <Tag
                          color={isPass ? 'success' : 'error'}
                          style={{
                            borderRadius: 10,
                            padding: '3px 12px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }}
                        >
                          {isPass ? (
                            <>
                              <CheckCircleOutlined style={{ marginRight: 4 }} />
                              ĐẠT BAND 7+ ({score}/10)
                            </>
                          ) : (
                            <>
                              <CloseCircleOutlined style={{ marginRight: 4 }} />
                              CẦN HỌC LẠI ({score}/10)
                            </>
                          )}
                        </Tag>
                      </Flex>

                      {/* PHẦN 2: ĐỀ BÀI NGỮ CẢNH GỐC */}
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 2 }}>
                          📝 Đề bài ngữ cảnh gốc:
                        </Text>
                        <Text style={{ color: '#e8eaf6', fontSize: '0.95rem', lineHeight: 1.5 }}>
                          {item.contextPrompt}
                        </Text>
                      </div>

                      {/* PHẦN 3: CÂU TRẢ LỜI THỰC TẾ CỦA BẠN */}
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: isPass ? 'rgba(46, 213, 115, 0.05)' : 'rgba(240, 82, 82, 0.05)',
                          border: isPass ? '1px solid rgba(46, 213, 115, 0.15)' : '1px solid rgba(240, 82, 82, 0.15)',
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 2 }}>
                          👤 Câu trả lời thực tế của bạn:
                        </Text>
                        <Text
                          strong
                          style={{
                            color: isPass ? '#2ed573' : '#f05252',
                            fontSize: '0.95rem',
                            lineHeight: 1.5,
                          }}
                        >
                          {item.userAnswer || '(Không có câu trả lời)'}
                        </Text>
                      </div>

                      {/* PHẦN 4: NHẬN XÉT CỦA AI & CÂU MẪU BAND 8.5+ */}
                      <div
                        style={{
                          padding: '14px 16px',
                          borderRadius: 12,
                          background: 'rgba(15, 17, 23, 0.75)',
                          border: '1px solid rgba(124, 106, 247, 0.25)',
                        }}
                      >
                        <Flex vertical gap={10}>
                          {/* AI Feedback */}
                          {item.aiFeedback && (
                            <Flex align="start" gap={10}>
                              <RobotOutlined style={{ color: '#7c6af7', fontSize: '1.1rem', marginTop: 2 }} />
                              <div style={{ flex: 1 }}>
                                <Text strong style={{ color: '#a89af5', fontSize: '0.86rem', display: 'block', marginBottom: 2 }}>
                                  Nhận xét của Giám khảo AI:
                                </Text>
                                <Text style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                  {item.aiFeedback}
                                </Text>
                              </div>
                            </Flex>
                          )}

                          {/* Band 8.5+ Alternative / Reference sentence */}
                          {item.betterAlternative && (
                            <div
                              style={{
                                marginTop: 4,
                                padding: '10px 14px',
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, rgba(124, 106, 247, 0.12) 0%, rgba(91, 82, 224, 0.06) 100%)',
                                border: '1px solid rgba(124, 106, 247, 0.35)',
                              }}
                            >
                              <Flex align="start" gap={8}>
                                <BulbOutlined style={{ color: '#f5a623', fontSize: '1rem', marginTop: 2 }} />
                                <div>
                                  <Text strong style={{ color: '#f5a623', fontSize: '0.82rem', display: 'block', marginBottom: 2 }}>
                                    ✨ Câu mẫu chuẩn học thuật đối chiếu (Band 8.5+):
                                  </Text>
                                  <Text style={{ color: '#ffffff', fontSize: '0.92rem', fontWeight: 500, lineHeight: 1.5 }}>
                                    {item.betterAlternative}
                                  </Text>
                                </div>
                              </Flex>
                            </div>
                          )}
                        </Flex>
                      </div>
                    </Flex>
                  </div>
                );
              })}
            </Flex>
          )}
        </Flex>
      </Card>
    </div>
  );
}
