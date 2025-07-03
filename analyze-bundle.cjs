#!/usr/bin/env node
// analyze-bundle.cjs
// Script Node.js CJS pour analyser le dossier dist/assets et afficher le top 20 des fichiers JS les plus lourds
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'dist', 'assets');

function colorize(sizeKb) {
  if (sizeKb > 500) return '\x1b[31m'; // rouge
  if (sizeKb > 200) return '\x1b[33m'; // orange
  return '\x1b[32m'; // vert
}

function resetColor() {
  return '\x1b[0m';
}

function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error('Dossier dist/assets introuvable. Build le projet d\'abord.');
    process.exit(1);
  }
  const files = fs.readdirSync(ASSETS_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => {
      const filePath = path.join(ASSETS_DIR, f);
      const stats = fs.statSync(filePath);
      return { name: f, size: stats.size };
    })
    .sort((a, b) => b.size - a.size);

  console.log('\nTop 20 des fichiers JS les plus lourds dans dist/assets :\n');
  files.slice(0, 20).forEach((file, i) => {
    const sizeKb = (file.size / 1024).toFixed(1);
    const color = colorize(sizeKb);
    console.log(`${color}${String(i+1).padStart(2, ' ')}. ${file.name.padEnd(40)} ${sizeKb} Ko${resetColor()}`);
  });
  console.log('\n\x1b[32mVert < 200Ko\x1b[0m, \x1b[33mOrange > 200Ko\x1b[0m, \x1b[31mRouge > 500Ko\x1b[0m\n');
}

main(); 