import { useState } from 'react';
import {
  Flex,
  Typography,
  Avatar,
  Button,
  Tag,
  Tooltip,
  Modal,
  Segmented,
} from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';

const { Title, Text, Paragraph } = Typography;

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
    <path d="M6.3 14.7l7 5.1C15.1 15.4 19.2 12 24 12c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" fill="#FF3D00"/>
    <path d="M24 46c5.5 0 10.5-1.9 14.4-5.1l-6.6-5.5C29.8 37.1 27 38 24 38c-6 0-10.7-3.9-11.7-9.1l-7 5.4C8.7 42 15.8 46 24 46z" fill="#4CAF50"/>
    <path d="M44.5 20H24v8.5h11.8c-.5 2.5-2 4.6-4 6l6.6 5.5C42.2 36.5 45 30.7 45 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
  </svg>
);

export default function Header({
  onSignIn,
  onSignOut,
  syncStatus,
  activeTab = 'learn',
  onTabChange,
}) {
  const user = useStore(s => s.user);
  const [showConfirmSignOut, setShowConfirmSignOut] = useState(false);

  const renderSyncBadge = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Tag icon={<SyncOutlined spin />} color="warning">Đang đồng bộ...</Tag>;
      case 'synced':
        return <Tag icon={<CheckCircleOutlined />} color="success">Đã đồng bộ</Tag>;
      case 'error':
        return <Tag icon={<ExclamationCircleOutlined />} color="error">Lỗi đồng bộ</Tag>;
      case 'idle':
      default:
        return <Tag color="default">Cục bộ</Tag>;
    }
  };

  return (
    <>
      <header className="app-header">
        <Flex align="center" justify="space-between" style={{ width: '100%' }}>
          {/* Logo & App title */}
          <Flex align="center" gap={12}>
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }} role="img" aria-label="VocabMaster logo">
              📚
            </span>
            <Flex vertical>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  VocabMaster
                </Title>
                <Tag color="purple" style={{ margin: 0, borderRadius: 12, fontSize: '0.72rem', fontWeight: 600 }}>
                  IELTS Vocabulary
                </Tag>
              </Flex>
            </Flex>
          </Flex>

          {/* Navigation Tab Switcher */}
          {onTabChange && (
            <Segmented
              value={activeTab}
              onChange={onTabChange}
              options={[
                {
                  label: (
                    <span style={{ padding: '0 8px', fontWeight: 600, fontSize: '0.86rem' }}>
                      📖 Học từ vựng
                    </span>
                  ),
                  value: 'learn',
                },
                {
                  label: (
                    <span style={{ padding: '0 8px', fontWeight: 600, fontSize: '0.86rem' }}>
                      📝 Bài kiểm tra AI
                    </span>
                  ),
                  value: 'exam',
                },
              ]}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: 12,
                padding: 3,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            />
          )}

          {/* User profile / Sign in button */}
          <Flex align="center" gap={12}>
            {user ? (
              <Tooltip title="Nhấn để xem thông tin tài khoản / đăng xuất">
                <Button
                  type="text"
                  onClick={() => setShowConfirmSignOut(true)}
                  style={{
                    height: 'auto',
                    padding: '4px 10px',
                    borderRadius: 10,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <Flex align="center" gap={10}>
                    <Avatar
                      src={user.photoURL || undefined}
                      alt={user.displayName || 'User'}
                      size={32}
                      style={{
                        border: '2px solid #7c6af7',
                        backgroundColor: '#7c6af7',
                      }}
                    >
                      {(!user.photoURL && (user.displayName || user.email || 'U')[0].toUpperCase())}
                    </Avatar>
                    <Flex vertical align="start" style={{ textAlign: 'left' }}>
                      <Text strong style={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                        {user.displayName || user.email}
                      </Text>
                      <div style={{ marginTop: 2 }}>{renderSyncBadge()}</div>
                    </Flex>
                    <DownOutlined style={{ fontSize: '0.65rem', opacity: 0.6 }} />
                  </Flex>
                </Button>
              </Tooltip>
            ) : (
              <Button
                type="default"
                size="middle"
                icon={<GoogleIcon />}
                onClick={onSignIn}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 500,
                  borderRadius: 8,
                }}
              >
                Đăng nhập Google
              </Button>
            )}
          </Flex>
        </Flex>
      </header>

      {/* Confirmation Modal before signing out */}
      <Modal
        title={
          <Flex align="center" gap={8}>
            <LockOutlined style={{ color: '#ff4757', fontSize: '1.2rem' }} />
            <Text strong style={{ fontSize: '1.05rem' }}>Xác nhận Đăng xuất</Text>
          </Flex>
        }
        open={showConfirmSignOut}
        onCancel={() => setShowConfirmSignOut(false)}
        onOk={() => {
          setShowConfirmSignOut(false);
          onSignOut();
        }}
        okText="Đăng xuất"
        cancelText="Hủy bỏ"
        okButtonProps={{ danger: true, size: 'middle' }}
        cancelButtonProps={{ size: 'middle' }}
        centered
        destroyOnHidden
      >
        {user && (
          <Flex vertical gap={16} style={{ paddingTop: 12 }}>
            <Flex
              align="center"
              gap={12}
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Avatar
                src={user.photoURL || undefined}
                alt={user.displayName}
                size={42}
                style={{ border: '2px solid #7c6af7' }}
              >
                {(!user.photoURL && (user.displayName || user.email || 'U')[0].toUpperCase())}
              </Avatar>
              <Flex vertical>
                <Text strong style={{ fontSize: '0.95rem' }}>
                  {user.displayName}
                </Text>
                <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                  {user.email}
                </Text>
              </Flex>
            </Flex>

            <Paragraph type="secondary" style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
              Tiến độ học tập của bạn đã được lưu an toàn trên Cloud Firestore. Bạn có chắc chắn muốn đăng xuất không?
            </Paragraph>
          </Flex>
        )}
      </Modal>
    </>
  );
}
