"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", children, ...props }, ref) => {
    
    let variantStyles = "";
    if (variant === "primary") {
      variantStyles = "bg-brand-teal text-lab-dark hover:bg-brand-teal/90 shadow-[0_0_15px_rgba(0,212,170,0.3)]";
    } else if (variant === "secondary") {
      variantStyles = "bg-brand-purple text-white hover:bg-brand-purple/90 shadow-[0_0_15px_rgba(124,106,247,0.3)]";
    } else if (variant === "outline") {
      variantStyles = "border border-brand-teal text-brand-teal hover:bg-brand-teal/10";
    } else if (variant === "ghost") {
      variantStyles = "text-gray-300 hover:text-white hover:bg-white/5";
    }

    let sizeStyles = "";
    if (size === "sm") sizeStyles = "h-9 px-4 text-sm";
    if (size === "md") sizeStyles = "h-11 px-8 text-base";
    if (size === "lg") sizeStyles = "h-14 px-10 text-lg";

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:-ring-2 focus-visible:ring-brand-teal disabled:opacity-50 disabled:pointer-events-none ${variantStyles} ${sizeStyles} ${className}`}
        {...(props as any)}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
