import { allowMethods, normalizeEmail, sanitizeExperiment, safeServerError } from '../../api-utils.js';
import { getUserDocByEmail } from '../../firebase-users.js';
import { updateDoc } from 'firebase/firestore';
import { getMemUser, updateMemUser } from '../../inMemoryUserStore.js';

const upsertExperiment = (list, experiment) => {
  const experiments = Array.isArray(list) ? [...list] : [];
  const index = experiments.findIndex((item) => item?.id === experiment.id);
  if (index >= 0) {
    experiments[index] = { ...experiments[index], ...experiment };
  } else {
    experiments.unshift(experiment);
  }
  return experiments.slice(0, 300);
};

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  const email = normalizeEmail(req.body?.email);
  const experiment = sanitizeExperiment(req.body?.experiment);
  if (!email || !experiment) {
    return res.status(400).json({ error: 'Valid email and experiment are required.' });
  }

  try {
    const record = await getUserDocByEmail(email);
    if (!record) return res.status(404).json({ error: 'User not found.' });

    const nextExperiments = upsertExperiment(record.user.experiments, experiment);
    await updateDoc(record.ref, { experiments: nextExperiments, updatedAt: new Date() });
    return res.status(200).json({ ok: true, experiment, source: 'firebase' });
  } catch (error) {
    console.warn('[API:user/save-experiment] Firebase unavailable, falling back to in-memory store.');
    try {
      const existing = getMemUser(email);
      if (!existing) return res.status(404).json({ error: 'User not found.' });
      const user = updateMemUser(email, (record) => {
        record.experiments = upsertExperiment(record.experiments, experiment);
        return record;
      });
      return res.status(200).json({ ok: true, experiment, experiments: user.experiments, source: 'memory' });
    } catch (fallbackError) {
      return safeServerError(res, fallbackError, 'user/save-experiment');
    }
  }
}
