const fs = require('fs');
const path = require('path');

const exts = ['.js', '.ts', '.tsx'];
const badRouteRegex = /\/:\W|\/:$/g; // match /: suivi d'un non-mot ou fin de ligne

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let match;
  let found = false;
  while ((match = badRouteRegex.exec(content)) !== null) {
    if (!found) {
      console.log(`\n❌ Problème trouvé dans : ${filePath}`);
      found = true;
    }
    const start = Math.max(0, match.index - 40);
    const end = Math.min(content.length, match.index + 40);
    const context = content.slice(start, end).replace(/\n/g, ' ');
    console.log(`  ...${context}...`);
  }
}

function scanDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (exts.includes(path.extname(fullPath))) {
      scanFile(fullPath);
    }
  });
}

console.log('🔎 Recherche des routes Express/React mal formées (/: sans nom)...');
scanDir(process.cwd());
console.log('\n✅ Scan terminé.');