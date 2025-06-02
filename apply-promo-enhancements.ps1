# Script PowerShell pour appliquer les améliorations de prix promotionnels à toutes les pages de catégorie
param(
    [switch]$DryRun = $false
)

Write-Host "🚀 Application des améliorations de prix promotionnels..." -ForegroundColor Green
Write-Host "📁 Analyse des fichiers de catégorie..." -ForegroundColor Cyan

# Référence: le fichier EaucDouceDécorationPage.tsx comme modèle
$referenceFile = "src/pages/categories/EaucDouceDécorationPage.tsx"

if (-not (Test-Path $referenceFile)) {
    Write-Host "❌ Fichier de référence non trouvé: $referenceFile" -ForegroundColor Red
    exit 1
}

# Lire le contenu de référence
$referenceContent = Get-Content $referenceFile -Raw -Encoding UTF8

# Extraire les fonctions importantes du fichier de référence
function Extract-FunctionFromReference {
    param($content, $functionName)
    
    switch ($functionName) {
        "enrichProductsWithPromotions" {
            if ($content -match '(?s)const enrichProductsWithPromotions = async.*?(?=\n\nconst|\n\n\/\/|\nconst \w+Page)') {
                return $matches[0]
            }
        }
        "promoPricesState" {
            if ($content -match 'const \[promoPrices, setPromoPrices\] = useState<Record<string, any>>\(\{\}\);') {
                return $matches[0]
            }
        }
        "cartFunctionality" {
            if ($content -match 'const \{ getDiscountedPrice, addItem \} = useCartStore\(\);') {
                return $matches[0]
            }
        }
        "promoPricesUseEffect" {
            if ($content -match '(?s)useEffect\(\(\) => \{.*?précharger les prix promos.*?\}, \[filteredProducts\]\);') {
                return $matches[0]
            }
        }
    }
    return $null
}

# Obtenir la liste des fichiers à traiter
$files = Get-ChildItem -Path "src/pages/categories" -Filter "*.tsx" | Where-Object { 
    $_.Name -notlike "*.backup*" -and $_.Name -notlike "*.debug*" -and $_.Name -ne "EaucDouceDécorationPage.tsx"
}

Write-Host "📋 Fichiers trouvés: $($files.Count)" -ForegroundColor Yellow
$files | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor Gray }

$updatedCount = 0
$errorCount = 0

foreach ($file in $files) {
    Write-Host "`n🔧 Traitement de $($file.Name)..." -ForegroundColor Cyan
    
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        $hasChanges = $false
        
        # 1. Ajouter les imports manquants
        if ($content -notmatch 'import \{ useCartStore \}') {
            Write-Host "  📦 Ajout de l'import useCartStore..." -ForegroundColor Yellow
            $content = $content -replace '(import.*?from.*?;)', "`$1`nimport { useCartStore } from `"@/stores/useCartStore`";"
            $hasChanges = $true
        }
        
        if ($content -notmatch 'import PromoBadge') {
            Write-Host "  📦 Ajout de l'import PromoBadge..." -ForegroundColor Yellow
            $content = $content -replace '(import.*?from.*?;)', "`$1`nimport PromoBadge from `"@/components/PromoBadge`";"
            $hasChanges = $true
        }
        
        # 2. Ajouter enrichProductsWithPromotions si absent
        if ($content -notmatch 'enrichProductsWithPromotions') {
            Write-Host "  🎯 Ajout de enrichProductsWithPromotions..." -ForegroundColor Yellow
            $enrichFunction = Extract-FunctionFromReference $referenceContent "enrichProductsWithPromotions"
            if ($enrichFunction) {
                $content = $content -replace '(const \w+Page = \(\) => \{)', "$enrichFunction`n`n`$1"
                $hasChanges = $true
            }
        }
        
        # 3. Ajouter l'état promoPrices si absent
        if ($content -notmatch 'promoPrices') {
            Write-Host "  📊 Ajout de l'état promoPrices..." -ForegroundColor Yellow
            $content = $content -replace '(const \[currentPage, setCurrentPage\] = useState\(1\);)', "`$1`n`n  // Ajout d'un état local pour stocker les prix promos des produits sans variante`n  const [promoPrices, setPromoPrices] = useState<Record<string, any>>({});"
            $hasChanges = $true
        }
        
        # 4. Ajouter useCartStore si absent
        if ($content -notmatch 'const \{ getDiscountedPrice, addItem \} = useCartStore') {
            Write-Host "  🛒 Ajout de useCartStore..." -ForegroundColor Yellow
            $content = $content -replace '(const \[promoPrices, setPromoPrices\].*?;)', "`$1`n`n  // Cart functionality`n  const { getDiscountedPrice, addItem } = useCartStore();"
            $hasChanges = $true
        }
        
        # 5. Ajouter le useEffect pour précharger les prix promos si absent
        if ($content -notmatch 'Précharger les prix promos') {
            Write-Host "  ⚡ Ajout du useEffect pour les prix promos..." -ForegroundColor Yellow
            $promoUseEffect = Extract-FunctionFromReference $referenceContent "promoPricesUseEffect"
            if ($promoUseEffect) {
                # Trouver le dernier useEffect
                $content = $content -replace '(\}, \[.*?\]\);)(\s*\n)', "`$1`$2`n  $promoUseEffect`n"
                $hasChanges = $true
            }
        }
        
        # 6. Corriger le rendu des produits pour inclure les prix promos
        if ($content -match 'paginatedProducts\.map\(\(product\) => \(' -and $content -notmatch 'const promo = promoPrices\[product\.id\]') {
            Write-Host "  🎨 Mise à jour du rendu des produits..." -ForegroundColor Yellow
            $content = $content -replace 'paginatedProducts\.map\(\(product\) => \(', 'paginatedProducts.map((product) => {`n                  const promo = promoPrices[product.id];`n                  const isPromo = !!promo && promo.discount_percentage;`n                  return ('
            $hasChanges = $true
        }
        
        # 7. Corriger l'affichage des prix pour inclure les promotions
        if ($content -match '\{product\.variantPriceRange.*?\$\{product\.price.*?\}' -and $content -notmatch 'isPromo \?') {
            Write-Host "  💰 Mise à jour de l'affichage des prix..." -ForegroundColor Yellow
            $newPriceDisplay = @'
{product.variantPriceRange ? (
                            `De ${product.variantPriceRange.min.toFixed(2)} € à ${product.variantPriceRange.max.toFixed(2)} €`
                          ) : isPromo ? (
                            <>
                              <span className="text-gray-500 line-through mr-2">{promo.original_price.toFixed(2)}€</span>
                              <span className="text-red-600 font-semibold">{promo.price.toFixed(2)}€</span>
                              <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">-{promo.discount_percentage}%</span>
                            </>
                          ) : (
                            `${product.price?.toFixed(2)} €`
                          )}
'@
            $content = $content -replace '\{product\.variantPriceRange.*?\$\{product\.price.*?\}', $newPriceDisplay
            $hasChanges = $true
        }
        
        # 8. Corriger le bouton "Ajouter" pour utiliser la logique des promotions
        if ($content -match 'onClick=\{\(\) => \{.*?addItem.*?title: product\.title.*?price: product\.price' -and $content -notmatch 'if \(isPromo\)') {
            Write-Host "  🔘 Mise à jour du bouton Ajouter..." -ForegroundColor Yellow
            $newButtonLogic = @'
onClick={async () => {
                                // Ajout au panier avec gestion promo
                                if (isPromo) {
                                  await addItem({
                                    id: product.id,
                                    title: product.title,
                                    price: promo.price,
                                    original_price: promo.original_price,
                                    discount_percentage: promo.discount_percentage,
                                    has_discount: true,
                                    image_url: product.image || "",
                                    quantity: 1,
                                    stripe_price_id: promo.stripe_price_id,
                                    stripe_discount_price_id: promo.stripe_discount_price_id
                                  });
                                  toast({
                                    title: "Produit ajouté au panier",
                                    description: `${product.title} a été ajouté au panier avec ${promo.discount_percentage}% de réduction !`,
                                  });
                                } else {
                                  await addItem({
                                    id: product.id,
                                    title: product.title,
                                    price: product.price,
                                    image_url: product.image || "",
                                    quantity: 1
                                  });
                                  toast({
                                    title: "Produit ajouté au panier",
                                    description: `${product.title} a été ajouté au panier.`,
                                  });
                                }
                              }}
'@
            $content = $content -replace 'onClick=\{\(\) => \{.*?title: "Produit ajouté".*?\}\}', $newButtonLogic
            $hasChanges = $true
        }
        
        # 9. Appliquer enrichProductsWithPromotions dans le useEffect principal
        if ($content -match 'enrichProductsWithPromotions' -and $content -notmatch 'await enrichProductsWithPromotions\(finalProducts\)') {
            Write-Host "  🔗 Application de enrichProductsWithPromotions..." -ForegroundColor Yellow
            $content = $content -replace '(const finalProducts = updatedWithRatings\.map.*?\}\);)', "`$1`n`n        // 🎯 Enrichir les produits avec la détection des promotions`n        const productsWithPromotions = await enrichProductsWithPromotions(finalProducts);"
            $content = $content -replace 'setProducts\(finalProducts\);', 'setProducts(productsWithPromotions);'
            $content = $content -replace 'const filtered = finalProducts\.filter', 'const filtered = productsWithPromotions.filter'
            $hasChanges = $true
        }
        
        # 10. Corriger la fermeture du map s'il y a des erreurs de parenthèses
        if ($content -match 'const isPromo = !!promo && promo\.discount_percentage;' -and $content -notmatch '\}\)\s*\n\s*\)\}\)') {
            Write-Host "  🔧 Correction des parenthèses du map..." -ForegroundColor Yellow
            $content = $content -replace '(\}\)\)\s*)$', '};\n                })\n              )}'
            $hasChanges = $true
        }
        
        # Sauvegarder le fichier s'il y a eu des modifications
        if ($hasChanges) {
            if (-not $DryRun) {
                Set-Content -Path $file.FullName -Value $content -Encoding UTF8
                Write-Host "  ✅ Fichier mis à jour!" -ForegroundColor Green
            } else {
                Write-Host "  🔍 Modifications détectées (mode DryRun)" -ForegroundColor Yellow
            }
            $updatedCount++
        } else {
            Write-Host "  ℹ️  Aucune modification nécessaire" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "  ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host "`n📊 Résumé:" -ForegroundColor Cyan
Write-Host "   ✅ $updatedCount fichiers mis à jour" -ForegroundColor Green
Write-Host "   ℹ️  $($files.Count - $updatedCount - $errorCount) fichiers déjà à jour" -ForegroundColor Gray
Write-Host "   ❌ $errorCount erreurs" -ForegroundColor Red

if ($DryRun) {
    Write-Host "`n🔍 Mode DryRun activé - aucun fichier n'a été modifié" -ForegroundColor Yellow
    Write-Host "Pour appliquer les modifications, exécutez: .\apply-promo-enhancements.ps1" -ForegroundColor Cyan
} else {
    Write-Host "`n🎉 Mise à jour terminée!" -ForegroundColor Green
    if ($updatedCount -gt 0) {
        Write-Host "`n💡 Recommandations:" -ForegroundColor Yellow
        Write-Host "   1. Vérifiez que les imports sont corrects" -ForegroundColor Gray
        Write-Host "   2. Testez les pages mises à jour" -ForegroundColor Gray
        Write-Host "   3. Vérifiez l'affichage des prix promotionnels" -ForegroundColor Gray
    }
} 