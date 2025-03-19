
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  mainProductId: z.string().min(1, "Le produit principal est requis"),
  suggestedProducts: z.array(z.object({
    productId: z.string(),
    active: z.boolean(),
    priority: z.number(),
  })),
});

interface SuggestionGroupFormProps {
  open: boolean;
  onClose: () => void;
  group?: any;
}

export const SuggestionGroupForm = ({
  open,
  onClose,
  group,
}: SuggestionGroupFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: group?.name || "",
      description: group?.description || "",
      mainProductId: group?.mainProduct?.id || "",
      suggestedProducts: group?.suggestedProducts?.map((p: any) => ({
        productId: p.id,
        active: p.active,
        priority: p.priority,
      })) || [],
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("shopify_id, title, price, image_url")
        .order("title");

      if (error) throw error;
      return data;
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);

      if (group) {
        // Mise à jour
        const { error: groupError } = await supabase
          .from("suggestion_groups")
          .update({
            name: values.name,
            description: values.description,
          })
          .eq("id", group.id);

        if (groupError) throw groupError;

        // Mettre à jour les produits
        const { error: productsError } = await supabase
          .from("suggestion_group_products")
          .delete()
          .eq("group_id", group.id);

        if (productsError) throw productsError;
      } else {
        // Création
        const { data: newGroup, error: groupError } = await supabase
          .from("suggestion_groups")
          .insert({
            name: values.name,
            description: values.description,
          })
          .select()
          .single();

        if (groupError) throw groupError;

        // Ajouter le produit principal
        const { error: mainProductError } = await supabase
          .from("suggestion_group_products")
          .insert({
            group_id: newGroup.id,
            product_id: values.mainProductId,
            is_main_product: true,
          });

        if (mainProductError) throw mainProductError;

        // Ajouter les produits suggérés
        const suggestedProductsData = values.suggestedProducts.map((product) => ({
          group_id: newGroup.id,
          product_id: product.productId,
          is_main_product: false,
          active: product.active,
          priority: product.priority,
        }));

        const { error: suggestedProductsError } = await supabase
          .from("suggestion_group_products")
          .insert(suggestedProductsData);

        if (suggestedProductsError) throw suggestedProductsError;
      }

      await queryClient.invalidateQueries({ queryKey: ["suggestion-groups"] });
      
      toast({
        title: "Succès",
        description: group ? "Groupe mis à jour" : "Groupe créé",
      });
      
      onClose();
    } catch (error) {
      console.error("Error saving group:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSuggestedProduct = () => {
    const currentProducts = form.getValues("suggestedProducts");
    form.setValue("suggestedProducts", [
      ...currentProducts,
      { productId: "", active: true, priority: currentProducts.length },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {group ? "Modifier le groupe" : "Nouveau groupe"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du groupe</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mainProductId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produit principal</FormLabel>
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
                        <SelectItem key={product.shopify_id} value={product.shopify_id}>
                          {product.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Produits suggérés</h4>
                <Button type="button" variant="outline" onClick={addSuggestedProduct}>
                  Ajouter un produit
                </Button>
              </div>

              {form.watch("suggestedProducts").map((_, index) => (
                <div key={index} className="flex gap-4 items-center">
                  <FormField
                    control={form.control}
                    name={`suggestedProducts.${index}.productId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
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
                              <SelectItem key={product.shopify_id} value={product.shopify_id}>
                                {product.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`suggestedProducts.${index}.active`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      const currentProducts = form.getValues("suggestedProducts");
                      form.setValue(
                        "suggestedProducts",
                        currentProducts.filter((_, i) => i !== index)
                      );
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
