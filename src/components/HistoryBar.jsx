import { Space, Tag, Typography } from 'antd';
import {
  BookOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';

const { Text } = Typography;

export default function HistoryBar() {
  const history = useStore(s => s.history);

  const config = {
    seen: {
      icon: <BookOutlined />,
      color: 'purple',
      label: (h) => `Đã xem: ${h.word}`,
    },
    correct: {
      icon: <ThunderboltOutlined />,
      color: 'warning',
      label: (h) => `Đúng ${h.streak}/2: ${h.word}`,
    },
    wrong: {
      icon: <CloseCircleOutlined />,
      color: 'error',
      label: (h) => `Nhầm: ${h.word}`,
    },
    mastered: {
      icon: <CheckCircleOutlined />,
      color: 'success',
      label: (h) => `Đã thuộc: ${h.word}`,
    },
  };

  if (history.length === 0) return null;

  return (
    <div className="history-bar">
      <Text
        type="secondary"
        strong
        style={{
          fontSize: '0.78rem',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Lịch sử:
      </Text>
      <div className="history-items" style={{ display: 'flex', overflowX: 'auto', paddingBottom: 2 }}>
        <Space size={8} wrap={false}>
          {history.map((h, i) => {
            const itemConfig = config[h.type] || {
              icon: null,
              color: 'default',
              label: () => h.word,
            };
            return (
              <Tag
                key={`${h.word}-${i}`}
                icon={itemConfig.icon}
                color={itemConfig.color}
                style={{
                  borderRadius: 12,
                  padding: '2px 10px',
                  fontSize: '0.78rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  margin: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {itemConfig.label(h)}
              </Tag>
            );
          })}
        </Space>
      </div>
    </div>
  );
}
