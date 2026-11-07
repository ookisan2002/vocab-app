import { useState } from 'react';
import { Flex, Spin, Typography, Card, Segmented, message } from 'antd';
import { useStore } from '../../store/useStore';
import { generateExamQuestions, gradeExamTranslations } from '../../services/geminiService';
import ExamSetup from './ExamSetup';
import ExamRoom from './ExamRoom';
import ExamResult from './ExamResult';
import ExamHistoryList from './ExamHistoryList';
import ExamHistoryDetail from './ExamHistoryDetail';

const { Title, Text } = Typography;

export default function ExamPage({ onBackToStudy }) {
  const geminiApiKey = useStore(s => s.geminiApiKey);
  const examSettings = useStore(s => s.examSettings);
  const recordExamResults = useStore(s => s.recordExamResults);
  const examHistory = useStore(s => s.examHistory || []);
  const saveExamHistoryRecord = useStore(s => s.saveExamHistoryRecord);
  const getAllWords = useStore(s => s.getAllWords);

  const [phase, setPhase] = useState('setup'); // 'setup' | 'generating' | 'taking' | 'evaluating' | 'results'
  const [activeTab, setActiveTab] = useState('setup'); // 'setup' | 'history'
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [latestSavedRecord, setLatestSavedRecord] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);

  // Phase 1 -> Phase 2: Generate Questions
  const handleStartExam = async (selectedWords, enabledTypes) => {
    setPhase('generating');
    try {
      const generated = await generateExamQuestions(geminiApiKey, selectedWords, enabledTypes);
      if (!Array.isArray(generated) || generated.length === 0) {
        throw new Error('Không thể khởi tạo đề thi.');
      }
      setQuestions(generated);
      setPhase('taking');
    } catch (err) {
      console.error('Lỗi sinh đề thi:', err);
      message.error(err.message || 'Lỗi khi tạo đề thi. Đang quay lại trang cài đặt.');
      setPhase('setup');
    }
  };

  // Phase 2 -> Phase 3: Submit & AI Grading
  const handleSubmitExam = async (userAnswers) => {
    setPhase('evaluating');
    try {
      // 1. Separate translation questions for AI batch grading
      const translationQuestions = questions.filter(q => q.type === 'translate');
      let gradedTranslations = [];

      if (translationQuestions.length > 0) {
        const submissions = translationQuestions.map(q => ({
          id: q.id,
          wordId: q.wordId,
          targetWord: q.targetWord,
          viPrompt: q.viPrompt,
          studentTranslation: userAnswers[q.id] || '',
          suggestedSentence: q.suggestedSentence || '',
        }));

        gradedTranslations = await gradeExamTranslations(geminiApiKey, submissions);
      }

      // 2. Assemble results for all question types
      const finalResults = questions.map(q => {
        if (q.type === 'translate') {
          const graded = gradedTranslations.find(g => g.id === q.id) || {
            score: (userAnswers[q.id] && userAnswers[q.id].toLowerCase().includes(q.targetWord.toLowerCase())) ? 7.5 : 4.0,
            isPass: Boolean(userAnswers[q.id] && userAnswers[q.id].toLowerCase().includes(q.targetWord.toLowerCase())),
            feedback: 'Đã hoàn tất đánh giá câu dịch.',
            grammarNotes: '',
            betterAlternative: q.suggestedSentence,
          };

          return {
            questionId: q.id,
            wordId: q.wordId,
            targetWord: q.targetWord,
            type: q.type,
            prompt: q.viPrompt,
            userAnswer: userAnswers[q.id] || '',
            correctAnswer: q.suggestedSentence,
            score: graded.score,
            isPass: graded.isPass,
            feedback: graded.feedback,
            grammarNotes: graded.grammarNotes,
            betterAlternative: graded.betterAlternative,
          };
        }

        if (q.type === 'reorder') {
          const ans = (userAnswers[q.id] || '').trim();
          const cleanAns = ans.replace(/[.,!?;:]/g, '').toLowerCase().replace(/\s+/g, ' ');
          const cleanTarget = (q.targetSentence || '').trim().replace(/[.,!?;:]/g, '').toLowerCase().replace(/\s+/g, ' ');
          const isPass = cleanAns.length > 0 && cleanAns === cleanTarget;

          return {
            questionId: q.id,
            wordId: q.wordId,
            targetWord: q.targetWord,
            type: q.type,
            prompt: q.viMeaning || q.targetSentence,
            userAnswer: ans,
            correctAnswer: q.targetSentence,
            score: isPass ? 10 : 0,
            isPass,
            feedback: isPass
              ? 'Tuyệt vời! Bạn đã sắp xếp chuẩn xác 100% trật tự câu học thuật.'
              : 'Trật tự các từ trong câu chưa chính xác.',
            explanation: '',
            betterAlternative: q.targetSentence,
          };
        }

        // fill_blank
        const ans = userAnswers[q.id];
        const isPass = Boolean(ans && ans.toLowerCase() === (q.correctOption || '').toLowerCase());

        return {
          questionId: q.id,
          wordId: q.wordId,
          targetWord: q.targetWord,
          type: q.type,
          prompt: q.prompt,
          userAnswer: ans || '(Chưa chọn)',
          correctAnswer: q.correctOption,
          score: isPass ? 10 : 0,
          isPass,
          feedback: isPass
            ? `Chính xác! Lựa chọn từ "${q.correctOption}" hoàn toàn chuẩn xác.`
            : `Chưa chính xác. Đáp án đúng cho câu này là "${q.correctOption}".`,
          explanation: q.explanation,
          betterAlternative: q.prompt ? q.prompt.replace('___', `**${q.correctOption}**`) : q.correctOption,
        };
      });

      // 3. Persist results in Store & SRS progression
      recordExamResults(finalResults);
      setResults(finalResults);

      // 4. Build ExamHistoryRecord (4-part closed feedback structure)
      const allWords = getAllWords();
      const totalQuestions = finalResults.length;
      const passCount = finalResults.filter(r => r.isPass).length;
      const failCount = totalQuestions - passCount;
      const accuracy = totalQuestions > 0 ? Math.round((passCount / totalQuestions) * 100) : 0;

      let estimatedBand = '5.0 - 5.5';
      if (accuracy === 100) estimatedBand = '8.5 - 9.0';
      else if (accuracy >= 80) estimatedBand = '7.5 - 8.0';
      else if (accuracy >= 70) estimatedBand = '7.0';
      else if (accuracy >= 55) estimatedBand = '6.0 - 6.5';

      const now = Date.now();
      const pad = (n) => String(n).padStart(2, '0');
      const d = new Date(now);
      const formattedDate = `${pad(d.getHours())}:${pad(d.getMinutes())} - ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

      const feedbackItems = finalResults.map(r => {
        const wordObj = allWords.find(w => w.id === r.wordId || (w.word && r.targetWord && w.word.toLowerCase() === r.targetWord.toLowerCase()));
        const typeName = r.type === 'fill_blank'
          ? 'Điền từ vào chỗ trống'
          : r.type === 'reorder'
          ? 'Sắp xếp câu học thuật'
          : r.type === 'translate'
          ? 'Dịch câu Việt -> Anh'
          : 'Kiểm tra từ vựng';

        const aiFeedbackText = [r.feedback, r.grammarNotes, r.explanation].filter(Boolean).join(' ')
          || (r.isPass ? 'Câu trả lời chuẩn xác theo ngữ cảnh.' : 'Cần ôn luyện thêm ngữ pháp và cách dùng từ.');

        return {
          wordId: r.wordId || '',
          targetWord: r.targetWord || wordObj?.word || '',
          wordVi: wordObj?.vi || '',
          type: r.type,
          typeName,
          contextPrompt: r.prompt || '',
          userAnswer: r.userAnswer || '',
          isPass: r.isPass,
          score: r.score !== undefined ? r.score : (r.isPass ? 10 : 0),
          aiFeedback: aiFeedbackText,
          betterAlternative: r.betterAlternative || r.correctAnswer || '',
        };
      });

      const newHistoryRecord = {
        id: `exam_${now}_${Math.random().toString(36).substring(2, 7)}`,
        title: `Bài thi ${totalQuestions} từ - ${formattedDate}`,
        timestamp: now,
        formattedDate,
        topic: examSettings.topicFilter || 'all',
        totalQuestions,
        passCount,
        failCount,
        accuracy,
        estimatedBand,
        feedbackItems,
      };

      saveExamHistoryRecord(newHistoryRecord);
      setLatestSavedRecord(newHistoryRecord);
      setPhase('results');
    } catch (err) {
      console.error('Lỗi khi chấm điểm bài thi:', err);
      message.error('Lỗi trong quá trình chấm điểm. Đang hiển thị kết quả cơ bản.');
      setPhase('results');
    }
  };

  const handleRetake = () => {
    setQuestions([]);
    setResults([]);
    setSelectedHistoryRecord(null);
    setPhase('setup');
    setActiveTab('setup');
  };

  const handleExitExam = () => {
    setQuestions([]);
    setResults([]);
    setPhase('setup');
  };

  const handleViewInHistory = (record) => {
    const target = record || latestSavedRecord;
    setPhase('setup');
    setActiveTab('history');
    setSelectedHistoryRecord(target);
  };

  return (
    <div className="exam-page-wrapper">
      {/* Top Tab Bar: visible only when not taking an active test */}
      {phase === 'setup' && (
        <Flex justify="center" style={{ marginBottom: 20 }}>
          <Segmented
            size="large"
            value={activeTab}
            onChange={(val) => {
              setActiveTab(val);
              if (val === 'history') {
                setSelectedHistoryRecord(null);
              }
            }}
            options={[
              {
                label: (
                  <span style={{ padding: '0 8px', fontWeight: 600 }}>
                    📝 Tạo bài thi mới
                  </span>
                ),
                value: 'setup',
              },
              {
                label: (
                  <span style={{ padding: '0 8px', fontWeight: 600 }}>
                    🕒 Lịch sử bài thi ({examHistory.length})
                  </span>
                ),
                value: 'history',
              },
            ]}
            style={{
              background: 'rgba(22, 20, 42, 0.9)',
              padding: 4,
              borderRadius: 14,
              border: '1px solid rgba(124, 106, 247, 0.3)',
            }}
          />
        </Flex>
      )}

      {/* 1. SETUP / HISTORY PHASE */}
      {phase === 'setup' && (
        <>
          {activeTab === 'setup' ? (
            <ExamSetup
              onStartExam={handleStartExam}
              onBackToStudy={onBackToStudy}
            />
          ) : selectedHistoryRecord ? (
            <ExamHistoryDetail
              record={selectedHistoryRecord}
              onBackToList={() => setSelectedHistoryRecord(null)}
            />
          ) : (
            <ExamHistoryList
              onSelectRecord={(rec) => setSelectedHistoryRecord(rec)}
              onNewExam={() => {
                setSelectedHistoryRecord(null);
                setActiveTab('setup');
              }}
            />
          )}
        </>
      )}

      {/* 2. GENERATING PHASE */}
      {phase === 'generating' && (
        <Flex
          vertical
          align="center"
          justify="center"
          style={{ minHeight: '65vh', padding: 24 }}
        >
          <Card
            style={{
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              borderRadius: 20,
              background: 'rgba(22, 20, 42, 0.9)',
              border: '1px solid rgba(124, 106, 247, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
            styles={{ body: { padding: '40px 32px' } }}
          >
            <Flex vertical align="center" gap={20}>
              <Spin size="large" />
              <Flex vertical gap={6}>
                <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
                  AI Đang Biên Soạn Đề Thi IELTS...
                </Title>
                <Text type="secondary" style={{ fontSize: '0.9rem' }}>
                  Hệ thống đang cấu trúc các câu hỏi ngữ cảnh Band 7.5+ dựa trên danh sách từ vựng của bạn.
                </Text>
              </Flex>
            </Flex>
          </Card>
        </Flex>
      )}

      {/* 3. TAKING EXAM PHASE */}
      {phase === 'taking' && (
        <ExamRoom
          questions={questions}
          timerMode={examSettings.timerMode || 'none'}
          onSubmitExam={handleSubmitExam}
          onExitExam={handleExitExam}
        />
      )}

      {/* 4. EVALUATING / GRADING PHASE */}
      {phase === 'evaluating' && (
        <Flex
          vertical
          align="center"
          justify="center"
          style={{ minHeight: '65vh', padding: 24 }}
        >
          <Card
            style={{
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              borderRadius: 20,
              background: 'rgba(22, 20, 42, 0.9)',
              border: '1px solid rgba(46, 213, 115, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
            styles={{ body: { padding: '40px 32px' } }}
          >
            <Flex vertical align="center" gap={20}>
              <Spin size="large" />
              <Flex vertical gap={6}>
                <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
                  Giám Khảo AI Đang Chấm Điểm...
                </Title>
                <Text type="secondary" style={{ fontSize: '0.9rem' }}>
                  Đang phân tích độ chính xác, ngữ pháp và đối chiếu câu dịch của bạn theo chuẩn IELTS Band 8.5+.
                </Text>
              </Flex>
            </Flex>
          </Card>
        </Flex>
      )}

      {/* 5. RESULTS PHASE */}
      {phase === 'results' && (
        <ExamResult
          results={results}
          savedRecord={latestSavedRecord}
          onViewHistory={handleViewInHistory}
          onRetakeExam={handleRetake}
          onBackToStudy={onBackToStudy}
        />
      )}
    </div>
  );
}
