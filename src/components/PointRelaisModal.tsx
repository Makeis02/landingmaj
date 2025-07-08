import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, Star, Car, Accessibility, Package, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect as useReactEffect } from 'react';

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

interface PointRelaisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (point: PointRelais) => void;
  codePostal: string;
  points: PointRelais[];
}

// Formateur de distance (mètres -> km, fallback)
const formatDistance = (d: string | undefined) => {
  const val = parseFloat(d || "");
  return isNaN(val) ? "Non disponible" : `${(val / 1000).toFixed(1)} km`;
};

// Composant pour centrer la carte sur le point sélectionné (sécurisé)
function FlyToPoint({ point }) {
  const map = useMap();
  useReactEffect(() => {
    const lat = parseFloat(point?.Latitude || "");
    const lng = parseFloat(point?.Longitude || "");
    if (!isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], 15, { animate: true });
    }
  }, [point]);
  return null;
}

export function PointRelaisModal({ isOpen, onClose, onSelect, codePostal, points }: PointRelaisModalProps) {
  const [selectedPoint, setSelectedPoint] = useState<PointRelais | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPoints = points.filter(point => 
    point.LgAdr1.toLowerCase().includes(searchTerm.toLowerCase()) ||
    point.Ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
    point.LgAdr2.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validFirst = filteredPoints.find(p =>
    !isNaN(parseFloat(p.Latitude || "")) && !isNaN(parseFloat(p.Longitude || ""))
  );
  const center = validFirst
    ? [parseFloat(validFirst.Latitude), parseFloat(validFirst.Longitude)]
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
            <MapContainer
              center={center as [number, number]}
              zoom={13}
              className="h-full w-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {filteredPoints.map((point) => {
                const lat = parseFloat(point.Latitude || "");
                const lng = parseFloat(point.Longitude || "");
                if (isNaN(lat) || isNaN(lng)) return null;
                return (
                  <Marker
                    key={point.Num}
                    position={[lat, lng]}
                    eventHandlers={{
                      click: () => setSelectedPoint(point)
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold">{point.LgAdr1}</h3>
                        <div className="text-sm text-gray-700 font-medium">{point.LgAdr2}</div>
                        <div className="text-xs text-gray-500 mb-1">{point.CP} {point.Ville}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <Clock className="h-4 w-4" />
                          <span>{point.Horaires}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <MapPin className="h-4 w-4" />
                          <span>Distance : {formatDistance(point.Distance)}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              {selectedPoint && <FlyToPoint point={selectedPoint} />}
            </MapContainer>
          </div>

          {/* Liste des points relais */}
          <div className="w-1/3 h-full overflow-y-auto border-l p-4">
            {filteredPoints.length === 0 ? (
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
                      <h3 className="font-semibold text-lg text-gray-900">{point.LgAdr1}</h3>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span>{point.Note}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-700 font-medium">{point.LgAdr2}</div>
                    <div className="text-xs text-gray-500 mb-1">{point.CP} {point.Ville}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Clock className="h-4 w-4" />
                      <span>{point.Horaires}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <MapPin className="h-4 w-4" />
                      <span>Distance : {formatDistance(point.Distance)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {point.Services?.map((service) => (
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