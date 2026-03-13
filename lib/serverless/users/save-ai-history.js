import { allowMethods, normalizeEmail, safeServerError } from '../../api-utils.js';
import { getUserDocByEmail } from '../../firebase-users.js';
import { updateDoc } from 'firebase/firestore';
import { getMemUser, updateMemUser } from '../../inMemoryUserStore.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  const email = normalizeEmail(req.body?.email);
  const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 4000) : '';
  const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim().slice(0, 12000) : '';

  if (!email || !question || !answer) {
    return res.status(400).json({ error: 'Valid email, question, and answer are required.' });
  }

  try {
    const record = await getUserDocByEmail(email);
    if (!record) return res.status(404).json({ error: 'User not found.' });

    const history = Array.isArray(record.user.aiHistory) ? record.user.aiHistory : [];
    const entry = { question, answer, createdAt: new Date().toISOString() };
    const nextHistory = [entry, ...history].slice(0, 50);
    await updateDoc(record.ref, { aiHistory: nextHistory, updatedAt: new Date() });

    return res.status(200).json({ message: 'AI history saved successfully.', history: nextHistory, source: 'firebase' });
  } catch (error) {
    console.warn('[API:user/save-ai-history] Firebase unavailable, falling back to in-memory store.');
    try {
      const existing = getMemUser(email);
      if (!existing) return res.status(404).json({ error: 'User not found.' });

      const user = updateMemUser(email, (record) => {
        const history = Array.isArray(record.aiHistory) ? record.aiHistory : [];
        history.unshift({ question, answer, createdAt: new Date().toISOString() });
        record.aiHistory = history.slice(0, 50);
        return record;
      });

      return res.status(200).json({ message: 'AI history saved successfully.', history: user.aiHistory, source: 'memory' });
    } catch (fallbackError) {
      return safeServerError(res, fallbackError, 'user/save-ai-history');
    }
  }
}
