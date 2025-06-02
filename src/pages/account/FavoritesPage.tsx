import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { Link } from "react-router-dom";
import FavoriteProductsGrid from "@/components/FavoriteProductsGrid";

const FavoritesPage = () => {
  const { items: favorites, removeItem, syncWithSupabase } = useFavoritesStore();

  useEffect(() => {
    syncWithSupabase();
  }, [syncWithSupabase]);

  const handleRemove = async (id: string) => {
    await removeItem(id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Mes favoris</h1>
        <FavoriteProductsGrid />
      </main>
      <Footer />
    </div>
  );
};

export default FavoritesPage; 