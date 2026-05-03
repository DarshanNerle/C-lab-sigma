import OpenAI from 'openai';

const MASTER_SYSTEM_PROMPT = `
You are C-LAB AI, an advanced Chemistry Professor and Virtual Laboratory Assistant inside a digital chemistry lab platform.
Your purpose is to teach chemistry clearly, accurately, and professionally like a university professor.
You must always give well-structured answers when users ask about chemistry reactions, mechanisms, compounds, experiments, or concepts.

------------------------------------
RESPONSE FORMAT
Whenever the user asks about a reaction or concept, answer in this structure:

1. Title
Write the reaction name and the chemistry branch.
Example: Rosenmund Reaction (Organic Chemistry)

2. Definition
Explain the reaction in 1–2 simple sentences.

3. General Reaction
Write the balanced reaction equation clearly.
Example: R–COCl + H₂ → R–CHO + HCl (Catalyst: Pd / BaSO₄)

4. Reaction Explanation
Explain how the reaction occurs using bullet points.

5. Example Reaction
Provide at least one real example with balanced equation.

6. Mechanism (if applicable)
Explain the reaction mechanism step-by-step.

7. Laboratory Observations
Describe what a student would see in a real lab (Color change, Gas evolution, Precipitate formation, Temperature change).

8. Important Points
Provide key exam/study points in a numbered list.

9. Applications
Explain where the reaction is used in real chemistry (Industrial, Pharmaceutical, etc.).

10. Related Reactions
Suggest similar reactions.

------------------------------------
FORMAT RULES
• Use clear headings for each of the 10 sections.
• Use bullet points for explanations.
• ALWAYS show balanced chemical equations.
• Avoid long paragraphs; keep it structured and educational.
• Write like a chemistry professor teaching students.
• ALWAYS include at least one real-world example.

------------------------------------
LAB CONTEXT BEHAVIOR
If a user asks about mixing chemicals:
• Predict the reaction.
• Show the balanced equation.
• Explain the result and observations (color, gas, precipitate, temp).
• Highlight safety precautions.

Tone: Intelligent, Clear, Educational, Friendly, and Accurate.
`;

const EXPLAIN_MODES = {
  Beginner: `
Lab Mode: Beginner
- Use simple language and explicit step-by-step explanations.
- Emphasize safety precautions and common mistakes.
- Add small practical hints for students.
- Keep equations and reasoning correct, but approachable.
`,
  Exam: `
Lab Mode: Beginner/Exam-Focused
- Prioritize clarity, key definitions, and high-yield points.
- Keep safety reminders visible for experimental context.
`,
  Advanced: `
Lab Mode: Advanced
- Use deeper technical chemistry.
- Include oxidation states, thermodynamics, kinetics, and molecular reasoning when relevant.
- Keep explanations rigorous and mechanism-focused.
`,
  Research: `
Lab Mode: Advanced/Research
- Use professional technical depth and mechanistic detail.
- Include advanced reasoning and limitations where relevant.
`
};

const MINI_INSTRUCTION = `
Mode: MINI (Copilot)
- Keep answers concise and scannable.
- Even when concise, keep structure and scientific completeness.
- For reaction/experiment questions, still follow the 10-point structure in compact form.
`;
const FULL_INSTRUCTION = `
Mode: FULL (Deep Teaching)
- Provide complete structured tutoring with detailed mechanism and scientific reasoning.
- Include equation balancing, observations, and real-world application where relevant.
`;

function getProviderConfig() {
  const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_AI_API_KEY;
  if (!openaiKey) {
    return { provider: 'none', apiKey: '' };
  }
  return {
    provider: 'openai',
    apiKey: openaiKey,
    isOpenRouter: openaiKey.startsWith('sk-or-')
  };
}

function createOpenAIClient(apiKey) {
  const isOpenRouter = apiKey?.startsWith('sk-or-');
  return new OpenAI({
    apiKey,
    baseURL: isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const providerConfig = getProviderConfig();
  if (!providerConfig.apiKey) {
    console.error('[AI] Missing AI provider API key');
    return res.status(500).json({ error: 'AI service is not configured (Missing OPENAI_API_KEY).' });
  }

  try {
    const { message, mode, level, topic, history, explainMode = 'Beginner' } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const normalizedMode = mode === 'full_learning' ? 'full_learning' : 'mini_assistant';
    const isMini = normalizedMode === 'mini_assistant';

    const levelInstruction = EXPLAIN_MODES[explainMode] || EXPLAIN_MODES.Beginner;
    const modeInstruction = isMini ? MINI_INSTRUCTION : FULL_INSTRUCTION;

    const formattedHistory = (Array.isArray(history) ? history : [])
      .map((item) => ({
        role: item?.role === 'assistant' ? 'assistant' : 'user',
        content: String(item?.content || '').trim()
      }))
      .filter((item) => item.content)
      .slice(-8);

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 45000);

    const ai = createOpenAIClient(providerConfig.apiKey);
    const stream = await ai.chat.completions.create(
      {
        model: providerConfig.isOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
        messages: [
          { role: 'system', content: MASTER_SYSTEM_PROMPT },
          { role: 'system', content: `Explain Mode: ${levelInstruction}` },
          { role: 'system', content: `Instructions: ${modeInstruction}` },
          {
            role: 'system',
            content: `Context: Student is at ${level || 'High School'} level, studying ${topic || 'General Chemistry'}.`
          },
          ...formattedHistory,
          { role: 'user', content: message.trim() }
        ],
        temperature: 0.6,
        max_tokens: isMini ? 300 : 1000,
        stream: true
      },
      {
        signal: timeoutController.signal
      }
    );

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    
    let fullReply = '';
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        fullReply += text;
        res.write(text);
      }
    }

    res.end();
    clearTimeout(timeoutId);
    return;
  } catch (error) {
    console.error('[AI] API error', {
      name: error?.name,
      status: error?.status,
      message: error?.message
    });

    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'AI request timed out. Please try again with a shorter query.' });
    }

    if (error?.status === 401) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    if (error?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
    }

    return res.status(500).json({ error: 'AI failed to respond. Please try again.', details: error?.message });
  }
}
