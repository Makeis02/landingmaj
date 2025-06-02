import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { PointRelaisModal } from "./PointRelaisModal";

// Type pour les points relais
type PointRelais = {
  Num: string;
  LgAdr1: string;
  LgAdr2: string;
  CP: string;
  Ville: string;
  Pays: string;
  Horaires: string;
  Latitude: string;
  Longitude: string;
  Distance?: string;
  Note?: string;
  Services?: string[];
  Parking?: string;
  Accessibilite?: string;
};

interface MondialRelaySelectorProps {
  onSelect: (point: PointRelais) => void;
  selected?: PointRelais | null;
  initialCodePostal?: string;
  initialVille?: string;
  autoSearch?: boolean;
}

// Données génériques pour les points relais
const GENERIC_POINTS: PointRelais[] = [
  {
    Num: "1",
    LgAdr1: "AquaShop Express",
    LgAdr2: "123 rue des Poissons",
    CP: "75001",
    Ville: "Paris",
    Pays: "France",
    Horaires: "Lun-Sam: 9h-19h",
    Latitude: "48.8566",
    Longitude: "2.3522",
    Distance: "0.5 km",
    Note: "4.8",
    Services: ["Retrait 24/7", "Dépôt de colis"],
    Parking: "Gratuit",
    Accessibilite: "PMR"
  },
  {
    Num: "2",
    LgAdr1: "AquaStyle Boutique",
    LgAdr2: "45 avenue de l'Aquarium",
    CP: "75002",
    Ville: "Paris",
    Pays: "France",
    Horaires: "Lun-Ven: 8h-20h, Sam: 9h-18h",
    Latitude: "48.8674",
    Longitude: "2.3622",
    Distance: "1.2 km",
    Note: "4.5",
    Services: ["Retrait express", "Emballage cadeau"],
    Parking: "Payant",
    Accessibilite: "PMR"
  },
  {
    Num: "3",
    LgAdr1: "AquaPlus Store",
    LgAdr2: "78 boulevard de l'Océan",
    CP: "75003",
    Ville: "Paris",
    Pays: "France",
    Horaires: "Lun-Sam: 8h30-19h30",
    Latitude: "48.8648",
    Longitude: "2.3499",
    Distance: "1.8 km",
    Note: "4.7",
    Services: ["Retrait 24/7", "Point de dépôt"],
    Parking: "Gratuit",
    Accessibilite: "Non"
  },
  {
    Num: "4",
    LgAdr1: "AquaWorld Shop",
    LgAdr2: "15 rue des Coraux",
    CP: "75004",
    Ville: "Paris",
    Pays: "France",
    Horaires: "Lun-Sam: 9h-20h",
    Latitude: "48.8559",
    Longitude: "2.3588",
    Distance: "2.1 km",
    Note: "4.6",
    Services: ["Retrait express", "Service client"],
    Parking: "Gratuit",
    Accessibilite: "PMR"
  },
  {
    Num: "5",
    LgAdr1: "AquaZone Store",
    LgAdr2: "92 rue des Poissons",
    CP: "75005",
    Ville: "Paris",
    Pays: "France",
    Horaires: "Lun-Ven: 8h-19h, Sam: 9h-17h",
    Latitude: "48.8462",
    Longitude: "2.3437",
    Distance: "2.5 km",
    Note: "4.9",
    Services: ["Retrait 24/7", "Dépôt de colis", "Emballage cadeau"],
    Parking: "Payant",
    Accessibilite: "PMR"
  }
];

const MondialRelaySelector: React.FC<MondialRelaySelectorProps> = ({
  onSelect, selected, initialCodePostal = "", initialVille = "", autoSearch = false
}) => {
  const [codePostal, setCodePostal] = useState(initialCodePostal);
  const [ville, setVille] = useState(initialVille);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [points, setPoints] = useState<PointRelais[]>([]);

  const handleSearch = async () => {
    if (!codePostal) return;
    setLoading(true);
    setError(null);
    
    try {
      // Simuler un délai de chargement
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Filtrer les points relais génériques par code postal
      const filteredPoints = GENERIC_POINTS.filter(point => 
        point.CP.startsWith(codePostal.substring(0, 2))
      );
      
      setPoints(filteredPoints);
      setIsModalOpen(true);
    } catch (err) {
      setError("Erreur lors de la recherche des points relais");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoSearch && initialCodePostal) {
      setCodePostal(initialCodePostal);
      handleSearch();
    }
  }, [autoSearch, initialCodePostal]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Code postal"
          value={codePostal}
          onChange={e => setCodePostal(e.target.value)}
          className="max-w-[200px]"
        />
        <Button
          onClick={handleSearch}
          disabled={loading || !codePostal}
          className="flex items-center gap-2"
        >
          <MapPin className="h-4 w-4" />
          {loading ? "Recherche..." : "Choisir un point relais"}
        </Button>
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {selected && (
        <div className="p-4 border rounded-lg bg-green-50">
          <div className="font-semibold text-green-800 mb-1">Point relais sélectionné</div>
          <div className="text-sm">
            <div className="font-medium">{selected.LgAdr1}</div>
            <div className="text-gray-600">{selected.LgAdr2}</div>
            <div className="text-gray-600">{selected.CP} {selected.Ville}</div>
            <div className="text-gray-600 text-xs mt-1">Horaires: {selected.Horaires}</div>
            {selected.Distance && (
              <div className="text-gray-600 text-xs">Distance: {selected.Distance}</div>
            )}
            {selected.Services && selected.Services.length > 0 && (
              <div className="flex gap-1 mt-1">
                {selected.Services.map((service, index) => (
                  <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {service}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <PointRelaisModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(point) => {
          onSelect(point);
          setIsModalOpen(false);
        }}
        codePostal={codePostal}
      />
    </div>
  );
};

export default MondialRelaySelector; 