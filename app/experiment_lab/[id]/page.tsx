"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FlaskConical, 
  ChevronLeft, 
  Info, 
  MessageSquare, 
  Play, 
  FileText, 
  RotateCcw,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";

import { useLabStore } from "@/lib/store/useLabStore";
import { experiments } from "@/lib/experiments";
import { Toolbox } from "@/components/lab/Toolbox";
import { LabWorkspace } from "@/components/lab/LabWorkspace";
import { TutorPanel } from "@/components/lab/TutorPanel";
import { ObservationPanel } from "@/components/lab/ObservationPanel";
import { LabReportModal } from "@/components/lab/LabReportModal";
import { LabFeedbackModal } from "@/components/lab/LabFeedbackModal";
import { Button } from "@/components/ui/Button";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function ExperimentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { 
    selectedExperiment, 
    setExperiment, 
    resetLab, 
    instances,
    readings,
    meterValue 
  } = useLabStore();
  
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "procedure">("info");
  const [startTime] = useState(Date.now());

  const experiment = experiments.find((e) => e.id === id);

  useEffect(() => {
    if (experiment) {
      setExperiment(experiment);
    } else {
      router.push("/experiment_lab");
    }
  }, [id, experiment, setExperiment, router]);

  // Global event listeners for bot shortcuts
  useEffect(() => {
    const handleGenerateReport = () => {
      if (readings.length > 0) generateReport();
      else alert("Please add at least one reading to your observation log before generating a report.");
    };
    const handleResetLab = () => resetLab();

    window.addEventListener('clab-generate-report', handleGenerateReport);
    window.addEventListener('clab-reset-lab', handleResetLab);

    return () => {
      window.removeEventListener('clab-generate-report', handleGenerateReport);
      window.removeEventListener('clab-reset-lab', handleResetLab);
    };
  }, [readings, generateReport, resetLab]);

  const [isGenerating, setIsGenerating] = useState(false);

  async function generateReport() {
    if (!experiment) return;
    setIsGenerating(true);

    try {
      // Logic for AI-Powered Report Generation
      const response = await fetch('/api/lab-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentName: experiment.title,
          observations: readings,
          reactionLogs: [
            { timestamp: new Date().toISOString(), action: "Lab session completed", ph: meterValue }
          ]
        })
      });

      const data = await response.json();
      
      if (data.report) {
        setReportMarkdown(data.report);
      } else {
        throw new Error("No report content");
      }
    } catch (err) {
      console.warn("AI Generation failed, falling back to template:", err);
      // Fallback to static template
      const markdown = `
# Laboratory Report: ${experiment.title}
**Date:** ${new Date().toLocaleDateString()}
**Status:** Completed (Template Version)

## 1. Aim
${experiment.aim}

## 2. Theory
${experiment.theory}

## 4. Observations
${readings.map(r => `* Trial ${r.trial}: ${r.volumeUsed} mL (pH ${r.ph})`).join('\n')}

## 5. Conclusion
Experiment successfully records ${readings.length} data points. Final Mean Volume: ${(readings.reduce((acc, curr) => acc + parseFloat(curr.volumeUsed), 0) / (readings.length || 1)).toFixed(2)} mL.
      `;
      setReportMarkdown(markdown);
    } finally {
      setIsGenerating(false);
      setIsReportOpen(true);
    }

    console.log("Opening report modal and saving to history...");

    const historyData = {
      userId: auth?.currentUser?.uid || 'guest-user',
      userName: auth?.currentUser?.displayName || auth?.currentUser?.email?.split('@')[0] || 'Guest Student',
      experimentName: experiment.title,
      chemicalsUsed: experiment.chemicals || [],
      instrumentsUsed: Array.isArray(experiment.apparatus) ? experiment.apparatus : [],
      result: `Average volume: ${(readings.reduce((acc, curr) => acc + parseFloat(curr.volumeUsed), 0) / (readings.length || 1)).toFixed(2)} mL`,
      observation: `Completed experiment with ${readings.length} trials.`,
      score: 100,
      accuracy: 100,
      completedAt: new Date().toISOString(),
      duration: Math.max(1, Math.round((Date.now() - startTime) / 60000))
    };

    // Synchronize with Experiment History
    let savedToCloud = false;
    if (db) {
      try {
        await addDoc(collection(db, 'experiment_history'), {
          ...historyData,
          completedAt: serverTimestamp() // Use server time for cloud
        });
        console.log("Experiment saved to Firestore successfully.");
        savedToCloud = true;
      } catch (err) {
        console.error("Failed to save to Firestore, falling back to local storage:", err);
      }
    }

    // Always save to LocalStorage as a fallback/redundancy
    try {
      const existing = JSON.parse(localStorage.getItem('clab_history_fallback') || '[]');
      localStorage.setItem('clab_history_fallback', JSON.stringify([historyData, ...existing]));
      console.log("Experiment saved to local storage successfully.");
    } catch (err) {
      console.error("Critical: Failed to save to local storage:", err);
    }
  }

  if (!experiment) return null;

  const experimentContext = {
    experimentName: experiment.title,
    currentStep: "Setup",
    observations: `Instances: ${instances.length}, pH: ${meterValue.toFixed(2)}`,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4 p-2 sm:p-4">
      {/* Experiment Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-lab-card/30 backdrop-blur-md border border-lab-border p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <Link href="/experiments">
            <Button variant="outline" size="sm" className="rounded-xl border-lab-border hover:bg-lab-highlight w-10 p-0 overflow-hidden flex items-center justify-center">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase tracking-widest text-brand-teal font-bold">{experiment.difficulty}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{experiment.time}</span>
            </div>
            <h1 className="text-xl font-heading font-bold text-white flex items-center gap-2 leading-none">
              {experiment.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="flex-1 sm:flex-none border-lab-border hover:bg-lab-highlight text-gray-400"
            onClick={() => resetLab()}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            className="flex-1 sm:flex-none bg-brand-teal text-lab-dark hover:bg-brand-tealAccent font-bold"
            onClick={generateReport}
            disabled={readings.length === 0 || isGenerating}
          >
            <FileText className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isGenerating ? "Generating..." : "Generate Report"}</span>
            <span className="sm:hidden">{isGenerating ? "..." : "Report"}</span>
          </Button>
          <Button 
            variant="outline"
            className="flex-1 sm:flex-none border-brand-teal/30 hover:bg-brand-teal/5 text-brand-teal font-bold"
            onClick={() => setIsFeedbackOpen(true)}
          >
            Finish Lab
          </Button>
          <div className="w-px h-8 bg-lab-border mx-2 hidden sm:block" />
          <Button 
            onClick={() => setIsTutorOpen(true)}
            className="bg-brand-purple text-white hover:bg-brand-purple/90 relative"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Ask Cleo
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-teal rounded-full border-2 border-lab-dark" />
          </Button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
        {/* Left Side: Toolbox and Info */}
        <aside className="w-full lg:w-80 flex flex-col gap-4 overflow-hidden shrink-0">
          <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-lab-border shadow-2xl">
            <Toolbox />
          </div>
          
          <div className="h-64 sm:h-80 bg-lab-card/30 backdrop-blur-md border border-lab-border rounded-2xl p-4 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4 border-b border-lab-border pb-2">
              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveTab("info")}
                  className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "info" ? 'text-brand-teal' : 'text-gray-500 hover:text-white'}`}
                >
                  Info
                </button>
                <button 
                  onClick={() => setActiveTab("procedure")}
                  className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "procedure" ? 'text-brand-teal' : 'text-gray-500 hover:text-white'}`}
                >
                  Procedure
                </button>
              </div>
              <Info className="w-4 h-4 text-gray-500" />
            </div>
            
            <AnimatePresence mode="wait">
              {activeTab === "info" ? (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-xs font-heading font-semibold text-brand-teal mb-1">AIM</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{experiment.aim}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-heading font-semibold text-brand-purple mb-1">THEORY</h3>
                    <p className="text-sm text-gray-400 leading-relaxed italic line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
                      {experiment.theory}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="procedure"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-3"
                >
                  {experiment.procedure.map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-start group">
                      <span className="w-5 h-5 rounded bg-lab-highlight border border-lab-border flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:text-brand-teal group-hover:border-brand-teal/50 transition-colors shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-gray-400 leading-tight group-hover:text-gray-200 transition-colors">{step}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* Center: Dynamic Laboratory Workspace */}
        <main className="flex-1 relative flex flex-col gap-4 min-w-0">
          <div className="flex-1 relative bg-lab-dark rounded-3xl overflow-hidden shadow-2xl">
            <LabWorkspace />
            
            {/* Status HUD Overlay */}
            <div className="absolute bottom-6 left-6 right-6 flex justify-between pointer-events-none">
              <div className="flex gap-2">
                <div className="bg-lab-dark/80 backdrop-blur-md border border-lab-border px-4 py-2 rounded-xl shadow-xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">pH Level</span>
                  <span className="text-lg font-mono font-bold text-white">{meterValue.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="bg-brand-teal/10 backdrop-blur-md border border-brand-teal/30 px-4 py-2 rounded-xl shadow-xl text-[10px] font-bold text-brand-teal uppercase flex items-center gap-2">
                <Play className="w-3 h-3 fill-brand-teal" />
                Live Simulation Active
              </div>
            </div>
          </div>

          {/* Bottom Panel: Observations */}
          <div className="h-64 sm:h-72 shrink-0">
            <ObservationPanel />
          </div>
        </main>
      </div>

      {/* Socratic Tutor Panel */}
      <TutorPanel 
        isOpen={isTutorOpen} 
        onClose={() => setIsTutorOpen(false)} 
        experimentContext={experimentContext}
      />

      {/* Floating Action Button for Report */}
      {readings.length > 0 && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-32 right-6 z-50 sm:hidden"
        >
          <Button 
            onClick={generateReport}
            className="w-14 h-14 rounded-full bg-brand-teal text-lab-dark shadow-2xl flex items-center justify-center p-0"
          >
            <FileText className="w-6 h-6" />
          </Button>
        </motion.div>
      )}

      {/* Lab Report Modal */}
      <LabReportModal 
        isOpen={isReportOpen}
        onClose={() => {
          setIsReportOpen(false);
          // Automatic trigger for feedback after report viewing
          setTimeout(() => setIsFeedbackOpen(true), 500);
        }}
        reportMarkdown={reportMarkdown}
        experimentName={experiment.title}
      />

      {/* Lab Feedback Modal */}
      <LabFeedbackModal 
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        onSubmit={(data) => {
          console.log("Feedback data archived:", data);
          // Redirect to dashboard after a short delay
          setTimeout(() => router.push('/dashboard'), 1500);
        }}
        labName={experiment.title}
      />
    </div>
  );
}
