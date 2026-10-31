// SRS (Spaced Repetition System) intervals in milliseconds
export const SRS_MODES = {
  standard: {
    label: 'Chuẩn',
    intervals: [
      10 * 60 * 1000,      // 10 min
      60 * 60 * 1000,      // 1 hr
      6 * 60 * 60 * 1000,  // 6 hrs
      24 * 60 * 60 * 1000, // 1 day
      3 * 24 * 60 * 60 * 1000, // 3 days
      7 * 24 * 60 * 60 * 1000, // 7 days
    ],
  },
  fast: {
    label: 'Ôn nhanh trong ngày',
    intervals: [
      2 * 60 * 1000,       // 2 min
      10 * 60 * 1000,      // 10 min
      30 * 60 * 1000,      // 30 min
      2 * 60 * 60 * 1000,  // 2 hrs
      6 * 60 * 60 * 1000,  // 6 hrs
      24 * 60 * 60 * 1000, // 1 day
    ],
  },
  turbo: {
    label: 'Test thử siêu tốc',
    intervals: [
      15 * 1000,           // 15 sec
      45 * 1000,           // 45 sec
      2 * 60 * 1000,       // 2 min
      5 * 60 * 1000,       // 5 min
      15 * 60 * 1000,      // 15 min
      60 * 60 * 1000,      // 1 hr
    ],
  },
};

export const INTERLEAVE_MODES = {
  intense: { label: 'Hỏi liên tục', newPerQuiz: [2, 3] },
  balanced: { label: 'Cân bằng', newPerQuiz: [3, 4] },
  relaxed: { label: 'Thư thả', newPerQuiz: [5, 6] },
  quizOnly: { label: 'Chỉ kiểm tra', newPerQuiz: [0, 0] },
};

// Generate a quiz question for a word
export function generateQuizQuestion(targetWord, allWords, direction) {
  // direction: 'en->vi' (show English, answer Vietnamese) or 'vi->en'
  const isEnToVi = direction === 'en->vi';

  // Get 3 random wrong options from other words
  const others = allWords.filter(w => w.id !== targetWord.id);
  const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);

  const correctOption = {
    id: targetWord.id,
    text: isEnToVi ? targetWord.vi : targetWord.word,
    correct: true,
  };

  const wrongOptions = shuffled.map(w => ({
    id: w.id,
    text: isEnToVi ? w.vi : w.word,
    correct: false,
  }));

  const options = [correctOption, ...wrongOptions].sort(() => Math.random() - 0.5);

  return {
    wordId: targetWord.id,
    direction,
    prompt: isEnToVi ? targetWord.word : targetWord.vi,
    options,
    correctId: targetWord.id,
  };
}

// Get next SRS interval based on stage
export function getNextInterval(stage, srsMode) {
  const intervals = SRS_MODES[srsMode]?.intervals || SRS_MODES.standard.intervals;
  const idx = Math.min(stage, intervals.length - 1);
  return intervals[idx];
}

// Format time remaining
export function formatTimeRemaining(ms) {
  if (ms <= 0) return 'ngay bây giờ';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} giây`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ ${min % 60} phút`;
  return `${Math.floor(hr / 24)} ngày`;
}

// Format time ago
export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'chưa học';
  const diff = Date.now() - timestamp;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} giây trước`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  return `${Math.floor(hr / 24)} ngày trước`;
}

// Speak text using Web Speech API
export function speakText(text, lang = 'en-US') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = 0.9;
  window.speechSynthesis.speak(utt);
}
