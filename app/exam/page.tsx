"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers3,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { H1, P } from "@/components/ui/Typography";
import { examCategories, examStats, examTopics, ExamTopic } from "@/lib/exams";

async function requestExamFullscreen() {
  if (!document.documentElement.requestFullscreen) return true;

  try {
    await document.documentElement.requestFullscreen();
    return true;
  } catch {
    alert("STRICT MODE: Please grant fullscreen permission to start the exam.");
    return false;
  }
}

function exitExamFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default function ExamPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"selection" | "exam" | "result" | "disqualified">("selection");
  const [selectedTopic, setSelectedTopic] = useState<ExamTopic | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [warnings, setWarnings] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categoryOptions = useMemo(() => ["All", ...examCategories], []);

  const filteredTopics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return examTopics.filter((topic) => {
      const categoryMatch = activeCategory === "All" || topic.category === activeCategory;
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
    setStartedAt(null);
    setFinishedAt(null);
    setPhase("selection");
  }, []);

  const disqualify = useCallback(() => {
    exitExamFullscreen();
    setFinishedAt(Date.now());
    setPhase("disqualified");
  }, []);

  useEffect(() => {
    if (phase !== "exam") return undefined;

    const preventCheat = (event: Event) => event.preventDefault();
    const registerWarning = () => {
      setWarnings((previousWarnings) => {
        const nextWarnings = previousWarnings + 1;
        if (nextWarnings >= 2) disqualify();
        return nextWarnings;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") registerWarning();
    };

    const handleBlur = () => registerWarning();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) registerWarning();
    };

    window.addEventListener("contextmenu", preventCheat);
    window.addEventListener("copy", preventCheat);
    window.addEventListener("paste", preventCheat);
    document.addEventListener("selectstart", preventCheat);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("contextmenu", preventCheat);
      window.removeEventListener("copy", preventCheat);
      window.removeEventListener("paste", preventCheat);
      document.removeEventListener("selectstart", preventCheat);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [disqualify, phase]);

  const startExam = useCallback(async (topic: ExamTopic) => {
    const fullscreenGranted = await requestExamFullscreen();
    if (!fullscreenGranted) return;

    setSelectedTopic(topic);
    setAnswers(new Array(topic.questions.length).fill(-1));
    setCurrentQuestionIdx(0);
    setWarnings(0);
    setStartedAt(Date.now());
    setFinishedAt(null);
    setPhase("exam");
  }, []);

  const submitAnswer = (optionIdx: number) => {
    setAnswers((previousAnswers) => {
      const nextAnswers = [...previousAnswers];
      nextAnswers[currentQuestionIdx] = optionIdx;
      return nextAnswers;
    });
  };

  const finishExam = useCallback(() => {
    exitExamFullscreen();
    setFinishedAt(Date.now());
    setPhase("result");
  }, []);

  const nextQuestion = () => {
    if (!selectedTopic) return;
    if (currentQuestionIdx < selectedTopic.questions.length - 1) {
      setCurrentQuestionIdx((previousIndex) => previousIndex + 1);
      return;
    }
    finishExam();
  };

  const score = useMemo(() => {
    if (!selectedTopic) return 0;
    const correctAnswers = selectedTopic.questions.reduce((total, question, index) => {
      return total + (answers[index] === question.correctAnswer ? 1 : 0);
    }, 0);
    return Math.round((correctAnswers / selectedTopic.questions.length) * 100);
  }, [answers, selectedTopic]);

  const completionTime = useMemo(() => {
    if (!startedAt || !finishedAt) return null;
    return formatDuration(finishedAt - startedAt);
  }, [finishedAt, startedAt]);

  const answeredCount = answers.filter((answer) => answer !== -1).length;

  if (phase === "selection") {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <motion.section
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] border border-lab-border bg-[radial-gradient(circle_at_top_left,rgba(0,212,170,0.16),rgba(10,15,26,0.95)_46%)] p-8"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-teal/20 bg-brand-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-brand-teal">
                <Sparkles className="h-3.5 w-3.5" />
                Smart Assessment Library
              </div>
              <H1 className="uppercase italic text-white">Examination Hall</H1>
              <P className="mt-3 max-w-2xl text-gray-300">
                Browse all 100 tests faster with category filters and search. Every exam now runs as a 12-question proctored assessment.
              </P>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Tests</div>
                <div className="mt-2 text-3xl font-black text-brand-teal">{examStats.totalTests}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Categories</div>
                <div className="mt-2 text-3xl font-black text-white">{examStats.totalCategories}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Questions</div>
                <div className="mt-2 text-3xl font-black text-white">{examStats.questionsPerTest}</div>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="mt-8 rounded-[1.75rem] border border-lab-border bg-lab-card/30 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tests by title, topic, or category..."
                className="w-full rounded-2xl border border-lab-border bg-lab-dark/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-brand-teal/50"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              className="border-lab-border hover:bg-lab-highlight"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
            >
              Reset Filters
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {categoryOptions.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
                  activeCategory === category
                    ? "border-brand-teal bg-brand-teal text-lab-dark"
                    : "border-lab-border bg-lab-dark/40 text-gray-300 hover:border-brand-teal/40 hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between text-xs font-semibold text-gray-400">
            <span>{filteredTopics.length} tests showing</span>
            <span className="inline-flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-brand-teal" />
              Large-library mode enabled
            </span>
          </div>
        </section>

        {filteredTopics.length === 0 ? (
          <div className="mt-8 rounded-[1.75rem] border border-dashed border-lab-border bg-lab-card/20 px-6 py-16 text-center">
            <div className="text-xl font-black uppercase italic text-white">No matching tests</div>
            <p className="mt-2 text-sm text-gray-400">Try a different keyword or clear the category filter.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTopics.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.012, 0.24) }}
              >
                <Card
                  className="group flex h-full cursor-pointer flex-col overflow-hidden border-lab-border bg-lab-highlight/5 transition-all hover:-translate-y-1 hover:border-brand-teal/40"
                  onClick={() => startExam(topic)}
                >
                  <CardHeader>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-teal/20 bg-brand-teal/10 text-brand-teal">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300">
                        {topic.category}
                      </span>
                    </div>
                    <CardTitle className="text-xl uppercase italic leading-tight">{topic.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <P className="mt-0 flex-1 text-sm leading-relaxed text-gray-400">{topic.description}</P>
                    <div className="mt-8 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">
                        {topic.questions.length} Questions
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-full border border-brand-teal/25 bg-brand-teal/10 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-brand-teal shadow-none hover:bg-brand-teal hover:text-lab-dark"
                      >
                        Start Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase === "disqualified") {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10"
        >
          <ShieldAlert className="h-12 w-12 animate-pulse text-red-500" />
        </motion.div>
        <H1 className="text-red-500">Assessment Terminated</H1>
        <P className="mt-4 max-w-md text-gray-400">
          Integrity checks detected repeated focus loss or fullscreen exit. Return to the lobby to start a fresh attempt.
        </P>
        <Button variant="outline" className="mt-8 border-lab-border hover:bg-lab-highlight" onClick={resetExam}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Return to Lobby
        </Button>
      </div>
    );
  }

  if (phase === "exam" && selectedTopic) {
    const currentQuestion = selectedTopic.questions[currentQuestionIdx];

    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 rounded-[1.75rem] border border-lab-border bg-lab-card/30 p-5 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Subject</div>
              <div className="text-sm font-black italic text-white">{selectedTopic.title}</div>
            </div>
            <div className="h-8 w-px bg-lab-border" />
            <div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Category</div>
              <div className="text-sm font-black italic text-brand-teal">{selectedTopic.category}</div>
            </div>
            <div className="h-8 w-px bg-lab-border" />
            <div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Progress</div>
              <div className="text-sm font-black italic text-white">
                {answeredCount}/{selectedTopic.questions.length} Answered
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {warnings > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-black uppercase text-amber-500">Warning {warnings}/2</span>
              </div>
            )}
            <div className="rounded-full border border-brand-teal/25 bg-brand-teal/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-brand-teal">
              Proctoring Active
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-[2rem] border border-lab-border bg-lab-card/30 p-8 backdrop-blur-xl"
          >
            <div className="mb-6 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
              Question {currentQuestionIdx + 1} of {selectedTopic.questions.length}
            </div>
            <h2 className="mb-10 text-2xl font-heading font-black uppercase italic leading-tight text-white">
              {currentQuestion.question}
            </h2>

            <div className="grid gap-4">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={`${currentQuestion.id}-${idx}`}
                  type="button"
                  onClick={() => submitAnswer(idx)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-6 text-left transition-all ${
                    answers[currentQuestionIdx] === idx
                      ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
                      : "border-lab-border bg-lab-card/50 text-gray-300 hover:border-gray-500 hover:bg-lab-highlight/40"
                  }`}
                >
                  <span className="font-medium">{option}</span>
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      answers[currentQuestionIdx] === idx ? "border-brand-teal bg-brand-teal" : "border-gray-700"
                    }`}
                  >
                    {answers[currentQuestionIdx] === idx && <CheckCircle2 className="h-4 w-4 text-lab-dark" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-12 flex items-center justify-between">
              <P className="mt-0 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Secure Submission Terminal
              </P>
              <Button
                type="button"
                disabled={answers[currentQuestionIdx] === -1}
                onClick={nextQuestion}
                className="rounded-2xl px-8 py-6 font-black uppercase tracking-widest shadow-xl shadow-brand-teal/20"
              >
                {currentQuestionIdx === selectedTopic.questions.length - 1 ? "Finish Exam" : "Next Question"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          <aside className="rounded-[2rem] border border-lab-border bg-lab-card/30 p-6 backdrop-blur-xl">
            <div className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-white">Question Navigator</div>
            <p className="mb-5 text-xs text-gray-400">Jump between the 12 questions any time before final submission.</p>
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
                        ? "border-brand-teal bg-brand-teal text-lab-dark"
                        : isAnswered
                          ? "border-brand-teal/30 bg-brand-teal/10 text-brand-teal"
                          : "border-lab-border bg-lab-dark/60 text-gray-300 hover:border-brand-teal/30"
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

  if (phase === "result" && selectedTopic) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-lab-border bg-lab-card/30 p-10 backdrop-blur-xl"
        >
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-brand-teal to-transparent opacity-50" />

          <div className="mb-12 flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-brand-teal/20 bg-brand-teal/10">
              <Trophy className="h-10 w-10 text-brand-teal" />
            </div>
            <H1 className="text-3xl">Performance Certificate</H1>
            <div className="mt-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-gray-300">
              {selectedTopic.category}
            </div>
            <div className="mt-6 flex flex-col items-center">
              <span className="text-7xl font-black italic text-brand-teal">{score}%</span>
              <span className="mt-2 text-xs font-black uppercase tracking-[0.5em] text-gray-500">Score</span>
            </div>
            {completionTime && (
              <div className="mt-5 flex items-center gap-2 rounded-full border border-lab-border bg-lab-highlight/30 px-4 py-2 text-xs font-semibold text-gray-300">
                <Clock className="h-4 w-4 text-brand-teal" />
                Completed in {completionTime}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {selectedTopic.questions.map((question, index) => {
              const answeredCorrectly = answers[index] === question.correctAnswer;

              return (
                <div key={question.id} className="rounded-2xl border border-lab-border/50 bg-lab-dark/50 p-6">
                  <div className="flex items-start gap-4">
                    {answeredCorrectly ? (
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand-teal" />
                    ) : (
                      <XCircle className="mt-1 h-5 w-5 shrink-0 text-red-400" />
                    )}
                    <div className="flex-1 space-y-4">
                      <h4 className="font-bold leading-tight uppercase italic text-white">{question.question}</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Your Response
                          </span>
                          <div
                            className={`rounded-lg border p-3 text-xs font-bold ${
                              answeredCorrectly
                                ? "border-brand-teal/20 bg-brand-teal/5 text-brand-teal"
                                : "border-red-500/20 bg-red-500/5 text-red-400"
                            }`}
                          >
                            {answers[index] === -1 ? "No response" : question.options[answers[index]]}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand-teal">
                            Correct Answer
                          </span>
                          <div className="rounded-lg border border-brand-teal/20 bg-brand-teal/5 p-3 text-xs font-bold text-brand-teal">
                            {question.options[question.correctAnswer]}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-lab-border bg-lab-highlight/20 p-4 text-xs italic text-gray-400">
                        <strong className="mr-2 uppercase tracking-widest text-brand-teal">Explanation:</strong>
                        {question.explanation}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row">
            <Button onClick={resetExam} className="flex-1">
              New Assessment
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")} className="flex-1 border-lab-border hover:bg-lab-highlight">
              Back to Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
