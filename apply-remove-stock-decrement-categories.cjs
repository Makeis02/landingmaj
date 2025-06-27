const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'src/pages/categories');

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const original = code;

  // Regex pour matcher le bloc fetch(/api/stock/decrement ...).then(() => { addItem ... })
  // et le remplacer par juste addItem(...)
  code = code.replace(/fetch\([^)]*\/api\/stock\/decrement[^;]*;\s*addItem\(([^)]*)\);[\s\S]*?\}\)\s*\.catch\([^}]*\}\);/g,
    (match, addItemArgs) => {
      return `addItem(${addItemArgs});`;
    }
  );

  // Variante : fetch ... then(() => { ... addItem ... })
  code = code.replace(/fetch\([^)]*\/api\/stock\/decrement[^;]*;\s*([\s\S]*?addItem\([^)]*\);[\s\S]*?)\}\)\s*\.catch\([^}]*\}\);/g,
    (match, block) => {
      // On garde tout le bloc sauf le fetch, on retire le fetch et on garde addItem et le reste
      return block;
    }
  );

  if (code !== original) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`[STOCK FIX] Correction appliquée à : ${path.basename(filePath)}`);
  }
}

fs.readdirSync(DIR).forEach(file => {
  if (file.endsWith('.tsx')) {
    processFile(path.join(DIR, file));
  }
});

console.log('[STOCK FIX] Script terminé.'); 