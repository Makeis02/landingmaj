import { Truck, RotateCcw, MessageCircle, CreditCard } from "lucide-react";
import { EditableText } from "./EditableText";

const TrustBar = () => (
  <section className="py-16 bg-white border-t">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="flex items-center justify-center text-center group">
          <Truck className="w-12 h-12 mr-4 group-hover:scale-110 transition-transform duration-300" style={{ color: '#0074b3' }} />
          <div>
            <h3 className="font-bold text-lg text-slate-900 mb-1">
              <EditableText
                contentKey="trustbar_title_1"
                initialContent="Livraison Gratuite"
              />
            </h3>
            <p className="text-gray-600 text-sm">
              <EditableText
                contentKey="trustbar_desc_1"
                initialContent="À partir de 49€"
              />
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center text-center group">
          <RotateCcw className="w-12 h-12 mr-4 group-hover:scale-110 transition-transform duration-300" style={{ color: '#0074b3' }} />
          <div>
            <h3 className="font-bold text-lg text-slate-900 mb-1">
              <EditableText
                contentKey="trustbar_title_2"
                initialContent="SAV Expert"
              />
            </h3>
            <p className="text-gray-600 text-sm">
              <EditableText
                contentKey="trustbar_desc_2"
                initialContent="Conseils spécialisés"
              />
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center text-center group">
          <MessageCircle className="w-12 h-12 mr-4 group-hover:scale-110 transition-transform duration-300" style={{ color: '#0074b3' }} />
          <div>
            <h3 className="font-bold text-lg text-slate-900 mb-1">
              <EditableText
                contentKey="trustbar_title_3"
                initialContent="Contact"
              />
            </h3>
            <p className="text-gray-600 text-sm">
              <EditableText
                contentKey="trustbar_desc_3"
                initialContent="Support réactif"
              />
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center text-center group">
          <CreditCard className="w-12 h-12 mr-4 group-hover:scale-110 transition-transform duration-300" style={{ color: '#0074b3' }} />
          <div>
            <h3 className="font-bold text-lg text-slate-900 mb-1">
              <EditableText
                contentKey="trustbar_title_4"
                initialContent="PayPal & Avis Vérifiés"
              />
            </h3>
            <p className="text-gray-600 text-sm">
              <EditableText
                contentKey="trustbar_desc_4"
                initialContent="Paiement sécurisé"
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default TrustBar; 