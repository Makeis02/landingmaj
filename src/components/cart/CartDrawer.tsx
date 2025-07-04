import React, { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import CartProducts from "./CartProducts";
import CartSuggestions from "./CartSuggestions";
import CartProgressBar from "./CartProgressBar";
import CartActions from "./CartActions";
import { useCartStore } from "@/stores/useCartStore";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CartStep = "products" | "thresholds" | "summary" | "checkout";

export const CartDrawer = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { items, isOpen, openDrawer, closeDrawer, syncWithSupabase, getTotal, fetchGiftSettings } = useCartStore();
  const [reachedThreshold, setReachedThreshold] = useState<number | null>(null);
  const prevItemsLength = useRef(items.length);

  // Fetch thresholds data
  const { data: thresholds } = useQuery({
    queryKey: ["cart-thresholds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_thresholds")
        .select(`
          *,
          gift_rule:cart_gift_rules (
            shopify_product_id,
            shopify_variant_id
          )
        `)
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Récupérer les paramètres du cadeau actif
  const { data: giftSettings } = useQuery({
    queryKey: ["gift-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_gift_settings")
        .select(`
          *,
          products:products(
            title,
            price,
            image_url
          )
        `)
        .eq("active", true)
        .single();

      if (error) {
        console.error("Error fetching gift settings:", error);
        return null;
      }
      console.log("Gift settings:", data);
      return data;
    },
  });

  // Initial sync and gift settings fetch
  useEffect(() => {
    const initCart = async () => {
      console.log("Initializing cart...");
      await fetchGiftSettings();
      await syncWithSupabase();
    };
    
    initCart();
  }, []);

  // Effect pour gérer le cadeau quand le panier change
  useEffect(() => {
    const manageGift = async () => {
      if (items.length > 0 && giftSettings?.active) {
        console.log("Managing gift item...");
        await fetchGiftSettings();
      }
    };
    
    manageGift();
  }, [items.length, giftSettings]);

  // Effect pour ouvrir automatiquement le panier quand un produit est ajouté
  useEffect(() => {
    // Ne pas ouvrir le panier sur la page de confirmation de commande
    if (location.pathname.includes("order-confirmation")) return;
    if (items.length > prevItemsLength.current) {
      openDrawer();
    }
    prevItemsLength.current = items.length;
  }, [items.length, location.pathname]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = getTotal();

  useEffect(() => {
    if (!thresholds) return;

    const newThreshold = thresholds.find(t => 
      t.value <= total && t.value !== reachedThreshold
    );
    
    if (newThreshold && newThreshold.value !== reachedThreshold) {
      setReachedThreshold(newThreshold.value);
      setTimeout(() => setReachedThreshold(null), 5000);
    }
  }, [total, thresholds, reachedThreshold]);

  const firstThreshold = thresholds?.[0];
  const lastThreshold = thresholds?.[thresholds?.length - 1];
  const maxValue = lastThreshold?.value || 0;
  const progress = firstThreshold ? Math.min((total / maxValue) * 100, 100) : 0;
  const remaining = firstThreshold ? Math.max(firstThreshold.value - total, 0) : 0;

  const handleCheckout = () => {
    closeDrawer();
    toast({
      title: "Information",
      description: "Redirection vers la page de paiement...",
    });
    // Redirection vers la page de checkout
    navigate('/checkout');
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={open => open ? openDrawer() : closeDrawer()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-white text-gray-800 border-l border-slate-200 rounded-l-xl shadow-2xl">
          <SheetHeader className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold text-primary mb-2">Votre panier</SheetTitle>
            <Button variant="ghost" size="icon" onClick={closeDrawer}>
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          {thresholds && thresholds.length > 0 && (
            <CartProgressBar
              thresholds={thresholds}
              total={total}
              progress={progress}
              remaining={remaining}
              firstThreshold={firstThreshold}
              maxValue={maxValue}
            />
          )}

          <div className="mt-6">
            <CartProducts />
          </div>

          {items.length > 0 && <CartSuggestions />}

          <CartActions
            total={total}
            items={items}
            firstThresholdValue={firstThreshold?.value || 0}
            onCheckout={handleCheckout}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CartDrawer;
