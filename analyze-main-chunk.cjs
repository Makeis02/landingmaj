#!/usr/bin/env node
// analyze-main-chunk.cjs
// Script Node.js CJS pour analyser le contenu du plus gros bundle JS (index-*.js) dans dist/assets
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'dist', 'assets');

function colorize(count) {
  if (count > 100) return '\x1b[31m'; // rouge
  if (count > 30) return '\x1b[33m'; // orange
  return '\x1b[32m'; // vert
}
function resetColor() { return '\x1b[0m'; }

function findMainChunk() {
  const files = fs.readdirSync(ASSETS_DIR)
    .filter(f => f.startsWith('index-') && f.endsWith('.js'))
    .map(f => ({
      name: f,
      size: fs.statSync(path.join(ASSETS_DIR, f)).size
    }))
    .sort((a, b) => b.size - a.size);
  return files[0]?.name;
}

function extractModules(content) {
  // Cherche les chemins de fichiers ou modules dans les commentaires rollup/webpack
  const regex = /\/\*\s*([^*?\n]+\.(js|ts|tsx|jsx|json))\s*\*\//g;
  const modules = {};
  let match;
  while ((match = regex.exec(content))) {
    const mod = match[1].trim();
    modules[mod] = (modules[mod] || 0) + 1;
  }
  // Ajoute aussi les require('...') ou import('...') trouvés
  const reqRegex = /require\(['"]([^'"]+)['"]\)/g;
  while ((match = reqRegex.exec(content))) {
    const mod = match[1].trim();
    modules[mod] = (modules[mod] || 0) + 1;
  }
  return modules;
}

function main() {
  const mainChunk = findMainChunk();
  if (!mainChunk) {
    console.error('Aucun fichier index-*.js trouvé dans dist/assets. Build le projet d\'abord.');
    process.exit(1);
  }
  const filePath = path.join(ASSETS_DIR, mainChunk);
  const content = fs.readFileSync(filePath, 'utf-8');
  const modules = extractModules(content);
  const sorted = Object.entries(modules).sort((a, b) => b[1] - a[1]);

  console.log(`\nTop 30 des modules/fichiers présents dans ${mainChunk} :\n`);
  sorted.slice(0, 30).forEach(([mod, count], i) => {
    const color = colorize(count);
    console.log(`${color}${String(i+1).padStart(2, ' ')}. ${mod.padEnd(50)} ${count}x${resetColor()}`);
  });
  console.log('\n\x1b[32mVert < 30x\x1b[0m, \x1b[33mOrange > 30x\x1b[0m, \x1b[31mRouge > 100x\x1b[0m\n');
}

main(); 