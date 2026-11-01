import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Input,
  Select,
  Table,
  Tag,
  Button,
  Space,
  Popconfirm,
  Tooltip,
  Typography,
  Flex,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { formatTimeRemaining, formatTimeAgo } from '../utils/srs';
import EditWordModal from './EditWordModal';

export default function VocabListModal({ onClose, onStudyWord, onEditWord }) {
  const getAllWords = useStore(s => s.getAllWords);
  const progress = useStore(s => s.progress);
  const editedWords = useStore(s => s.editedWords);
  const deletedWordIds = useStore(s => s.deletedWordIds);
  const deleteWord = useStore(s => s.deleteWord);
  const restoreAllDefaults = useStore(s => s.restoreAllDefaults);
  const globalTopicFilter = useStore(s => s.topicFilter);

  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(globalTopicFilter || 'all');
  const [now, setNow] = useState(() => Date.now());
  const [localEditingWord, setLocalEditingWord] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const allWords = getAllWords();

  // Extract unique topics for filter select
  const topicOptions = useMemo(() => {
    const uniqueTopics = Array.from(new Set(allWords.map(w => w.topic).filter(Boolean)));
    return [
      { value: 'all', label: 'Tất cả chủ đề' },
      ...uniqueTopics.map(t => ({ value: t, label: t })),
    ];
  }, [allWords]);

  const filteredWords = useMemo(() => {
    return allWords.filter(w => {
      const topicOk = selectedTopic === 'all' || w.topic === selectedTopic;
      const q = search.trim().toLowerCase();
      const searchOk =
        !q ||
        w.word.toLowerCase().includes(q) ||
        (w.vi && w.vi.toLowerCase().includes(q));
      return topicOk && searchOk;
    });
  }, [allWords, selectedTopic, search]);

  const hasModifications =
    (Array.isArray(deletedWordIds) && deletedWordIds.length > 0) ||
    (editedWords && Object.keys(editedWords).length > 0);

  const handleEdit = (w) => {
    if (onEditWord) {
      onEditWord(w);
    } else {
      setLocalEditingWord(w);
    }
  };

  const columns = [
    {
      title: 'Từ vựng & Định nghĩa',
      key: 'wordInfo',
      render: (_, record) => {
        const isEdited = !!editedWords?.[record.id];
        return (
          <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            <Flex align="center" gap={8} wrap="wrap">
              <Typography.Text strong style={{ fontSize: '1rem', color: '#e2e8f0' }}>
                {record.word}
              </Typography.Text>
              {record.topic && <Tag color="blue">{record.topic}</Tag>}
              {isEdited && <Tag color="gold">Đã sửa</Tag>}
            </Flex>

            <Typography.Text style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              {record.vi}
            </Typography.Text>

            {record.en && (
              <Typography.Text type="secondary" italic style={{ fontSize: '0.82rem' }}>
                {record.en}
              </Typography.Text>
            )}

            {record.example && (
              <div
                style={{
                  marginTop: 4,
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 6,
                  borderLeft: '3px solid #7c6af7',
                  fontSize: '0.84rem',
                }}
              >
                <div>💬 "{record.example}"</div>
                {record.exampleVi && (
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 2 }}>
                    ↳ {record.exampleVi}
                  </div>
                )}
              </div>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Tiến độ SRS',
      key: 'srsStatus',
      width: 210,
      render: (_, record) => {
        const ws = progress[record.id];
        const timeAgo = ws?.lastReviewedAt ? formatTimeAgo(ws.lastReviewedAt) : null;
        const timeUntilReview = ws?.nextReviewAt ? ws.nextReviewAt - now : null;

        let statusTag = <Tag color="default">Chưa xem</Tag>;
        if (ws?.status === 'learning') {
          statusTag = <Tag color="processing">⏳ Chờ hỏi ({ws.correctStreak || 0}/2)</Tag>;
        } else if (ws?.status === 'mastered') {
          statusTag = <Tag color="success">✅ Đã thuộc (Bậc {ws.srsStage || 1})</Tag>;
        }

        return (
          <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            <div>{statusTag}</div>
            {timeAgo && (
              <Typography.Text type="secondary" style={{ fontSize: '0.78rem', display: 'block' }}>
                Đã học: {timeAgo}
              </Typography.Text>
            )}
            {timeUntilReview !== null && ws?.status === 'mastered' && (
              <div>
                {timeUntilReview > 0 ? (
                  <Tag color="purple" style={{ margin: 0, fontSize: '0.75rem' }}>
                    Ôn lại sau {formatTimeRemaining(timeUntilReview)}
                  </Tag>
                ) : (
                  <Tag color="error" style={{ margin: 0, fontSize: '0.75rem' }}>
                    ⚡ Cần ôn ngay!
                  </Tag>
                )}
              </div>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 170,
      align: 'right',
      render: (_, record) => (
        <Space size={6} wrap>
          <Tooltip title="Chuyển đến học hoặc hỏi từ này ngay lập tức">
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => {
                onStudyWord(record);
                onClose();
              }}
            >
              Học ngay
            </Button>
          </Tooltip>
          <Tooltip title={`Chỉnh sửa từ "${record.word}"`}>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              Sửa
            </Button>
          </Tooltip>
          <Popconfirm
            title={`Xóa từ "${record.word}"?`}
            description="Bạn có chắc chắn muốn xóa từ vựng này khỏi danh sách?"
            onConfirm={() => deleteWord(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa từ khỏi danh sách">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        open={true}
        onCancel={onClose}
        footer={null}
        width={960}
        style={{ top: 24 }}
        styles={{
          body: {
            padding: '16px 24px',
            maxHeight: 'calc(88vh - 80px)',
            overflowY: 'auto',
          },
        }}
        title={
          <Flex align="center" justify="space-between" style={{ paddingRight: 24, width: '100%' }}>
            <Space align="center" size={8}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                📋 Danh sách từ vựng ({filteredWords.length})
              </Typography.Title>
            </Space>
            {hasModifications && (
              <Popconfirm
                title="Khôi phục từ gốc?"
                description="Khôi phục lại toàn bộ từ mặc định về trạng thái ban đầu? (Sẽ hoàn tác các từ mặc định đã chỉnh sửa hoặc đã xóa)"
                onConfirm={restoreAllDefaults}
                okText="Khôi phục"
                cancelText="Hủy"
              >
                <Button size="small" icon={<ReloadOutlined />} danger>
                  Khôi phục từ gốc
                </Button>
              </Popconfirm>
            )}
          </Flex>
        }
      >
        <Space orientation="vertical" size={14} style={{ width: '100%' }}>
          {/* Filter Bar */}
          <Flex gap={12} wrap="wrap">
            <Input.Search
              placeholder="Tìm theo từ tiếng Anh hoặc nghĩa tiếng Việt..."
              allowClear
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 220 }}
              prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
            />
            <Select
              value={selectedTopic}
              onChange={val => setSelectedTopic(val)}
              options={topicOptions}
              style={{ width: 220 }}
              suffixIcon={<FilterOutlined />}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Flex>

          {/* Table */}
          <Table
            dataSource={filteredWords}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 8,
              showSizeChanger: true,
              pageSizeOptions: ['8', '15', '30', '50'],
              showTotal: total => `Tổng ${total} từ`,
              size: 'small',
            }}
            scroll={{ x: 680 }}
            locale={{
              emptyText: 'Không tìm thấy từ vựng nào phù hợp.',
            }}
          />
        </Space>
      </Modal>

      {localEditingWord && (
        <EditWordModal
          word={localEditingWord}
          isOpen={!!localEditingWord}
          onClose={() => setLocalEditingWord(null)}
        />
      )}
    </>
  );
}
