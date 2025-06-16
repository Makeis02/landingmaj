import { Category } from "@/lib/api/categories";

/**
 * Trouve le chemin complet d'une catégorie jusqu'à sa racine
 * @param category La catégorie de départ
 * @param allCategories Toutes les catégories disponibles
 * @returns Un tableau de catégories du plus proche parent jusqu'à la racine
 */
export function getCategoryPath(category: Category, allCategories: Category[]): Category[] {
  const path: Category[] = [];
  let current = category;
  
  while (current?.parent_id) {
    const parent = allCategories.find(c => c.id === current.parent_id);
    if (parent) {
      path.unshift(parent);
      current = parent;
    } else {
      break;
    }
  }
  
  return path;
}

/**
 * Trouve la catégorie racine d'une catégorie donnée
 * @param category La catégorie de départ
 * @param allCategories Toutes les catégories disponibles
 * @returns La catégorie racine ou la catégorie elle-même si elle n'a pas de parent
 */
export function getRootCategory(category: Category, allCategories: Category[]): Category {
  const path = getCategoryPath(category, allCategories);
  return path.length > 0 ? path[0] : category;
}

/**
 * Trouve les catégories frères d'une catégorie donnée
 * @param category La catégorie de référence
 * @param allCategories Toutes les catégories disponibles
 * @returns Un tableau des catégories qui partagent le même parent
 */
export function getSiblingCategories(category: Category, allCategories: Category[]): Category[] {
  const rootCategory = getRootCategory(category, allCategories);
  return allCategories.filter(c => c.parent_id === rootCategory.parent_id);
}

/**
 * Trouve les sous-catégories d'une catégorie donnée
 * @param allCategories Toutes les catégories disponibles
 * @param parentId L'ID de la catégorie parente
 * @returns Un tableau des sous-catégories
 */
export function findSubCategories(allCategories: Category[], parentId: string | null): Category[] {
  return allCategories.filter(cat => cat.parent_id === parentId);
} 