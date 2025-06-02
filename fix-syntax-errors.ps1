# Script pour corriger les erreurs de syntaxe dans les fichiers de catégorie

Write-Host "🔧 Début de la correction des erreurs de syntaxe dans les fichiers de catégorie" -ForegroundColor Green

# Liste des fichiers à corriger
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
$errorCount = 0

foreach ($file in $filesToFix) {
    if (Test-Path $file) {
        try {
            Write-Host "🔍 Vérification de $file" -ForegroundColor Yellow
            
            # Lire le contenu du fichier
            $content = Get-Content $file -Raw -Encoding UTF8
            
            # Vérifier s'il y a des problèmes de parenthèses
            $originalContent = $content
            
            # Correction 1: Parenthèse fermante en trop après "/placeholder.svg"
            $content = $content -replace 'image: product\.image \|\| "/placeholder\.svg",\)', 'image: product.image || "/placeholder.svg",'
            
            # Correction 2: Problème avec les objets non fermés dans map
            $content = $content -replace '(\s+image: product\.image \|\| "/placeholder\.svg",)\s*\)\s*:', '$1' + "`n            }))"
            
            # Correction 3: Assurer la fermeture correcte des objets map
            $content = $content -replace '(\s+hasVariant: false,\s+image: product\.image \|\| "/placeholder\.svg",)(\s*\)\s*:\s*\[\];)', '$1' + "`n            }))$2"
            
            # Correction 4: Réparer les structures d'objets cassées
            if ($content -match 'image: product\.image \|\| "/placeholder\.svg",\s*\)\s*:') {
                $content = $content -replace '(hasVariant: false,\s+image: product\.image \|\| "/placeholder\.svg",)\s*\)\s*:', '$1' + "`n            }))"
            }
            
            # Si le contenu a changé, sauvegarder
            if ($content -ne $originalContent) {
                Set-Content $file -Value $content -Encoding UTF8
                Write-Host "✅ Corrigé: $file" -ForegroundColor Green
                $fixedCount++
            } else {
                Write-Host "ℹ️  Aucune correction nécessaire: $file" -ForegroundColor Cyan
            }
            
        } catch {
            Write-Host "❌ Erreur lors de la correction de $file : $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    } else {
        Write-Host "⚠️  Fichier introuvable: $file" -ForegroundColor Magenta
    }
}

Write-Host "`n📊 Résumé:"
Write-Host "✅ Fichiers corrigés: $fixedCount" -ForegroundColor Green
Write-Host "❌ Erreurs: $errorCount" -ForegroundColor Red
Write-Host "🔧 Correction terminée!" -ForegroundColor Green

# Vérification additionnelle pour ProduitsSpecifiquesPage.tsx
$specificFile = "src/pages/categories/ProduitsSpecifiquesPage.tsx"
if (Test-Path $specificFile) {
    Write-Host "`n🔍 Vérification spéciale pour ProduitsSpecifiquesPage.tsx"
    $content = Get-Content $specificFile -Raw -Encoding UTF8
    
    # Rechercher les patterns problématiques
    if ($content -match 'image: product\.image \|\| "/placeholder\.svg",\s*\)') {
        Write-Host "⚠️  Pattern problématique trouvé, correction supplémentaire..." -ForegroundColor Yellow
        
        # Correction plus ciblée
        $content = $content -replace '(\s+hasVariant: false,\s+image: product\.image \|\| "/placeholder\.svg",)\s*\)', '$1' + "`n            })"
        
        Set-Content $specificFile -Value $content -Encoding UTF8
        Write-Host "✅ Correction supplémentaire appliquée" -ForegroundColor Green
    }
}

Write-Host "`n🚀 Vous pouvez maintenant redémarrer votre serveur de développement" -ForegroundColor Cyan 