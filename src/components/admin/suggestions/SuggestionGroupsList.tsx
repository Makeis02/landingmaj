
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { SuggestionGroupForm } from "./SuggestionGroupForm";
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
import { useToast } from "@/hooks/use-toast";

export const SuggestionGroupsList = () => {
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const { data: groups, refetch } = useQuery({
    queryKey: ["suggestion-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_suggestions_view")
        .select("*")
        .order("group_name");

      if (error) throw error;

      // Regrouper les produits par groupe
      const groupedData = data.reduce((acc: any, curr: any) => {
        if (!acc[curr.group_id]) {
          acc[curr.group_id] = {
            id: curr.group_id,
            name: curr.group_name,
            active: curr.group_active,
            mainProduct: {
              id: curr.main_product_id,
              title: curr.main_product_title,
              price: curr.main_product_price,
              image: curr.main_product_image,
            },
            suggestedProducts: [],
          };
        }
        
        acc[curr.group_id].suggestedProducts.push({
          id: curr.suggested_product_id,
          title: curr.suggested_product_title,
          price: curr.suggested_product_price,
          image: curr.suggested_product_image,
          active: curr.suggestion_active,
          priority: curr.priority,
        });

        return acc;
      }, {});

      return Object.values(groupedData);
    },
  });

  const toggleGroupActive = async (groupId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("suggestion_groups")
        .update({ active: !currentActive })
        .eq("id", groupId);

      if (error) throw error;
      
      refetch();
    } catch (error) {
      console.error("Error toggling group:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteGroupId) return;

    try {
      const { error } = await supabase
        .from("suggestion_groups")
        .delete()
        .eq("id", deleteGroupId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le groupe a été supprimé",
      });
      
      refetch();
    } catch (error) {
      console.error("Error deleting group:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setDeleteGroupId(null);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom du groupe</TableHead>
            <TableHead>Produit principal</TableHead>
            <TableHead>Produits suggérés</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups?.map((group: any) => (
            <TableRow key={group.id}>
              <TableCell className="font-medium">{group.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {group.mainProduct.image && (
                    <img
                      src={group.mainProduct.image}
                      alt={group.mainProduct.title}
                      className="w-8 h-8 object-cover rounded"
                    />
                  )}
                  <span>{group.mainProduct.title}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {group.suggestedProducts.map((product: any) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-1 text-sm bg-gray-100 rounded-full px-2 py-1"
                    >
                      {product.active ? "✅" : "❌"} {product.title}
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Switch
                  checked={group.active}
                  onCheckedChange={() => toggleGroupActive(group.id, group.active)}
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedGroup(group);
                      setIsFormOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteGroupId(group.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <SuggestionGroupForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedGroup(null);
        }}
        group={selectedGroup}
      />

      <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le groupe et toutes ses suggestions seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
