import { useMemo } from 'react';
import { Card, Flex, Select, Segmented, Typography, Space } from 'antd';
import {
  AppstoreOutlined,
  FieldTimeOutlined,
  BranchesOutlined,
  EyeOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { SRS_MODES, INTERLEAVE_MODES } from '../utils/srs';

const { Text } = Typography;

export default function FilterBar() {
  const getAllWords = useStore(s => s.getAllWords);
  const topicFilter = useStore(s => s.topicFilter);
  const setTopicFilter = useStore(s => s.setTopicFilter);
  const srsMode = useStore(s => s.srsMode);
  const setSrsMode = useStore(s => s.setSrsMode);
  const interleaveMode = useStore(s => s.interleaveMode);
  const setInterleaveMode = useStore(s => s.setInterleaveMode);
  const showMeaningFirst = useStore(s => s.showMeaningFirst);
  const setShowMeaningFirst = useStore(s => s.setShowMeaningFirst);

  const topics = useMemo(() => {
    const all = getAllWords().map(w => w.topic);
    return ['all', ...new Set(all)];
  }, [getAllWords]);

  const topicOptions = useMemo(() => {
    return topics.map(t => ({
      value: t,
      label: t === 'all' ? '🌐 Tất cả chủ đề' : t,
    }));
  }, [topics]);

  const srsOptions = useMemo(() => {
    return Object.entries(SRS_MODES).map(([key, val]) => ({
      value: key,
      label: val.label,
    }));
  }, []);

  const interleaveOptions = useMemo(() => {
    return Object.entries(INTERLEAVE_MODES).map(([key, val]) => ({
      value: key,
      label: val.label,
    }));
  }, []);

  return (
    <Card
      size="small"
      style={{
        borderRadius: 12,
        background: 'rgba(22, 20, 42, 0.95)',
        border: '1px solid rgba(124, 106, 247, 0.25)',
      }}
      styles={{ body: { padding: '16px' } }}
    >
      <Flex wrap="wrap" gap={16} align="flex-end">
        {/* Chủ đề */}
        <Flex vertical gap={6} style={{ minWidth: 160, flex: 1 }}>
          <Space size={4}>
            <AppstoreOutlined style={{ color: '#7c6af7', fontSize: '0.85rem' }} />
            <Text
              style={{
                fontSize: '0.75rem',
                color: '#9fa8c7',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Chủ đề
            </Text>
          </Space>
          <Select
            value={topicFilter}
            onChange={val => setTopicFilter(val)}
            options={topicOptions}
            style={{ width: '100%' }}
            size="middle"
          />
        </Flex>

        {/* Chu kỳ ôn SRS */}
        <Flex vertical gap={6} style={{ minWidth: 160, flex: 1 }}>
          <Space size={4}>
            <FieldTimeOutlined style={{ color: '#f5a623', fontSize: '0.85rem' }} />
            <Text
              style={{
                fontSize: '0.75rem',
                color: '#9fa8c7',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Chu kỳ ôn
            </Text>
          </Space>
          <Select
            value={srsMode}
            onChange={val => setSrsMode(val)}
            options={srsOptions}
            style={{ width: '100%' }}
            size="middle"
          />
        </Flex>

        {/* Tần suất hỏi */}
        <Flex vertical gap={6} style={{ minWidth: 160, flex: 1 }}>
          <Space size={4}>
            <BranchesOutlined style={{ color: '#2ed573', fontSize: '0.85rem' }} />
            <Text
              style={{
                fontSize: '0.75rem',
                color: '#9fa8c7',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Tần suất hỏi
            </Text>
          </Space>
          <Select
            value={interleaveMode}
            onChange={val => setInterleaveMode(val)}
            options={interleaveOptions}
            style={{ width: '100%' }}
            size="middle"
          />
        </Flex>

        {/* Chế độ Thẻ học */}
        <Flex vertical gap={6} style={{ minWidth: 180, flex: 1 }}>
          <Text
            style={{
              fontSize: '0.75rem',
              color: '#9fa8c7',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Chế độ Thẻ học
          </Text>
          <Segmented
            value={showMeaningFirst}
            onChange={val => setShowMeaningFirst(val)}
            options={[
              {
                label: (
                  <Space orientation="horizontal" size={4}>
                    <EyeOutlined />
                    <span>Hiện nghĩa</span>
                  </Space>
                ),
                value: true,
              },
              {
                label: (
                  <Space orientation="horizontal" size={4}>
                    <SwapOutlined />
                    <span>Lật thẻ</span>
                  </Space>
                ),
                value: false,
              },
            ]}
            block
            size="middle"
          />
        </Flex>
      </Flex>
    </Card>
  );
}
