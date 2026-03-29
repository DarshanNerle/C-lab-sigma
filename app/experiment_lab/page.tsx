"use client";

import { motion } from "framer-motion";
import { FlaskConical, Microscope, Activity, ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { H1, P } from "@/components/ui/Typography";

import { experiments } from "@/lib/experiments";

const EXPERIMENT_ICONS: Record<string, React.ReactNode> = {
  titration: <FlaskConical className="w-6 h-6 text-brand-teal" />,
  spectroscopy: <Activity className="w-6 h-6 text-brand-purple" />,
  stoichiometry: <Microscope className="w-6 h-6 text-brand-electricBlue" />,
};

export default function ExperimentsPage() {
  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-lab-border pb-6"
      >
        <div>
          <H1 className="text-brand-teal flex items-center gap-3">
            <FlaskConical className="w-8 h-8" />
            Laboratory Portal
          </H1>
          <P className="mt-2 text-gray-400">Select an experiment to begin your chemical simulation.</P>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center gap-2 bg-lab-card border border-lab-highlight px-4 py-2 rounded-lg backdrop-blur-sm">
          <Star className="w-4 h-4 text-brand-warmOrange" />
          <span className="text-sm font-medium">Level 3 Chemist</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {experiments.map((exp: any, idx: number) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
          >
            <Link href={`/experiment_lab/${exp.id}`}>
              <Card className="h-full hover:border-brand-teal/50 hover:bg-lab-highlight/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-teal/5 rounded-full blur-3xl group-hover:bg-brand-teal/10 transition-colors" />
                
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-lab-dark border border-lab-border flex items-center justify-center p-2 group-hover:scale-110 transition-transform shadow-lg">
                    {EXPERIMENT_ICONS[exp.id] || <FlaskConical className="w-6 h-6 text-brand-teal" />}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{exp.difficulty}</span>
                    <span className="text-xs text-brand-teal">{exp.time}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="relative z-10">
                  <CardTitle className="mt-2 text-xl">{exp.title}</CardTitle>
                  <p className="mt-3 text-sm text-gray-400 line-clamp-3 leading-relaxed">
                    {exp.description}
                  </p>
                  
                  <div className="mt-6 flex items-center text-sm font-medium text-brand-teal group-hover:text-brand-tealAccent">
                    Start Experiment 
                    <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
