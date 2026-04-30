const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, 'client', 'build');
const entriesToSync = ['index.html', 'asset-manifest.json', 'static'];

if (!fs.existsSync(buildDir)) {
  throw new Error('client/build does not exist. Run npm run build first.');
}

for (const entry of entriesToSync) {
  const source = path.join(buildDir, entry);
  const target = path.join(root, entry);
  if (!fs.existsSync(source)) continue;
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });
}

console.log('Synced static public_html files to the repository root.');
