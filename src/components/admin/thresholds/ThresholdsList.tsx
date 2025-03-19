
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { ThresholdForm } from "@/components/admin/ThresholdForm";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CartThreshold {
  id: string;
  value: number;
  description: string;
  type: 'free_shipping' | 'discount';
  reward_type: string | null;
  reward_value: number | null;
  animation_id: string | null;
  active: boolean;
  display_order: number;
}

export const ThresholdsList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedThreshold, setSelectedThreshold] = useState<CartThreshold | null>(null);
  const [deleteThresholdId, setDeleteThresholdId] = useState<string | null>(null);

  const { data: thresholds, isLoading } = useQuery({
    queryKey: ["cart-thresholds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_thresholds")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as CartThreshold[];
    },
  });

  const handleEdit = (threshold: CartThreshold) => {
    setSelectedThreshold(threshold);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedThreshold(null);
    queryClient.invalidateQueries({ queryKey: ["cart-thresholds"] });
  };

  const handleDelete = async () => {
    if (!deleteThresholdId) return;

    const { error } = await supabase
      .from("cart_thresholds")
      .delete()
      .eq("id", deleteThresholdId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Palier supprimé avec succès",
    });
    setDeleteThresholdId(null);
    queryClient.invalidateQueries({ queryKey: ["cart-thresholds"] });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Paliers du panier</h2>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un palier
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Chargement...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ordre</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Récompense</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {thresholds?.map((threshold) => (
              <TableRow key={threshold.id}>
                <TableCell>{threshold.display_order}</TableCell>
                <TableCell>{threshold.value}€</TableCell>
                <TableCell>{threshold.description}</TableCell>
                <TableCell>
                  {threshold.type === 'free_shipping' 
                    ? 'Livraison gratuite' 
                    : 'Réduction'}
                </TableCell>
                <TableCell>
                  {threshold.reward_value && `${threshold.reward_value}${
                    threshold.reward_type === 'percentage' ? '%' : '€'
                  }`}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    threshold.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {threshold.active ? 'Actif' : 'Inactif'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(threshold)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDeleteThresholdId(threshold.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ThresholdForm 
        open={isFormOpen} 
        onClose={handleCloseForm} 
        threshold={selectedThreshold} 
      />

      <AlertDialog open={!!deleteThresholdId} onOpenChange={() => setDeleteThresholdId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le palier sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
