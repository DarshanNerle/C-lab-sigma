import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, experimentName, currentStep, observations } = await req.json();

    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    const systemPrompt = `You are Cleo, an intelligent and extremely helpful Socratic AI lab assistant in C-Lab Sigma.
You are currently assisting a student with the experiment: "${experimentName || 'General Chemistry'}".
The student is currently on step: ${currentStep || 'Unknown'}.
Current student observations:
${observations || 'None'}

CRITICAL INSTRUCTIONS:
1. NEVER give the student the direct answer to an experiment step, conclusion, or calculation.
2. ALWAYS use the Socratic method. Guide them to the answer using thought-provoking questions.
3. Keep your responses concise, encouraging, and focused entirely on the chemistry experiment.
4. If a student explicitly asks for the answer, politely decline and ask a guiding question about the underlying chemical principles instead.
5. Format mathematical or chemical formulas clearly if needed, but do not solve their current problem for them.`;

    // As requested, using the specific Claude model
    const result = await streamText({
      model: anthropic('claude-3-5-sonnet-20240620'),
      system: systemPrompt,
      messages,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in AI Tutor Route:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
