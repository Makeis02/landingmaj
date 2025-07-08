import React, { useState, useEffect, Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

// Type pour les points relais
type PointRelais = {
  Num: string;
  LgAdr1: string;
  LgAdr2: string;
  LgAdr3?: string;
  LgAdr4?: string;
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

const PointRelaisModal = lazy(() => import('./PointRelaisModal').then(mod => ({ default: mod.PointRelaisModal })));

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
      // Appel à la Supabase Edge Function (mondial-relay)
      const res = await fetch("https://btnyenoxsjtuydpzbapq.functions.supabase.co/mondial-relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codePostal, ville })
      });
      const json = await res.json();
      if (res.ok) {
        setPoints(json.points);
        setIsModalOpen(true);
      } else {
        setError(json.error || "Erreur lors de la recherche.");
      }
    } catch (err) {
      setError("Erreur lors de l'appel à Mondial Relay");
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

      {isModalOpen && (
        <Suspense fallback={<div>Chargement de la carte...</div>}>
      <PointRelaisModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(point) => {
          onSelect(point);
          setIsModalOpen(false);
        }}
        codePostal={codePostal}
        points={points}
      />
        </Suspense>
      )}
    </div>
  );
};

export default MondialRelaySelector; 