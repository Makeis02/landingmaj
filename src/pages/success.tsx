import { useEffect } from "react";
import { useCartStore } from "@/stores/useCartStore";

export default function SuccessPage() {
  const { clearCart } = useCartStore();

  useEffect(() => {
    clearCart();
  }, []);

  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold text-green-600">Merci pour votre commande !</h1>
      <p className="mt-4 text-gray-600">Une confirmation vous a été envoyée par email.</p>
    </div>
  );
} 