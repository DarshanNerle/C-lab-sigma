import { allowMethods, normalizeEmail, sanitizeLabState, safeServerError } from '../../api-utils.js';
import { getUserDocByEmail } from '../../firebase-users.js';
import { updateDoc } from 'firebase/firestore';
import { getMemUser, updateMemUser } from '../../inMemoryUserStore.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  const email = normalizeEmail(req.body?.email);
  const labState = sanitizeLabState(req.body?.labState);

  if (!email || !labState) {
    return res.status(400).json({ error: 'Valid email and labState are required.' });
  }

  try {
    const record = await getUserDocByEmail(email);
    if (!record) return res.status(404).json({ error: 'User not found.' });

    await updateDoc(record.ref, { currentLabState: labState, updatedAt: new Date() });
    return res.status(200).json({ message: 'Lab state saved successfully.', labState, source: 'firebase' });
  } catch (error) {
    console.warn('[API:user/save-lab] Firebase unavailable, falling back to in-memory store.');
    try {
      const existing = getMemUser(email);
      if (!existing) return res.status(404).json({ error: 'User not found.' });

      const user = updateMemUser(email, (record) => {
        record.currentLabState = labState;
        return record;
      });

      return res.status(200).json({ message: 'Lab state saved successfully.', labState: user.currentLabState, source: 'memory' });
    } catch (fallbackError) {
      return safeServerError(res, fallbackError, 'user/save-lab');
    }
  }
}
