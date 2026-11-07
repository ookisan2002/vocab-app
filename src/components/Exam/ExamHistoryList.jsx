import { useState } from 'react';
import {
  Card,
  Flex,
  Typography,
  Button,
  Tag,
  Popconfirm,
  Pagination,
  Empty,
  Tooltip,
} from 'antd';
import {
  EyeOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
  FormOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useStore } from '../../store/useStore';

const { Title, Text, Paragraph } = Typography;

export default function ExamHistoryList({ onSelectRecord, onNewExam }) {
  const examHistory = useStore(s => s.examHistory || []);
  const deleteExamHistoryRecord = useStore(s => s.deleteExamHistoryRecord);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const total = examHistory.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRecords = examHistory.slice(startIndex, startIndex + pageSize);

  // If user deleted all items on current page and page is now empty
  if (currentPage > 1 && paginatedRecords.length === 0) {
    setCurrentPage(currentPage - 1);
  }

  return (
    <div className="exam-history-list" style={{ maxWidth: 880, margin: '0 auto', padding: '8px 0 40px' }}>
      {/* Top Header */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#ffffff', fontWeight: 700 }}>
            <ClockCircleOutlined style={{ color: '#7c6af7', marginRight: 8 }} />
            Lịch Sử Bài Thi &amp; Phản Hồi AI
          </Title>
          <Paragraph style={{ margin: '4px 0 0', color: '#9fa8c7', fontSize: '0.85rem' }}>
            Xem lại chi tiết từng câu hỏi, nhận xét ngữ pháp và câu mẫu Band 8.5+ từ AI (lưu trữ {total}/30 bài gần nhất).
          </Paragraph>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onNewExam}
          style={{
            borderRadius: 10,
            background: 'linear-gradient(135deg, #7c6af7 0%, #5b52e0 100%)',
            fontWeight: 600,
          }}
        >
          Làm bài kiểm tra mới
        </Button>
      </Flex>

      {/* Empty State */}
      {total === 0 ? (
        <Card
          style={{
            borderRadius: 20,
            background: 'rgba(22, 20, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center',
            padding: '48px 24px',
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Flex vertical gap={6} align="center">
                <Text strong style={{ color: '#ffffff', fontSize: '1.05rem' }}>
                  Chưa có bài kiểm tra nào trong lịch sử
                </Text>
                <Text type="secondary" style={{ maxWidth: 420, fontSize: '0.88rem' }}>
                  Sau khi hoàn thành bài thi IELTS Arena, toàn bộ câu hỏi và nhận xét chuyên sâu từ Giám khảo AI sẽ được lưu tự động tại đây.
                </Text>
              </Flex>
            }
          >
            <Button
              type="primary"
              icon={<FormOutlined />}
              onClick={onNewExam}
              size="large"
              style={{
                marginTop: 12,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #7c6af7 0%, #5b52e0 100%)',
                fontWeight: 600,
              }}
            >
              Bắt đầu bài thi ngay
            </Button>
          </Empty>
        </Card>
      ) : (
        /* List with items */
        <Flex vertical gap={16}>
          {paginatedRecords.map((record) => {
            const accuracy = record.accuracy ?? 0;
            const accuracyColor = accuracy >= 80 ? '#2ed573' : accuracy >= 60 ? '#f5a623' : '#f05252';

            return (
              <Card
                key={record.id}
                hoverable
                style={{
                  borderRadius: 16,
                  background: 'rgba(22, 20, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s ease',
                }}
                styles={{ body: { padding: '20px 24px' } }}
              >
                <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
                  {/* Left info column */}
                  <Flex vertical gap={10} style={{ flex: '1 1 320px' }}>
                    <Flex align="center" wrap="wrap" gap={10}>
                      <Text strong style={{ color: '#ffffff', fontSize: '1.05rem' }}>
                        {record.title || `Bài thi ${record.totalQuestions || 0} từ`}
                      </Text>
                      {record.topic && record.topic !== 'all' && (
                        <Tag color="cyan" style={{ borderRadius: 6, fontSize: '0.75rem' }}>
                          Chủ đề: {record.topic}
                        </Tag>
                      )}
                    </Flex>

                    {/* Stats & Badges */}
                    <Flex align="center" wrap="wrap" gap={8}>
                      <Tag
                        style={{
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          background: `${accuracyColor}1a`,
                          borderColor: `${accuracyColor}4d`,
                          color: accuracyColor,
                        }}
                      >
                        {accuracy}% Đạt
                      </Tag>

                      <Tag color="success" style={{ borderRadius: 8 }}>
                        <CheckCircleOutlined style={{ marginRight: 4 }} />
                        {record.passCount ?? 0} Pass
                      </Tag>

                      <Tag color={(record.failCount ?? 0) > 0 ? 'error' : 'default'} style={{ borderRadius: 8 }}>
                        <CloseCircleOutlined style={{ marginRight: 4 }} />
                        {record.failCount ?? 0} Cần ôn
                      </Tag>

                      {record.estimatedBand && (
                        <Tag
                          color="purple"
                          style={{
                            borderRadius: 8,
                            fontWeight: 700,
                            border: '1px solid rgba(124, 106, 247, 0.4)',
                          }}
                        >
                          <TrophyOutlined style={{ marginRight: 4, color: '#f5a623' }} />
                          Band {record.estimatedBand}
                        </Tag>
                      )}

                      <Text type="secondary" style={{ fontSize: '0.8rem', marginLeft: 4 }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {record.formattedDate || new Date(record.timestamp).toLocaleString('vi-VN')}
                      </Text>
                    </Flex>
                  </Flex>

                  {/* Right actions */}
                  <Flex align="center" gap={10}>
                    <Button
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={() => onSelectRecord(record)}
                      style={{
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #7c6af7 0%, #5b52e0 100%)',
                        fontWeight: 600,
                      }}
                    >
                      Xem chi tiết Feedback
                    </Button>

                    <Popconfirm
                      title="Xóa bài kiểm tra này?"
                      description="Bài thi này sẽ bị xóa vĩnh viễn khỏi lịch sử."
                      onConfirm={() => deleteExamHistoryRecord(record.id)}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="Xóa khỏi lịch sử">
                        <Button
                          danger
                          type="text"
                          icon={<DeleteOutlined />}
                          style={{
                            borderRadius: 10,
                            background: 'rgba(240, 82, 82, 0.08)',
                          }}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </Flex>
                </Flex>
              </Card>
            );
          })}

          {/* Pagination */}
          {total > pageSize && (
            <Flex justify="center" style={{ marginTop: 16 }}>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={total}
                onChange={setCurrentPage}
                showSizeChanger={false}
                style={{
                  background: 'rgba(22, 20, 42, 0.85)',
                  padding: '8px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              />
            </Flex>
          )}
        </Flex>
      )}
    </div>
  );
}
