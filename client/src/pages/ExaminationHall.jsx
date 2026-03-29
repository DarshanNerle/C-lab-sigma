import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Layers3,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trophy,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { examCategories, examStats, examTopics } from '../lib/exams';

async function requestExamFullscreen() {
  if (!document.documentElement.requestFullscreen) return true;

  try {
    await document.documentElement.requestFullscreen();
    return true;
  } catch {
    alert('STRICT MODE: Please grant fullscreen permission to start the exam.');
    return false;
  }
}

function exitExamFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

export default function ExaminationHall() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('selection');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [warnings, setWarnings] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categoryOptions = useMemo(() => ['All', ...examCategories], []);

  const filteredTopics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return examTopics.filter((topic) => {
      const categoryMatch = activeCategory === 'All' || topic.category === activeCategory;
      const searchMatch =
        !query ||
        topic.title.toLowerCase().includes(query) ||
        topic.description.toLowerCase().includes(query) ||
        topic.category.toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    });
  }, [activeCategory, searchQuery]);

  const resetExam = useCallback(() => {
    exitExamFullscreen();
    setSelectedTopic(null);
    setCurrentQuestionIdx(0);
    setAnswers([]);
    setWarnings(0);
    setPhase('selection');
  }, []);

  const disqualify = useCallback(() => {
    exitExamFullscreen();
    setPhase('disqualified');
  }, []);

  useEffect(() => {
    if (phase !== 'exam') return undefined;

    const preventCheat = (event) => event.preventDefault();
    const registerWarning = () => {
      setWarnings((previousWarnings) => {
        const nextWarnings = previousWarnings + 1;
        if (nextWarnings >= 2) disqualify();
        return nextWarnings;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') registerWarning();
    };

    const handleBlur = () => registerWarning();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) registerWarning();
    };

    window.addEventListener('contextmenu', preventCheat);
    window.addEventListener('copy', preventCheat);
    window.addEventListener('paste', preventCheat);
    document.addEventListener('selectstart', preventCheat);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('contextmenu', preventCheat);
      window.removeEventListener('copy', preventCheat);
      window.removeEventListener('paste', preventCheat);
      document.removeEventListener('selectstart', preventCheat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [disqualify, phase]);

  const startExam = useCallback(async (topic) => {
    const fullscreenGranted = await requestExamFullscreen();
    if (!fullscreenGranted) return;

    setSelectedTopic(topic);
    setAnswers(new Array(topic.questions.length).fill(-1));
    setCurrentQuestionIdx(0);
    setWarnings(0);
    setPhase('exam');
  }, []);

  const submitAnswer = (optionIdx) => {
    setAnswers((previousAnswers) => {
      const nextAnswers = [...previousAnswers];
      nextAnswers[currentQuestionIdx] = optionIdx;
      return nextAnswers;
    });
  };

  const nextQuestion = () => {
    if (!selectedTopic) return;
    if (currentQuestionIdx < selectedTopic.questions.length - 1) {
      setCurrentQuestionIdx((previousIndex) => previousIndex + 1);
      return;
    }
    exitExamFullscreen();
    setPhase('result');
  };

  const score = selectedTopic
    ? Math.round(
        (selectedTopic.questions.reduce((total, question, index) => {
          return total + (answers[index] === question.correctAnswer ? 1 : 0);
        }, 0) /
          selectedTopic.questions.length) *
          100
      )
    : 0;

  const answeredCount = answers.filter((answer) => answer !== -1).length;

  if (phase === 'selection') {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <motion.section
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.2),rgba(15,23,42,0.95)_45%)] p-8"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                Smart Assessment Library
              </div>
              <h1 className="text-4xl font-black uppercase italic text-white md:text-5xl">Examination Hall</h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Browse all 100 tests faster with category filters and search. Every exam now runs as a 12-question proctored assessment.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Tests</div>
                <div className="mt-2 text-3xl font-black text-cyan-300">{examStats.totalTests}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Categories</div>
                <div className="mt-2 text-3xl font-black text-white">{examStats.totalCategories}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Questions</div>
                <div className="mt-2 text-3xl font-black text-white">{examStats.questionsPerTest}</div>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tests by title, topic, or category..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-500/50"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.15em] text-white transition hover:bg-white/5"
            >
              Reset Filters
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {categoryOptions.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
                  activeCategory === category
                    ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                    : 'border-white/10 bg-slate-950/40 text-slate-300 hover:border-cyan-500/40 hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>{filteredTopics.length} tests showing</span>
            <span className="inline-flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-cyan-400" />
              Large-library mode enabled
            </span>
          </div>
        </section>

        {filteredTopics.length === 0 ? (
          <div className="mt-8 rounded-[1.75rem] border border-dashed border-white/10 bg-slate-900/30 px-6 py-16 text-center">
            <div className="text-xl font-black uppercase italic text-white">No matching tests</div>
            <p className="mt-2 text-sm text-slate-400">Try a different keyword or clear the category filter.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTopics.map((topic, idx) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.012, 0.24) }}
                className="h-full"
              >
                <div
                  className="group flex h-full cursor-pointer flex-col rounded-3xl border border-white/10 bg-slate-900/60 p-6 transition-all hover:-translate-y-1 hover:border-cyan-500/40"
                  onClick={() => startExam(topic)}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                      {topic.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold uppercase italic leading-tight text-white">{topic.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{topic.description}</p>
                  <div className="mt-8 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                      {topic.questions.length} Questions
                    </span>
                    <button
                      type="button"
                      className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 transition group-hover:bg-cyan-500 group-hover:text-slate-950"
                    >
                      Start Test
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase === 'disqualified') {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 rounded-full border border-red-500/30 bg-red-500/10 p-6">
          <ShieldAlert className="h-12 w-12 animate-pulse text-red-500" />
        </div>
        <h1 className="text-3xl font-black uppercase italic text-red-500">Assessment Terminated</h1>
        <p className="mt-4 max-w-md text-slate-400">
          Integrity checks detected repeated focus loss or fullscreen exit. Return to the lobby to start a fresh attempt.
        </p>
        <button
          type="button"
          onClick={resetExam}
          className="mt-8 flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/5"
        >
          <RotateCcw className="h-4 w-4" />
          Return to Lobby
        </button>
      </div>
    );
  }

  if (phase === 'exam' && selectedTopic) {
    const currentQuestion = selectedTopic.questions[currentQuestionIdx];

    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Subject</div>
              <div className="text-sm font-black italic text-white">{selectedTopic.title}</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Category</div>
              <div className="text-sm font-black italic text-cyan-400">{selectedTopic.category}</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Progress</div>
              <div className="text-sm font-black italic text-white">
                {answeredCount}/{selectedTopic.questions.length} Answered
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {warnings > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                <span className="text-[10px] font-black uppercase text-orange-500">Warning {warnings}/2</span>
              </div>
            )}
            <div className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
              Proctoring Active
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl"
          >
            <div className="mb-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
              Question {currentQuestionIdx + 1} of {selectedTopic.questions.length}
            </div>
            <h2 className="mb-10 text-2xl font-black uppercase italic leading-tight text-white">
              {currentQuestion.question}
            </h2>

            <div className="grid gap-4">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={`${currentQuestion.id}-${idx}`}
                  type="button"
                  onClick={() => submitAnswer(idx)}
                  className={`flex items-center justify-between rounded-2xl border p-6 text-left transition ${
                    answers[currentQuestionIdx] === idx
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                      : 'border-white/10 bg-slate-950/50 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <span className="font-bold">{option}</span>
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      answers[currentQuestionIdx] === idx ? 'border-cyan-500 bg-cyan-500' : 'border-slate-700'
                    }`}
                  >
                    {answers[currentQuestionIdx] === idx && <CheckCircle2 className="h-4 w-4 text-slate-950" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-12 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Secure Submission Terminal</p>
              <button
                type="button"
                disabled={answers[currentQuestionIdx] === -1}
                onClick={nextQuestion}
                className="flex items-center gap-2 rounded-2xl bg-cyan-500 px-8 py-4 font-black uppercase tracking-widest text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentQuestionIdx === selectedTopic.questions.length - 1 ? 'Finish Exam' : 'Next Question'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>

          <aside className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl">
            <div className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-white">Question Navigator</div>
            <p className="mb-5 text-xs text-slate-400">Jump between the 12 questions any time before final submission.</p>
            <div className="grid grid-cols-4 gap-3">
              {selectedTopic.questions.map((question, index) => {
                const isCurrent = index === currentQuestionIdx;
                const isAnswered = answers[index] !== -1;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(index)}
                    className={`flex h-12 items-center justify-center rounded-xl border text-sm font-black transition ${
                      isCurrent
                        ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                        : isAnswered
                          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                          : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-cyan-500/30'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (phase === 'result' && selectedTopic) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/60 p-10 backdrop-blur-xl">
          <div className="mb-12 flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <Trophy className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black uppercase italic text-white">Assessment Complete</h1>
            <div className="mt-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-300">
              {selectedTopic.category}
            </div>
            <div className="mt-6 flex flex-col items-center">
              <span className="text-7xl font-black italic text-cyan-400">{score}%</span>
              <span className="mt-2 text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Score</span>
            </div>
          </div>

          <div className="space-y-6">
            {selectedTopic.questions.map((question, index) => {
              const answeredCorrectly = answers[index] === question.correctAnswer;

              return (
                <div key={question.id} className="rounded-2xl border border-white/5 bg-slate-950/50 p-6">
                  <div className="flex gap-4">
                    {answeredCorrectly ? (
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-cyan-400" />
                    ) : (
                      <XCircle className="mt-1 h-5 w-5 shrink-0 text-red-500" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-bold uppercase italic text-white">{question.question}</h4>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Your Response</p>
                          <p className={`mt-1 text-sm font-bold ${answeredCorrectly ? 'text-cyan-400' : 'text-red-400'}`}>
                            {answers[index] === -1 ? 'No response' : question.options[answers[index]]}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Correct Answer</p>
                          <p className="mt-1 text-sm font-bold text-cyan-400">{question.options[question.correctAnswer]}</p>
                        </div>
                      </div>
                      <div className="mt-4 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4 text-xs italic text-slate-400">
                        <span className="mr-2 font-black uppercase tracking-wider text-cyan-400">Expert Insight:</span>
                        {question.explanation}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex gap-4">
            <button
              type="button"
              onClick={resetExam}
              className="flex-1 rounded-2xl bg-cyan-500 py-4 font-black uppercase tracking-widest text-slate-950 transition hover:bg-cyan-400"
            >
              Try Another Topic
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 rounded-2xl border border-white/10 py-4 font-black uppercase tracking-widest text-white transition hover:bg-white/5"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
