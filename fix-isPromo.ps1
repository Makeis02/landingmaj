# Script PowerShell pour corriger l'erreur isPromo is not defined
Write-Host "🚀 Correction de l'erreur 'isPromo is not defined'..." -ForegroundColor Green

$files = Get-ChildItem -Path "src/pages/categories" -Filter "*.tsx" | Where-Object { 
    $_.Name -notlike "*.backup*" -and $_.Name -notlike "*.debug*" 
}

$fixedCount = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    if ($content -match '\{isPromo && <PromoBadge />\}') {
        $newContent = $content -replace '\{isPromo && <PromoBadge />\}', '{(product.hasDiscount || product.onSale) && <PromoBadge />}'
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
        Write-Host "✅ Corrigé: $($file.Name)" -ForegroundColor Green
        $fixedCount++
    }
}

Write-Host "`n🎉 Terminé! $fixedCount fichiers corrigés." -ForegroundColor Cyan
Write-Host "💡 L'erreur 'isPromo is not defined' a été résolue." -ForegroundColor Yellow 