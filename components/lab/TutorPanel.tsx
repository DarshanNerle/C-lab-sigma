"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Network, FileText, RotateCcw } from "lucide-react";
import { BeakerIcon } from "@/components/ui/icons/BeakerIcon";

interface TutorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  experimentContext: {
    experimentName: string;
    currentStep: string;
    observations: string;
  };
}

export function TutorPanel({ isOpen, onClose, experimentContext }: TutorPanelProps) {
  const transport = React.useMemo(() => {
    return new DefaultChatTransport({
      api: "/api/tutor",
      body: experimentContext,
    });
  }, [experimentContext]);

  const { messages, status, sendMessage } = useChat({
    transport,
  });

  const [input, setInput] = React.useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-full sm:w-96 bg-lab-dark border-l border-lab-border shadow-2xl z-50 flex flex-col font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-lab-border bg-lab-card backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-brand-purple/20 border border-brand-purple/50 flex items-center justify-center">
                  <Network className="w-5 h-5 text-brand-purple" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-brand-teal rounded-full border-2 border-lab-dark animate-pulse" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-white">Cleo Tutor</h3>
                <p className="text-xs text-brand-teal">Socratic AI Active</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <BeakerIcon active className="w-16 h-16 text-brand-purple" />
                <p className="text-sm">Hi, I'm Cleo! I'm here to guide you through this experiment. Ask me anything.</p>
              </div>
            )}
            
            {messages.map((m) => {
              const textParts = m.parts?.filter((p: any) => p.type === 'text') || [];
              const textContent = textParts.map((p: any) => p.text).join('\n');
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed
                      ${m.role === 'user' 
                        ? 'bg-brand-teal text-lab-dark rounded-br-sm' 
                        : 'bg-lab-highlight border border-lab-border text-gray-200 rounded-bl-sm whitespace-pre-wrap'
                      }`}
                  >
                    {textContent}
                  </div>
                </motion.div>
              );
            })}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center space-x-2 text-brand-purple p-2"
              >
                <div className="w-2 h-2 rounded-full bg-brand-purple animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: "0.4s" }} />
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-lab-dark border-t border-lab-border">
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <input
                value={input}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Ask Cleo a question..."
                className="w-full bg-lab-card border border-lab-border rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-purple transition-all disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 rounded-lg bg-brand-purple text-white hover:bg-brand-purple/90 disabled:opacity-50 disabled:bg-lab-highlight disabled:text-gray-500 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            
            {/* Quick Actions in Tutor Panel */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button 
                onClick={() => {
                  // This is a bit of a hack to trigger the parent's function
                  // but in a real app we'd use a shared store or event bus.
                  (window as any).dispatchEvent(new CustomEvent('clab-generate-report'));
                }}
                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 bg-brand-teal/10 hover:bg-brand-teal/20 border border-brand-teal/30 rounded-full text-[10px] font-bold text-brand-teal transition-all"
              >
                <FileText className="w-3 h-3" />
                Generate Report
              </button>
              <button 
                onClick={() => (window as any).dispatchEvent(new CustomEvent('clab-reset-lab'))}
                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 bg-lab-highlight hover:bg-white/10 border border-lab-border rounded-full text-[10px] font-bold text-gray-400 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Lab
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

