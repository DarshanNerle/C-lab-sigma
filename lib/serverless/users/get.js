import { allowMethods, normalizeEmail, safeServerError } from '../../api-utils.js';
import { getUserDocByEmail } from '../../firebase-users.js';
import { getMemUser } from '../../inMemoryUserStore.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  const email = normalizeEmail(req.query?.email);
  if (!email) {
    return res.status(400).json({ error: 'A valid email query parameter is required.' });
  }

  try {
    const record = await getUserDocByEmail(email);
    if (!record) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({ user: record.user, source: 'firebase' });
  } catch (error) {
    console.warn('[API:user/get] Firebase unavailable, falling back to in-memory store.');
    try {
      const user = getMemUser(email);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      return res.status(200).json({ user, source: 'memory' });
    } catch (fallbackError) {
      return safeServerError(res, fallbackError, 'user/get');
    }
  }
}
