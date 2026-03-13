import { allowMethods, normalizeEmail, sanitizeLabState, sanitizeSettings, safeServerError } from '../../api-utils.js';
import { getUserDocByEmail } from '../../firebase-users.js';
import { updateDoc } from 'firebase/firestore';
import { getMemUser, updateMemUser } from '../../inMemoryUserStore.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  const email = normalizeEmail(req.body?.email);
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 120) : undefined;
  const settings = req.body?.settings ? sanitizeSettings(req.body.settings) : null;
  const currentLabState = req.body?.currentLabState ? sanitizeLabState(req.body.currentLabState) : null;

  if (!email) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  try {
    const record = await getUserDocByEmail(email);
    if (!record) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updates = {};
    if (typeof name === 'string') updates.name = name;
    if (settings) updates.settings = { ...(record.user.settings || {}), ...settings };
    if (currentLabState) updates.currentLabState = currentLabState;

    const didUpdate = Object.keys(updates).length > 0;
    if (didUpdate) {
      await updateDoc(record.ref, { ...updates, updatedAt: new Date() });
    }

    const nextUser = {
      ...record.user,
      ...updates,
      updatedAt: didUpdate ? new Date().toISOString() : record.user.updatedAt
    };
    return res.status(200).json({ message: 'User updated successfully.', user: nextUser, source: 'firebase' });
  } catch (error) {
    console.warn('[API:user/update] Firebase unavailable, falling back to in-memory store.');
    try {
      const existing = getMemUser(email);
      if (!existing) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const user = updateMemUser(email, (record) => {
        if (typeof name === 'string') record.name = name;
        if (settings) record.settings = { ...record.settings, ...settings };
        if (currentLabState) record.currentLabState = currentLabState;
        return record;
      });

      return res.status(200).json({ message: 'User updated successfully.', user, source: 'memory' });
    } catch (fallbackError) {
      return safeServerError(res, fallbackError, 'user/update');
    }
  }
}
