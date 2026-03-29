import * as React from "react";
import Link from "next/link";
import { FlaskConical, LayoutDashboard, Settings, User, ShieldCheck } from "lucide-react";

export default function ExperimentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-lab-dark font-sans text-white">
      {/* Sidebar Navigation */}
      <aside className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full sm:translate-x-0 border-r border-lab-border bg-lab-card backdrop-blur-md">
        <div className="h-full px-3 py-4 overflow-y-auto">
          <div className="flex items-center pl-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-brand-teal/20 flex items-center justify-center mr-3">
              <FlaskConical className="w-5 h-5 text-brand-teal" />
            </div>
            <span className="self-center text-xl font-heading font-semibold whitespace-nowrap pt-1">
              C-LAB <span className="text-brand-teal text-sm ml-1 uppercase">Sigma</span>
            </span>
          </div>
          
          <ul className="space-y-2 font-medium">
            <li>
              <Link href="/dashboard" className="flex items-center p-3 text-gray-300 rounded-lg hover:bg-lab-highlight hover:text-white transition-colors group">
                <LayoutDashboard className="w-5 h-5 text-gray-400 group-hover:text-brand-teal transition-colors" />
                <span className="ms-3">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link href="/experiment_lab" className="flex items-center p-3 text-brand-teal bg-lab-highlight rounded-lg group border border-brand-teal/20">
                <FlaskConical className="w-5 h-5" />
                <span className="flex-1 ms-3 whitespace-nowrap">Experiment Lab</span>
                <span className="inline-flex items-center justify-center px-2 ms-3 text-sm font-medium text-lab-dark bg-brand-teal rounded-full">Pro</span>
              </Link>
            </li>
            <li>
              <Link href="/exam" className="flex items-center p-3 text-gray-300 rounded-lg hover:bg-lab-highlight hover:text-white transition-colors group">
                <ShieldCheck className="w-5 h-5 text-gray-400 group-hover:text-brand-warmOrange transition-colors" />
                <span className="ms-3">Examination Hall</span>
              </Link>
            </li>
            <li className="pt-4 mt-4 border-t border-lab-border space-y-2">
              <Link href="/profile" className="flex items-center p-3 text-gray-300 rounded-lg hover:bg-lab-highlight hover:text-white transition-colors group">
                <User className="w-5 h-5 text-gray-400 group-hover:text-brand-purple transition-colors" />
                <span className="flex-1 ms-3 whitespace-nowrap">Profile</span>
              </Link>
              <Link href="/settings" className="flex items-center p-3 text-gray-300 rounded-lg hover:bg-lab-highlight hover:text-white transition-colors group">
                <Settings className="w-5 h-5 text-gray-400 group-hover:text-brand-electricBlue transition-colors" />
                <span className="flex-1 ms-3 whitespace-nowrap">Settings</span>
              </Link>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:ml-64 relative min-h-screen">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-teal/5 via-lab-dark to-lab-dark pointer-events-none" />
        {children}
      </main>
    </div>
  );
}
