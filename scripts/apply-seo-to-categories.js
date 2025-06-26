const fs = require("fs");
const path = require("path");

const CATEGORIES_DIR = path.join(__dirname, "../src/pages/categories");
const SEO_IMPORT = `import SEO from \"@/components/SEO\";`;

function getCategoryInfo(content, filename) {
  // Essaie de trouver le titre/description dans le code
  const titleMatch = content.match(/const\s+categoryTitle\s*=\s*["'`](.+?)["'`]/);
  const descMatch = content.match(/const\s+categoryDescription\s*=\s*["'`](.+?)["'`]/);
  const title = titleMatch ? titleMatch[1] : filename.replace(/Page\.tsx$/, "");
  const description = descMatch ? descMatch[1] : `Découvrez notre sélection ${title}`;
  return { title, description };
}

function hasSeoComponent(content) {
  return content.includes("<SEO") || content.includes("import SEO");
}

function insertSeoComponent(content, { title, description }, filename) {
  // Ajoute l'import si absent
  let newContent = content;
  if (!content.includes(SEO_IMPORT)) {
    // Place l'import après les imports React
    newContent = newContent.replace(
      /import\s+[^;]+;\s*\n?/, // après le premier import
      (m) => m + SEO_IMPORT + "\n"
    );
  }
  // Ajoute le composant SEO juste après le début du composant principal
  const mainComponentMatch = newContent.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(.*?\)\s*=>\s*{([\s\S]*?)return\s*\(/);
  if (!mainComponentMatch) return newContent; // fallback
  const [fullMatch, compName, beforeReturn] = mainComponentMatch;
  const seoTag = `\n      <SEO\n        title=\"${title}\"\n        description=\"${description}\"\n        canonical={typeof window !== 'undefined' ? window.location.href : ''}\n        ogImage=\"/og-image.png\"\n      />\n  `;
  // Injecte juste avant le return (
  const idx = newContent.indexOf("return (", newContent.indexOf(fullMatch));
  if (idx === -1) return newContent;
  return newContent.slice(0, idx) + seoTag + "\n" + newContent.slice(idx);
}

function processFile(filepath) {
  const filename = path.basename(filepath);
  if (!filename.endsWith(".tsx")) return false;
  let content = fs.readFileSync(filepath, "utf8");
  if (hasSeoComponent(content)) return false; // déjà présent
  const info = getCategoryInfo(content, filename);
  const newContent = insertSeoComponent(content, info, filename);
  if (newContent !== content) {
    fs.copyFileSync(filepath, filepath + ".bak");
    fs.writeFileSync(filepath, newContent, "utf8");
    return true;
  }
  return false;
}

function main() {
  const files = fs.readdirSync(CATEGORIES_DIR);
  let count = 0;
  for (const file of files) {
    const fullPath = path.join(CATEGORIES_DIR, file);
    if (processFile(fullPath)) {
      console.log("✅ SEO ajouté à :", file);
      count++;
    }
  }
  if (count === 0) {
    console.log("Aucune page modifiée (SEO déjà présent partout ?)");
  } else {
    console.log(`Fini ! SEO ajouté à ${count} page(s) catégorie.`);
  }
}

main(); 