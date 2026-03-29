import { FlaskConical, TestTube2, BrainCircuit, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-lab-dark text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pt-32 pb-20 mt-10 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-teal/10 via-lab-dark to-lab-dark blur-3xl" />
        
        <div className="inline-flex items-center space-x-2 px-3 py-1 mb-8 rounded-full bg-lab-highlight border border-lab-border text-brand-teal animate-fade-in">
          <FlaskConical className="w-4 h-4" />
          <span className="text-sm font-medium tracking-wide">C-LAB Sigma 2.0</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tight mb-8">
          The Future of <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal to-brand-purple">
            Chemistry Education
          </span>
        </h1>
        
        <p className="mt-6 text-xl text-gray-400 max-w-2xl mx-auto font-sans leading-relaxed">
          A premium, immersive laboratory experience powered by AI scaffolding, strict proctoring, and true-to-life mechanics.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link 
            href="/experiment_lab"
            className="group flex items-center gap-3 bg-brand-teal hover:bg-brand-tealAccent text-lab-dark font-black uppercase tracking-widest text-xs px-10 py-5 rounded-[2rem] transition-all duration-300 shadow-xl shadow-brand-teal/20"
          >
            Enter Laboratory
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="/exam"
            className="group flex items-center gap-3 border border-lab-border bg-lab-card/50 hover:bg-lab-highlight text-white font-black uppercase tracking-widest text-xs px-10 py-5 rounded-[2rem] transition-all duration-300 backdrop-blur-md"
          >
            Examination Hall
            <ShieldCheck className="w-4 h-4 text-brand-warmOrange group-hover:scale-110 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="w-full max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="p-8 rounded-[2.5rem] bg-lab-card/30 border border-lab-border backdrop-blur-md hover:border-brand-teal/50 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center mb-8 shadow-inner">
              <FlaskConical className="w-7 h-7 text-brand-teal" />
            </div>
            <h3 className="text-xl font-heading font-black mb-4 uppercase italic">True Mechanics</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Experience true-to-life chemical simulation, combining volumetric liquid handling with molar interaction mechanics.</p>
          </div>
          
          <div className="p-8 rounded-[2.5rem] bg-lab-card/30 border border-lab-border backdrop-blur-md hover:border-brand-purple/50 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center mb-8 shadow-inner">
              <BrainCircuit className="w-7 h-7 text-brand-purple" />
            </div>
            <h3 className="text-xl font-heading font-black mb-4 uppercase italic">AI Socratic Tutor</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Meet Cleo, your intelligent assistant that guides you through experiments using Socratic questioning without spoilers.</p>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-lab-card/30 border border-lab-border backdrop-blur-md hover:border-brand-warmOrange/50 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-brand-warmOrange/10 border border-brand-warmOrange/20 flex items-center justify-center mb-8 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-brand-warmOrange" />
            </div>
            <h3 className="text-xl font-heading font-black mb-4 uppercase italic">Examination Hall</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Strict proctored assessments with integrity monitoring, AI evaluation, and comprehensive scientific debriefing.</p>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-lab-card/30 border border-lab-border backdrop-blur-md hover:border-brand-electricBlue/50 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-brand-electricBlue/10 border border-brand-electricBlue/20 flex items-center justify-center mb-8 shadow-inner">
              <TestTube2 className="w-7 h-7 text-brand-electricBlue" />
            </div>
            <h3 className="text-xl font-heading font-black mb-4 uppercase italic">Curriculum Sync</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Aligns with academic standards, featuring full students analytics and automated lab report archival system.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
