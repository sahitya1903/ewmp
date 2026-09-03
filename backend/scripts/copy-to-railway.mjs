// One-off: copy every collection from a source MongoDB to a target, exactly
// (documents, _ids, and indexes preserved). The target is wiped first.
//
//   TARGET_URI="mongodb://mongo:PASS@HOST.proxy.rlwy.net:PORT/ewmp?authSource=admin" \
//   node scripts/copy-to-railway.mjs
//
// SOURCE_URI defaults to the local dev database.

import mongoose from "mongoose";

const SOURCE_URI = process.env.SOURCE_URI || "mongodb://127.0.0.1:27017/ewmp";
const TARGET_URI = process.env.TARGET_URI;

if (!TARGET_URI) {
  console.error("Set TARGET_URI to the destination connection string.");
  process.exit(1);
}
if (SOURCE_URI === TARGET_URI) {
  console.error("SOURCE_URI and TARGET_URI are identical — refusing.");
  process.exit(1);
}

const src = await mongoose.createConnection(SOURCE_URI).asPromise();
const dst = await mongoose.createConnection(TARGET_URI).asPromise();

console.log(`\n  source: ${src.host}/${src.name}`);
console.log(`  target: ${dst.host}/${dst.name}\n`);

// Wipe the target.
for (const { name } of await dst.db.listCollections().toArray()) {
  await dst.db.dropCollection(name).catch(() => {});
}

const names = (await src.db.listCollections().toArray())
  .map((c) => c.name)
  .filter((n) => !n.startsWith("system."))
  .sort();

let grandTotal = 0;
for (const name of names) {
  const docs = await src.collection(name).find({}).toArray();
  if (docs.length) await dst.collection(name).insertMany(docs, { ordered: false });

  for (const idx of await src.collection(name).indexes()) {
    if (idx.name === "_id_") continue;
    const { key, name: idxName, v, ns, background, ...opts } = idx;
    await dst
      .collection(name)
      .createIndex(key, { name: idxName, ...opts })
      .catch((e) => console.warn(`  ! index ${name}.${idxName}: ${e.message}`));
  }

  grandTotal += docs.length;
  console.log(`  ${name.padEnd(22)} ${docs.length}`);
}

console.log(`\n  ${grandTotal} documents copied.\n`);
await src.close();
await dst.close();
