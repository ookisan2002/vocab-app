import { useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { generateQuizQuestion, INTERLEAVE_MODES } from '../utils/srs';

/**
 * useLearningEngine: Core hook that decides what card to show next
 * Returns: { currentCard, advance }
 * currentCard: { type: 'learn' | 'quiz', word, question? }
 */
export function useLearningEngine(pinnedWordId = null) {
  const getAllWords = useStore(s => s.getAllWords);
  const progress = useStore(s => s.progress);
  const topicFilter = useStore(s => s.topicFilter);
  const interleaveMode = useStore(s => s.interleaveMode);

  const filteredWords = useMemo(() => {
    return getAllWords().filter(w =>
      topicFilter === 'all' || w.topic === topicFilter
    );
  }, [getAllWords, progress, topicFilter]);

  const getNextCard = useCallback((cardsSinceLastQuiz = 0, forcedWordId = null) => {
    if (forcedWordId) {
      const word = filteredWords.find(w => w.id === forcedWordId);
      if (!word) return null;
      const ws = progress[word.id];
      if (ws?.status === 'learning') {
        // Show as quiz
        const direction = (ws.correctStreak || 0) === 0 ? 'en->vi' : 'vi->en';
        const question = generateQuizQuestion(word, filteredWords, direction);
        return { type: 'quiz', word, question };
      }
      return { type: 'learn', word };
    }

    const unseen = filteredWords.filter(w => {
      const ws = progress[w.id];
      return !ws || ws.status === 'unseen';
    });
    const learning = filteredWords.filter(w => progress[w.id]?.status === 'learning');

    // Determine quiz frequency
    const mode = INTERLEAVE_MODES[interleaveMode] || INTERLEAVE_MODES.balanced;
    const [min, max] = mode.newPerQuiz;
    const threshold = min === 0 ? Infinity : min + Math.floor(Math.random() * (max - min + 1));

    // Show quiz if: we have learning words AND (quiz only mode OR enough cards shown)
    const shouldQuiz = learning.length > 0 && (
      interleaveMode === 'quizOnly' || cardsSinceLastQuiz >= threshold
    );

    if (shouldQuiz && learning.length > 0) {
      // Pick a random learning word
      const word = learning[Math.floor(Math.random() * learning.length)];
      const ws = progress[word.id];
      const direction = (ws?.correctStreak || 0) === 0 ? 'en->vi' : 'vi->en';
      const question = generateQuizQuestion(word, filteredWords, direction);
      return { type: 'quiz', word, question };
    }

    // Show next unseen card
    if (unseen.length > 0) {
      return { type: 'learn', word: unseen[0] };
    }

    // All done — but still show quizzes if learning words remain
    if (learning.length > 0) {
      const word = learning[Math.floor(Math.random() * learning.length)];
      const ws = progress[word.id];
      const direction = (ws?.correctStreak || 0) === 0 ? 'en->vi' : 'vi->en';
      const question = generateQuizQuestion(word, filteredWords, direction);
      return { type: 'quiz', word, question };
    }

    return null; // All mastered!
  }, [filteredWords, progress, interleaveMode]);

  return { getNextCard, filteredWords };
}
