import { Category } from "@/lib/api/categories";

/**
 * Récupère le chemin complet d'une catégorie jusqu'à sa racine
 * @param category La catégorie de départ
 * @param allCategories Toutes les catégories disponibles
 * @returns Un tableau de catégories représentant le chemin de la catégorie jusqu'à sa racine
 */
export function getCategoryPath(category: Category, allCategories: Category[]): Category[] {
  const path: Category[] = [category];
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
 * @returns La catégorie racine ou la catégorie de départ si elle n'a pas de parent
 */
export function findRootCategory(category: Category, allCategories: Category[]): Category {
  const path = getCategoryPath(category, allCategories);
  return path[0];
}

/**
 * Trouve les catégories du même niveau (frères) d'une catégorie donnée
 * @param category La catégorie de référence
 * @param allCategories Toutes les catégories disponibles
 * @returns Un tableau des catégories du même niveau
 */
export function findSiblingCategories(category: Category, allCategories: Category[]): Category[] {
  const rootCategory = findRootCategory(category, allCategories);
  return allCategories.filter(c => c.parent_id === rootCategory.parent_id);
} 