import { allowMethods, normalizeEmail, safeServerError } from '../../api-utils.js';
import { buildUserRecord, getUserDocByEmail } from '../../firebase-users.js';
import { getFirestoreDb } from '../../firebase.js';
import { doc, setDoc } from 'firebase/firestore';
import { createMemUser, getMemUser } from '../../inMemoryUserStore.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  const email = normalizeEmail(req.body?.email);
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 120) : '';

  if (!email) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  try {
    const existing = await getUserDocByEmail(email);
    if (existing) {
      return res.status(200).json({ message: 'User already exists.', user: existing.user, source: 'firebase' });
    }

    const db = getFirestoreDb();
    const userRecord = buildUserRecord({ email, name });
    const userRef = doc(db, 'users', userRecord.userId);
    await setDoc(userRef, userRecord);
    return res.status(201).json({
      message: 'User created successfully.',
      user: { ...userRecord, createdAt: userRecord.createdAt.toISOString(), updatedAt: userRecord.updatedAt.toISOString() },
      source: 'firebase'
    });
  } catch (error) {
    console.warn('[API:user/create] Firebase unavailable, falling back to in-memory store.');
    try {
      const existing = getMemUser(email);
      if (existing) {
        return res.status(200).json({ message: 'User already exists.', user: existing, source: 'memory' });
      }
      const user = createMemUser({ email, name });
      return res.status(201).json({ message: 'User created successfully.', user, source: 'memory' });
    } catch (fallbackError) {
      return safeServerError(res, fallbackError, 'user/create');
    }
  }
}
