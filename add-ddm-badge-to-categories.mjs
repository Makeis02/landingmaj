import { promises as fs } from 'fs';
import path from 'path';

const categoriesDir = path.join('src', 'pages', 'categories');

async function processFile(filePath) {
  let content = await fs.readFile(filePath, 'utf8');
  let changed = false;

  // Ajout de l'état DDM si absent
  if (!content.includes('const [ddmFlags, setDdmFlags]')) {
    content = content.replace(
      /useState\([^)]*\);\s*\n/, // après le dernier useState
      match => match + '  const [ddmFlags, setDdmFlags] = useState<Record<string, boolean>>({});\n  const [ddmDates, setDdmDates] = useState<Record<string, string>>({});\n'
    );
    changed = true;
  }

  // Ajout du useEffect DDM si absent
  if (!content.includes('fetchDdmFlags')) {
    content = content.replace(
      /setCurrentPage\(1\);\s*\n\s*}\), \[[^\]]*\]\);/,
      match => match + `\n\n  // Charger les flags DDM pour tous les produits affichés\n  useEffect(() => {\n    if (filteredProducts.length === 0) return;\n    const fetchDdmFlags = async () => {\n      const ddmKeys = filteredProducts.map(p => \`product_\${p.id}_ddm_exceeded\`);\n      const ddmDateKeys = filteredProducts.map(p => \`product_\${p.id}_ddm_date\`);\n      const { data: ddmData } = await supabase\n        .from('editable_content')\n        .select('content_key, content')\n        .in('content_key', [...ddmKeys, ...ddmDateKeys]);\n      const flags = {};\n      const dates = {};\n      ddmData?.forEach(item => {\n        if (item.content_key.endsWith('_ddm_exceeded')) {\n          const id = item.content_key.replace(/^product_|_ddm_exceeded$/g, '');\n          flags[id] = item.content === 'true';\n        }\n        if (item.content_key.endsWith('_ddm_date')) {\n          const id = item.content_key.replace(/^product_|_ddm_date$/g, '');\n          dates[id] = item.content;\n        }\n      });\n      setDdmFlags(flags);\n      setDdmDates(dates);\n    };\n    fetchDdmFlags();\n  }, [filteredProducts]);\n`
    );
    changed = true;
  }

  // Remplacement du badge promo par la logique DDM+promo
  if (!content.includes('Badge DDM prioritaire sur promo')) {
    content = content.replace(
      /(\{\s*)(\(product\.hasDiscount \|\| product\.onSale\) && <PromoBadge \/>)(\s*\})/g,
      `/* Badge DDM prioritaire sur promo */\n{ddmFlags[product.id] && ddmDates[product.id] ? (\n  <div className=\"absolute top-2 left-2 z-10\">\n    <span className=\"bg-orange-500 hover:bg-orange-600 text-white border-transparent uppercase text-xs px-3 py-1 rounded-full shadow\">\n      DDM DÉPASSÉE\n    </span>\n  </div>\n) : (product.hasDiscount || product.onSale) ? (\n  <div className=\"absolute top-2 left-2 z-10\">\n    <PromoBadge />\n  </div>\n) : null}`
    );
    changed = true;
  }

  if (changed) {
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Modifié :', filePath);
  } else {
    console.log('— Déjà à jour :', filePath);
  }
}

async function main() {
  const files = await fs.readdir(categoriesDir);
  for (const file of files) {
    if (file.endsWith('.tsx')) {
      await processFile(path.join(categoriesDir, file));
    }
  }
}

main(); 