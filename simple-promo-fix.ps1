# Script PowerShell simple pour appliquer les améliorations promotionnelles
Write-Host "🚀 Application des améliorations promotionnelles..." -ForegroundColor Green

# Fichier de référence avec les bonnes implémentations
$referenceFile = "src/pages/categories/EaucDouceDécorationPage.tsx"

if (-not (Test-Path $referenceFile)) {
    Write-Host "❌ Fichier de référence non trouvé" -ForegroundColor Red
    exit 1
}

$referenceContent = Get-Content $referenceFile -Raw -Encoding UTF8

# Extraire la fonction enrichProductsWithPromotions
$enrichFunctionMatch = $referenceContent -match '(?s)(const enrichProductsWithPromotions = async.*?)(?=\n\nconst fetchVariantPriceMaps)'
if ($enrichFunctionMatch) {
    $enrichFunction = $matches[1]
} else {
    Write-Host "❌ Fonction enrichProductsWithPromotions non trouvée dans le fichier de référence" -ForegroundColor Red
    exit 1
}

# Extraire le useEffect pour les prix promos
$promoUseEffectMatch = $referenceContent -match '(?s)(useEffect\(\(\) => \{.*?Précharger les prix promos.*?\}, \[filteredProducts\]\);)'
if ($promoUseEffectMatch) {
    $promoUseEffect = $matches[1]
} else {
    Write-Host "❌ useEffect pour prix promos non trouvé" -ForegroundColor Red
    exit 1
}

# Obtenir la liste des fichiers à traiter
$files = Get-ChildItem -Path "src/pages/categories" -Filter "*.tsx" | Where-Object { 
    $_.Name -notlike "*.backup*" -and 
    $_.Name -notlike "*.debug*" -and 
    $_.Name -ne "EaucDouceDécorationPage.tsx"
}

Write-Host "📋 Fichiers à traiter: $($files.Count)" -ForegroundColor Cyan
$files | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor Gray }

$updatedCount = 0

foreach ($file in $files) {
    Write-Host "`n🔧 Traitement de $($file.Name)..." -ForegroundColor Yellow
    
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $hasChanges = $false
        
        # 1. Ajouter import useCartStore si manquant
        if ($content -notmatch "import \{ useCartStore \}") {
            $importLine = "import { useCartStore } from `"@/stores/useCartStore`";"
            $content = $content -replace "(import.*?use-toast.*?;)", "`$1`n$importLine"
            Write-Host "  ✅ Import useCartStore ajouté" -ForegroundColor Green
            $hasChanges = $true
        }
        
        # 2. Ajouter import PromoBadge si manquant
        if ($content -notmatch "import PromoBadge") {
            $importLine = "import PromoBadge from `"@/components/PromoBadge`";"
            $content = $content -replace "(import { getPriceIdForProduct }.*?;)", "`$1`n$importLine"
            Write-Host "  ✅ Import PromoBadge ajouté" -ForegroundColor Green
            $hasChanges = $true
        }
        
        # 3. Ajouter enrichProductsWithPromotions si absent
        if ($content -notmatch "enrichProductsWithPromotions") {
            $pattern = "(const \w+Page = \(\) => \{)"
            $content = $content -replace $pattern, "$enrichFunction`n`n`$1"
            Write-Host "  ✅ Fonction enrichProductsWithPromotions ajoutée" -ForegroundColor Green
            $hasChanges = $true
        }
        
        # 4. Ajouter état promoPrices si absent
        if ($content -notmatch "promoPrices") {
            $stateDeclaration = @"
  // Ajout d'un état local pour stocker les prix promos des produits sans variante
  const [promoPrices, setPromoPrices] = useState<Record<string, any>>({});

  // Cart functionality
  const { getDiscountedPrice, addItem } = useCartStore();
"@
            $pattern = "(const \[currentPage, setCurrentPage\] = useState\(1\);)"
            $content = $content -replace $pattern, "`$1`n`n$stateDeclaration"
            Write-Host "  ✅ État promoPrices et useCartStore ajoutés" -ForegroundColor Green
            $hasChanges = $true
        }
        
        # 5. Ajouter useEffect pour prix promos si absent
        if ($content -notmatch "Précharger les prix promos") {
            # Trouver le dernier useEffect et ajouter après
            $pattern = "(\}, \[filteredProducts\]\);)"
            $content = $content -replace $pattern, "`$1`n`n  $promoUseEffect"
            Write-Host "  ✅ useEffect pour prix promos ajouté" -ForegroundColor Green
            $hasChanges = $true
        }
        
        # 6. Mettre à jour le map des produits pour inclure la logique promo
        if ($content -match "paginatedProducts\.map\(\(product\) => \(" -and $content -notmatch "const promo = promoPrices") {
            $pattern = "paginatedProducts\.map\(\(product\) => \("
            $replacement = @"
paginatedProducts.map((product) => {
                  const promo = promoPrices[product.id];
                  const isPromo = !!promo && promo.discount_percentage;
                  return (
"@
            $content = $content -replace $pattern, $replacement
            Write-Host "  ✅ Logique des prix promos ajoutée au rendu" -ForegroundColor Green
            $hasChanges = $true
        }
        
        # 7. Mettre à jour l'affichage des prix
        $oldPricePattern = '\{product\.variantPriceRange[\s\S]*?`\$\{product\.price\?\?\.toFixed\(2\)\} €`[\s\S]*?\}'
        if ($content -match $oldPricePattern -and $content -notmatch "isPromo \?") {
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
            $content = $content -replace $oldPricePattern, $newPriceDisplay
            Write-Host "  ✅ Affichage des prix avec promotions mis à jour" -ForegroundColor Green
            $hasChanges = $true
        }
        
        # 8. Mettre à jour le bouton Ajouter pour gérer les promotions
        $oldButtonPattern = 'onClick=\{\(\) => \{[\s\S]*?addItem\(\{[\s\S]*?title: product\.title,[\s\S]*?price: product\.price,[\s\S]*?\}\);[\s\S]*?\}\}'
        if ($content -match $oldButtonPattern -and $content -notmatch "if \(isPromo\)") {
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
            $content = $content -replace $oldButtonPattern, $newButtonLogic
            Write-Host "  ✅ Bouton Ajouter avec gestion des promotions mis à jour" -ForegroundColor Green
            $hasChanges = $true
        }
        
        # 9. Appliquer enrichProductsWithPromotions dans le useEffect principal
        if ($content -match "enrichProductsWithPromotions" -and $content -notmatch "await enrichProductsWithPromotions\(finalProducts\)") {
            $pattern = "(const finalProducts = updatedWithRatings\.map[\s\S]*?\}\);)"
            $replacement = "`$1`n`n        // 🎯 Enrichir les produits avec la détection des promotions`n        const productsWithPromotions = await enrichProductsWithPromotions(finalProducts);"
            $content = $content -replace $pattern, $replacement
            
            $content = $content -replace "setProducts\(finalProducts\);", "setProducts(productsWithPromotions);"
            $content = $content -replace "const filtered = finalProducts\.filter", "const filtered = productsWithPromotions.filter"
            
            Write-Host "  ✅ enrichProductsWithPromotions appliqué" -ForegroundColor Green
            $hasChanges = $true
        }
        
        # 10. Corriger la fermeture du map
        if ($content -match "const isPromo = !!promo && promo\.discount_percentage;" -and $content -notmatch "\}\)\s*\}\)\)") {
            $pattern = "(\}\)\)\s*)(?=\s*\)\})"
            $content = $content -replace $pattern, "};\n                })\n              )}"
            Write-Host "  ✅ Fermeture du map corrigée" -ForegroundColor Green
            $hasChanges = $true
        }
        
        # Sauvegarder si des modifications ont été apportées
        if ($hasChanges) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            Write-Host "  🎉 Fichier mis à jour avec succès!" -ForegroundColor Green
            $updatedCount++
        } else {
            Write-Host "  ℹ️  Aucune modification nécessaire" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "  ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n📊 Résumé:" -ForegroundColor Cyan
Write-Host "   ✅ $updatedCount fichiers mis à jour" -ForegroundColor Green
Write-Host "   ℹ️  $($files.Count - $updatedCount) fichiers déjà à jour" -ForegroundColor Gray

Write-Host "`n🎉 Mise à jour terminée!" -ForegroundColor Green
Write-Host "💡 Les pages de catégorie ont maintenant:" -ForegroundColor Yellow
Write-Host "   - Gestion des prix promotionnels" -ForegroundColor Gray
Write-Host "   - Badges de promotion" -ForegroundColor Gray
Write-Host "   - Ajout au panier avec prix réduits" -ForegroundColor Gray
Write-Host "   - Affichage correct des prix barrés" -ForegroundColor Gray 