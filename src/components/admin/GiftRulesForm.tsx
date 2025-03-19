
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const formSchema = z.object({
  threshold: z.string().min(1, "Le seuil est requis"),
  description: z.string().min(1, "La description est requise"),
  shopify_product_id: z.string().min(1, "Veuillez sélectionner un produit"),
});

export const GiftRulesForm = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      threshold: "",
      description: "",
      shopify_product_id: "",
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("title");

      if (error) throw error;
      return data;
    },
  });

  const { data: giftRules, isLoading } = useQuery({
    queryKey: ["gift-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_rules_with_products")
        .select("*")
        .order("threshold", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (rule: any) => {
    setSelectedRule(rule);
    form.reset({
      threshold: rule.threshold.toString(),
      description: rule.description,
      shopify_product_id: rule.shopify_product_id,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteRuleId) return;

    const { error } = await supabase
      .from("cart_gift_rules")
      .delete()
      .eq("id", deleteRuleId);

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
      description: "Règle de cadeau supprimée avec succès",
    });
    setDeleteRuleId(null);
    queryClient.invalidateQueries({ queryKey: ["gift-rules"] });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const selectedProduct = products?.find(p => p.shopify_id === values.shopify_product_id);
    if (!selectedProduct) {
      toast({
        title: "Erreur",
        description: "Produit non trouvé",
        variant: "destructive",
      });
      return;
    }

    const giftRuleData = {
      threshold: parseFloat(values.threshold),
      description: values.description,
      shopify_product_id: values.shopify_product_id,
      shopify_variant_id: selectedProduct.variants?.[0]?.id || "0",
    };

    let query;
    if (selectedRule) {
      query = supabase
        .from("cart_gift_rules")
        .update(giftRuleData)
        .eq("id", selectedRule.id);
    } else {
      query = supabase
        .from("cart_gift_rules")
        .insert(giftRuleData);
    }

    const { error } = await query;

    if (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: `Règle de cadeau ${selectedRule ? "modifiée" : "ajoutée"} avec succès`,
    });
    setIsFormOpen(false);
    setSelectedRule(null);
    form.reset();
    queryClient.invalidateQueries({ queryKey: ["gift-rules"] });
  };

  const handleAddNew = () => {
    setSelectedRule(null);
    form.reset({
      threshold: "",
      description: "",
      shopify_product_id: "",
    });
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Règles de cadeaux par palier</h3>
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une règle
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Chargement...</div>
      ) : (
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seuil</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Produit cadeau</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giftRules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.threshold}€</TableCell>
                  <TableCell>{rule.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {rule.product_image_url && (
                        <img
                          src={rule.product_image_url}
                          alt={rule.product_title}
                          className="w-8 h-8 object-cover rounded"
                        />
                      )}
                      <span>{rule.product_title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(rule)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteRuleId(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!giftRules || giftRules.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    Aucune règle de cadeau définie
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h3 className="text-lg font-medium mb-4">
              {selectedRule ? "Modifier la règle" : "Ajouter une règle"}
            </h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seuil (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="50.00"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Un cadeau offert à partir de 50€ d'achat"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shopify_product_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produit cadeau</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un produit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.map((product) => (
                            <SelectItem
                              key={product.shopify_id}
                              value={product.shopify_id}
                            >
                              {product.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Ce produit sera automatiquement ajouté comme cadeau
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsFormOpen(false);
                      setSelectedRule(null);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">
                    {selectedRule ? "Modifier" : "Ajouter"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La règle de cadeau sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GiftRulesForm;
