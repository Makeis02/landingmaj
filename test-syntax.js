const fs = require('fs');
const path = require('path');

const filesToCheck = [
    'src/pages/categories/ProduitsSpecifiquesPage.tsx',
    'src/pages/categories/EauDeMerDecorationPage.tsx',
    'src/pages/categories/UniverselsDecoPage.tsx',
    'src/pages/categories/EaudoucePompesPage.tsx',
    'src/pages/categories/EaudemerPompesPage.tsx',
    'src/pages/categories/EaudouceEclairagePage.tsx',
    'src/pages/categories/EclairageSpectreCompletPage.tsx',
    'src/pages/categories/EaudouceNourriturePage.tsx',
    'src/pages/categories/EaudemerNourriturePage.tsx',
    'src/pages/categories/EauDouceEntretienPage.tsx',
    'src/pages/categories/EauDeMerEntretienPage.tsx',
    'src/pages/categories/EntretienGeneralPage.tsx'
];

console.log('🔍 Vérification de la syntaxe des fichiers...\n');

let hasErrors = false;

filesToCheck.forEach(file => {
    try {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            
            // Vérifications de base pour les erreurs communes
            const checks = [
                {
                    pattern: /image: product\.image \|\| "\/placeholder\.svg",\)/g,
                    error: 'Parenthèse fermante en trop après placeholder.svg'
                },
                {
                    pattern: /\}\s*\)\s*:/g,
                    error: 'Structure d\'objet incorrecte'
                },
                {
                    pattern: /\(\s*product\s*=>\s*\(\s*\{/g,
                    error: 'Fonction map mal fermée'
                }
            ];
            
            let fileHasError = false;
            checks.forEach(check => {
                const matches = content.match(check.pattern);
                if (matches) {
                    console.log(`❌ ${file}: ${check.error} (${matches.length} occurrences)`);
                    fileHasError = true;
                    hasErrors = true;
                }
            });
            
            if (!fileHasError) {
                console.log(`✅ ${file}: Syntaxe OK`);
            }
        } else {
            console.log(`⚠️  ${file}: Fichier non trouvé`);
        }
    } catch (error) {
        console.log(`❌ ${file}: Erreur de lecture - ${error.message}`);
        hasErrors = true;
    }
});

console.log(`\n📊 Résumé: ${hasErrors ? 'Des erreurs ont été trouvées' : 'Tous les fichiers semblent corrects'}`);
process.exit(hasErrors ? 1 : 0); 