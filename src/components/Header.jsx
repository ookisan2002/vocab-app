import { useState } from 'react';
import { useStore } from '../store/useStore';

export default function Header({ onSignIn, onSignOut, syncStatus }) {
  const user = useStore(s => s.user);
  const [showConfirmSignOut, setShowConfirmSignOut] = useState(false);

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <span className="app-logo">📚</span>
          <h1 className="app-title">VocabMaster</h1>
          <span className="app-subtitle">IELTS Vocabulary</span>
        </div>
        <div className="header-right">
          {user ? (
            <div
              className="user-info"
              onClick={() => setShowConfirmSignOut(true)}
              title="Nhấn để xem thông tin tài khoản / đăng xuất"
            >
              <img src={user.photoURL || 'https://via.placeholder.com/32'} alt={user.displayName || 'User'} className="user-avatar" />
              <div className="user-text">
                <span className="user-name">{user.displayName || user.email}</span>
                <span className="sync-status">
                  {syncStatus === 'syncing' && <><span className="dot dot-yellow"></span>Đang đồng bộ...</>}
                  {syncStatus === 'synced' && <><span className="dot dot-green"></span>Đã đồng bộ</>}
                  {syncStatus === 'error' && <><span className="dot dot-red"></span>Lỗi đồng bộ</>}
                  {syncStatus === 'idle' && <><span className="dot dot-gray"></span>Cục bộ</>}
                </span>
              </div>
              <span className="user-dropdown-arrow">▼</span>
            </div>
          ) : (
            <button className="btn-google-signin" onClick={onSignIn}>
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
                <path d="M6.3 14.7l7 5.1C15.1 15.4 19.2 12 24 12c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" fill="#FF3D00"/>
                <path d="M24 46c5.5 0 10.5-1.9 14.4-5.1l-6.6-5.5C29.8 37.1 27 38 24 38c-6 0-10.7-3.9-11.7-9.1l-7 5.4C8.7 42 15.8 46 24 46z" fill="#4CAF50"/>
                <path d="M44.5 20H24v8.5h11.8c-.5 2.5-2 4.6-4 6l6.6 5.5C42.2 36.5 45 30.7 45 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
              </svg>
              Đăng nhập Google
            </button>
          )}
        </div>
      </header>

      {/* Confirmation Modal before signing out */}
      {showConfirmSignOut && (
        <div className="modal-overlay" onClick={() => setShowConfirmSignOut(false)}>
          <div className="modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">🔐</div>
            <h3>Xác nhận Đăng xuất</h3>
            <div className="confirm-profile-badge">
              <img src={user.photoURL} alt={user.displayName} className="confirm-avatar" />
              <div>
                <strong>{user.displayName}</strong>
                <div className="confirm-email">{user.email}</div>
              </div>
            </div>
            <p className="confirm-msg">
              Tiến độ học tập của bạn đã được lưu an toàn trên Cloud Firestore. Bạn có chắc chắn muốn đăng xuất không?
            </p>
            <div className="confirm-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowConfirmSignOut(false)}
              >
                Hủy bỏ
              </button>
              <button
                className="btn-confirm-signout"
                onClick={() => {
                  setShowConfirmSignOut(false);
                  onSignOut();
                }}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
