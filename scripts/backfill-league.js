import fs from 'fs';
import admin from 'firebase-admin';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('Missing service account file path. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

const raw = fs.readFileSync(serviceAccountPath, 'utf8');
const serviceAccount = JSON.parse(raw);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const usersSnap = await db.collection('users').get();
const leagueSnap = await db.collection('league_scores').get();
const existingLeagueIds = new Set(leagueSnap.docs.map((doc) => doc.id));

let batch = db.batch();
let batchCount = 0;
let created = 0;

for (const doc of usersSnap.docs) {
  if (existingLeagueIds.has(doc.id)) continue;

  const data = doc.data() || {};
  const userName = String(data.name || data.displayName || data.email?.split('@')[0] || 'Student').trim() || 'Student';
  const leagueRef = db.collection('league_scores').doc(doc.id);

  batch.set(leagueRef, {
    userId: doc.id,
    userName,
    totalExperiments: 0,
    totalScore: 0,
    averageAccuracy: 0,
    lastExperiment: '',
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  batchCount += 1;
  created += 1;

  if (batchCount >= 400) {
    await batch.commit();
    batch = db.batch();
    batchCount = 0;
  }
}

if (batchCount > 0) {
  await batch.commit();
}

console.log(`Backfill complete. Created ${created} league_scores documents.`);
