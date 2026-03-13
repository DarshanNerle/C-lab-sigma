import { allowMethods, normalizeEmail, sanitizeObservationTable, safeServerError } from '../../api-utils.js';
import { getUserDocByEmail } from '../../firebase-users.js';
import { updateDoc } from 'firebase/firestore';
import { getMemUser, updateMemUser } from '../../inMemoryUserStore.js';

const sanitizeProgress = (progress = {}) => ({
  observations: sanitizeObservationTable(progress.observations),
  completionStatus: typeof progress.completionStatus === 'string' ? progress.completionStatus.slice(0, 30) : 'in_progress',
  userResult: typeof progress.userResult === 'string' ? progress.userResult.slice(0, 500) : '',
  expectedResult: typeof progress.expectedResult === 'string' ? progress.expectedResult.slice(0, 500) : '',
  errorPercent: Number.isFinite(Number(progress.errorPercent)) ? Number(progress.errorPercent) : 0
});

const updateProgress = (list, experimentId, progress) => {
  const experiments = Array.isArray(list) ? [...list] : [];
  const index = experiments.findIndex((item) => item?.id === experimentId);
  if (index < 0) return experiments;
  experiments[index] = {
    ...experiments[index],
    progress: {
      ...(experiments[index]?.progress || {}),
      ...progress
    }
  };
  return experiments;
};

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['PATCH'])) return;

  const email = normalizeEmail(req.body?.email);
  const experimentId = typeof req.body?.experimentId === 'string' ? req.body.experimentId.trim() : '';
  const progress = sanitizeProgress(req.body?.progress);
  if (!email || !experimentId) {
    return res.status(400).json({ error: 'Valid email and experimentId are required.' });
  }

  try {
    const record = await getUserDocByEmail(email);
    if (!record) return res.status(404).json({ error: 'User not found.' });

    const nextExperiments = updateProgress(record.user.experiments, experimentId, progress);
    await updateDoc(record.ref, { experiments: nextExperiments, updatedAt: new Date() });
    return res.status(200).json({ ok: true, experimentId, progress, source: 'firebase' });
  } catch (error) {
    console.warn('[API:user/update-experiment-progress] Firebase unavailable, falling back to in-memory store.');
    try {
      const existing = getMemUser(email);
      if (!existing) return res.status(404).json({ error: 'User not found.' });
      const user = updateMemUser(email, (record) => {
        record.experiments = updateProgress(record.experiments, experimentId, progress);
        return record;
      });
      return res.status(200).json({ ok: true, experimentId, progress, experiments: user.experiments, source: 'memory' });
    } catch (fallbackError) {
      return safeServerError(res, fallbackError, 'user/update-experiment-progress');
    }
  }
}
