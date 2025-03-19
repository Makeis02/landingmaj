import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface CartActionsProps {
  total: number;
  items: any[];
  firstThresholdValue: number;
  onCheckout: () => void;
}

const CartActions = ({ total, items, firstThresholdValue, onCheckout }: CartActionsProps) => {
  const { toast } = useToast();
  const [discountCode, setDiscountCode] = useState("");

  const handleApplyDiscount = () => {
    if (!discountCode) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un code de réduction",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Information",
      description: "Cette fonctionnalité n'est pas encore disponible",
    });
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Code de réduction"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value)}
        />
        <Button onClick={handleApplyDiscount}>Appliquer</Button>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Sous-total</span>
          <span>{total.toFixed(2)}€</span>
        </div>
        <div className="flex justify-between mb-4">
          <span className="text-gray-600">Livraison</span>
          <span className={total >= firstThresholdValue ? "text-green-600" : ""}>
            {total >= firstThresholdValue ? "Offerte" : "5.90€"}
          </span>
        </div>
        <Button 
          className="w-full" 
          disabled={items.length === 0}
          onClick={onCheckout}
        >
          Procéder au paiement
        </Button>
      </div>
    </div>
  );
};

export default CartActions;
