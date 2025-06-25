const fs = require('fs').promises;
const path = require('path');

const CATEGORY_DIR = path.join(__dirname, 'src', 'pages', 'categories');
const EXCLUDE = ['EaudouceNourriturePage.tsx'];
const BADGE_BLOCK_REGEX = /(\{\s*\(product\.hasDiscount\s*\|\|\s*product\.onSale\)\s*\}\s*<PromoBadge \/>\s*\})/g;
const RELATIVE_BADGE_BLOCK = 'product.hasDiscount || product.onSale';
const DDM_STATE_BLOCK = `  const [ddmFlags, setDdmFlags] = useState<Record<string, boolean>>({});\n  const [ddmDates, setDdmDates] = useState<Record<string, string>>({});\n`;
const DDM_EFFECT_BLOCK = `  useEffect(() => {\n    if (filteredProducts.length === 0) return;\n    const fetchDdmFlags = async () => {\n      const ddmKeys = filteredProducts.map(p => \`product_\${p.id}_ddm_exceeded\`);\n      const ddmDateKeys = filteredProducts.map(p => \`product_\${p.id}_ddm_date\`);\n      const { data: ddmData } = await supabase\n        .from('editable_content')\n        .select('content_key, content')\n        .in('content_key', [...ddmKeys, ...ddmDateKeys]);\n      const flags = {};\n      const dates = {};\n      ddmData?.forEach(item => {\n        if (item.content_key.endsWith('_ddm_exceeded')) {\n          const id = item.content_key.replace(/^product_|_ddm_exceeded$/g, '');\n          flags[id] = item.content === 'true';\n        }\n        if (item.content_key.endsWith('_ddm_date')) {\n          const id = item.content_key.replace(/^product_|_ddm_date$/g, '');\n          dates[id] = item.content;\n        }\n      });\n      setDdmFlags(flags);\n      setDdmDates(dates);\n    };\n    fetchDdmFlags();\n  }, [filteredProducts]);\n`;
const DDM_BADGE_BLOCK = `{ddmFlags[product.id] && ddmDates[product.id] ? (\n  <div className=\"absolute top-2 left-2 z-10\">\n    <span className=\"bg-orange-500 hover:bg-orange-600 text-white border-transparent uppercase text-xs px-3 py-1 rounded-full shadow\">\n      DDM DÉPASSÉE\n    </span>\n  </div>\n) : (product.hasDiscount || product.onSale) ? (\n  <div className=\"absolute top-2 left-2 z-10\">\n    <PromoBadge />\n  </div>\n) : null}`;

(async () => {
  const files = (await fs.readdir(CATEGORY_DIR)).filter(f => f.endsWith('.tsx') && !EXCLUDE.includes(f));
  const now = Date.now();
  let modified = 0;
  for (const file of files) {
    const filePath = path.join(CATEGORY_DIR, file);
    let content = await fs.readFile(filePath, 'utf8');
    if (!content.includes('PromoBadge')) continue;
    // Backup
    await fs.writeFile(filePath + `.backup-badge-fix-${now}`, content, 'utf8');
    // Inject useState/useEffect si pas déjà là
    if (!content.includes('setDdmFlags')) {
      content = content.replace(/(useState\([^)]*\);\s*){1}/, `$&\n${DDM_STATE_BLOCK}`);
    }
    if (!content.includes('fetchDdmFlags')) {
      content = content.replace(/(useEffect\([^)]*\);\s*){1}/, `$&\n${DDM_EFFECT_BLOCK}`);
    }
    // Remplacer le bloc badge
    content = content.replace(BADGE_BLOCK_REGEX, DDM_BADGE_BLOCK);
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✅ Modifié : ${file}`);
    modified++;
  }
  console.log(`\n${modified} fichiers modifiés. Un backup .backup-badge-fix-${now} a été créé pour chaque.`);
})(); 