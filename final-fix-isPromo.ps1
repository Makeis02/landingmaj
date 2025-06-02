# Script final pour corriger isPromo undefined

Write-Host "Correction finale de l'erreur isPromo..." -ForegroundColor Green

$filesToFix = @(
    "src/pages/categories/ProduitsSpecifiquesPage.tsx",
    "src/pages/categories/EauDeMerDecorationPage.tsx",
    "src/pages/categories/UniverselsDecoPage.tsx",
    "src/pages/categories/EaudoucePompesPage.tsx",
    "src/pages/categories/EaudemerPompesPage.tsx",
    "src/pages/categories/EaudouceEclairagePage.tsx",
    "src/pages/categories/EclairageSpectreCompletPage.tsx",
    "src/pages/categories/EaudouceNourriturePage.tsx",
    "src/pages/categories/EaudemerNourriturePage.tsx",
    "src/pages/categories/EauDouceEntretienPage.tsx",
    "src/pages/categories/EauDeMerEntretienPage.tsx",
    "src/pages/categories/EntretienGeneralPage.tsx"
)

$fixedCount = 0

foreach ($file in $filesToFix) {
    if (Test-Path $file) {
        Write-Host "Verification de $file"
        
        $content = Get-Content $file -Raw -Encoding UTF8
        $originalContent = $content
        
        # Corriger isPromo undefined vers la bonne logique
        $content = $content -replace '\{isPromo \&\& \<PromoBadge /\>\}', '{(product.hasDiscount || product.onSale) && <PromoBadge />}'
        
        if ($content -ne $originalContent) {
            Set-Content $file -Value $content -Encoding UTF8
            Write-Host "Corrige isPromo dans: $file" -ForegroundColor Green
            $fixedCount++
        }
    }
}

Write-Host "Fichiers corriges pour isPromo: $fixedCount" -ForegroundColor Green 