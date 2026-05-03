/**
 * AIController
 * Manages AI communication through serverless routes with deduplicated in-flight requests.
 */
import { storageService } from '../../lib/storageService';

export class AIController {
    static pending = new Set();

    static async sendMessage({ message, context, level, mode, userEmail = null, onChunk = null }) {
        const trimmed = String(message || '').trim();
        if (!trimmed) {
            throw new Error('Message is required.');
        }

        const normalizedMode = mode === 'full_learning' ? 'full_learning' : 'mini_assistant';
        const dedupeKey = `${normalizedMode}:${trimmed.toLowerCase()}`;

        if (this.pending.has(dedupeKey)) {
            throw new Error('A similar AI request is already running.');
        }

        this.pending.add(dedupeKey);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        try {
            const history = userEmail ? await this.getRecentHistory(userEmail) : [];

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    message: trimmed,
                    mode: normalizedMode,
                    level,
                    topic: context,
                    history: history.slice(-8).map((h) => ({ role: h.role, content: h.content }))
                })
            });

            if (!response.ok) {
                let payload = {};
                try { payload = await response.json(); } catch { }
                throw new Error(payload.error || 'AI service request failed.');
            }

            // Check if response is streaming
            const contentType = response.headers.get('content-type') || '';
            const isStreaming = contentType.includes('text/event-stream') || contentType.includes('text/plain');

            let aiContent = '';

            if (isStreaming && response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    aiContent += chunk;
                    if (onChunk) onChunk(aiContent);
                }
            } else {
                let payload = {};
                try { payload = await response.json(); } catch { }
                aiContent = String(payload.reply || '').trim();
            }

            if (!aiContent && !onChunk) {
                throw new Error('AI returned an empty response.');
            }

            if (userEmail) {
                await this.saveExchange(userEmail, trimmed, aiContent);
            }

            return aiContent;
        } catch (error) {
            if (error?.name === 'AbortError') {
                throw new Error('AI request timed out. Please retry with a shorter question.');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
            this.pending.delete(dedupeKey);
        }
    }

    static async saveExchange(email, question, answer) {
        try {
            await storageService.saveAIHistory({ email, question, answer });
        } catch {
            // no-op, history persistence is best effort
        }
    }

    static async getRecentHistory(email) {
        try {
            const data = await storageService.getUser(email);
            const history = Array.isArray(data?.user?.aiHistory) ? data.user.aiHistory : [];

            const flattened = [];
            for (const item of history.slice(0, 8).reverse()) {
                if (item?.question) flattened.push({ role: 'user', content: item.question });
                if (item?.answer) flattened.push({ role: 'assistant', content: item.answer });
            }

            return flattened;
        } catch {
            return [];
        }
    }
}
