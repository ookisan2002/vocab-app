import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Space, Popconfirm, Flex, Spin, Typography, Result, Card } from 'antd';
import {
  UnorderedListOutlined,
  PlusOutlined,
  SettingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useStore } from './store/useStore';
import { useAuth } from './hooks/useAuth';
import { useLearningEngine } from './hooks/useLearningEngine';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import FilterBar from './components/FilterBar';
import LearnCard from './components/LearnCard';
import QuizCard from './components/QuizCard';
import VocabListModal from './components/VocabListModal';
import AddWordModal from './components/AddWordModal';
import EditWordModal from './components/EditWordModal';
import HistoryBar from './components/HistoryBar';
import AiTutorModal from './components/AiTutorModal';
import ExamPage from './components/Exam/ExamPage';
import './App.css';

export default function App() {
  const { loading, syncStatus, signInWithGoogle, signOutUser } = useAuth();
  const checkSrsReview = useStore(s => s.checkSrsReview);
  const markLearning = useStore(s => s.markLearning);
  const markMastered = useStore(s => s.markMastered);
  const handleQuizAnswer = useStore(s => s.handleQuizAnswer);
  const resetProgress = useStore(s => s.resetProgress);

  const { getNextCard } = useLearningEngine();

  // Navigation tab: 'learn' | 'exam'
  const [viewMode, setViewMode] = useState('learn');

  // Current card state
  const [currentCard, setCurrentCard] = useState(null);
  const [_cardsSinceLastQuiz, setCardsSinceLastQuiz] = useState(0);
  const [_pinnedWordId, setPinnedWordId] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const cardsSinceLastQuizRef = useRef(0);
  const pinnedWordIdRef = useRef(null);

  // Modals
  const [showList, setShowList] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingWord, setEditingWord] = useState(null);

  const deletedWordIds = useStore(s => s.deletedWordIds);

  // SRS background check every 3 seconds
  useEffect(() => {
    const t = setInterval(() => {
      checkSrsReview();
    }, 3000);
    return () => clearInterval(t);
  }, [checkSrsReview]);

  // Get next card
  const advance = useCallback((afterQuiz = false) => {
    checkSrsReview();
    setIsTransitioning(true);
    setTimeout(() => {
      const newCount = afterQuiz ? 0 : cardsSinceLastQuizRef.current + 1;
      cardsSinceLastQuizRef.current = newCount;
      setCardsSinceLastQuiz(newCount);

      const pinned = pinnedWordIdRef.current;
      pinnedWordIdRef.current = null;
      setPinnedWordId(null);

      const card = getNextCard(newCount, pinned);
      setCurrentCard(card);
      setIsTransitioning(false);
    }, 300);
  }, [getNextCard, checkSrsReview]);

  // Initial load
  useEffect(() => {
    if (!loading) {
      const card = getNextCard(0, null);
      setCurrentCard(card);
    }
  }, [loading, getNextCard]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (viewMode !== 'learn') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        const nextQuizBtn = document.querySelector('.btn-quiz-next');
        if (nextQuizBtn) {
          nextQuizBtn.click();
        } else if (currentCard?.type === 'learn') {
          advance(false);
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        const nextQuizBtn = document.querySelector('.btn-quiz-next');
        if (nextQuizBtn) {
          nextQuizBtn.click();
        }
      }
      if (['1','2','3','4'].includes(e.key) && currentCard?.type === 'quiz') {
        const idx = parseInt(e.key) - 1;
        const opts = currentCard.question?.options;
        if (opts && opts[idx]) {
          // Simulate click on option
          document.querySelectorAll('.quiz-option')[idx]?.click();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentCard, advance, viewMode]);

  // Touch swipe
  const touchStartX = useRef(null);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 60) {
      const nextQuizBtn = document.querySelector('.btn-quiz-next');
      if (nextQuizBtn) {
        nextQuizBtn.click();
      } else if (currentCard?.type === 'learn') {
        advance(false);
      }
    }
    touchStartX.current = null;
  };

  // Handlers
  const handleUnderstood = () => {
    if (!currentCard) return;
    markLearning(currentCard.word.id);
    advance(false);
  };

  const handleMastered = () => {
    if (!currentCard) return;
    markMastered(currentCard.word.id);
    advance(false);
  };

  const handleQuizAnswered = (correct) => {
    if (!currentCard) return;
    handleQuizAnswer(currentCard.word.id, correct);
  };

  const handleNextQuiz = () => {
    advance(true);
  };

  const handleStudyWord = (word) => {
    pinnedWordIdRef.current = word.id;
    setPinnedWordId(word.id);
    setTimeout(() => {
      const card = getNextCard(0, word.id);
      setCurrentCard(card);
      pinnedWordIdRef.current = null;
      setPinnedWordId(null);
    }, 100);
  };

  const handleWordSaved = (updatedFields) => {
    if (currentCard?.word?.id && editingWord && currentCard.word.id === editingWord.id) {
      setCurrentCard(prev => {
        if (!prev || !prev.word || prev.word.id !== editingWord.id) return prev;
        return {
          ...prev,
          word: { ...prev.word, ...updatedFields },
        };
      });
    }
  };

  // If the word currently shown on card is deleted, advance immediately
  useEffect(() => {
    if (currentCard?.word?.id && deletedWordIds?.includes(currentCard.word.id)) {
      advance(false);
    }
  }, [deletedWordIds, currentCard, advance]);

  const handleAddClose = (firstWord) => {
    setShowAdd(false);
    if (firstWord) {
      handleStudyWord(firstWord);
    }
  };

  if (loading) {
    return (
      <Flex vertical align="center" justify="center" style={{ minHeight: '100vh', gap: 16 }}>
        <Spin size="large" />
        <Typography.Text type="secondary">Đang tải dữ liệu...</Typography.Text>
      </Flex>
    );
  }

  return (
    <div className="app">
      <Header
        onSignIn={signInWithGoogle}
        onSignOut={signOutUser}
        syncStatus={syncStatus}
        activeTab={viewMode}
        onTabChange={setViewMode}
      />

      {viewMode === 'exam' ? (
        <main className="main-content" style={{ maxWidth: 960, margin: '0 auto', width: '100%', padding: '16px 12px' }}>
          <ExamPage onBackToStudy={() => setViewMode('learn')} />
        </main>
      ) : (
        <>
          <main className="main-content">
            <Dashboard />

            {/* Controls */}
            <Flex justify="space-between" align="center" wrap="wrap" gap={8} className="controls-row">
              <Space wrap size={8} className="controls-left">
                <Button
                  icon={<UnorderedListOutlined />}
                  onClick={() => setShowList(true)}
                  style={{ borderRadius: 8 }}
                >
                  Danh sách
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => setShowAdd(true)}
                  style={{ borderRadius: 8 }}
                >
                  Thêm từ mới
                </Button>
                <Button
                  icon={<SettingOutlined />}
                  type={showSettings ? 'primary' : 'default'}
                  onClick={() => setShowSettings(s => !s)}
                  style={{ borderRadius: 8 }}
                >
                  Cài đặt
                </Button>
              </Space>

              <div className="controls-right">
                <Popconfirm
                  title="Đặt lại toàn bộ tiến độ học?"
                  description="Các từ tự thêm vẫn được giữ lại sau khi đặt lại."
                  okText="Đặt lại"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => {
                    resetProgress();
                    cardsSinceLastQuizRef.current = 0;
                    setCardsSinceLastQuiz(0);
                    pinnedWordIdRef.current = null;
                    setPinnedWordId(null);
                    const card = getNextCard(0, null);
                    setCurrentCard(card);
                  }}
                >
                  <Button danger icon={<ReloadOutlined />} style={{ borderRadius: 8 }}>
                    Học lại từ đầu
                  </Button>
                </Popconfirm>
              </div>
            </Flex>

            {showSettings && <FilterBar />}

            {/* Main card area */}
            <div
              className={`card-area ${isTransitioning ? 'fade-out' : 'fade-in'}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {currentCard === null && (
                <Card
                  className="all-done-card"
                  style={{
                    borderRadius: 16,
                    background: 'rgba(22, 20, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'center',
                  }}
                >
                  <Result
                    icon={<span style={{ fontSize: '3.5rem' }}>🏆</span>}
                    title={<span style={{ color: '#ffffff', fontSize: '1.6rem' }}>Xuất sắc!</span>}
                    subTitle={
                      <Flex vertical gap={4}>
                        <Typography.Text type="secondary" style={{ fontSize: '0.95rem' }}>
                          Bạn đã hoàn thành tất cả từ vựng trong chủ đề này.
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                          Hệ thống sẽ tự động đưa từ về ôn lại theo lịch SRS.
                        </Typography.Text>
                      </Flex>
                    }
                  />
                </Card>
              )}

              {currentCard?.type === 'learn' && (
                <LearnCard
                  key={currentCard.word.id + '-learn'}
                  word={currentCard.word}
                  onUnderstood={handleUnderstood}
                  onMastered={handleMastered}
                  onEditWord={(w) => setEditingWord(w)}
                />
              )}

              {currentCard?.type === 'quiz' && (
                <QuizCard
                  key={currentCard.word.id + '-' + currentCard.question?.direction}
                  question={currentCard.question}
                  word={currentCard.word}
                  onAnswer={handleQuizAnswered}
                  onNext={handleNextQuiz}
                />
              )}
            </div>
          </main>

          <HistoryBar />
        </>
      )}

      {showList && (
        <VocabListModal
          onClose={() => setShowList(false)}
          onStudyWord={handleStudyWord}
          onEditWord={(w) => setEditingWord(w)}
        />
      )}

      {showAdd && <AddWordModal onClose={handleAddClose} />}

      <EditWordModal
        word={editingWord}
        isOpen={!!editingWord}
        onClose={() => setEditingWord(null)}
        onSaved={handleWordSaved}
      />

      <AiTutorModal currentWord={currentCard?.word} />
    </div>
  );
}
