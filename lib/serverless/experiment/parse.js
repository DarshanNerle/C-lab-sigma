import OpenAI from 'openai';
import mammoth from 'mammoth';
import { allowMethods } from '../../api-utils.js';

const DEFAULT_EXPERIMENT = {
  title: '',
  aim: '',
  theory: '',
  apparatus: [],
  chemicals: [],
  procedure: [],
  formula: '',
  observationTable: [],
  resultMethod: '',
  graphType: 'x_vs_y',
  difficultyLevel: 'Intermediate',
  estimatedTime: '30-45 min',
  aiHints: [],
  badges: []
};
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt']);
const TXT_MIME_TYPES = new Set(['text/plain', 'application/text']);
const PDF_MIME_TYPES = new Set(['application/pdf']);
const DOC_MIME_TYPES = new Set(['application/msword']);
const DOCX_MIME_TYPES = new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

const HEADING_MAP = {
  aim: ['aim', 'objective', 'purpose'],
  theory: ['theory', 'principle', 'background'],
  apparatus: ['apparatus', 'equipment', 'instruments'],
  chemicals: ['chemicals', 'materials', 'reagents'],
  procedure: ['procedure', 'method', 'steps', 'experimental procedure'],
  formula: ['formula', 'equation', 'calculation formula'],
  observation: ['observation', 'observations', 'reading', 'data'],
  result: ['result', 'conclusion', 'inference']
};

const EQUIPMENT_MAP = {
  burette: ['burette', 'buret'],
  beaker: ['beaker'],
  flask: ['flask', 'conical flask', 'volumetric flask', 'erlenmeyer'],
  pipette: ['pipette', 'dropper'],
  ph_meter: ['ph meter', 'pH meter'],
  conductivity_meter: ['conductivity meter', 'conductometer'],
  viscometer: ['viscometer'],
  magnetic_stirrer: ['magnetic stirrer', 'stirrer'],
  indicator_bottle: ['indicator bottle', 'indicator']
};

const toList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value
    .split(/\r?\n|,|;/)
    .map((item) => item.replace(/^[\d)\-.\s]+/, '').trim())
    .filter(Boolean);
};

const linesToSectionMap = (text) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const sections = { intro: [] };
  let current = 'intro';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const normalized = line.toLowerCase().replace(/[:\s]+$/g, '');
    let nextSection = null;
    for (const [key, aliases] of Object.entries(HEADING_MAP)) {
      if (aliases.some((alias) => normalized === alias || normalized.startsWith(`${alias}:`))) {
        nextSection = key;
        break;
      }
    }
    if (nextSection) {
      current = nextSection;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!sections[current]) sections[current] = [];
    sections[current].push(line);
  }

  return sections;
};

const detectEquipment = (apparatus = []) => {
  const found = new Set();
  const source = apparatus.map((item) => String(item || '').toLowerCase());
  Object.entries(EQUIPMENT_MAP).forEach(([equipment, aliases]) => {
    if (source.some((item) => aliases.some((alias) => item.includes(alias.toLowerCase())))) {
      found.add(equipment);
    }
  });
  return Array.from(found);
};

const heuristicParse = ({ text, fileName }) => {
  const sections = linesToSectionMap(text);
  const titleFromFile = String(fileName || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const introText = (sections.intro || []).join(' ');
  const guessedTitle = titleFromFile || introText.split(/[.!?]/)[0]?.slice(0, 100) || 'Untitled Experiment';
  const observationTable = (sections.observation || []).slice(0, 20).map((line, index) => {
    const nums = line.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
    return { x: nums[0] ?? index + 1, y: nums[1] ?? 0, note: line.slice(0, 140) };
  });

  const apparatus = toList((sections.apparatus || []).join('\n'));
  const chemicals = toList((sections.chemicals || []).join('\n'));

  return {
    ...DEFAULT_EXPERIMENT,
    title: guessedTitle,
    aim: (sections.aim || []).join(' ').slice(0, 800),
    theory: (sections.theory || []).join(' ').slice(0, 3000),
    apparatus: apparatus.length ? apparatus : ['Beaker', 'Flask', 'Pipette'],
    chemicals: chemicals.length ? chemicals : ['Distilled Water'],
    procedure: toList((sections.procedure || []).join('\n')),
    formula: (sections.formula || []).join(' ').slice(0, 400),
    observationTable,
    resultMethod: (sections.result || []).join(' ').slice(0, 700),
    graphType: 'x_vs_y',
    equipment: detectEquipment(apparatus)
  };
};

const cleanExperiment = (value) => {
  const merged = { ...DEFAULT_EXPERIMENT, ...(value || {}) };
  const apparatus = toList(merged.apparatus);
  const chemicals = toList(merged.chemicals);
  return {
    ...merged,
    title: String(merged.title || '').trim().slice(0, 180),
    aim: String(merged.aim || '').trim().slice(0, 1000),
    theory: String(merged.theory || '').trim().slice(0, 6000),
    apparatus,
    chemicals,
    procedure: toList(merged.procedure).slice(0, 150),
    formula: String(merged.formula || '').trim().slice(0, 500),
    observationTable: Array.isArray(merged.observationTable) ? merged.observationTable.slice(0, 200).map((row, idx) => ({
      x: Number.isFinite(Number(row?.x)) ? Number(row.x) : idx + 1,
      y: Number.isFinite(Number(row?.y)) ? Number(row.y) : 0,
      note: String(row?.note || '').slice(0, 140)
    })) : [],
    resultMethod: String(merged.resultMethod || '').trim().slice(0, 1000),
    graphType: String(merged.graphType || 'x_vs_y').trim().slice(0, 80),
    difficultyLevel: String(merged.difficultyLevel || 'Intermediate').slice(0, 40),
    estimatedTime: String(merged.estimatedTime || '30-45 min').slice(0, 40),
    aiHints: toList(merged.aiHints).slice(0, 10),
    badges: toList(merged.badges).slice(0, 10),
    equipment: detectEquipment(apparatus)
  };
};

const normalizeFileMeta = (file = {}) => ({
  fileName: String(file?.name || '').trim().slice(0, 180),
  mimeType: String(file?.type || '').trim().toLowerCase(),
  size: Number(file?.size) || 0,
  dataBase64: typeof file?.dataBase64 === 'string' ? file.dataBase64.trim() : ''
});

const extFromFileName = (fileName = '') => {
  const last = String(fileName || '').split('.').pop() || '';
  return last.toLowerCase().trim();
};

const sanitizeDocText = (value = '') => String(value || '')
  .replace(/\u0000/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const parseTxtBuffer = (buffer) => {
  const utf8 = buffer.toString('utf8');
  return sanitizeDocText(utf8);
};

const parseDocBuffer = (buffer) => {
  // Legacy .doc is binary. Keep best-effort extraction to avoid hard failure.
  const latin = buffer.toString('latin1');
  const probableText = latin.replace(/[^\x20-\x7E\r\n\t]/g, ' ').replace(/\s+/g, ' ');
  return sanitizeDocText(probableText);
};

async function parsePdfBuffer(buffer) {
  // Some runtimes may not provide DOMMatrix. Define a minimal fallback
  // before loading pdf-parse/pdfjs to avoid import-time crashes.
  if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = class DOMMatrix {};
  }

  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  let parsed = null;
  try {
    parsed = await parser.getText();
  } finally {
    await parser.destroy();
  }
  const text = sanitizeDocText(parsed?.text || '');
  if (!text) throw new Error('No readable text found in PDF.');
  return text;
}

async function extractTextFromFile(file) {
  const { fileName, mimeType, size, dataBase64 } = normalizeFileMeta(file);
  if (!fileName || !dataBase64 || !size) {
    throw new Error('A valid file payload is required.');
  }

  const extension = extFromFileName(fileName);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error('Unsupported file type. Use PDF, DOC, DOCX, or TXT.');
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File size exceeds 10MB limit.');
  }

  const buffer = Buffer.from(dataBase64, 'base64');
  if (!buffer.length) {
    throw new Error('Uploaded file is empty.');
  }

  if (extension === 'pdf' || PDF_MIME_TYPES.has(mimeType)) {
    const text = await parsePdfBuffer(buffer);
    return { text, fileName };
  }

  if (extension === 'docx' || DOCX_MIME_TYPES.has(mimeType)) {
    const parsed = await mammoth.extractRawText({ buffer });
    const text = sanitizeDocText(parsed?.value || '');
    if (!text) throw new Error('No readable text found in DOCX.');
    return { text, fileName };
  }

  if (extension === 'doc' || DOC_MIME_TYPES.has(mimeType)) {
    const text = parseDocBuffer(buffer);
    if (!text) throw new Error('No readable text found in DOC.');
    return { text, fileName };
  }

  if (extension === 'txt' || TXT_MIME_TYPES.has(mimeType)) {
    const text = parseTxtBuffer(buffer);
    if (!text) throw new Error('No readable text found in TXT.');
    return { text, fileName };
  }

  throw new Error('Unsupported file format.');
}

const createClient = () => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_AI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: apiKey.startsWith('sk-or-') ? 'https://openrouter.ai/api/v1' : undefined
  });
};

async function parseWithAI({ text, fileName }) {
  const client = createClient();
  if (!client) return null;

  const prompt = `Extract chemistry experiment sections from the content and return ONLY strict JSON.
Keys:
title, aim, theory, apparatus (array), chemicals (array), procedure (array), formula, observationTable (array of {x,y,note}), resultMethod, graphType, difficultyLevel, estimatedTime, aiHints (array), badges (array).
Use semantic heading matching (Objective->aim, Method->procedure, Equipment->apparatus, Materials->chemicals).
If missing, infer reasonable values.
File name: ${fileName}
Content:
${text.slice(0, 20000)}`;

  const completion = await client.chat.completions.create({
    model: (process.env.OPENAI_API_KEY || process.env.VITE_AI_API_KEY || '').startsWith('sk-or-') ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 1500,
    messages: [
      { role: 'system', content: 'You are a strict JSON generator for chemistry experiments. Output JSON only.' },
      { role: 'user', content: prompt }
    ]
  });

  const content = String(completion?.choices?.[0]?.message?.content || '').trim();
  if (!content) return null;

  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < jsonStart) return null;
  const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
  return cleanExperiment(parsed);
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    let text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    let fileName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim().slice(0, 180) : 'uploaded_experiment';

    if (!text && req.body?.file && typeof req.body.file === 'object') {
      const parsedFile = await extractTextFromFile(req.body.file);
      text = parsedFile.text;
      fileName = parsedFile.fileName || fileName;
    }

    if (!text) {
      return res.status(400).json({ error: 'Experiment text or file is required.' });
    }

    let experiment = null;
    try {
      experiment = await parseWithAI({ text, fileName });
    } catch {
      experiment = null;
    }

    if (!experiment) {
      experiment = cleanExperiment(heuristicParse({ text, fileName }));
    }

    return res.status(200).json({ experiment });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to parse experiment.', details: error?.message || 'Unknown error' });
  }
}
