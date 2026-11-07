import { useMemo } from 'react';
import { Card, Statistic, Progress, Flex, Typography, Space } from 'antd';
import {
  BookOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  AimOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';

const { Text } = Typography;

export default function Dashboard() {
  const getAllWords = useStore(s => s.getAllWords);
  const progress = useStore(s => s.progress);
  const topicFilter = useStore(s => s.topicFilter);
  const sessionCorrect = useStore(s => s.sessionCorrect);
  const sessionTotal = useStore(s => s.sessionTotal);

  const stats = useMemo(() => {
    const words = getAllWords().filter(w =>
      topicFilter === 'all' || w.topic === topicFilter
    );
    let unseen = 0, learning = 0, mastered = 0, tested = 0;
    words.forEach(w => {
      const ws = progress[w.id];
      if (!ws || ws.status === 'unseen') unseen++;
      else if (ws.status === 'learning') learning++;
      else if (ws.status === 'mastered') mastered++;
      else if (ws.status === 'tested') tested++;
    });
    const total = words.length;
    const accuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : null;
    return { unseen, learning, mastered, tested, total, accuracy };
  }, [getAllWords, progress, topicFilter, sessionCorrect, sessionTotal]);

  const masteredPct = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
  const testedPct = stats.total > 0 ? Math.round((stats.tested / stats.total) * 100) : 0;
  const learningPct = stats.total > 0 ? Math.round((stats.learning / stats.total) * 100) : 0;
  const finishedPct = Math.min(100, masteredPct + testedPct);
  const activePct = Math.min(100, stats.total > 0 ? Math.round(((stats.mastered + stats.tested + stats.learning) / stats.total) * 100) : 0);

  return (
    <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 5 Thẻ thống kê */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <Card
          size="small"
          style={{
            borderRadius: 12,
            background: 'rgba(22, 20, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
          styles={{ body: { padding: '12px 14px' } }}
        >
          <Statistic
            title={<span style={{ fontSize: '0.8rem', color: '#9fa8c7' }}>Chưa xem</span>}
            value={stats.unseen}
            prefix={<BookOutlined style={{ color: '#9fa8c7', marginRight: 6, fontSize: '1.1rem' }} />}
            styles={{ content: { fontSize: '1.5rem', fontWeight: 700, color: '#e8eaf6' } }}
          />
        </Card>

        <Card
          size="small"
          style={{
            borderRadius: 12,
            background: 'rgba(22, 20, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(245, 166, 35, 0.2)',
          }}
          styles={{ body: { padding: '12px 14px' } }}
        >
          <Statistic
            title={<span style={{ fontSize: '0.8rem', color: '#f5a623' }}>Chờ hỏi</span>}
            value={stats.learning}
            prefix={<ClockCircleOutlined style={{ color: '#f5a623', marginRight: 6, fontSize: '1.1rem' }} />}
            styles={{ content: { fontSize: '1.5rem', fontWeight: 700, color: '#f5a623' } }}
          />
        </Card>

        <Card
          size="small"
          style={{
            borderRadius: 12,
            background: 'rgba(22, 20, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(46, 213, 115, 0.2)',
          }}
          styles={{ body: { padding: '12px 14px' } }}
        >
          <Statistic
            title={<span style={{ fontSize: '0.8rem', color: '#2ed573' }}>Đã thuộc</span>}
            value={stats.mastered}
            prefix={<CheckCircleOutlined style={{ color: '#2ed573', marginRight: 6, fontSize: '1.1rem' }} />}
            styles={{ content: { fontSize: '1.5rem', fontWeight: 700, color: '#2ed573' } }}
          />
        </Card>

        <Card
          size="small"
          style={{
            borderRadius: 12,
            background: 'rgba(22, 20, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 210, 211, 0.25)',
          }}
          styles={{ body: { padding: '12px 14px' } }}
        >
          <Statistic
            title={<span style={{ fontSize: '0.8rem', color: '#00d2d3' }}>Đã kiểm tra</span>}
            value={stats.tested}
            prefix={<SafetyCertificateOutlined style={{ color: '#00d2d3', marginRight: 6, fontSize: '1.1rem' }} />}
            styles={{ content: { fontSize: '1.5rem', fontWeight: 700, color: '#00d2d3' } }}
          />
        </Card>

        <Card
          size="small"
          style={{
            borderRadius: 12,
            background: 'rgba(22, 20, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(124, 106, 247, 0.25)',
          }}
          styles={{ body: { padding: '12px 14px' } }}
        >
          <Statistic
            title={<span style={{ fontSize: '0.8rem', color: '#a89af5' }}>Nhớ đúng</span>}
            value={stats.accuracy !== null ? stats.accuracy : '—'}
            suffix={stats.accuracy !== null ? '%' : ''}
            prefix={<AimOutlined style={{ color: '#7c6af7', marginRight: 6, fontSize: '1.1rem' }} />}
            styles={{ content: { fontSize: '1.5rem', fontWeight: 700, color: '#a89af5' } }}
          />
        </Card>
      </div>

      {/* Tiến độ chi tiết */}
      <Card
        size="small"
        style={{
          borderRadius: 12,
          background: 'rgba(22, 20, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        styles={{ body: { padding: '10px 14px' } }}
      >
        <Flex vertical gap={6}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={6}>
            <Space size={8} wrap>
              <Text style={{ fontSize: '0.78rem', color: '#9fa8c7' }}>Tiến độ:</Text>
              <Text strong style={{ fontSize: '0.85rem', color: '#2ed573' }}>
                Đã thuộc: {stats.mastered} ({masteredPct}%)
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.2)' }}>•</Text>
              <Text strong style={{ fontSize: '0.85rem', color: '#00d2d3' }}>
                Đã kiểm tra: {stats.tested} ({testedPct}%)
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.2)' }}>•</Text>
              <Text strong style={{ fontSize: '0.85rem', color: '#f5a623' }}>
                Chờ hỏi: {stats.learning} ({learningPct}%)
              </Text>
            </Space>
            <Text strong style={{ fontSize: '0.85rem', color: '#e8eaf6' }}>
              {stats.mastered + stats.tested}/{stats.total} từ
            </Text>
          </Flex>

          <Progress
            percent={activePct}
            success={{
              percent: finishedPct,
              strokeColor: '#2ed573',
            }}
            strokeColor="#f5a623"
            railColor="rgba(255, 255, 255, 0.08)"
            showInfo={false}
            strokeLinecap="round"
            size={['100%', 10]}
          />
        </Flex>
      </Card>
    </div>
  );
}
