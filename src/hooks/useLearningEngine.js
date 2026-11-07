import { useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { generateQuizQuestion, INTERLEAVE_MODES } from '../utils/srs';

/**
 * useLearningEngine: Core hook that decides what card to show next
 * Returns: { currentCard, advance }
 * currentCard: { type: 'learn' | 'quiz', word, question? }
 */
export function useLearningEngine(_pinnedWordId = null) {
  const getAllWords = useStore(s => s.getAllWords);
  const topicFilter = useStore(s => s.topicFilter);
  const customWords = useStore(s => s.customWords);
  const editedWords = useStore(s => s.editedWords);
  const deletedWordIds = useStore(s => s.deletedWordIds);

  const filteredWords = useMemo(() => {
    // Depend on customWords, editedWords, deletedWordIds to re-evaluate when word list changes
    void customWords;
    void editedWords;
    void deletedWordIds;
    return getAllWords().filter(w =>
      topicFilter === 'all' || w.topic === topicFilter
    );
  }, [getAllWords, topicFilter, customWords, editedWords, deletedWordIds]);

  const getNextCard = useCallback((cardsSinceLastQuiz = 0, forcedWordId = null) => {
    const state = useStore.getState();
    const progress = state.progress || {};
    const currentTopicFilter = state.topicFilter;
    const currentInterleaveMode = state.interleaveMode;
    const allWords = state.getAllWords();

    const currentFilteredWords = allWords.filter(w =>
      currentTopicFilter === 'all' || w.topic === currentTopicFilter
    );

    if (forcedWordId) {
      const word = currentFilteredWords.find(w => w.id === forcedWordId);
      if (!word) return null;
      const ws = progress[word.id];
      if (ws?.status === 'learning') {
        // Show as quiz
        const direction = (ws.correctStreak || 0) === 0 ? 'en->vi' : 'vi->en';
        const question = generateQuizQuestion(word, currentFilteredWords, direction);
        return { type: 'quiz', word, question };
      }
      return { type: 'learn', word };
    }

    const now = Date.now();
    const unseen = currentFilteredWords.filter(w => {
      const ws = progress[w.id];
      return !ws || ws.status === 'unseen';
    });
    const learning = currentFilteredWords.filter(w => {
      const ws = progress[w.id];
      if (!ws) return false;
      if (ws.status === 'learning') return true;
      if (ws.status === 'tested' && ws.nextReviewAt && ws.nextReviewAt <= now) return true;
      return false;
    });

    // Determine quiz frequency
    const mode = INTERLEAVE_MODES[currentInterleaveMode] || INTERLEAVE_MODES.balanced;
    const [min, max] = mode.newPerQuiz;
    const threshold = min === 0 ? Infinity : min + Math.floor(Math.random() * (max - min + 1));

    // Show quiz if: we have learning words AND (quiz only mode OR enough cards shown)
    const shouldQuiz = learning.length > 0 && (
      currentInterleaveMode === 'quizOnly' || cardsSinceLastQuiz >= threshold
    );

    if (shouldQuiz && learning.length > 0) {
      // Pick a random learning word
      const word = learning[Math.floor(Math.random() * learning.length)];
      const ws = progress[word.id];
      const direction = (ws?.correctStreak || 0) === 0 ? 'en->vi' : 'vi->en';
      const question = generateQuizQuestion(word, currentFilteredWords, direction);
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
      const question = generateQuizQuestion(word, currentFilteredWords, direction);
      return { type: 'quiz', word, question };
    }

    return null; // All mastered!
  }, []);

  return { getNextCard, filteredWords };
}
