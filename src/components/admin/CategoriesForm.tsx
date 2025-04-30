import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Category, fetchCategories, createCategory, updateCategory, deleteCategory, reorderCategory } from "@/lib/api/categories";
import { ArrowUp, ArrowDown } from "lucide-react";

export const CategoriesForm = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState<{ name: string; slug: string; is_active: boolean; redirect_url: string; parent_id: string }>({
    name: "",
    slug: "",
    is_active: true,
    redirect_url: "",
    parent_id: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    parent_id: "",
    is_active: true,
    redirect_url: "",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  // Générer automatiquement redirect_url uniquement si la catégorie est de niveau 3
  useEffect(() => {
    const parent = categories.find((cat) => cat.id === formData.parent_id);
    const grandParent = parent && categories.find((cat) => cat.id === parent.parent_id);
  
    if (parent && grandParent) {
      // Niveau 3 => on génère la redirection
      setFormData((prev) => ({
        ...prev,
        redirect_url: `/categories/${parent.slug}?souscategorie=${prev.slug}`,
      }));
    } else {
      // Niveau 1 ou 2 => pas de redirection
      setFormData((prev) => ({
        ...prev,
        redirect_url: "",
      }));
    }
  }, [formData.slug, formData.parent_id, categories]);

  // Générer automatiquement redirect_url pour inlineForm lors de l'édition
  useEffect(() => {
    if (!editingId) return;

    const editedCat = categories.find((cat) => cat.id === editingId);
    if (!editedCat) return;

    const parent = categories.find((cat) => cat.id === editedCat.parent_id);
    const grandParent = parent && categories.find((cat) => cat.id === parent.parent_id);

    if (parent && grandParent) {
      setInlineForm((prev) => ({
        ...prev,
        redirect_url: `/categories/${parent.slug}?souscategorie=${prev.slug}`,
      }));
    } else {
      setInlineForm((prev) => ({
        ...prev,
        redirect_url: "",
      }));
    }
  }, [inlineForm.slug, inlineForm.parent_id, editingId, categories]);

  const getCategoryPath = (category: Category, allCategories: Category[]): string => {
    const path: string[] = [category.name];
    let current = category;

    while (current.parent_id) {
      const parent = allCategories.find((cat) => cat.id === current.parent_id);
      if (!parent) break;
      path.unshift(parent.name);
      current = parent;
    }

    return path.join(" / ");
  };

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Succès",
        description: "Catégorie créée avec succès",
      });
      setFormData({ name: "", slug: "", parent_id: "", is_active: true, redirect_url: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Succès",
        description: "Catégorie mise à jour avec succès",
      });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Succès",
        description: "Catégorie supprimée avec succès",
      });
    },
  });

  const moveCategory = async (cat: Category, direction: number) => {
    const siblings = categories
      .filter((c) => c.parent_id === cat.parent_id)
      .sort((a, b) => a.order - b.order);

    const currentIndex = siblings.findIndex((c) => c.id === cat.id);
    const newIndex = currentIndex + direction;

    if (newIndex < 0 || newIndex >= siblings.length) return;

    const target = siblings[newIndex];

    await Promise.all([
      reorderCategory(cat.id, target.order),
      reorderCategory(target.id, cat.order),
    ]);

    queryClient.invalidateQueries({ queryKey: ["categories"] });
    toast({
      title: "Succès",
      description: "Ordre mis à jour avec succès",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      slug: formData.slug,
      parent_id: formData.parent_id === "" ? null : formData.parent_id,
      is_active: formData.is_active,
      redirect_url: formData.redirect_url,
    };
    createMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) {
      deleteMutation.mutate(id);
    }
  };

  const isFirst = (cat: Category) =>
    categories
      .filter((c) => c.parent_id === cat.parent_id)
      .sort((a, b) => a.order - b.order)[0]?.id === cat.id;

  const isLast = (cat: Category) =>
    categories
      .filter((c) => c.parent_id === cat.parent_id)
      .sort((a, b) => a.order - b.order)
      .at(-1)?.id === cat.id;

  const renderCategories = (parentId: string | null = null, level: number = 0) => {
    return categories
      .filter((cat) => cat.parent_id === parentId)
      .sort((a, b) => a.order - b.order)
      .map((cat) => (
        <div
          key={cat.id}
          className="ml-4 mt-2 p-2 bg-gray-50 rounded"
          style={{ marginLeft: `${level * 16}px` }}
        >
          <div className="flex justify-between items-center">
            <div>
              {editingId === cat.id ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Nom</label>
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1"
                      value={inlineForm.name}
                      onChange={(e) => setInlineForm({ ...inlineForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Slug (URL)</label>
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1"
                      value={inlineForm.slug}
                      onChange={(e) => setInlineForm({ ...inlineForm, slug: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="text-xs text-gray-600">Catégorie active</label>
                    <input
                      type="checkbox"
                      checked={inlineForm.is_active}
                      onChange={(e) => setInlineForm({ ...inlineForm, is_active: e.target.checked })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">URL de redirection</label>
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1"
                      value={inlineForm.redirect_url || ""}
                      onChange={(e) => setInlineForm({ ...inlineForm, redirect_url: e.target.value })}
                      disabled={level !== 2} // Désactivé si ce n'est pas un niveau 3
                    />
                    {level === 2 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Générée automatiquement pour sous-sous-catégories
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="font-medium">{cat.name}</h4>
                  <p className="text-sm text-gray-500">/{cat.slug}</p>
                  {cat.redirect_url && (
                    <p className="text-xs text-blue-500">→ {cat.redirect_url}</p>
                  )}
                </div>
              )}
            </div>
            <div className="space-x-2">
              {editingId === cat.id ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      updateMutation.mutate({
                        id: cat.id,
                        data: { 
                          name: inlineForm.name,
                          slug: inlineForm.slug,
                          is_active: inlineForm.is_active,
                          redirect_url: inlineForm.redirect_url,
                        },
                      });
                    }}
                  >
                    ✅ Sauvegarder
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    ❌ Annuler
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(cat.id);
                      setInlineForm({ 
                        name: cat.name, 
                        slug: cat.slug,
                        is_active: cat.is_active,
                        redirect_url: cat.redirect_url || "",
                        parent_id: cat.parent_id || "",
                      });
                    }}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(cat.id)}
                  >
                    Supprimer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveCategory(cat, -1)}
                    disabled={isFirst(cat)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveCategory(cat, 1)}
                    disabled={isLast(cat)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={cat.is_active ? "outline" : "destructive"}
                    size="sm"
                    onClick={() => {
                      updateMutation.mutate({
                        id: cat.id,
                        data: { is_active: !cat.is_active },
                      });
                    }}
                  >
                    {cat.is_active ? "✅ Actif" : "🚫 Inactif"}
                  </Button>
                </>
              )}
            </div>
          </div>
          {renderCategories(cat.id, level + 1)}
        </div>
      ));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nom de la catégorie</Label>
          <input
            id="name"
            type="text"
            className="w-full border rounded p-2"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="slug">Slug (URL)</Label>
          <input
            id="slug"
            type="text"
            className="w-full border rounded p-2"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="parent_id">Catégorie parente</Label>
          <select
            id="parent_id"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.parent_id}
            onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
          >
            <option value="">-- Pas de parent (catégorie principale) --</option>
            {[...categories]
              .sort((a, b) => getCategoryPath(a, categories).localeCompare(getCategoryPath(b, categories)))
              .map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCategoryPath(cat, categories)}
                </option>
              ))}
          </select>
        </div>

        <div>
          <Label htmlFor="redirect_url">URL de redirection</Label>
          <input
            id="redirect_url"
            type="text"
            className="w-full border rounded p-2 bg-gray-100"
            value={formData.redirect_url}
            disabled
          />
          <p className="text-xs text-gray-500 mt-1">
            Générée automatiquement pour les sous-sous-catégories
          </p>
        </div>

        <Button type="submit">Créer</Button>
      </form>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Liste des catégories</h2>
        <div className="space-y-4">
          {renderCategories(null)}
        </div>
      </div>
    </div>
  );
};

export default CategoriesForm; 