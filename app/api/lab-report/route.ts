import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export const maxDuration = 45;

export async function POST(req: Request) {
  try {
    const { experimentName, observations, reactionLogs } = await req.json();

    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    const systemPrompt = `You are an expert chemistry professor. You have been given the raw observations and reaction logs from a student's virtual experiment session named "${experimentName || 'Laboratory Experiment'}".

Your task is to generate a formal, well-structured scientific laboratory report in Markdown format based on their data.
The report MUST include the following sections:
1. Title
2. Objective (Infer based on the experiment name and logs)
3. Materials/Methods (Infer based on the chemicals used)
4. Empirical Data & Observations
5. Conclusion & Socratic Reflection

Format the output strictly as readable Markdown. Do not include any conversational filler; output ONLY the Markdown text.`;

    const studentData = `
Observations:
${observations ? JSON.stringify(observations, null, 2) : 'No observations recorded.'}

Reaction Logs:
${reactionLogs ? JSON.stringify(reactionLogs, null, 2) : 'No reactions logged.'}
`;

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: systemPrompt,
      prompt: `Please format the following student session data into the final Lab Report: \n${studentData}`,
      temperature: 0.2, // Keep generation deterministic
    });

    return new Response(JSON.stringify({ report: text }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error generating Lab Report:", error);
    return new Response(JSON.stringify({ error: "Failed to generate report." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
