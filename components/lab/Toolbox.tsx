"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  FlaskConical, 
  Beaker, 
  Thermometer, 
  Pipette, 
  Activity, 
  Search,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { INSTRUMENT_GROUPS, CHEMICAL_LIBRARY } from "@/lib/constants";
import { useLabStore } from "@/lib/store/useLabStore";

export function Toolbox() {
  const [activeTab, setActiveTab] = useState<"apparatus" | "chemicals">("apparatus");
  const [searchQuery, setSearchQuery] = useState("");
  const addInstance = useLabStore((state) => state.addInstance);

  const TABS = [
    { id: "apparatus", label: "Apparatus", icon: FlaskConical },
    { id: "chemicals", label: "Chemicals", icon: Activity },
  ];

  return (
    <div className="flex flex-col h-full bg-lab-card/50 backdrop-blur-xl border border-lab-border text-white">
      {/* Search Bar */}
      <div className="p-4 border-b border-lab-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search toolbox..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-lab-dark border border-lab-border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-teal transition-all"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-lab-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? "text-brand-teal" : "text-gray-400 hover:text-white"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-teal"
              />
            )}
          </button>
        ))}
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === "apparatus" ? (
            <motion.div
              key="apparatus"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-4 space-y-6"
            >
              {INSTRUMENT_GROUPS.map((group) => (
                <div key={group.id} className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <ChevronDown className="w-3 h-3" />
                    {group.title}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addInstance(item.id)}
                        className="group flex items-center gap-3 p-3 rounded-xl bg-lab-dark border border-lab-border hover:border-brand-teal/50 hover:bg-lab-highlight/30 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-lab-highlight border border-lab-border flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                          {/* We can maps these to specific icons later */}
                          <Beaker className="w-5 h-5 text-brand-teal" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.label}</p>
                          <p className="text-[10px] text-gray-500 truncate">{item.hint}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-brand-teal transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="chemicals"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-4 space-y-6"
            >
              {CHEMICAL_LIBRARY.map((category) => (
                <div key={category.id} className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {category.label}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {category.items.map((item) => (
                      <button
                        key={item.id}
                        className="group flex flex-col gap-1 p-3 rounded-xl bg-lab-dark border border-lab-border hover:border-brand-purple/50 hover:bg-lab-highlight/30 transition-all text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.name}</span>
                          <div 
                            className="w-3 h-3 rounded-full shadow-lg"
                            style={{ backgroundColor: item.color }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <span>{item.formula}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
