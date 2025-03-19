
import { EditableText } from "./EditableText";
import { Shield, Truck, HeartHandshake, LifeBuoy } from "lucide-react";

const Features = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex flex-col items-center text-center p-6 rounded-lg transition-all duration-300 hover:shadow-lg">
            <LifeBuoy className="w-12 h-12 text-ocean mb-4" />
            <EditableText
              contentKey="features_title_1"
              initialContent="Expertise aquariophile"
              className="text-lg font-semibold mb-2"
            />
            <EditableText
              contentKey="features_desc_1"
              initialContent="Des conseils d'experts pour un aquarium parfait"
              className="text-gray-600"
            />
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-lg transition-all duration-300 hover:shadow-lg">
            <Truck className="w-12 h-12 text-ocean mb-4" />
            <EditableText
              contentKey="features_title_2"
              initialContent="Livraison express"
              className="text-lg font-semibold mb-2"
            />
            <EditableText
              contentKey="features_desc_2"
              initialContent="Livraison rapide et soignée partout en France"
              className="text-gray-600"
            />
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-lg transition-all duration-300 hover:shadow-lg">
            <Shield className="w-12 h-12 text-ocean mb-4" />
            <EditableText
              contentKey="features_title_3"
              initialContent="Produits garantis"
              className="text-lg font-semibold mb-2"
            />
            <EditableText
              contentKey="features_desc_3"
              initialContent="Sélection rigoureuse des meilleurs produits"
              className="text-gray-600"
            />
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-lg transition-all duration-300 hover:shadow-lg">
            <HeartHandshake className="w-12 h-12 text-ocean mb-4" />
            <EditableText
              contentKey="features_title_4"
              initialContent="Service client dédié"
              className="text-lg font-semibold mb-2"
            />
            <EditableText
              contentKey="features_desc_4"
              initialContent="Une équipe à votre écoute 7j/7"
              className="text-gray-600"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
