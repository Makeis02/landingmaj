import React from 'react';
import { useCartStore } from '@/stores/useCartStore';
import CartProducts from '@/components/cart/CartProducts';
import CartSummary from '@/components/cart/CartSummary';
import CartActions from '@/components/cart/CartActions';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';

const CartPage: React.FC = () => {
  const { items, clearCart, getTotal, appliedPromoCode, removePromoCode } = useCartStore();
  const hasItems = items.length > 0;
  const navigate = useNavigate();

  // TODO: Récupérer la vraie valeur du premier palier si besoin
  const firstThresholdValue = 0;

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6 md:p-10 flex flex-col gap-8">
        <h1 className="text-3xl font-bold text-cyan-800 mb-2 text-center">🛒 Mon panier</h1>
        {hasItems ? (
          <>
            <CartProducts />
            <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-start justify-between">
              <div className="flex-1 w-full">
                <CartActions 
                  total={getTotal()} 
                  items={items} 
                  firstThresholdValue={firstThresholdValue} 
                  onCheckout={handleCheckout} 
                />
                {appliedPromoCode && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded p-3 flex items-center justify-between">
                    <span className="text-green-700 font-medium">Code promo appliqué : <b>{appliedPromoCode.code}</b></span>
                    <Button variant="ghost" size="sm" onClick={removePromoCode} className="text-red-500 hover:text-red-700">Retirer</Button>
                  </div>
                )}
              </div>
              <div className="w-full md:w-80">
                <CartSummary />
                <Button asChild className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl text-lg shadow">
                  <Link to="/checkout">Passer à la commande</Link>
                </Button>
                <Button variant="outline" asChild className="w-full mt-2 text-cyan-700 border-cyan-300">
                  <Link to="/">← Continuer mes achats</Link>
                </Button>
                <Button variant="ghost" className="w-full mt-2 text-red-500" onClick={clearCart}>Vider le panier</Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-semibold text-cyan-700 mb-2">Votre panier est vide</h2>
            <Button asChild className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl text-lg shadow">
              <Link to="/">← Retour à la boutique</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage; 