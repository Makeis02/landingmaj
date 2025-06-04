import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/admin/FloatingHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (!error) setOrder(data);
      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <FloatingHeader />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-3 text-green-700">
              <CheckCircle className="h-6 w-6" />
              Commande confirmée !
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            {loading ? (
              <p className="text-gray-600 text-sm">Chargement de votre commande...</p>
            ) : order ? (
              <>
                <p className="text-gray-700 text-sm">
                  Merci <strong>{order.first_name}</strong> pour votre achat !<br />
                  Un email a été envoyé à <strong>{order.email}</strong>.
                </p>

                <div className="text-sm text-gray-700 border-t pt-4">
                  <p><strong>Commande n°:</strong> {order.id}</p>
                  <p><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-semibold text-gray-800">Récapitulatif :</h4>
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-700">
                      <span>{item.title} x{item.quantity}</span>
                      <span>{(item.price * item.quantity).toFixed(2)}€</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2 border-t text-gray-900">
                    <span>Total TTC</span>
                    <span>{order.total.toFixed(2)}€</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-red-600 text-sm">Commande introuvable.</p>
            )}

            <Button asChild className="w-full bg-[#0074b3] text-white hover:bg-[#005a8c]">
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default OrderConfirmation; 