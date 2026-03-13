import { allowMethods, normalizeEmail, safeServerError } from '../../api-utils.js';
import { getUserDocByEmail } from '../../firebase-users.js';
import { updateDoc } from 'firebase/firestore';
import { getMemUser, updateMemUser } from '../../inMemoryUserStore.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  const email = normalizeEmail(req.body?.email);
  const amount = Number(req.body?.amount);

  if (!email || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Valid email and positive XP amount are required.' });
  }

  try {
    const record = await getUserDocByEmail(email);
    if (!record) return res.status(404).json({ error: 'User not found.' });

    const totalXp = (Number(record.user.xp) || 0) + amount;
    const level = Math.floor(totalXp / 100) + 1;
    await updateDoc(record.ref, { xp: totalXp, level, updatedAt: new Date() });

    return res.status(200).json({ message: 'XP updated successfully.', xp: totalXp, level, source: 'firebase' });
  } catch (error) {
    console.warn('[API:user/add-xp] Firebase unavailable, falling back to in-memory store.');
    try {
      const existing = getMemUser(email);
      if (!existing) return res.status(404).json({ error: 'User not found.' });

      const user = updateMemUser(email, (record) => {
        const totalXp = (record.xp || 0) + amount;
        record.xp = totalXp;
        record.level = Math.floor(totalXp / 100) + 1;
        return record;
      });

      return res.status(200).json({ message: 'XP updated successfully.', xp: user.xp, level: user.level, source: 'memory' });
    } catch (fallbackError) {
      return safeServerError(res, fallbackError, 'user/add-xp');
    }
  }
}
