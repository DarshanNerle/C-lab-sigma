"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ReactionAnimationProps {
  isVisible: boolean;
  type?: "success" | "explosion" | "fizz";
  onComplete?: () => void;
}

export function ReactionAnimation({ isVisible, type = "success", onComplete }: ReactionAnimationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          onAnimationComplete={onComplete}
        >
          {type === "success" && (
            <motion.div
              className="w-32 h-32 rounded-full bg-brand-teal/30 blur-2xl flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(0,212,170,0.8)]"
              animate={{ 
                scale: [1, 1.5, 0],
                opacity: [0.8, 1, 0]
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              🎉
            </motion.div>
          )}

          {type === "explosion" && (
            <div className="relative">
              <motion.div
                className="absolute inset-0 w-40 h-40 rounded-full bg-brand-coralPink/50 blur-xl"
                animate={{ scale: [1, 3, 0], opacity: [1, 0] }}
                transition={{ duration: 0.8 }}
              />
              <motion.div
                className="w-40 h-40 rounded-full bg-brand-warmOrange blur-md mix-blend-screen"
                animate={{ scale: [0, 2, 0], opacity: [1, 0] }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          {type === "fizz" && (
            <div className="relative w-32 h-32">
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-white blur-[1px]"
                  style={{ left: "50%", bottom: "0%" }}
                  animate={{
                    y: [0, -100 - Math.random() * 50],
                    x: [(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 100],
                    opacity: [1, 0],
                    scale: [1, 0]
                  }}
                  transition={{
                    duration: 1 + Math.random(),
                    repeat: Infinity,
                    delay: Math.random() * 0.5
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
