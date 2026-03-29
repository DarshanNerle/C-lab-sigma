"use client";

import { motion } from "framer-motion";
import { NotebookPen, Table, Activity, TrendingUp, Download, Trash2 } from "lucide-react";
import { useLabStore } from "@/lib/store/useLabStore";
import { Button } from "@/components/ui/Button";

export function ObservationPanel() {
  const { readings, clearReadings, meterValue, addReading } = useLabStore();

  return (
    <div className="flex flex-col h-full bg-lab-card/30 backdrop-blur-md border border-lab-border rounded-2xl overflow-hidden text-white font-sans">
      {/* Header */}
      <div className="p-4 border-b border-lab-border flex items-center justify-between bg-lab-highlight/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-teal/20 border border-brand-teal/50 flex items-center justify-center">
            <NotebookPen className="w-4 h-4 text-brand-teal" />
          </div>
          <h3 className="font-heading font-semibold text-sm">Observation Log</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="h-8 bg-brand-teal text-lab-dark hover:bg-brand-tealAccent font-bold text-[10px] uppercase tracking-wider"
            onClick={() => {
              const nextTrial = readings.length + 1;
              const volumeUsed = (Math.random() * 2 + 9).toFixed(2); // Mock volume for now
              addReading({
                id: Date.now().toString(),
                trial: nextTrial,
                initialReading: "0.00",
                finalReading: volumeUsed,
                volumeUsed: volumeUsed,
                ph: meterValue.toFixed(2),
                conductivity: "0.05",
              });
            }}
          >
            <Table className="w-3 h-3 mr-1.5" />
            Add Reading
          </Button>
          {readings.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 border-lab-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all text-[10px] font-bold uppercase tracking-wider"
              onClick={clearReadings}
            >
              <Trash2 className="w-3 h-3 mr-1.5" />
              Clear All
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 border-lab-border hover:bg-lab-highlight text-[10px] font-bold uppercase tracking-wider"
          >
            <Download className="w-3 h-3 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Real-time Meter HUD */}
      <div className="px-4 py-3 bg-gradient-to-r from-brand-teal/10 to-transparent border-b border-lab-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-brand-teal animate-pulse" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Meter Output</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-gray-500 font-bold uppercase">pH</span>
            <span className="text-sm font-mono font-bold text-brand-teal">{meterValue.toFixed(2)}</span>
          </div>
          <div className="w-px h-6 bg-lab-border" />
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-gray-500 font-bold uppercase">Temp</span>
            <span className="text-sm font-mono font-bold text-brand-purple">25°C</span>
          </div>
        </div>
      </div>

      {/* Observation Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {readings.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
            <Table className="w-8 h-8 mb-3 text-gray-500" />
            <p className="text-xs">No readings recorded yet.</p>
            <p className="text-[10px] mt-1 text-gray-600 italic">Data will appear here once you perform a titration.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-lab-dark z-10">
              <tr className="border-b border-lab-border">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Trial</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Initial (mL)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Final (mL)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vol Used</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">pH</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading, idx) => (
                <motion.tr 
                  key={reading.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-lab-border/50 hover:bg-lab-highlight/10 transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-bold text-brand-teal">{reading.trial}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{reading.initialReading}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{reading.finalReading}</td>
                  <td className="px-4 py-3 text-xs font-mono text-white font-bold">{reading.volumeUsed}</td>
                  <td className="px-4 py-3 text-xs font-mono text-brand-purple text-right">{reading.ph}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer / Summary Stats */}
      {readings.length > 0 && (
        <div className="p-3 bg-lab-highlight/10 border-t border-lab-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-brand-teal" />
            <span className="text-[10px] font-bold text-gray-400">Mean Volume:</span>
            <span className="text-[10px] font-bold text-white">
              {(readings.reduce((acc, curr) => acc + parseFloat(curr.volumeUsed), 0) / readings.length).toFixed(2)} mL
            </span>
          </div>
          <span className="text-[10px] font-bold text-gray-500 italic">
            {readings.length} reading{readings.length > 1 ? 's' : ''} captured
          </span>
        </div>
      )}
    </div>
  );
}
