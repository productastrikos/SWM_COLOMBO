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

function removeSourceMaps(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removeSourceMaps(fullPath);
    } else if (entry.name.endsWith('.map')) {
      fs.rmSync(fullPath, { force: true });
    }
  }
}

removeSourceMaps(path.join(root, 'static'));

console.log('Synced static public_html files to the repository root.');
