import { useState, useEffect, useRef, useCallback } from 'react';
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
import HistoryBar from './components/HistoryBar';
import './App.css';

export default function App() {
  const { loading, syncStatus, signInWithGoogle, signOutUser } = useAuth();
  const checkSrsReview = useStore(s => s.checkSrsReview);
  const markLearning = useStore(s => s.markLearning);
  const markMastered = useStore(s => s.markMastered);
  const handleQuizAnswer = useStore(s => s.handleQuizAnswer);
  const resetProgress = useStore(s => s.resetProgress);

  const { getNextCard } = useLearningEngine();

  // Current card state
  const [currentCard, setCurrentCard] = useState(null);
  const [cardsSinceLastQuiz, setCardsSinceLastQuiz] = useState(0);
  const [pinnedWordId, setPinnedWordId] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Modals
  const [showList, setShowList] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
      const newCount = afterQuiz ? 0 : cardsSinceLastQuiz + 1;
      setCardsSinceLastQuiz(newCount);
      const pinned = pinnedWordId;
      setPinnedWordId(null);
      const card = getNextCard(newCount, pinned);
      setCurrentCard(card);
      setIsTransitioning(false);
    }, 300);
  }, [getNextCard, cardsSinceLastQuiz, pinnedWordId, checkSrsReview]);

  // Initial load
  useEffect(() => {
    if (!loading) {
      const card = getNextCard(0, null);
      setCurrentCard(card);
    }
  }, [loading]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
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
  }, [currentCard, advance]);

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
    setPinnedWordId(word.id);
    setTimeout(() => {
      const card = getNextCard(0, word.id);
      setCurrentCard(card);
    }, 100);
  };

  const handleAddClose = (firstWord) => {
    setShowAdd(false);
    if (firstWord) {
      handleStudyWord(firstWord);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        onSignIn={signInWithGoogle}
        onSignOut={signOutUser}
        syncStatus={syncStatus}
      />

      <main className="main-content">
        <Dashboard />

        {/* Controls */}
        <div className="controls-row">
          <div className="controls-left">
            <button className="ctrl-btn" onClick={() => setShowList(true)}>📋 Danh sách</button>
            <button className="ctrl-btn" onClick={() => setShowAdd(true)}>➕ Thêm từ mới</button>
            <button className="ctrl-btn" onClick={() => setShowSettings(s => !s)}>⚙️ Cài đặt</button>
          </div>
          <div className="controls-right">
            <button
              className="ctrl-btn ctrl-btn-danger"
              onClick={() => {
                if (confirm('Đặt lại toàn bộ tiến độ học? (Các từ tự thêm vẫn được giữ lại)')) {
                  resetProgress();
                  const card = getNextCard(0, null);
                  setCurrentCard(card);
                  setCardsSinceLastQuiz(0);
                }
              }}
            >🔄 Học lại từ đầu</button>
          </div>
        </div>

        {showSettings && <FilterBar />}

        {/* Main card area */}
        <div
          className={`card-area ${isTransitioning ? 'fade-out' : 'fade-in'}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {currentCard === null && (
            <div className="all-done-card">
              <div className="all-done-icon">🏆</div>
              <h2>Xuất sắc!</h2>
              <p>Bạn đã hoàn thành tất cả từ vựng trong chủ đề này.</p>
              <p className="all-done-sub">Hệ thống sẽ tự động đưa từ về ôn lại theo lịch SRS.</p>
            </div>
          )}

          {currentCard?.type === 'learn' && (
            <LearnCard
              key={currentCard.word.id + '-learn'}
              word={currentCard.word}
              onUnderstood={handleUnderstood}
              onMastered={handleMastered}
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

      {showList && (
        <VocabListModal
          onClose={() => setShowList(false)}
          onStudyWord={handleStudyWord}
        />
      )}

      {showAdd && <AddWordModal onClose={handleAddClose} />}
    </div>
  );
}
