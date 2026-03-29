"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Download, 
  Upload, 
  FileText, 
  ShieldCheck, 
  Trash2, 
  History, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Button } from "@/components/ui/Button";
import { H1, P } from "@/components/ui/Typography";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function SettingsPage() {
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({
        message: '',
        type: null
    });

    const showStatus = (message: string, type: 'success' | 'error' | 'info') => {
        setStatus({ message, type });
        setTimeout(() => setStatus({ message: '', type: null }), 5000);
    };

    const handleBackup = () => {
        try {
            const data = {
                localStorage: { ...localStorage },
                timestamp: new Date().toISOString(),
                version: "2.5.0"
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clab-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showStatus("Core profile data backed up successfully.", "success");
        } catch (err) {
            showStatus("Failed to generate backup.", "error");
        }
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.localStorage) {
                    Object.entries(data.localStorage).forEach(([key, value]) => {
                        localStorage.setItem(key, value as string);
                    });
                    showStatus("Profile restored. Reloading session...", "success");
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    throw new Error("Invalid backup format");
                }
            } catch (err) {
                showStatus("Failed to restore. Critical file corruption detected.", "error");
            }
        };
        reader.readAsText(file);
    };

    const exportProgressPDF = async () => {
        const dashboardElement = document.getElementById('dashboard-view');
        if (!dashboardElement) {
            showStatus("Dashboard context not found. Navigate to Dashboard to export.", "info");
            return;
        }

        try {
            const canvas = await html2canvas(dashboardElement);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`clab-progress-${new Date().toISOString().split('T')[0]}.pdf`);
            showStatus("Progress document exported as PDF.", "success");
        } catch (err) {
            showStatus("PDF generation engine failed.", "error");
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-10 px-6">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 text-center sm:text-left"
            >
                <H1 className="text-brand-teal italic">Archive & Systems</H1>
                <P className="text-gray-400">Manage your laboratory progress, backups, and secure data exports.</P>
            </motion.div>

            {status.message && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`mb-8 p-4 rounded-xl flex items-center gap-3 border ${
                        status.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                        status.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        'bg-brand-teal/10 border-brand-teal/30 text-brand-teal'
                    }`}
                >
                    {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-bold uppercase tracking-widest italic italic">{status.message}</span>
                </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup & Recovery */}
                <Card className="border-brand-teal/20 bg-lab-highlight/5">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <Database className="w-5 h-5 text-brand-teal" />
                            <CardTitle className="text-sm uppercase tracking-widest italic italic">Profile Preservation</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <P className="text-xs text-gray-400 mt-0">Archive your local history and experiment data into a portable JSON format.</P>
                        <div className="flex flex-col gap-3 pt-4">
                            <Button onClick={handleBackup} className="w-full justify-between bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal border border-brand-teal/30">
                                <span>Generate Backup File</span>
                                <Download className="w-4 h-4 ml-2" />
                            </Button>
                            
                            <div className="relative">
                                <input 
                                    type="file" 
                                    accept=".json" 
                                    onChange={handleRestore}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                />
                                <Button variant="outline" className="w-full justify-between border-lab-border hover:bg-white/5">
                                    <span>Restore from Archive</span>
                                    <Upload className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Progress Export */}
                <Card className="border-brand-purple/20 bg-lab-highlight/5">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-brand-purple" />
                            <CardTitle className="text-sm uppercase tracking-widest italic italic">Progress Manifest</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <P className="text-xs text-gray-400 mt-0">Export a summary of your completed experiments and achievements as a formal document.</P>
                        <Button onClick={exportProgressPDF} className="w-full justify-between bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple border border-brand-purple/30 mt-4">
                            <span>Export Progress as PDF</span>
                            <Download className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Account Security */}
                <Card className="border-lab-border bg-lab-highlight/5 md:col-span-2">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <ShieldCheck className="w-5 h-5 text-brand-warmOrange" />
                            <CardTitle className="text-sm uppercase tracking-widest italic italic">Archival Maintenance</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex-1">
                            <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 italic italic italic">Purge Local Repository</h4>
                            <P className="text-xs text-gray-500 mt-0 italic italic italic italic">Resets all locally archived history and session preferences. This action is irreversible.</P>
                        </div>
                        <Button variant="outline" className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:border-red-500" onClick={() => {
                            if (confirm("PURGE ALL DATA? This will permanently erase your local experiment history.")) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            System Wipe
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            <div className="mt-12 pt-8 border-t border-lab-border text-center opacity-30">
                <span className="text-[10px] uppercase font-black tracking-[0.5em] text-gray-500 italic italic italic italic italic italic">Secure Archival Protocol Active</span>
            </div>
        </div>
    );
}
