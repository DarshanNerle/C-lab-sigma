import React from 'react';
import { Calculator } from 'lucide-react';
import ScientificCalculatorPanel from '../components/tools/ScientificCalculatorPanel';

export default function ScientificCalculator() {
    const functionCatalog = [
        {
            title: 'Basic Arithmetic Functions',
            items: [
                'Addition +',
                'Subtraction −',
                'Multiplication ×',
                'Division ÷',
                'Percentage %',
                'Negative number (−)',
                'Reciprocal 1/x',
                'Square x²',
                'Cube x³',
                'Power xʸ',
                'Square root √',
                'Cube root ∛',
                'y-th root x√y',
                'Absolute value Abs',
                'Scientific notation ×10ⁿ',
                'Engineering notation ENG'
            ]
        },
        {
            title: 'Fraction Functions',
            items: [
                'Fraction input a b/c',
                'Improper fraction',
                'Mixed fraction',
                'Fraction simplification',
                'Fraction ↔ decimal conversion',
                'Fraction calculations'
            ]
        },
        {
            title: 'Logarithmic Functions',
            items: [
                'log',
                '10ˣ',
                'ln',
                'eˣ',
                'Logarithm with base conversion'
            ]
        },
        {
            title: 'Trigonometric Functions',
            items: [
                'Basic trig: sin, cos, tan',
                'Inverse trig: sin⁻¹, cos⁻¹, tan⁻¹',
                'Hyperbolic: sinh, cosh, tanh',
                'Inverse hyperbolic: sinh⁻¹, cosh⁻¹, tanh⁻¹'
            ]
        },
        {
            title: 'Angle Functions',
            items: [
                'Degree',
                'Radian',
                'Gradian',
                '° ′ ″ (Degree-Minute-Second)',
                'DMS ↔ Decimal conversion'
            ]
        },
        {
            title: 'Exponential & Power Functions',
            items: [
                'x²',
                'x³',
                'xʸ',
                '√x',
                '∛x',
                'x^(1/y)',
                '10ˣ',
                'eˣ'
            ]
        },
        {
            title: 'Combinatorics',
            items: [
                'nPr (Permutation)',
                'nCr (Combination)',
                'x! (Factorial)'
            ]
        },
        {
            title: 'Random Functions',
            items: [
                'Ran# (random number)',
                'Random integer'
            ]
        },
        {
            title: 'Coordinate Conversion',
            items: [
                'Pol( Rectangular → Polar',
                'Rec( Polar → Rectangular'
            ]
        },
        {
            title: 'Statistics Functions',
            items: [
                'Single-Variable: Mean (x̄), Sum (Σx), Sum of squares (Σx²)',
                'Standard deviation (σ)',
                'Sample standard deviation (s)',
                'Two-Variable: Σx, Σy, Σxy, Σx², Σy²',
                'Regression coefficients',
                'Linear regression',
                'Quadratic regression',
                'Exponential regression',
                'Logarithmic regression',
                'Power regression'
            ]
        },
        {
            title: 'Table Mode Functions',
            items: [
                'Generate table of values',
                'Define function f(x)',
                'Define function g(x)',
                'Choose start value',
                'Choose end value',
                'Choose step value'
            ]
        },
        {
            title: 'Memory Functions',
            items: [
                'Memory variables: A, B, C, D, E, F, X, Y, M',
                'Store value',
                'Recall value',
                'Add to memory',
                'Subtract from memory',
                'Clear memory'
            ]
        },
        {
            title: 'Replay & Editing Functions',
            items: [
                'Multi-Replay (edit previous calculations)',
                'Insert',
                'Delete',
                'Cursor movement'
            ]
        },
        {
            title: 'Prime & Number Functions',
            items: [
                'Prime factorization',
                'Integer calculations'
            ]
        },
        {
            title: 'Engineering Functions',
            items: [
                'ENG notation',
                'Shift engineering notation',
                'Convert powers of 10'
            ]
        },
        {
            title: 'Constants & Symbols',
            items: [
                'Constants: π (Pi), e (Euler number)',
                'Symbols: Parentheses ( ), Comma ,',
                'Variable names'
            ]
        },
        {
            title: 'Calculator Modes',
            items: [
                'COMP – normal calculations',
                'STAT – statistics calculations',
                'TABLE – generate function tables'
            ]
        },
        {
            title: 'Display Features',
            items: [
                'Natural textbook display',
                '2-line display',
                '10-digit mantissa + 2-digit exponent',
                'Dot matrix screen',
                'Multi-line expression display'
            ]
        },
        {
            title: 'Hardware Features',
            items: [
                'Slide-on hard case',
                'Battery powered (AAA)',
                'Non-programmable',
                '252 functions total'
            ]
        }
    ];

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            <Calculator className="h-4 w-4 text-cyan-300" />
                            Lab Tools
                        </div>
                        <h1 className="mt-2 text-2xl font-black text-white">Scientific Calculator</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Compact but capable: trig, logs, powers, memory, and quick scientific shortcuts.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-200">
                        Tip: Use <span className="font-semibold">ANS</span> to reuse your last result.
                    </div>
                </div>
            </div>

            <div className="flex justify-center">
                <ScientificCalculatorPanel />
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Function Catalog</div>
                        <h2 className="mt-2 text-xl font-black text-white">All Built-In Functions</h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Comprehensive list of supported operations, modes, and utilities.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                        Total: 252 functions
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {functionCatalog.map((section) => (
                        <div key={section.title} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{section.title}</div>
                            <ul className="mt-3 space-y-1 text-xs text-slate-300">
                                {section.items.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Quick Summary</div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">Arithmetic: 15+</div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">Fractions: 5</div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">Trigonometry: 12</div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">Logs & Exponent: 6</div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">Statistics: 40+</div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">Combinatorics: 3</div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">Memory: 9 variables</div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">Total: 252 functions</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
