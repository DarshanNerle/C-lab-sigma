
import React, { useMemo, useState } from 'react';
import { Calculator, X } from 'lucide-react';

const ANGLE_MODES = {
    DEG: 'DEG',
    RAD: 'RAD',
    GRAD: 'GRAD'
};

const OPERATORS = {
    '+': { precedence: 1, assoc: 'L', fn: (a, b) => a + b },
    '-': { precedence: 1, assoc: 'L', fn: (a, b) => a - b },
    '*': { precedence: 2, assoc: 'L', fn: (a, b) => a * b },
    '/': { precedence: 2, assoc: 'L', fn: (a, b) => a / b },
    '^': { precedence: 3, assoc: 'R', fn: (a, b) => Math.pow(a, b) },
    'u-': { precedence: 4, assoc: 'R', unary: true, fn: (a) => -a },
    'u+': { precedence: 4, assoc: 'R', unary: true, fn: (a) => a },
    '!': { precedence: 5, assoc: 'L', unary: true, postfix: true, fn: (a) => factorial(a) },
    '%': { precedence: 5, assoc: 'L', unary: true, postfix: true, fn: (a) => a / 100 }
};

function factorial(value) {
    if (!Number.isFinite(value)) return NaN;
    if (value < 0 || Math.floor(value) !== value) return NaN;
    let result = 1;
    for (let i = 2; i <= value; i += 1) {
        result *= i;
    }
    return result;
}

function toInteger(value) {
    if (!Number.isFinite(value)) return NaN;
    return Math.trunc(value);
}

function combination(n, r) {
    const nInt = toInteger(n);
    const rInt = toInteger(r);
    if (!Number.isFinite(nInt) || !Number.isFinite(rInt)) return NaN;
    if (nInt < 0 || rInt < 0 || rInt > nInt) return NaN;
    const k = Math.min(rInt, nInt - rInt);
    let result = 1;
    for (let i = 1; i <= k; i += 1) {
        result = (result * (nInt - k + i)) / i;
    }
    return result;
}

function permutation(n, r) {
    const nInt = toInteger(n);
    const rInt = toInteger(r);
    if (!Number.isFinite(nInt) || !Number.isFinite(rInt)) return NaN;
    if (nInt < 0 || rInt < 0 || rInt > nInt) return NaN;
    let result = 1;
    for (let i = 0; i < rInt; i += 1) {
        result *= nInt - i;
    }
    return result;
}

function gcdCalc(a, b) {
    let x = Math.abs(toInteger(a));
    let y = Math.abs(toInteger(b));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return NaN;
    while (y !== 0) {
        const temp = y;
        y = x % y;
        x = temp;
    }
    return x;
}

function lcmCalc(a, b) {
    const x = toInteger(a);
    const y = toInteger(b);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return NaN;
    if (x === 0 || y === 0) return 0;
    return Math.abs(x * y) / gcdCalc(x, y);
}

function normalizeValue(value) {
    if (value && typeof value === 'object' && 'value' in value) return value.value;
    return value;
}

function createDisplayValue(value, display) {
    return { value, display };
}

function formatFraction(numerator, denominator) {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 'Error';
    if (denominator === 0) return 'Error';
    const sign = numerator * denominator < 0 ? '-' : '';
    const n = Math.abs(toInteger(numerator));
    const d = Math.abs(toInteger(denominator));
    const factor = gcdCalc(n, d);
    const simpleN = n / factor;
    const simpleD = d / factor;
    if (simpleD === 1) return `${sign}${simpleN}`;
    return `${sign}${simpleN}/${simpleD}`;
}

function approximateFraction(value, maxDenominator = 1000000) {
    const x = normalizeValue(value);
    if (!Number.isFinite(x)) return null;
    let h1 = 1;
    let h2 = 0;
    let k1 = 0;
    let k2 = 1;
    let b = x;
    for (let i = 0; i < 25; i += 1) {
        const a = Math.floor(b);
        const h = a * h1 + h2;
        const k = a * k1 + k2;
        if (k > maxDenominator) break;
        h2 = h1;
        h1 = h;
        k2 = k1;
        k1 = k;
        const frac = b - a;
        if (frac === 0) break;
        b = 1 / frac;
    }
    return { numerator: h1, denominator: k1 };
}

function formatDms(deg) {
    const value = normalizeValue(deg);
    if (!Number.isFinite(value)) return 'Error';
    const sign = value < 0 ? '-' : '';
    let remaining = Math.abs(value);
    const d = Math.floor(remaining);
    remaining = (remaining - d) * 60;
    const m = Math.floor(remaining);
    const s = (remaining - m) * 60;
    return `${sign}${d}°${m}'${s.toFixed(2)}"`;
}

function formatScientific(value, digits = 6) {
    const num = normalizeValue(value);
    if (!Number.isFinite(num)) return 'Error';
    if (num === 0) return '0';
    const exp = Math.floor(Math.log10(Math.abs(num)));
    const mantissa = num / Math.pow(10, exp);
    const fixed = Number.parseFloat(mantissa.toFixed(digits)).toString();
    return `${fixed}x10^${exp}`;
}

function formatEngineering(value, shift = 0, digits = 6) {
    const num = normalizeValue(value);
    if (!Number.isFinite(num)) return 'Error';
    if (num === 0) return '0';
    let exp = Math.floor(Math.log10(Math.abs(num)));
    exp = exp - (exp % 3) + shift * 3;
    const mantissa = num / Math.pow(10, exp);
    const fixed = Number.parseFloat(mantissa.toFixed(digits)).toString();
    return `${fixed}x10^${exp}`;
}

function primeFactorization(value) {
    const n = toInteger(value);
    if (!Number.isFinite(n)) return 'Error';
    if (n === 0) return '0';
    if (Math.abs(n) === 1) return n.toString();
    let remaining = Math.abs(n);
    const factors = [];
    let divisor = 2;
    while (divisor * divisor <= remaining) {
        let count = 0;
        while (remaining % divisor === 0) {
            remaining /= divisor;
            count += 1;
        }
        if (count > 0) {
            factors.push(count === 1 ? `${divisor}` : `${divisor}^${count}`);
        }
        divisor += divisor === 2 ? 1 : 2;
    }
    if (remaining > 1) factors.push(`${remaining}`);
    const prefix = n < 0 ? '-1*' : '';
    return `${prefix}${factors.join('*')}`;
}

function formatResult(value) {
    if (value && typeof value === 'object' && 'display' in value) return value.display;
    if (typeof value === 'string') return value;
    if (!Number.isFinite(value)) return 'Error';
    const abs = Math.abs(value);
    if (abs !== 0 && (abs >= 1e9 || abs < 1e-6)) {
        return value.toExponential(6).replace(/\.0+e/, 'e').replace(/e\+?/, 'e');
    }
    const normalized = Number.parseFloat(value.toPrecision(12));
    return normalized.toString();
}

function tokenize(input) {
    const tokens = [];
    let i = 0;
    while (i < input.length) {
        const ch = input[i];
        if (ch === ' ' || ch === '\t') {
            i += 1;
            continue;
        }
        if (/[0-9.]/.test(ch)) {
            let num = '';
            let dotCount = 0;
            while (i < input.length && /[0-9.]/.test(input[i])) {
                if (input[i] === '.') {
                    dotCount += 1;
                    if (dotCount > 1) break;
                }
                num += input[i];
                i += 1;
            }
            if (num === '.') {
                num = '0.';
            }
            tokens.push({ type: 'number', value: Number(num) });
            continue;
        }
        if (/[a-zA-Z]/.test(ch)) {
            let name = '';
            while (i < input.length && /[a-zA-Z]/.test(input[i])) {
                name += input[i];
                i += 1;
            }
            tokens.push({ type: 'identifier', value: name });
            continue;
        }
        if (ch === ',') {
            tokens.push({ type: 'comma', value: ',' });
            i += 1;
            continue;
        }
        if ('+-*/^()!%'.includes(ch)) {
            const type = ch === '(' || ch === ')' ? 'paren' : 'operator';
            tokens.push({ type, value: ch });
            i += 1;
            continue;
        }
        throw new Error(`Invalid character: ${ch}`);
    }
    return tokens;
}

function toRpn(tokens, constants, functionDefs) {
    const output = [];
    const stack = [];
    const argCountStack = [];
    let prevToken = null;

    for (let idx = 0; idx < tokens.length; idx += 1) {
        const token = tokens[idx];
        if (token.type === 'number') {
            output.push(token);
            prevToken = token;
            continue;
        }
        if (token.type === 'identifier') {
            const raw = token.value;
            const lower = raw.toLowerCase();
            if (constants[raw] !== undefined) {
                output.push({ type: 'number', value: constants[raw] });
                prevToken = token;
                continue;
            }
            if (constants[lower] !== undefined) {
                output.push({ type: 'number', value: constants[lower] });
                prevToken = token;
                continue;
            }
            if (functionDefs[lower]) {
                stack.push({ type: 'function', value: lower });
                argCountStack.push(0);
                prevToken = token;
                continue;
            }
            throw new Error(`Unknown identifier: ${token.value}`);
        }
        if (token.type === 'comma') {
            while (stack.length && stack[stack.length - 1].value !== '(') {
                output.push(stack.pop());
            }
            if (!argCountStack.length) throw new Error('Unexpected comma');
            argCountStack[argCountStack.length - 1] += 1;
            prevToken = token;
            continue;
        }
        if (token.type === 'operator') {
            let op = token.value;
            if (
                (op === '-' || op === '+') &&
                (!prevToken ||
                    (prevToken.type === 'operator' && !OPERATORS[prevToken.value]?.postfix) ||
                    (prevToken.type === 'paren' && prevToken.value === '(') ||
                    prevToken.type === 'comma')
            ) {
                op = op === '-' ? 'u-' : 'u+';
            }
            const opInfo = OPERATORS[op];
            if (!opInfo) {
                throw new Error(`Unsupported operator: ${op}`);
            }
            while (stack.length) {
                const top = stack[stack.length - 1];
                const topInfo = OPERATORS[top.value];
                if (!topInfo) break;
                const higherPrecedence = topInfo.precedence > opInfo.precedence;
                const samePrecedence = topInfo.precedence === opInfo.precedence;
                if (higherPrecedence || (samePrecedence && opInfo.assoc === 'L')) {
                    output.push(stack.pop());
                } else {
                    break;
                }
            }
            stack.push({ type: 'operator', value: op });
            prevToken = token;
            continue;
        }
        if (token.type === 'paren') {
            if (token.value === '(') {
                stack.push(token);
            } else {
                while (stack.length && stack[stack.length - 1].value !== '(') {
                    output.push(stack.pop());
                }
                if (!stack.length) throw new Error('Mismatched parentheses');
                stack.pop();
                if (stack.length && stack[stack.length - 1].type === 'function') {
                    const fnToken = stack.pop();
                    const argCount = prevToken && prevToken.type === 'paren' && prevToken.value === '('
                        ? 0
                        : (argCountStack.pop() ?? 0) + 1;
                    output.push({ ...fnToken, argCount });
                }
            }
            prevToken = token;
        }
    }

    while (stack.length) {
        const top = stack.pop();
        if (top.type === 'paren') throw new Error('Mismatched parentheses');
        if (top.type === 'function') {
            const argCount = (argCountStack.pop() ?? 0) + 1;
            output.push({ ...top, argCount });
        } else {
            output.push(top);
        }
    }

    return output;
}

function evaluateRpn(rpn, functionDefs) {
    const stack = [];
    for (const token of rpn) {
        if (token.type === 'number') {
            stack.push(token.value);
            continue;
        }
        if (token.type === 'operator') {
            const opInfo = OPERATORS[token.value];
            if (opInfo.unary) {
                if (stack.length < 1) throw new Error('Invalid expression');
                const value = normalizeValue(stack.pop());
                stack.push(opInfo.fn(value));
            } else {
                if (stack.length < 2) throw new Error('Invalid expression');
                const b = normalizeValue(stack.pop());
                const a = normalizeValue(stack.pop());
                stack.push(opInfo.fn(a, b));
            }
            continue;
        }
        if (token.type === 'function') {
            const fnDef = functionDefs[token.value];
            if (!fnDef) throw new Error('Invalid function');
            const arity = token.argCount ?? fnDef.arity ?? 1;
            if (stack.length < arity) throw new Error('Invalid expression');
            const args = stack.splice(-arity).map((item) => normalizeValue(item));
            const result = fnDef.fn(...args);
            stack.push(result);
            continue;
        }
        throw new Error('Unsupported token');
    }
    if (stack.length !== 1) throw new Error('Invalid expression');
    return stack[0];
}

function evaluateExpression(expression, angleMode, ansValue, memoryValue, extraConstants = {}, extraFunctionDefs = {}) {
    const normalized = expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/[−–]/g, '-')
        .replace(/π/gi, 'pi')
        .replace(/√/g, 'sqrt')
        .replace(/\s+/g, '');
    if (!normalized) return 0;

    const toRadians = (value) => {
        if (angleMode === ANGLE_MODES.DEG) return (value * Math.PI) / 180;
        if (angleMode === ANGLE_MODES.GRAD) return (value * Math.PI) / 200;
        return value;
    };
    const fromRadians = (value) => {
        if (angleMode === ANGLE_MODES.DEG) return (value * 180) / Math.PI;
        if (angleMode === ANGLE_MODES.GRAD) return (value * 200) / Math.PI;
        return value;
    };

    const functionDefs = {
        sin: { arity: 1, fn: (value) => Math.sin(toRadians(value)) },
        cos: { arity: 1, fn: (value) => Math.cos(toRadians(value)) },
        tan: { arity: 1, fn: (value) => Math.tan(toRadians(value)) },
        asin: { arity: 1, fn: (value) => fromRadians(Math.asin(value)) },
        acos: { arity: 1, fn: (value) => fromRadians(Math.acos(value)) },
        atan: { arity: 1, fn: (value) => fromRadians(Math.atan(value)) },
        sinh: { arity: 1, fn: (value) => Math.sinh(value) },
        cosh: { arity: 1, fn: (value) => Math.cosh(value) },
        tanh: { arity: 1, fn: (value) => Math.tanh(value) },
        asinh: { arity: 1, fn: (value) => Math.asinh(value) },
        acosh: { arity: 1, fn: (value) => Math.acosh(value) },
        atanh: { arity: 1, fn: (value) => Math.atanh(value) },
        log: {
            arity: 1,
            fn: (...args) => (args.length === 2 ? Math.log(args[1]) / Math.log(args[0]) : Math.log10(args[0]))
        },
        ln: { arity: 1, fn: (value) => Math.log(value) },
        sqrt: { arity: 1, fn: (value) => Math.sqrt(value) },
        abs: { arity: 1, fn: (value) => Math.abs(value) },
        exp: { arity: 1, fn: (value) => Math.exp(value) },
        floor: { arity: 1, fn: (value) => Math.floor(value) },
        ceil: { arity: 1, fn: (value) => Math.ceil(value) },
        round: { arity: 1, fn: (value) => Math.round(value) },
        ncr: { arity: 2, fn: (n, r) => combination(n, r) },
        npr: { arity: 2, fn: (n, r) => permutation(n, r) },
        gcd: { arity: 2, fn: (a, b) => gcdCalc(a, b) },
        lcm: { arity: 2, fn: (a, b) => lcmCalc(a, b) },
        mod: { arity: 2, fn: (a, b) => ((a % b) + b) % b },
        root: { arity: 2, fn: (x, y) => Math.pow(y, 1 / x) },
        deg: { arity: 1, fn: (value) => (value * 180) / Math.PI },
        rad: { arity: 1, fn: (value) => (value * Math.PI) / 180 },
        grad: { arity: 1, fn: (value) => (value * 200) / 180 },
        dms: { arity: 3, fn: (d, m, s) => d + m / 60 + s / 3600 },
        todms: { arity: 1, fn: (value) => createDisplayValue(value, formatDms(value)) },
        sci: { arity: 1, fn: (value) => createDisplayValue(value, formatScientific(value)) },
        eng: { arity: 1, fn: (value) => createDisplayValue(value, formatEngineering(value)) },
        engshift: { arity: 2, fn: (value, shift) => createDisplayValue(value, formatEngineering(value, shift)) },
        frac: {
            arity: 2,
            fn: (a, b) => createDisplayValue(a / b, formatFraction(a, b))
        },
        mix: {
            arity: 3,
            fn: (a, b, c) => createDisplayValue(a + b / c, `${toInteger(a)} ${formatFraction(b, c)}`)
        },
        improper: {
            arity: 3,
            fn: (a, b, c) => createDisplayValue(a + b / c, formatFraction(toInteger(a) * toInteger(c) + toInteger(b), c))
        },
        tofrac: {
            arity: 1,
            fn: (value) => {
                const frac = approximateFraction(value);
                if (!frac) return NaN;
                return createDisplayValue(value, formatFraction(frac.numerator, frac.denominator));
            }
        },
        todec: { arity: 2, fn: (a, b) => a / b },
        rand: { arity: 0, fn: () => Math.random() },
        ran: { arity: 0, fn: () => Math.random() },
        randint: {
            arity: 2,
            fn: (min, max) => {
                const lo = Math.ceil(Math.min(min, max));
                const hi = Math.floor(Math.max(min, max));
                return Math.floor(Math.random() * (hi - lo + 1)) + lo;
            }
        },
        polr: { arity: 2, fn: (x, y) => Math.hypot(x, y) },
        polt: { arity: 2, fn: (x, y) => fromRadians(Math.atan2(y, x)) },
        pol: {
            arity: 2,
            fn: (x, y) => {
                const r = Math.hypot(x, y);
                const theta = fromRadians(Math.atan2(y, x));
                return createDisplayValue(r, `${r.toFixed(6)}, ${theta.toFixed(6)}`);
            }
        },
        recx: { arity: 2, fn: (r, theta) => r * Math.cos(toRadians(theta)) },
        recy: { arity: 2, fn: (r, theta) => r * Math.sin(toRadians(theta)) },
        rec: {
            arity: 2,
            fn: (r, theta) => {
                const x = r * Math.cos(toRadians(theta));
                const y = r * Math.sin(toRadians(theta));
                return createDisplayValue(x, `${x.toFixed(6)}, ${y.toFixed(6)}`);
            }
        },
        int: { arity: 1, fn: (value) => toInteger(value) },
        prime: { arity: 1, fn: (value) => createDisplayValue(value, primeFactorization(value)) }
    };


    const constants = {
        pi: Math.PI,
        e: Math.E,
        ans: ansValue,
        m: memoryValue,
        ...extraConstants
    };

    const tokens = tokenize(normalized);
    const rpn = toRpn(tokens, constants, { ...functionDefs, ...extraFunctionDefs });
    return evaluateRpn(rpn, { ...functionDefs, ...extraFunctionDefs });
}

const baseButtons = [
    [
        { label: 'DEG', action: 'toggle-angle' },
        { label: 'MC', action: 'memory-clear' },
        { label: 'MR', action: 'memory-recall' },
        { label: 'M+', action: 'memory-add' },
        { label: 'M-', action: 'memory-subtract' },
        { label: 'AC', action: 'clear' }
    ],
    [
        { label: 'sin', value: 'sin(', type: 'function' },
        { label: 'cos', value: 'cos(', type: 'function' },
        { label: 'tan', value: 'tan(', type: 'function' },
        { label: 'log', value: 'log(', type: 'function' },
        { label: 'ln', value: 'ln(', type: 'function' },
        { label: 'sqrt', value: 'sqrt(', type: 'function' }
    ],
    [
        { label: 'x^2', value: '^2', type: 'operator' },
        { label: 'x^3', value: '^3', type: 'operator' },
        { label: '1/x', value: '1/(', type: 'operator' },
        { label: '10^x', value: '10^(', type: 'operator' },
        { label: 'e^x', value: 'e^(', type: 'operator' },
        { label: 'x!', value: '!', type: 'operator' }
    ],
    [
        { label: '(', value: '(', type: 'operator' },
        { label: ')', value: ')', type: 'operator' },
        { label: 'pi', value: 'pi', type: 'constant' },
        { label: 'e', value: 'e', type: 'constant' },
        { label: 'ANS', value: 'ans', type: 'constant' },
        { label: 'DEL', action: 'delete' }
    ],
    [
        { label: '7', value: '7' },
        { label: '8', value: '8' },
        { label: '9', value: '9' },
        { label: '/', value: '/', type: 'operator' },
        { label: '^', value: '^', type: 'operator' },
        { label: '%', value: '%', type: 'operator' }
    ],
    [
        { label: '4', value: '4' },
        { label: '5', value: '5' },
        { label: '6', value: '6' },
        { label: '*', value: '*', type: 'operator' },
        { label: '-', value: '-', type: 'operator' },
        { label: '+', value: '+', type: 'operator' }
    ],
    [
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3', value: '3' },
        { label: '0', value: '0' },
        { label: '.', value: '.' },
        { label: '=', action: 'evaluate' }
    ]
];

function getButtonTone(type, action) {
    if (action === 'evaluate') return 'bg-cyan-500 text-white hover:bg-cyan-400';
    if (action === 'clear') return 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25';
    if (action === 'delete') return 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25';
    if (type === 'operator') return 'bg-white/10 text-white hover:bg-white/20';
    if (type === 'function') return 'bg-slate-800 text-cyan-200 hover:bg-slate-700';
    return 'bg-slate-900 text-slate-200 hover:bg-slate-800';
}

function nextAngleMode(current) {
    if (current === ANGLE_MODES.DEG) return ANGLE_MODES.RAD;
    if (current === ANGLE_MODES.RAD) return ANGLE_MODES.GRAD;
    return ANGLE_MODES.DEG;
}

function solve3x3(matrix, vector) {
    const [a11, a12, a13] = matrix[0];
    const [a21, a22, a23] = matrix[1];
    const [a31, a32, a33] = matrix[2];
    const [b1, b2, b3] = vector;

    const det =
        a11 * (a22 * a33 - a23 * a32) -
        a12 * (a21 * a33 - a23 * a31) +
        a13 * (a21 * a32 - a22 * a31);
    if (det === 0) return null;

    const detA =
        b1 * (a22 * a33 - a23 * a32) -
        a12 * (b2 * a33 - a23 * b3) +
        a13 * (b2 * a32 - a22 * b3);
    const detB =
        a11 * (b2 * a33 - a23 * b3) -
        b1 * (a21 * a33 - a23 * a31) +
        a13 * (a21 * b3 - b2 * a31);
    const detC =
        a11 * (a22 * b3 - b2 * a32) -
        a12 * (a21 * b3 - b2 * a31) +
        b1 * (a21 * a32 - a22 * a31);

    return [detA / det, detB / det, detC / det];
}

export default function ScientificCalculatorPanel({ compact = false, onClose }) {
    const [expression, setExpression] = useState('');
    const [result, setResult] = useState('0');
    const [lastResult, setLastResult] = useState(0);
    const [memory, setMemory] = useState(0);
    const [angleMode, setAngleMode] = useState(ANGLE_MODES.DEG);
    const [variables, setVariables] = useState(() => ({
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        E: 0,
        F: 0,
        X: 0,
        Y: 0
    }));
    const [statsData, setStatsData] = useState(() => ({ x: [], y: [] }));
    const [tableFns, setTableFns] = useState(() => ({ f: 'x', g: 'x' }));
    const [activeTable, setActiveTable] = useState('f');
    const [calcMode, setCalcMode] = useState('COMP');

    const variableConstants = useMemo(() => ({
        A: variables.A,
        B: variables.B,
        C: variables.C,
        D: variables.D,
        E: variables.E,
        F: variables.F,
        X: variables.X,
        Y: variables.Y,
        M: memory
    }), [variables, memory]);

    const displayResult = useMemo(() => {
        if (!expression) return result;
        return result;
    }, [expression, result]);

    const getStatsSummary = () => {
        const xs = statsData.x;
        const ys = statsData.y;
        const n = xs.length;
        const hasY = ys.length === xs.length && ys.length > 0;
        const sumx = xs.reduce((acc, v) => acc + v, 0);
        const sumy = hasY ? ys.reduce((acc, v) => acc + v, 0) : 0;
        const sumx2 = xs.reduce((acc, v) => acc + v * v, 0);
        const sumy2 = hasY ? ys.reduce((acc, v) => acc + v * v, 0) : 0;
        const sumxy = hasY ? xs.reduce((acc, v, i) => acc + v * ys[i], 0) : 0;
        const meanx = n ? sumx / n : NaN;
        const meany = hasY && n ? sumy / n : NaN;
        const varx = n ? xs.reduce((acc, v) => acc + Math.pow(v - meanx, 2), 0) / n : NaN;
        const vary = hasY && n ? ys.reduce((acc, v) => acc + Math.pow(v - meany, 2), 0) / n : NaN;
        const stdx = Number.isFinite(varx) ? Math.sqrt(varx) : NaN;
        const stdy = Number.isFinite(vary) ? Math.sqrt(vary) : NaN;
        const stdxSample = n > 1 ? Math.sqrt(xs.reduce((acc, v) => acc + Math.pow(v - meanx, 2), 0) / (n - 1)) : NaN;
        const stdySample = hasY && n > 1 ? Math.sqrt(ys.reduce((acc, v) => acc + Math.pow(v - meany, 2), 0) / (n - 1)) : NaN;
        return {
            n,
            hasY,
            sumx,
            sumy,
            sumx2,
            sumy2,
            sumxy,
            meanx,
            meany,
            stdx,
            stdy,
            stdxSample,
            stdySample,
            xs,
            ys
        };
    };

    const buildFunctionDefs = (allowSideEffects) => {
        const stats = getStatsSummary();
        return {
            f: {
                arity: 1,
                fn: (x) =>
                    evaluateExpression(
                        tableFns.f || 'x',
                        angleMode,
                        lastResult,
                        memory,
                        { ...variableConstants, x },
                        buildFunctionDefs(false)
                    )
            },
            g: {
                arity: 1,
                fn: (x) =>
                    evaluateExpression(
                        tableFns.g || 'x',
                        angleMode,
                        lastResult,
                        memory,
                        { ...variableConstants, x },
                        buildFunctionDefs(false)
                    )
            },
            table: {
                arity: 3,
                fn: (start, end, step) => {
                    const expr = tableFns[activeTable] || 'x';
                    const values = [];
                    if (step === 0) return NaN;
                    const dir = start <= end ? 1 : -1;
                    const realStep = Math.abs(step) * dir;
                    for (let x = start; dir > 0 ? x <= end : x >= end; x += realStep) {
                        try {
                            const y = evaluateExpression(
                                expr,
                                angleMode,
                                lastResult,
                                memory,
                                { ...variableConstants, x },
                                buildFunctionDefs(false)
                            );
                            values.push(`${formatResult(x)}:${formatResult(y)}`);
                        } catch (error) {
                            values.push(`${formatResult(x)}:Err`);
                        }
                        if (values.length > 20) break;
                    }
                    return createDisplayValue(values.length, values.join('; '));
                }
            },
            tablef: {
                arity: 3,
                fn: (start, end, step) => {
                    const expr = tableFns.f || 'x';
                    const values = [];
                    if (step === 0) return NaN;
                    const dir = start <= end ? 1 : -1;
                    const realStep = Math.abs(step) * dir;
                    for (let x = start; dir > 0 ? x <= end : x >= end; x += realStep) {
                        try {
                            const y = evaluateExpression(
                                expr,
                                angleMode,
                                lastResult,
                                memory,
                                { ...variableConstants, x },
                                buildFunctionDefs(false)
                            );
                            values.push(`${formatResult(x)}:${formatResult(y)}`);
                        } catch (error) {
                            values.push(`${formatResult(x)}:Err`);
                        }
                        if (values.length > 20) break;
                    }
                    if (allowSideEffects) setActiveTable('f');
                    return createDisplayValue(values.length, values.join('; '));
                }
            },
            tableg: {
                arity: 3,
                fn: (start, end, step) => {
                    const expr = tableFns.g || 'x';
                    const values = [];
                    if (step === 0) return NaN;
                    const dir = start <= end ? 1 : -1;
                    const realStep = Math.abs(step) * dir;
                    for (let x = start; dir > 0 ? x <= end : x >= end; x += realStep) {
                        try {
                            const y = evaluateExpression(
                                expr,
                                angleMode,
                                lastResult,
                                memory,
                                { ...variableConstants, x },
                                buildFunctionDefs(false)
                            );
                            values.push(`${formatResult(x)}:${formatResult(y)}`);
                        } catch (error) {
                            values.push(`${formatResult(x)}:Err`);
                        }
                        if (values.length > 20) break;
                    }
                    if (allowSideEffects) setActiveTable('g');
                    return createDisplayValue(values.length, values.join('; '));
                }
            },
            statadd: {
                arity: 1,
                fn: (...args) => {
                    if (!allowSideEffects) return stats.n;
                    if (args.length === 2) {
                        setStatsData((prev) => ({
                            x: [...prev.x, args[0]],
                            y: [...prev.y, args[1]]
                        }));
                        return stats.n + 1;
                    }
                    if (stats.y.length) return NaN;
                    setStatsData((prev) => ({ x: [...prev.x, args[0]], y: [] }));
                    return stats.n + 1;
                }
            },
            statclear: {
                arity: 0,
                fn: () => {
                    if (allowSideEffects) setStatsData({ x: [], y: [] });
                    return 0;
                }
            },
            statcount: { arity: 0, fn: () => stats.n },
            mean: { arity: 0, fn: () => stats.meanx },
            meanx: { arity: 0, fn: () => stats.meanx },
            meany: { arity: 0, fn: () => stats.meany },
            sumx: { arity: 0, fn: () => stats.sumx },
            sumy: { arity: 0, fn: () => stats.sumy },
            sumx2: { arity: 0, fn: () => stats.sumx2 },
            sumy2: { arity: 0, fn: () => stats.sumy2 },
            sumxy: { arity: 0, fn: () => stats.sumxy },
            std: { arity: 0, fn: () => stats.stdx },
            stdx: { arity: 0, fn: () => stats.stdx },
            stdy: { arity: 0, fn: () => stats.stdy },
            stds: { arity: 0, fn: () => stats.stdxSample },
            stdxs: { arity: 0, fn: () => stats.stdxSample },
            stdys: { arity: 0, fn: () => stats.stdySample },
            linreg: {
                arity: 0,
                fn: () => {
                    if (!stats.hasY || stats.n < 2) return NaN;
                    const denom = stats.n * stats.sumx2 - stats.sumx * stats.sumx;
                    if (denom === 0) return NaN;
                    const b = (stats.n * stats.sumxy - stats.sumx * stats.sumy) / denom;
                    const a = (stats.sumy - b * stats.sumx) / stats.n;
                    return createDisplayValue(b, `y=${a.toFixed(6)}+${b.toFixed(6)}x`);
                }
            },
            quadreg: {
                arity: 0,
                fn: () => {
                    if (!stats.hasY || stats.n < 3) return NaN;
                    const sumx3 = stats.xs.reduce((acc, v) => acc + v * v * v, 0);
                    const sumx4 = stats.xs.reduce((acc, v) => acc + v * v * v * v, 0);
                    const sumx2y = stats.xs.reduce((acc, v, i) => acc + v * v * stats.ys[i], 0);
                    const solution = solve3x3(
                        [
                            [stats.n, stats.sumx, stats.sumx2],
                            [stats.sumx, stats.sumx2, sumx3],
                            [stats.sumx2, sumx3, sumx4]
                        ],
                        [stats.sumy, stats.sumxy, sumx2y]
                    );
                    if (!solution) return NaN;
                    const [a, b, c] = solution;
                    return createDisplayValue(c, `y=${a.toFixed(6)}+${b.toFixed(6)}x+${c.toFixed(6)}x^2`);
                }
            },
            expreg: {
                arity: 0,
                fn: () => {
                    if (!stats.hasY || stats.n < 2) return NaN;
                    const pairs = stats.xs
                        .map((x, i) => ({ x, y: stats.ys[i] }))
                        .filter((p) => p.y > 0);
                    if (pairs.length < 2) return NaN;
                    const n = pairs.length;
                    const sumx = pairs.reduce((acc, p) => acc + p.x, 0);
                    const sumy = pairs.reduce((acc, p) => acc + Math.log(p.y), 0);
                    const sumx2 = pairs.reduce((acc, p) => acc + p.x * p.x, 0);
                    const sumxy = pairs.reduce((acc, p) => acc + p.x * Math.log(p.y), 0);
                    const denom = n * sumx2 - sumx * sumx;
                    if (denom === 0) return NaN;
                    const b = (n * sumxy - sumx * sumy) / denom;
                    const a = Math.exp((sumy - b * sumx) / n);
                    return createDisplayValue(b, `y=${a.toFixed(6)}*e^(${b.toFixed(6)}x)`);
                }
            },
            logreg: {
                arity: 0,
                fn: () => {
                    if (!stats.hasY || stats.n < 2) return NaN;
                    const pairs = stats.xs
                        .map((x, i) => ({ x, y: stats.ys[i] }))
                        .filter((p) => p.x > 0);
                    if (pairs.length < 2) return NaN;
                    const n = pairs.length;
                    const sumx = pairs.reduce((acc, p) => acc + Math.log(p.x), 0);
                    const sumy = pairs.reduce((acc, p) => acc + p.y, 0);
                    const sumx2 = pairs.reduce((acc, p) => acc + Math.log(p.x) * Math.log(p.x), 0);
                    const sumxy = pairs.reduce((acc, p) => acc + Math.log(p.x) * p.y, 0);
                    const denom = n * sumx2 - sumx * sumx;
                    if (denom === 0) return NaN;
                    const b = (n * sumxy - sumx * sumy) / denom;
                    const a = (sumy - b * sumx) / n;
                    return createDisplayValue(b, `y=${a.toFixed(6)}+${b.toFixed(6)}ln(x)`);
                }
            },
            powreg: {
                arity: 0,
                fn: () => {
                    if (!stats.hasY || stats.n < 2) return NaN;
                    const pairs = stats.xs
                        .map((x, i) => ({ x, y: stats.ys[i] }))
                        .filter((p) => p.x > 0 && p.y > 0);
                    if (pairs.length < 2) return NaN;
                    const n = pairs.length;
                    const sumx = pairs.reduce((acc, p) => acc + Math.log(p.x), 0);
                    const sumy = pairs.reduce((acc, p) => acc + Math.log(p.y), 0);
                    const sumx2 = pairs.reduce((acc, p) => acc + Math.log(p.x) * Math.log(p.x), 0);
                    const sumxy = pairs.reduce((acc, p) => acc + Math.log(p.x) * Math.log(p.y), 0);
                    const denom = n * sumx2 - sumx * sumx;
                    if (denom === 0) return NaN;
                    const b = (n * sumxy - sumx * sumy) / denom;
                    const a = Math.exp((sumy - b * sumx) / n);
                    return createDisplayValue(b, `y=${a.toFixed(6)}*x^${b.toFixed(6)}`);
                }
            },
            compmode: {
                arity: 0,
                fn: () => {
                    if (allowSideEffects) setCalcMode('COMP');
                    return createDisplayValue(0, 'MODE:COMP');
                }
            },
            statmode: {
                arity: 0,
                fn: () => {
                    if (allowSideEffects) setCalcMode('STAT');
                    return createDisplayValue(0, 'MODE:STAT');
                }
            },
            tablemode: {
                arity: 0,
                fn: () => {
                    if (allowSideEffects) setCalcMode('TABLE');
                    return createDisplayValue(0, 'MODE:TABLE');
                }
            }
        };
    };

    const updateResultPreview = (nextExpression) => {
        const trimmed = nextExpression.trim();
        if (!trimmed) {
            setResult('0');
            return;
        }
        if (/^\s*[A-FXYM]\s*[+\-]?=/.test(trimmed) || /^\s*[fg]\s*\(\s*x\s*\)\s*=/.test(trimmed)) {
            setResult('Ready');
            return;
        }
        try {
            const value = evaluateExpression(nextExpression, angleMode, lastResult, memory, variableConstants, buildFunctionDefs(false));
            setResult(formatResult(value));
        } catch (error) {
            setResult('Error');
        }
    };

    const insertValue = (value) => {
        const trimmed = expression.trim();
        const leftEndsWithValue = /(\d|\)|ans|pi|e|m|[A-FXYM])$/i.test(trimmed);
        const rightStartsWithValue = /^[a-z(]/i.test(value) || /^[0-9.]/.test(value);
        
        let prefix = '';
        if (leftEndsWithValue && rightStartsWithValue) {
            const isNumberContinuation = /[\d.]$/.test(trimmed) && /^[0-9.]/.test(value);
            if (!isNumberContinuation) {
                prefix = '*';
            }
        }
        
        const nextExpression = `${expression}${prefix}${value}`;
        setExpression(nextExpression);
        updateResultPreview(nextExpression);
    };

    const handleEvaluate = () => {
        const trimmed = expression.trim();
        if (!trimmed) return;

        const assignMatch = trimmed.match(/^\s*([A-FXYM])\s*([+\-]?=)\s*(.+)$/i);
        if (assignMatch) {
            const name = assignMatch[1].toUpperCase();
            const op = assignMatch[2];
            const rhs = assignMatch[3];
            try {
                const value = evaluateExpression(rhs, angleMode, lastResult, memory, variableConstants, buildFunctionDefs(true));
                const numeric = normalizeValue(value);
                if (!Number.isFinite(numeric)) {
                    setResult('Error');
                    return;
                }
                if (name === 'M') {
                    if (op === '=') setMemory(numeric);
                    if (op === '+=') setMemory((prev) => prev + numeric);
                    if (op === '-=') setMemory((prev) => prev - numeric);
                } else {
                    setVariables((prev) => {
                        const current = prev[name] ?? 0;
                        const nextValue = op === '=' ? numeric : op === '+=' ? current + numeric : current - numeric;
                        return { ...prev, [name]: nextValue };
                    });
                }
                setResult(formatResult(numeric));
                setLastResult(numeric);
                return;
            } catch (error) {
                setResult('Error');
                return;
            }
        }

        const fnAssign = trimmed.match(/^\s*([fg])\s*\(\s*x\s*\)\s*=\s*(.+)$/i);
        if (fnAssign) {
            const name = fnAssign[1].toLowerCase();
            const expr = fnAssign[2];
            setTableFns((prev) => ({ ...prev, [name]: expr }));
            setActiveTable(name);
            setResult(`Stored ${name}(x)`);
            return;
        }

        try {
            const value = evaluateExpression(expression, angleMode, lastResult, memory, variableConstants, buildFunctionDefs(true));
            setResult(formatResult(value));
            const numeric = normalizeValue(value);
            if (Number.isFinite(numeric)) setLastResult(numeric);
        } catch (error) {
            setResult('Error');
        }
    };

    const handleClear = () => {
        setExpression('');
        setResult('0');
    };

    const handleDelete = () => {
        const nextExpression = expression.slice(0, -1);
        setExpression(nextExpression);
        updateResultPreview(nextExpression);
    };

    const getWorkingValue = () => {
        if (!expression.trim()) return lastResult;
        try {
            return normalizeValue(
                evaluateExpression(expression, angleMode, lastResult, memory, variableConstants, buildFunctionDefs(false))
            );
        } catch (error) {
            return lastResult;
        }
    };

    const handleButton = (button) => {
        if (button.action === 'toggle-angle') {
            setAngleMode((prev) => nextAngleMode(prev));
            return;
        }
        if (button.action === 'clear') {
            handleClear();
            return;
        }
        if (button.action === 'delete') {
            handleDelete();
            return;
        }
        if (button.action === 'evaluate') {
            handleEvaluate();
            return;
        }
        if (button.action === 'memory-clear') {
            setMemory(0);
            return;
        }
        if (button.action === 'memory-recall') {
            insertValue(String(memory));
            return;
        }
        if (button.action === 'memory-add') {
            const value = getWorkingValue();
            if (Number.isFinite(value)) setMemory((prev) => prev + value);
            return;
        }
        if (button.action === 'memory-subtract') {
            const value = getWorkingValue();
            if (Number.isFinite(value)) setMemory((prev) => prev - value);
            return;
        }
        if (!button.value) return;

        if (button.value === '^2' || button.value === '^3' || button.value === '!' || button.value === '%') {
            if (!expression) {
                const base = Number.isFinite(lastResult) ? `ans${button.value}` : '';
                setExpression(base);
                updateResultPreview(base);
                return;
            }
            const nextExpression = `${expression}${button.value}`;
            setExpression(nextExpression);
            updateResultPreview(nextExpression);
            return;
        }

        insertValue(button.value);
    };

    const panelWidth = compact ? 'w-[320px] max-w-full' : 'w-full max-w-[520px]';

    return (
        <div className={`${panelWidth} rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    <Calculator className="h-4 w-4 text-cyan-300" />
                    Scientific Calculator
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setAngleMode((prev) => nextAngleMode(prev))}
                        className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-white/10"
                    >
                        {angleMode}
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-white/10 p-1 text-slate-300 hover:bg-white/10"
                            aria-label="Close calculator"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                Mode: {calcMode}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/80 p-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    <span>Memory: {formatResult(memory)}</span>
                    <span>Ans: {formatResult(lastResult)}</span>
                </div>
                <input
                    value={expression}
                    onChange={(event) => {
                        setExpression(event.target.value);
                        updateResultPreview(event.target.value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            handleEvaluate();
                        }
                    }}
                    placeholder="0"
                    className="mt-2 w-full bg-transparent text-right font-mono text-lg text-white outline-none placeholder:text-slate-600"
                    aria-label="Calculator input"
                />
                <div className="mt-1 text-right font-mono text-2xl font-semibold text-cyan-200">
                    {displayResult}
                </div>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-2 text-sm">
                {baseButtons.map((row, rowIndex) =>
                    row.map((button, index) => {
                        const tone = getButtonTone(button.type, button.action);
                        const label = button.action === 'toggle-angle' ? angleMode : button.label;
                        return (
                            <button
                                key={`${rowIndex}-${index}-${label}`}
                                type="button"
                                onClick={() => handleButton(button)}
                                className={`h-10 rounded-xl border border-white/10 px-1 font-semibold transition ${tone}`}
                            >
                                {label}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
