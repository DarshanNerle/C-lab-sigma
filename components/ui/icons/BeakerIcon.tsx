"use client";

import * as React from "react";
import { motion } from "framer-motion";

interface BeakerIconProps extends React.SVGProps<SVGSVGElement> {
  active?: boolean;
}

export function BeakerIcon({ active = false, className = "", ...props }: BeakerIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M4.5 3h15" />
      <path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" />
      <path d="M6 14h12" />
      {active && (
        <>
          <motion.circle
            cx="9"
            cy="17"
            r="1"
            fill="currentColor"
            stroke="none"
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -10, opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          />
          <motion.circle
            cx="15"
            cy="18"
            r="1"
            fill="currentColor"
            stroke="none"
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -12, opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.circle
            cx="12"
            cy="16"
            r="1.5"
            fill="currentColor"
            stroke="none"
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -15, opacity: [0, 1, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.2 }}
          />
        </>
      )}
    </svg>
  );
}
