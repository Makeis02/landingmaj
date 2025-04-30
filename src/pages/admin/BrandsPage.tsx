import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { fetchBrands, createBrand, updateBrand, deleteBrand, Brand } from "@/lib/api/brands";
import { useEditStore } from "@/stores/useEditStore";
import { useToast } from "@/components/ui/use-toast";
import { Pencil, Trash2, Save, X, ChevronLeft, Image } from "lucide-react";

const BrandsPage = () => {
  const { isAdmin } = useEditStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    image_url: "",
  });
  const [editFormData, setEditFormData] = useState<{
    name: string;
    slug: string;
    image_url: string | null;
  }>({
    name: "",
    slug: "",
    image_url: null,
  });

  // Si l'utilisateur n'est pas admin, rediriger ou afficher un message
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Accès non autorisé</h1>
        <p>Vous devez être connecté en tant qu'administrateur pour accéder à cette page.</p>
      </div>
    );
  }

  // Récupération des marques
  const { data: brands = [], isLoading, error } = useQuery({
    queryKey: ["brands"],
    queryFn: fetchBrands,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast({
        title: "Succès",
        description: "Marque créée avec succès",
      });
      setFormData({ name: "", slug: "", image_url: "" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la marque. " + error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Brand> }) => updateBrand(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast({
        title: "Succès",
        description: "Marque mise à jour avec succès",
      });
      setEditingId(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour la marque. " + error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast({
        title: "Succès",
        description: "Marque supprimée avec succès",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer la marque. " + error.message,
      });
    },
  });

  // Gestionnaires d'événements
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateBrand = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Générer un slug si non fourni
    const slug = formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, "-");
    
    createMutation.mutate({
      name: formData.name,
      slug,
      image_url: formData.image_url || null,
    });
  };

  const handleEditBrand = (brand: Brand) => {
    setEditingId(brand.id);
    setEditFormData({
      name: brand.name,
      slug: brand.slug,
      image_url: brand.image_url,
    });
  };

  const handleUpdateBrand = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    
    // Générer un slug si non fourni
    const slug = editFormData.slug.trim() || editFormData.name.toLowerCase().replace(/\s+/g, "-");
    
    updateMutation.mutate({
      id,
      data: {
        name: editFormData.name,
        slug,
        image_url: editFormData.image_url,
      },
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDeleteBrand = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette marque ?")) {
      deleteMutation.mutate(id);
    }
  };

  // Filtrer les marques en fonction du terme de recherche
  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" className="mr-2" asChild>
          <Link to="/admin/produits">
            <ChevronLeft size={20} />
            <span>Retour aux produits</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Gestion des marques</h1>
          <p className="text-gray-500">Créez et gérez les marques de vos produits</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulaire d'ajout */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Ajouter une marque</h2>
            <form onSubmit={handleCreateBrand} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Nom de la marque
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Tetra"
                  required
                />
              </div>
              <div>
                <label htmlFor="slug" className="block text-sm font-medium mb-1">
                  Slug (URL)
                </label>
                <Input
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="Ex: tetra (optionnel, généré automatiquement)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Laissez vide pour générer automatiquement à partir du nom
                </p>
              </div>
              <div>
                <label htmlFor="image_url" className="block text-sm font-medium mb-1">
                  URL de l'image
                </label>
                <Input
                  id="image_url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/logo.png (optionnel)"
                />
              </div>
              <Button type="submit" className="w-full" disabled={!formData.name}>
                Créer la marque
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Liste des marques */}
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Liste des marques</h2>
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-md">
                Une erreur est survenue lors du chargement des marques.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ width: '52px' }}>Logo</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBrands.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Aucune marque trouvée
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBrands.map((brand) => (
                        <TableRow key={brand.id}>
                          <TableCell>
                            {brand.image_url ? (
                              <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden">
                                <img
                                  src={brand.image_url}
                                  alt={brand.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center">
                                <Image size={16} className="text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === brand.id ? (
                              <Input
                                name="name"
                                value={editFormData.name}
                                onChange={handleEditInputChange}
                                className="w-full"
                                required
                              />
                            ) : (
                              <span className="font-medium">{brand.name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === brand.id ? (
                              <Input
                                name="slug"
                                value={editFormData.slug}
                                onChange={handleEditInputChange}
                                className="w-full"
                                placeholder="Généré automatiquement"
                              />
                            ) : (
                              <span className="text-gray-500">{brand.slug}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {editingId === brand.id ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={handleCancelEdit}
                                >
                                  <X size={16} className="mr-1" />
                                  Annuler
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={(e) => handleUpdateBrand(e, brand.id)}
                                >
                                  <Save size={16} className="mr-1" />
                                  Enregistrer
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleEditBrand(brand)}
                                >
                                  <Pencil size={16} className="mr-1" />
                                  Modifier
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-500 hover:text-red-700" 
                                  onClick={() => handleDeleteBrand(brand.id)}
                                >
                                  <Trash2 size={16} className="mr-1" />
                                  Supprimer
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BrandsPage; 