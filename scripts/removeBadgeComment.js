const fs = require('fs');
const path = require('path');

const CATEGORY_DIR = path.join(__dirname, '../src/pages/categories');
const COMMENT = '/* Badge DDM prioritaire sur promo */';

function removeCommentFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(COMMENT)) {
    const newContent = content.split('\n').filter(line => !line.includes(COMMENT)).join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Nettoyé : ${filePath}`);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx')) {
      removeCommentFromFile(fullPath);
    }
  }
}

processDirectory(CATEGORY_DIR);
console.log('🚀 Nettoyage terminé.'); 