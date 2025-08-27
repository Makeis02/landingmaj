# Script pour restaurer tous les fichiers de categorie en utilisant le fichier de reference

Write-Host "Restauration des fichiers de categorie" -ForegroundColor Green

# Fichier de reference qui fonctionne
$referenceFile = "src/pages/categories/EaucDouceDécorationPage.tsx"

# Mapping des fichiers a restaurer avec leurs nouvelles configurations
$filesToRestore = @{
    "src/pages/categories/ProduitsSpecifiquesPage.tsx" = @{
        componentName = "ProduitsSpecifiquesPage"
        slug = "produitsspecifiques"
        title = "Produits Specifiques"
        description = "Decouvrez notre selection de produits specialises pour aquariophilie."
    }
    "src/pages/categories/EauDeMerDecorationPage.tsx" = @{
        componentName = "EauDeMerDecorationPage"
        slug = "eaudemerdecoration"
        title = "Decorations Eau de Mer"
        description = "Embellissez votre aquarium d'eau de mer avec nos decorations marines."
    }
    "src/pages/categories/UniverselsDecoPage.tsx" = @{
        componentName = "UniverselsDecoPage"
        slug = "universelsdeco"
        title = "Decorations Universelles"
        description = "Decorations adaptees a tous types d'aquariums."
    }
    "src/pages/categories/EaudoucePompesPage.tsx" = @{
        componentName = "EaudoucePompesPage"
        slug = "eaudoucepompes"
        title = "Pompes Eau Douce"
        description = "Systemes de pompage pour aquariums d'eau douce."
    }
    "src/pages/categories/EaudemerPompesPage.tsx" = @{
        componentName = "EaudemerPompesPage"
        slug = "eaudemerpompes"
        title = "Pompes Eau de Mer"
        description = "Pompes specialisees pour aquariums marins."
    }
    "src/pages/categories/EaudouceEclairagePage.tsx" = @{
        componentName = "EaudouceEclairagePage"
        slug = "eaudouceeclairage"
        title = "Eclairage Eau Douce"
        description = "Solutions d'eclairage pour aquariums d'eau douce."
    }
    "src/pages/categories/EclairageSpectreCompletPage.tsx" = @{
        componentName = "EclairageSpectreCompletPage"
        slug = "eclairagespectre"
        title = "Eclairage Spectre Complet"
        description = "Eclairages LED full spectrum pour tous aquariums."
    }
    "src/pages/categories/EaudouceNourriturePage.tsx" = @{
        componentName = "EaudouceNourriturePage"
        slug = "eaudoucenourriture"
        title = "Nourriture Eau Douce"
        description = "Alimentation adaptee aux poissons d'eau douce."
    }
    "src/pages/categories/EaudemerNourriturePage.tsx" = @{
        componentName = "EaudemerNourriturePage"
        slug = "eaudemernourriture"
        title = "Nourriture Eau de Mer"
        description = "Nutrition specialisee pour la vie marine."
    }
    "src/pages/categories/EauDouceEntretienPage.tsx" = @{
        componentName = "EauDouceEntretienPage"
        slug = "eaudouceentretien"
        title = "Entretien Eau Douce"
        description = "Produits d'entretien pour aquariums d'eau douce."
    }
    "src/pages/categories/EauDeMerEntretienPage.tsx" = @{
        componentName = "EauDeMerEntretienPage"
        slug = "eaudemerentretien"
        title = "Entretien Eau de Mer"
        description = "Solutions d'entretien pour aquariums marins."
    }
    "src/pages/categories/EntretienGeneralPage.tsx" = @{
        componentName = "EntretienGeneralPage"
        slug = "entretiengeneral"
        title = "Entretien General"
        description = "Produits d'entretien universels pour tous aquariums."
    }
}

Write-Host "Lecture du fichier de reference..." -ForegroundColor Yellow

# Verifier que le fichier de reference existe
if (-not (Test-Path $referenceFile)) {
    Write-Host "Fichier de reference non trouve: $referenceFile" -ForegroundColor Red
    exit 1
}

# Lire le contenu du fichier de reference
$referenceContent = Get-Content $referenceFile -Raw -Encoding UTF8

foreach ($file in $filesToRestore.Keys) {
    $config = $filesToRestore[$file]
    
    Write-Host "Restauration de $file..." -ForegroundColor Blue
    
    # Copier le contenu de reference
    $newContent = $referenceContent
    
    # Remplacer le nom du composant
    $newContent = $newContent -replace "const CategoryPage", "const $($config.componentName)"
    $newContent = $newContent -replace "export default CategoryPage", "export default $($config.componentName)"
    
    # Remplacer les valeurs par defaut
    $newContent = $newContent -replace 'const rawSlug = useParams<\{ slug: string \}>\(\)\?\.slug \|\| "eaudoucedecoration"', "const rawSlug = useParams<{ slug: string }>()?.slug || `"$($config.slug)`""
    $newContent = $newContent -replace 'setCategoryTitle\("Décorations Eau Douce"\)', "setCategoryTitle(`"$($config.title)`")"
    $newContent = $newContent -replace 'setCategoryDescription\("Embellissez votre aquarium d''eau douce avec nos décorations spécialement sélectionnées\."\)', "setCategoryDescription(`"$($config.description)`")"
    
    # Ecrire le nouveau fichier
    try {
        $newContent | Out-File -FilePath $file -Encoding UTF8 -NoNewline
        Write-Host "  $file restaure avec succes" -ForegroundColor Green
    }
    catch {
        Write-Host "  Erreur lors de la restauration de $file : $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Restauration terminee!" -ForegroundColor Green
Write-Host "Resume:"
Write-Host "  - Fichier de reference: $referenceFile"
Write-Host "  - Fichiers restaures: $($filesToRestore.Count)"
Write-Host ""
Write-Host "Vous pouvez maintenant redemarrer votre serveur de developpement." -ForegroundColor Cyan jgjgj