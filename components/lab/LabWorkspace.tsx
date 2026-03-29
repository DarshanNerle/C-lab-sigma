"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLabStore } from "@/lib/store/useLabStore";
import { LabInstance } from "@/lib/types";
import { X, Trash2, RotateCcw } from "lucide-react";

export function LabWorkspace() {
  const { instances, updateInstance, removeInstance } = useLabStore((state) => ({
    instances: state.instances,
    updateInstance: state.updateInstance,
    removeInstance: state.removeInstance,
  }));

  return (
    <div className="relative w-full h-full bg-lab-dark/80 overflow-hidden rounded-3xl border border-lab-border shadow-inner group">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#5eead4_1px,transparent_1px)] [background-size:32px_32px]" />
      
      {/* Table Interface */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-lab-highlight/20 to-transparent pointer-events-none" />

      {/* Lab Items */}
      <div className="relative w-full h-full">
        <AnimatePresence>
          {instances.map((instance) => (
            <LabItem 
              key={instance.uid} 
              instance={instance} 
              onUpdate={(updates) => updateInstance(instance.uid, updates)}
              onRemove={() => removeInstance(instance.uid)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {instances.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-center p-10 opacity-30 select-none pointer-events-none">
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-500 mx-auto" />
            <p className="text-sm font-medium">Select apparatus from the toolbox to begin your experiment.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function LabItem({ 
  instance, 
  onUpdate, 
  onRemove 
}: { 
  instance: LabInstance; 
  onUpdate: (updates: Partial<LabInstance>) => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layoutId={instance.uid}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      drag
      dragMomentum={false}
      onDragEnd={(event, info) => {
        onUpdate({ x: instance.x + info.offset.x, y: instance.y + info.offset.y });
      }}
      className="absolute cursor-grab active:cursor-grabbing group/item"
      style={{ left: instance.x, top: instance.y }}
    >
      {/* Controls Overlay */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity bg-lab-dark/80 backdrop-blur-md rounded-lg border border-lab-border p-1 shadow-xl z-20">
        <button 
          onClick={onRemove}
          className="p-1.5 rounded-md hover:bg-red-500/20 text-red-500 transition-colors"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3 bg-lab-border mx-0.5" />
        <button 
          className="p-1.5 rounded-md hover:bg-brand-teal/20 text-brand-teal transition-colors"
          title="Controls"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Glassware Visualization */}
      <div className="relative select-none pointer-events-none">
        {/* Shadow */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-3 bg-black/40 blur-lg rounded-full" />
        
        {/* SVG Container */}
        <div className="relative">
          <svg
            width="120"
            height="140"
            viewBox="0 0 100 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-2xl"
          >
            {/* Liquid Level */}
            {instance.volume > 0 && (
              <motion.rect 
                x="15" 
                y={110 - (instance.volume / instance.capacity) * 80} 
                width="70" 
                height={(instance.volume / instance.capacity) * 80} 
                fill={instance.color} 
                fillOpacity="0.6"
                className="transition-all"
              />
            )}

            {/* Glass Outline */}
            <path
              d="M10 20V110C10 115.523 14.4772 120 20 120H80C85.5228 120 90 115.523 90 110V20"
              stroke="white"
              strokeWidth="2"
              strokeOpacity="0.3"
            />
            <path
              d="M10 20H90"
              stroke="white"
              strokeWidth="1"
              strokeOpacity="0.1"
            />
            
            {/* HUD / Label */}
            <foreignObject x="15" y="-30" width="70" height="30">
              <div className="text-[10px] font-bold text-center text-brand-teal drop-shadow-md">
                {instance.type.toUpperCase()}
              </div>
            </foreignObject>
          </svg>
        </div>
      </div>
    </motion.div>
  );
}
