
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { GiftRulesForm } from "./GiftRulesForm";

const formSchema = z.object({
  active: z.boolean(),
  shopify_product_id: z.string().min(1, "Veuillez sélectionner un produit"),
});

export const GiftSettingsForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      active: false,
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

  const { data: currentSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["gift-settings"],
    queryFn: async () => {
      const { data: settings, error: settingsError } = await supabase
        .from("cart_gift_settings")
        .select("*")
        .eq('active', true)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      if (!settings) return null;

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("shopify_id, title, price, image_url")
        .eq('shopify_id', settings.shopify_product_id)
        .single();

      if (productError) throw productError;

      return {
        ...settings,
        product: productData
      };
    },
  });

  useEffect(() => {
    if (currentSettings) {
      form.reset({
        active: currentSettings.active,
        shopify_product_id: currentSettings.shopify_product_id,
      });
    }
  }, [currentSettings, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);

      const { error: deactivateError } = await supabase
        .from("cart_gift_settings")
        .update({ active: false })
        .not('id', 'is', null);

      if (deactivateError) throw deactivateError;

      const selectedProduct = products?.find(p => p.shopify_id === values.shopify_product_id);
      if (!selectedProduct) {
        throw new Error("Produit non trouvé");
      }

      if (currentSettings) {
        const { error } = await supabase
          .from("cart_gift_settings")
          .update({
            active: values.active,
            shopify_product_id: values.shopify_product_id,
            shopify_variant_id: selectedProduct.variants?.[0]?.id || "0",
          })
          .eq("id", currentSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cart_gift_settings")
          .insert({
            active: values.active,
            shopify_product_id: values.shopify_product_id,
            shopify_variant_id: selectedProduct.variants?.[0]?.id || "0",
          });

        if (error) throw error;
      }

      await refetchSettings();

      toast({
        title: "Succès",
        description: "Les paramètres ont été mis à jour",
      });
    } catch (error) {
      console.error("Error updating gift settings:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products?.find(p => p.shopify_id === form.watch("shopify_product_id"));
  const activeProduct = currentSettings?.product;

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-6">Paramètres des articles cadeaux</h2>

        {currentSettings && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium mb-2">Cadeau par défaut actuellement actif :</h3>
            {activeProduct ? (
              <div className="flex items-center gap-4">
                {activeProduct.image_url && (
                  <img 
                    src={activeProduct.image_url} 
                    alt={activeProduct.title} 
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <p className="font-medium">{activeProduct.title}</p>
                  <p className="text-sm text-gray-600">
                    Status : {currentSettings.active ? "Activé" : "Désactivé"}
                  </p>
                  {activeProduct.price && (
                    <p className="text-sm text-gray-600">Prix : {activeProduct.price}€</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-600">Aucun produit sélectionné</p>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>Activer le cadeau par défaut</FormLabel>
                    <FormDescription>
                      Ajoute automatiquement un cadeau au panier (indépendamment des paliers)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
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
                  <FormLabel>Article cadeau par défaut</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!form.watch("active")}
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
                  <FormDescription>
                    Ce produit sera automatiquement ajouté comme cadeau
                  </FormDescription>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </form>
        </Form>
      </div>

      <Separator className="my-8" />

      <div className="p-6 bg-white rounded-lg shadow">
        <GiftRulesForm />
      </div>
    </div>
  );
};

export default GiftSettingsForm;
