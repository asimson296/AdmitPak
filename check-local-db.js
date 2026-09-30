/**
 * AdmitPak — Local MongoDB Inspector
 * Run: node check-local-db.js
 */

const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/admitpak');
  const db = mongoose.connection.db;

  const cols = await db.listCollections().toArray();
  console.log('📁 Collections:', cols.map(c => c.name).join(', ') || '(none)');

  const users = await db.collection('users').find({}).toArray();
  console.log('');
  console.log('👤 Signups:', users.length);
  users.forEach(u => {
    console.log('   - ' + u.email);
    console.log('     Name: ' + (u.name || '—'));
    console.log('     Tracked: ' + JSON.stringify(u.tracked || []));
    console.log('     Joined: ' + (u.createdAt || '').slice(0, 10));
  });

  const fb = await db.collection('feedbacks').find({}).sort({ submittedAt: -1 }).toArray();
  console.log('');
  console.log('💬 Feedback:', fb.length);
  fb.forEach(f => {
    console.log('   - [' + (f.category || 'general') + '] ' + (f.message || '').slice(0, 80));
    console.log('     From: ' + (f.email || f.userEmail || 'anonymous') + ' | ' + (f.submittedAt || '').slice(0, 16));
  });

  await mongoose.connection.close();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
