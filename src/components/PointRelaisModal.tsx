import { useState, useEffect, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, Star, Car, Accessibility, Package, X } from 'lucide-react';
import React from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix pour les icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface PointRelais {
  Num: string;
  LgAdr1: string;
  LgAdr2: string;
  CP: string;
  Ville: string;
  Pays: string;
  Horaires: string;
  Latitude: string;
  Longitude: string;
  Distance: string;
  Note: string;
  Services: string[];
  Parking: string;
  Accessibilite: string;
}

// Données de test pour les points relais
const TEST_POINTS: PointRelais[] = [
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

interface PointRelaisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (point: PointRelais) => void;
  codePostal: string;
}

const MapContainer = React.lazy(() => import('react-leaflet').then(mod => ({ default: mod.MapContainer })));
const TileLayer = React.lazy(() => import('react-leaflet').then(mod => ({ default: mod.TileLayer })));
const Marker = React.lazy(() => import('react-leaflet').then(mod => ({ default: mod.Marker })));
const Popup = React.lazy(() => import('react-leaflet').then(mod => ({ default: mod.Popup })));

export function PointRelaisModal({ isOpen, onClose, onSelect, codePostal }: PointRelaisModalProps) {
  const [points, setPoints] = useState<PointRelais[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<PointRelais | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && codePostal) {
      // Filtrer les points relais par code postal
      const filteredPoints = TEST_POINTS.filter(point => 
        point.CP.startsWith(codePostal.substring(0, 2))
      );
      setPoints(filteredPoints);
    }
  }, [isOpen, codePostal]);

  const filteredPoints = points.filter(point => 
    point.LgAdr1.toLowerCase().includes(searchTerm.toLowerCase()) ||
    point.Ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
    point.LgAdr2.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const center = points.length > 0 
    ? [parseFloat(points[0].Latitude), parseFloat(points[0].Longitude)]
    : [48.8566, 2.3522];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold">Choisissez votre point relais</DialogTitle>
          <div className="flex items-center gap-4 mt-4">
            <Input
              placeholder="Rechercher un point relais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Fermer
            </Button>
          </div>
        </DialogHeader>

        <div className="flex h-[calc(80vh-8rem)]">
          {/* Carte */}
          <div className="w-2/3 h-full">
            <Suspense fallback={null}>
              <MapContainer
                center={center as [number, number]}
                zoom={13}
                className="h-full w-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {filteredPoints.map((point) => (
                  <Marker
                    key={point.Num}
                    position={[parseFloat(point.Latitude), parseFloat(point.Longitude)]}
                    eventHandlers={{
                      click: () => setSelectedPoint(point)
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold">{point.LgAdr1}</h3>
                        <p>{point.LgAdr2}</p>
                        <p>{point.CP} {point.Ville}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </Suspense>
          </div>

          {/* Liste des points relais */}
          <div className="w-1/3 h-full overflow-y-auto border-l p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 p-4">{error}</div>
            ) : filteredPoints.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                Aucun point relais trouvé
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPoints.map((point) => (
                  <div
                    key={point.Num}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedPoint?.Num === point.Num
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPoint(point)}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold">{point.LgAdr1}</h3>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span>{point.Note}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{point.LgAdr2}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{point.Horaires}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {point.Services.map((service) => (
                        <span
                          key={service}
                          className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                        >
                          {service}
                        </span>
                      ))}
                      {point.Parking === "Gratuit" && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          Parking gratuit
                        </span>
                      )}
                      {point.Accessibilite === "PMR" && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1">
                          <Accessibility className="h-3 w-3" />
                          PMR
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-sm text-gray-500">{point.Distance}</span>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(point);
                        }}
                      >
                        Choisir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 