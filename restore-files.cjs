const fs = require('fs');
const path = require('path');

console.log('🔧 Restauration des fichiers de catégorie');

// Fichier de référence qui fonctionne
const referenceFile = 'src/pages/categories/EaucDouceDécorationPage.tsx';

// Mapping des fichiers à restaurer avec leurs nouvelles configurations
const filesToRestore = {
    'src/pages/categories/ProduitsSpecifiquesPage.tsx': {
        componentName: 'ProduitsSpecifiquesPage',
        slug: 'produitsspecifiques',
        title: 'Produits Spécifiques',
        description: 'Découvrez notre sélection de produits spécialisés pour aquariophilie.'
    },
    'src/pages/categories/EauDeMerDecorationPage.tsx': {
        componentName: 'EauDeMerDecorationPage',
        slug: 'eaudemerdecoration',
        title: 'Décorations Eau de Mer',
        description: 'Embellissez votre aquarium d\'eau de mer avec nos décorations marines.'
    },
    'src/pages/categories/UniverselsDecoPage.tsx': {
        componentName: 'UniverselsDecoPage',
        slug: 'universelsdeco',
        title: 'Décorations Universelles',
        description: 'Décorations adaptées à tous types d\'aquariums.'
    },
    'src/pages/categories/EaudoucePompesPage.tsx': {
        componentName: 'EaudoucePompesPage',
        slug: 'eaudoucepompes',
        title: 'Pompes Eau Douce',
        description: 'Systèmes de pompage pour aquariums d\'eau douce.'
    },
    'src/pages/categories/EaudemerPompesPage.tsx': {
        componentName: 'EaudemerPompesPage',
        slug: 'eaudemerpompes',
        title: 'Pompes Eau de Mer',
        description: 'Pompes spécialisées pour aquariums marins.'
    },
    'src/pages/categories/EaudouceEclairagePage.tsx': {
        componentName: 'EaudouceEclairagePage',
        slug: 'eaudouceeclairage',
        title: 'Éclairage Eau Douce',
        description: 'Solutions d\'éclairage pour aquariums d\'eau douce.'
    },
    'src/pages/categories/EclairageSpectreCompletPage.tsx': {
        componentName: 'EclairageSpectreCompletPage',
        slug: 'eclairagespectre',
        title: 'Éclairage Spectre Complet',
        description: 'Éclairages LED full spectrum pour tous aquariums.'
    },
    'src/pages/categories/EaudouceNourriturePage.tsx': {
        componentName: 'EaudouceNourriturePage',
        slug: 'eaudoucenourriture',
        title: 'Nourriture Eau Douce',
        description: 'Alimentation adaptée aux poissons d\'eau douce.'
    },
    'src/pages/categories/EaudemerNourriturePage.tsx': {
        componentName: 'EaudemerNourriturePage',
        slug: 'eaudemernourriture',
        title: 'Nourriture Eau de Mer',
        description: 'Nutrition spécialisée pour la vie marine.'
    },
    'src/pages/categories/EauDouceEntretienPage.tsx': {
        componentName: 'EauDouceEntretienPage',
        slug: 'eaudouceentretien',
        title: 'Entretien Eau Douce',
        description: 'Produits d\'entretien pour aquariums d\'eau douce.'
    },
    'src/pages/categories/EauDeMerEntretienPage.tsx': {
        componentName: 'EauDeMerEntretienPage',
        slug: 'eaudemerentretien',
        title: 'Entretien Eau de Mer',
        description: 'Solutions d\'entretien pour aquariums marins.'
    },
    'src/pages/categories/EntretienGeneralPage.tsx': {
        componentName: 'EntretienGeneralPage',
        slug: 'entretiengeneral',
        title: 'Entretien Général',
        description: 'Produits d\'entretien universels pour tous aquariums.'
    }
};

console.log('📖 Lecture du fichier de référence...');

// Vérifier que le fichier de référence existe
if (!fs.existsSync(referenceFile)) {
    console.error(`❌ Fichier de référence non trouvé: ${referenceFile}`);
    process.exit(1);
}

// Lire le contenu du fichier de référence
const referenceContent = fs.readFileSync(referenceFile, 'utf8');

let successCount = 0;
let errorCount = 0;

for (const [file, config] of Object.entries(filesToRestore)) {
    console.log(`🔄 Restauration de ${file}...`);
    
    try {
        // Copier le contenu de référence
        let newContent = referenceContent;
        
        // Remplacer le nom du composant
        newContent = newContent.replace(/const CategoryPage/g, `const ${config.componentName}`);
        newContent = newContent.replace(/export default CategoryPage/g, `export default ${config.componentName}`);
        
        // Remplacer les valeurs par défaut
        newContent = newContent.replace(
            /const rawSlug = useParams<\{ slug: string \}>\(\)\?\.slug \|\| "eaudoucedecoration"/g,
            `const rawSlug = useParams<{ slug: string }>()?.slug || "${config.slug}"`
        );
        newContent = newContent.replace(
            /setCategoryTitle\("Décorations Eau Douce"\)/g,
            `setCategoryTitle("${config.title}")`
        );
        newContent = newContent.replace(
            /setCategoryDescription\("Embellissez votre aquarium d'eau douce avec nos décorations spécialement sélectionnées\."\)/g,
            `setCategoryDescription("${config.description}")`
        );
        
        // Écrire le nouveau fichier
        fs.writeFileSync(file, newContent, 'utf8');
        console.log(`  ✅ ${file} restauré avec succès`);
        successCount++;
    } catch (error) {
        console.error(`  ❌ Erreur lors de la restauration de ${file}: ${error.message}`);
        errorCount++;
    }
}

console.log('');
console.log('🎉 Restauration terminée!');
console.log('📝 Résumé:');
console.log(`  - Fichier de référence: ${referenceFile}`);
console.log(`  - Fichiers restaurés avec succès: ${successCount}`);
console.log(`  - Erreurs: ${errorCount}`);
console.log('');
console.log('🚀 Vous pouvez maintenant redémarrer votre serveur de développement.'); 