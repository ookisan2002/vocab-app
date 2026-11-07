import { useState, useMemo } from 'react';
import {
  Card,
  Flex,
  Typography,
  Radio,
  Select,
  Checkbox,
  Button,
  Space,
  Tag,
  Alert,
  Switch,
  Divider,
  message,
} from 'antd';
import {
  RocketOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  InfoCircleOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useStore } from '../../store/useStore';

const { Title, Text, Paragraph } = Typography;

export default function ExamSetup({ onStartExam, onBackToStudy }) {
  const getAllWords = useStore(s => s.getAllWords);
  const progress = useStore(s => s.progress);
  const examSettings = useStore(s => s.examSettings);
  const setExamSettings = useStore(s => s.setExamSettings);
  const geminiApiKey = useStore(s => s.geminiApiKey);

  const [includeLearningWords, setIncludeLearningWords] = useState(false);
  const [manualSearch, setManualSearch] = useState('');

  const allWords = useMemo(() => getAllWords(), [getAllWords]);

  // Unique topics
  const topics = useMemo(() => {
    const set = new Set();
    allWords.forEach(w => {
      if (w.topic) set.add(w.topic);
    });
    return Array.from(set).sort();
  }, [allWords]);

  // Mastered & tested words
  const masteredWords = useMemo(() => {
    return allWords.filter(w => {
      const st = progress[w.id]?.status;
      return st === 'mastered' || st === 'tested';
    });
  }, [allWords, progress]);

  // Learning words
  const learningWords = useMemo(() => {
    return allWords.filter(w => {
      const st = progress[w.id]?.status;
      return st === 'learning';
    });
  }, [allWords, progress]);

  // Pool of words based on topic and includeLearningWords
  const eligiblePool = useMemo(() => {
    let pool = [];
    const useLearningFallback = masteredWords.length === 0 || includeLearningWords;

    if (useLearningFallback) {
      pool = allWords.filter(w => {
        const st = progress[w.id]?.status;
        return st === 'mastered' || st === 'tested' || st === 'learning';
      });
      if (pool.length === 0) {
        pool = allWords; // fallback to all words if brand new user
      }
    } else {
      pool = masteredWords;
    }

    if (examSettings.topicFilter && examSettings.topicFilter !== 'all') {
      pool = pool.filter(w => w.topic === examSettings.topicFilter);
    }
    return pool;
  }, [allWords, masteredWords, includeLearningWords, progress, examSettings.topicFilter]);

  // Update setting helper
  const updateSetting = (key, val) => {
    setExamSettings({ [key]: val });
  };

  // Filtered manual selection words
  const manualCandidates = useMemo(() => {
    if (!manualSearch) return eligiblePool;
    const q = manualSearch.toLowerCase().trim();
    return eligiblePool.filter(w =>
      w.word.toLowerCase().includes(q) ||
      (w.vi && w.vi.toLowerCase().includes(q))
    );
  }, [eligiblePool, manualSearch]);

  const handleStart = () => {
    if (!examSettings.enabledTypes || examSettings.enabledTypes.length === 0) {
      message.warning('Vui lòng chọn ít nhất một dạng câu hỏi.');
      return;
    }

    let finalWords = [];

    if (examSettings.selectionMode === 'manual') {
      const selectedSet = new Set(examSettings.manualWordIds || []);
      finalWords = eligiblePool.filter(w => selectedSet.has(w.id));
      if (finalWords.length === 0) {
        message.warning('Vui lòng chọn ít nhất một từ vựng từ danh sách thủ công.');
        return;
      }
    } else if (examSettings.selectionMode === 'due_or_oldest') {
      const sorted = [...eligiblePool].sort((a, b) => {
        const timeA = progress[a.id]?.lastReviewedAt || 0;
        const timeB = progress[b.id]?.lastReviewedAt || 0;
        return timeA - timeB; // oldest first
      });
      finalWords = sorted.slice(0, examSettings.wordCount || 10);
    } else {
      // Random
      const shuffled = [...eligiblePool].sort(() => Math.random() - 0.5);
      finalWords = shuffled.slice(0, examSettings.wordCount || 10);
    }

    if (finalWords.length === 0) {
      message.error('Không tìm thấy từ vựng phù hợp với bộ lọc hiện tại.');
      return;
    }

    onStartExam(finalWords, examSettings.enabledTypes);
  };

  return (
    <div className="exam-setup-container" style={{ maxWidth: 840, margin: '0 auto', padding: '16px 8px 40px' }}>
      {/* Top Bar with back button */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={onBackToStudy}
          style={{ borderRadius: 10, background: 'rgba(255, 255, 255, 0.05)' }}
        >
          Quay lại học từ vựng
        </Button>
        <Space size={8}>
          <Tag color="purple" style={{ borderRadius: 12, padding: '4px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
            IELTS Exam Arena
          </Tag>
          {geminiApiKey ? (
            <Tag color="success" style={{ borderRadius: 12, padding: '4px 10px', fontSize: '0.8rem' }}>
              Gemini AI Sẵn sàng
            </Tag>
          ) : (
            <Tag color="warning" style={{ borderRadius: 12, padding: '4px 10px', fontSize: '0.8rem' }}>
              Chế độ Ngoại tuyến (Offline AI)
            </Tag>
          )}
        </Space>
      </Flex>

      {/* Hero Title */}
      <Card
        style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.85) 0%, rgba(22, 20, 42, 0.95) 100%)',
          border: '1px solid rgba(124, 106, 247, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          marginBottom: 24,
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <Flex align="center" gap={16} wrap="wrap">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #7c6af7 0%, #5b52e0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              boxShadow: '0 4px 16px rgba(124, 106, 247, 0.4)',
            }}
          >
            📝
          </div>
          <Flex vertical style={{ flex: 1, minWidth: 240 }}>
            <Title level={3} style={{ margin: 0, color: '#ffffff', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Phòng Kiểm Tra Năng Lực AI
            </Title>
            <Paragraph style={{ margin: '4px 0 0', color: '#9fa8c7', fontSize: '0.92rem' }}>
              Kiểm tra khả năng vận dụng thực tế các từ vựng đã học với 3 dạng đề học thuật IELTS: Điền từ, Sắp xếp câu, và Dịch câu nâng cao.
            </Paragraph>
          </Flex>
        </Flex>
      </Card>

      {/* Notice if no mastered words */}
      {masteredWords.length === 0 && (
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined style={{ color: '#7c6af7', fontSize: '1.2rem' }} />}
          style={{
            marginBottom: 24,
            borderRadius: 14,
            background: 'rgba(124, 106, 247, 0.12)',
            border: '1px solid rgba(124, 106, 247, 0.25)',
          }}
          title={
            <Text strong style={{ color: '#ffffff' }}>
              Bạn chưa có từ vựng nào đạt trạng thái &quot;Đã thuộc&quot;
            </Text>
          }
          description={
            <Flex vertical gap={6} style={{ marginTop: 4 }}>
              <Text style={{ color: '#c5cae9', fontSize: '0.88rem' }}>
                Hệ thống mặc định ưu tiên kiểm tra các từ bạn đã thuộc kỹ. Tuy nhiên, bạn hoàn toàn có thể thi thử ngay với danh sách từ vựng hiện có để làm quen với phòng thi!
              </Text>
            </Flex>
          }
        />
      )}

      {/* Configuration Form Card */}
      <Card
        style={{
          borderRadius: 20,
          background: 'rgba(22, 20, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <Flex vertical gap={24}>
          {/* Section: Word Count */}
          <Flex vertical gap={8}>
            <Flex justify="space-between" align="center">
              <Space size={8}>
                <BookOutlined style={{ color: '#7c6af7' }} />
                <Text strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>
                  Số lượng câu hỏi / từ vựng:
                </Text>
              </Space>
              <Text type="secondary" style={{ fontSize: '0.82rem' }}>
                Khả dụng trong kho: <strong style={{ color: '#2ed573' }}>{eligiblePool.length}</strong> từ
              </Text>
            </Flex>
            <Radio.Group
              value={examSettings.wordCount || 10}
              onChange={e => updateSetting('wordCount', e.target.value)}
              buttonStyle="solid"
              style={{ width: '100%' }}
            >
              <Flex gap={10} wrap="wrap">
                {[5, 10, 15, 20].map(cnt => (
                  <Radio.Button
                    key={cnt}
                    value={cnt}
                    style={{
                      flex: 1,
                      minWidth: 70,
                      textAlign: 'center',
                      borderRadius: 10,
                      height: 40,
                      lineHeight: '38px',
                      fontWeight: 600,
                    }}
                  >
                    {cnt} từ
                  </Radio.Button>
                ))}
              </Flex>
            </Radio.Group>
          </Flex>

          <Divider style={{ margin: '4px 0', borderColor: 'rgba(255, 255, 255, 0.06)' }} />

          {/* Section: Selection Mode */}
          <Flex vertical gap={10}>
            <Space size={8}>
              <SettingOutlined style={{ color: '#f5a623' }} />
              <Text strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>
                Phương thức chọn từ vựng:
              </Text>
            </Space>
            <Radio.Group
              value={examSettings.selectionMode || 'random'}
              onChange={e => updateSetting('selectionMode', e.target.value)}
              style={{ width: '100%' }}
            >
              <Flex vertical gap={10}>
                <Radio value="random" style={{ color: '#e8eaf6' }}>
                  <Space vertical align="start" size={2}>
                    <Text strong style={{ color: '#e8eaf6' }}>Ngẫu nhiên (Khuyên dùng)</Text>
                    <Text type="secondary" style={{ fontSize: '0.82rem' }}>
                      Bốc ngẫu nhiên các từ vựng đủ điều kiện để kiểm tra phản xạ toàn diện.
                    </Text>
                  </Space>
                </Radio>
                <Radio value="due_or_oldest" style={{ color: '#e8eaf6' }}>
                  <Space vertical align="start" size={2}>
                    <Text strong style={{ color: '#e8eaf6' }}>Theo hạn kiểm tra / Học lâu nhất</Text>
                    <Text type="secondary" style={{ fontSize: '0.82rem' }}>
                      Ưu tiên những từ học từ lâu hoặc đã đến hạn ôn tập định kỳ 14 ngày.
                    </Text>
                  </Space>
                </Radio>
                <Radio value="manual" style={{ color: '#e8eaf6' }}>
                  <Space vertical align="start" size={2}>
                    <Text strong style={{ color: '#e8eaf6' }}>Tự chọn thủ công</Text>
                    <Text type="secondary" style={{ fontSize: '0.82rem' }}>
                      Tự tích chọn danh sách các từ vựng cụ thể mà bạn muốn AI ra đề kiểm tra.
                    </Text>
                  </Space>
                </Radio>
              </Flex>
            </Radio.Group>

            {/* Manual Selection Interface */}
            {examSettings.selectionMode === 'manual' && (
              <Card
                size="small"
                style={{
                  marginTop: 10,
                  borderRadius: 14,
                  background: 'rgba(15, 17, 23, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                styles={{ body: { padding: 14 } }}
              >
                <Flex vertical gap={10}>
                  <Flex justify="space-between" align="center">
                    <Text strong style={{ color: '#c5cae9', fontSize: '0.85rem' }}>
                      Đã chọn: <span style={{ color: '#7c6af7' }}>{(examSettings.manualWordIds || []).length}</span> từ
                    </Text>
                    <Space size={8}>
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          const ids = manualCandidates.slice(0, examSettings.wordCount || 10).map(w => w.id);
                          updateSetting('manualWordIds', ids);
                        }}
                      >
                        Chọn nhanh {examSettings.wordCount || 10} từ đầu
                      </Button>
                      <Button
                        size="small"
                        type="link"
                        danger
                        onClick={() => updateSetting('manualWordIds', [])}
                      >
                        Bỏ chọn hết
                      </Button>
                    </Space>
                  </Flex>

                  <Select
                    mode="multiple"
                    allowClear
                    placeholder="Tìm kiếm và chọn từ vựng..."
                    style={{ width: '100%' }}
                    value={examSettings.manualWordIds || []}
                    onChange={val => updateSetting('manualWordIds', val)}
                    onSearch={v => setManualSearch(v)}
                    filterOption={false}
                    maxTagCount={6}
                    options={manualCandidates.map(w => ({
                      label: `${w.word} — ${w.vi}`,
                      value: w.id,
                    }))}
                  />
                </Flex>
              </Card>
            )}
          </Flex>

          <Divider style={{ margin: '4px 0', borderColor: 'rgba(255, 255, 255, 0.06)' }} />

          {/* Section: Question Types */}
          <Flex vertical gap={10}>
            <Space size={8}>
              <AppstoreOutlined style={{ color: '#2ed573' }} />
              <Text strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>
                Dạng bài kiểm tra kích hoạt:
              </Text>
            </Space>
            <Checkbox.Group
              value={examSettings.enabledTypes || ['fill_blank', 'reorder', 'translate']}
              onChange={vals => updateSetting('enabledTypes', vals)}
              style={{ width: '100%' }}
            >
              <Flex vertical gap={8}>
                <Checkbox value="fill_blank" style={{ color: '#e8eaf6' }}>
                  <Text style={{ color: '#e8eaf6' }}>
                    <strong>Điền từ vào chỗ trống:</strong> Chọn từ thích hợp vào câu ngữ cảnh học thuật IELTS Band 7.5+.
                  </Text>
                </Checkbox>
                <Checkbox value="reorder" style={{ color: '#e8eaf6' }}>
                  <Text style={{ color: '#e8eaf6' }}>
                    <strong>Sắp xếp câu:</strong> Ghép các thẻ từ xáo trộn để tạo thành câu hoàn chỉnh chứa từ mục tiêu.
                  </Text>
                </Checkbox>
                <Checkbox value="translate" style={{ color: '#e8eaf6' }}>
                  <Text style={{ color: '#e8eaf6' }}>
                    <strong>Dịch câu Việt -&gt; Anh:</strong> Thử thách dịch câu học thuật, được AI chấm điểm chi tiết (1-10) và gợi ý câu Band 8.5+.
                  </Text>
                </Checkbox>
              </Flex>
            </Checkbox.Group>
          </Flex>

          <Divider style={{ margin: '4px 0', borderColor: 'rgba(255, 255, 255, 0.06)' }} />

          {/* Section: Topic & Timer Filters */}
          <Flex gap={16} wrap="wrap">
            <Flex vertical gap={8} style={{ flex: 1, minWidth: 240 }}>
              <Text strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>
                Chủ đề từ vựng:
              </Text>
              <Select
                value={examSettings.topicFilter || 'all'}
                onChange={val => updateSetting('topicFilter', val)}
                style={{ width: '100%', borderRadius: 10 }}
                options={[
                  { label: 'Tất cả chủ đề', value: 'all' },
                  ...topics.map(t => ({ label: `Chủ đề: ${t}`, value: t })),
                ]}
              />
            </Flex>

            <Flex vertical gap={8} style={{ flex: 1, minWidth: 240 }}>
              <Space size={6}>
                <ClockCircleOutlined style={{ color: '#a89af5' }} />
                <Text strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>
                  Chế độ thời gian:
                </Text>
              </Space>
              <Radio.Group
                value={examSettings.timerMode || 'none'}
                onChange={e => updateSetting('timerMode', e.target.value)}
                buttonStyle="solid"
                style={{ width: '100%' }}
              >
                <Flex gap={8}>
                  <Radio.Button value="none" style={{ flex: 1, textAlign: 'center', borderRadius: 10 }}>
                    Tự do
                  </Radio.Button>
                  <Radio.Button value="countdown" style={{ flex: 1, textAlign: 'center', borderRadius: 10 }}>
                    Đếm ngược (1.5p/câu)
                  </Radio.Button>
                </Flex>
              </Radio.Group>
            </Flex>
          </Flex>

          {/* Toggle include learning words if mastered words exists */}
          {masteredWords.length > 0 && (
            <Flex
              justify="space-between"
              align="center"
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <Flex vertical gap={2}>
                <Text strong style={{ color: '#e8eaf6', fontSize: '0.88rem' }}>
                  Cho phép thi thử với cả từ &quot;Đang học&quot;
                </Text>
                <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                  Hiện có {masteredWords.length} từ đã thuộc và {learningWords.length} từ đang học.
                </Text>
              </Flex>
              <Switch
                checked={includeLearningWords}
                onChange={setIncludeLearningWords}
              />
            </Flex>
          )}

          {/* Start Exam Button */}
          <Button
            type="primary"
            size="large"
            icon={<RocketOutlined style={{ fontSize: '1.2rem' }} />}
            onClick={handleStart}
            style={{
              height: 52,
              borderRadius: 14,
              fontSize: '1.05rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #7c6af7 0%, #5b52e0 100%)',
              border: 'none',
              boxShadow: '0 6px 20px rgba(124, 106, 247, 0.45)',
              marginTop: 10,
            }}
          >
            Bắt đầu làm bài thi ({examSettings.selectionMode === 'manual' ? (examSettings.manualWordIds || []).length : (examSettings.wordCount || 10)} câu)
          </Button>
        </Flex>
      </Card>
    </div>
  );
}
