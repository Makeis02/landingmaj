import CategoriesForm from "@/components/admin/CategoriesForm";
import PointsPage from './PointsPage';

export default function CategoriesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestion des catégories</h1>
      <CategoriesForm />
    </div>
  );
} 