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
  LgAdr1?: string;
  LgAdr2?: string;
  LgAdr3?: string;
  LgAdr4?: string;
  CP?: string;
  Ville?: string;
  Pays?: string;
  Horaires?: string;
  Latitude?: string;
  Longitude?: string;
  Distance?: string;
  Note?: string;
  Services?: string[];
  Parking?: string;
  Accessibilite?: string;
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

// Assemble l'adresse complète à partir de LgAdr3 (rue) et LgAdr4 (complément)
function getAdresseComplete(point: PointRelais) {
  const lignes = [
    point.LgAdr3?.trim(), // Rue
    point.LgAdr4?.trim(), // Complément
  ].filter(Boolean);
  const adresse = lignes.join(", ");
  return adresse || `${point.CP} ${point.Ville}`;
}

// Utilitaire pour parser les coordonnées, gère le format français (virgule)
function parseCoord(value: any): number {
  return parseFloat(String(value ?? "").replace(",", "."));
}

// Vérifie si les coordonnées sont valides (ni NaN, ni hors limites géographiques)
function isValidCoordinates(lat: any, lng: any) {
  const latF = parseCoord(lat);
  const lngF = parseCoord(lng);
  return !isNaN(latF) && !isNaN(lngF) && latF >= -90 && latF <= 90 && lngF >= -180 && lngF <= 180;
}

// Nouvelle version robuste de formatHoraires :
/**
 * Formate la chaîne d'horaires brute Mondial Relay en tableau par jour.
 * Utilise un regex pour extraire le nom du jour (tolère accents, espaces, etc).
 * Nettoie les accents et force la casse pour correspondre à l'ordre des jours.
 * @param horairesRaw Chaîne brute (ex: "Mardi:09:00-12:00,14:00-18:00;...")
 */
function formatHoraires(horairesRaw?: string): { jour: string, creneaux: string[] }[] {
  const joursOrdres = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const map: Record<string, string[]> = {};

  if (horairesRaw) {
    const lignes = horairesRaw.split(";").map(l => l.trim()).filter(Boolean);

    lignes.forEach(line => {
      const match = line.match(/^([^:]+):(.+)$/);
      if (!match) return;

      let jourRaw = match[1].trim();
      const horairesStr = match[2].trim();

      const jour = jourRaw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // supprime les accents
        .toLowerCase()
        .replace(/^./, c => c.toUpperCase());

      const creneaux = horairesStr.split(",").map(c => {
        const [debut, fin] = c.split("-");
        if (!debut || !fin) return null;
        return `${debut} - ${fin}`;
      }).filter(Boolean) as string[];

      map[jour] = creneaux;
    });
  }

  return joursOrdres.map(jour => ({
    jour,
    creneaux: map[jour] || []
  }));
}

// Composant pour centrer dynamiquement la carte sur tous les points (fitBounds)
function AutoCenterMap({ points }: { points: PointRelais[] }) {
  const map = useMap();
  useEffect(() => {
    const coords: [number, number][] = points
      .map(p => {
        const lat = parseCoord(p.Latitude);
        const lng = parseCoord(p.Longitude);
        if (isValidCoordinates(lat, lng)) return [lat, lng];
        console.warn("Point ignoré (coordonnées invalides):", p);
        return null;
      })
      .filter(Boolean) as [number, number][];

    if (coords.length === 0) {
      map.setView([48.8566, 2.3522], 6); // fallback Paris
    } else if (coords.length === 1) {
      map.setView(coords[0], 14);
    } else {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

// Composant pour centrer la carte sur le point sélectionné (sécurisé)
function FlyToPoint({ point }: { point: PointRelais | null }) {
  const map = useMap();
  useReactEffect(() => {
    if (!point) return;
    const lat = parseCoord(point.Latitude);
    const lng = parseCoord(point.Longitude);
    if (isValidCoordinates(lat, lng)) {
      console.log("→ flyTo", lat, lng);
      setTimeout(() => {
        map.flyTo([lat, lng], 15, { animate: true });
      }, 100);
    }
  }, [point?.Num]);
  return null;
}

export function PointRelaisModal({ isOpen, onClose, onSelect, codePostal, points }: PointRelaisModalProps) {
  const [selectedPoint, setSelectedPoint] = useState<PointRelais | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPoints = [...new Map(
    points
      .filter(point =>
        [point.LgAdr1, point.Ville, point.LgAdr2, point.LgAdr3].some(field =>
          field?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
      .filter(p => isValidCoordinates(p.Latitude, p.Longitude))
      .map(p => [p.Num, p])
  ).values()];

  useEffect(() => {
    if (isOpen) {
      setSelectedPoint(null);
      setSearchTerm('');
    }
  }, [isOpen, points]);

  // Auto-sélection du premier point valide au chargement
  useEffect(() => {
    if (!selectedPoint && filteredPoints.length > 0) {
      setSelectedPoint(filteredPoints[0]);
    }
  }, [filteredPoints, selectedPoint]);

  // Debug temporaire : log selectedPoint à chaque changement
  useEffect(() => {
    console.log("Selected point:", selectedPoint);
  }, [selectedPoint]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh] md:h-[80vh] sm:h-[90vh] p-0" aria-describedby="">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold">Choisissez votre point relais</DialogTitle>
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
            <Input
              placeholder="Rechercher un point relais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md w-full"
            />
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              <X className="h-4 w-4 mr-2" />
              Fermer
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row h-[calc(80vh-8rem)] sm:h-[calc(90vh-8rem)]">
          {/* Carte */}
          <div className="w-full md:w-2/3 h-64 md:h-full p-2 md:p-0">
            <MapContainer
              center={[48.8566, 2.3522]}
              zoom={13}
              className="h-full w-full rounded-lg shadow-sm"
              scrollWheelZoom={true}
            >
              <AutoCenterMap points={filteredPoints} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {filteredPoints.map((point) => {
                console.log("→ Horaires bruts pour", point.Num, ":", point.Horaires);
                const lat = parseCoord(point.Latitude);
                const lng = parseCoord(point.Longitude);
                if (!isValidCoordinates(lat, lng)) {
                  console.warn("Marker ignoré (coordonnées invalides):", point);
                  return null;
                }
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
                        <div className="font-bold text-base mb-1">{point.LgAdr1 || "Nom indisponible"}</div>
                        <div className="text-sm text-gray-700 font-medium">{getAdresseComplete(point)}</div>
                        <div className="text-xs text-gray-500">{point.CP} {point.Ville}</div>
                        <div className="mt-2">
                          <table className="text-xs w-full">
                            <tbody>
                              {formatHoraires(point.Horaires).map(({ jour, creneaux }) => (
                                <tr key={jour}>
                                  <td className="pr-2 font-medium text-gray-700">{jour} :</td>
                                  <td className="text-gray-600">
                                    {creneaux.length > 0 ? creneaux.join(" / ") : <span className="text-gray-400">Fermé</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <MapPin className="h-4 w-4" />
                          <span>Distance : {formatDistance(point.Distance)}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              {selectedPoint && <FlyToPoint key={selectedPoint.Num} point={selectedPoint} />}
            </MapContainer>
          </div>

          {/* Liste des points relais */}
          <div className="w-full md:w-1/3 h-full overflow-y-auto border-t md:border-t-0 md:border-l p-2 md:p-4 bg-white">
            {filteredPoints.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                Aucun point relais trouvé
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPoints.map((point) => (
                  console.log("→ Horaires bruts pour", point.Num, ":", point.Horaires),
                  <div
                    key={point.Num}
                    className={`p-3 md:p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedPoint?.Num === point.Num
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPoint(point)}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0">
                      <div>
                        <div className="font-bold text-base md:text-lg text-gray-900 mb-1">{point.LgAdr1 || "Nom indisponible"}</div>
                        <div className="text-sm text-gray-700 font-medium">{getAdresseComplete(point)}</div>
                        <div className="text-xs text-gray-500">{point.CP} {point.Ville}</div>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500 mt-2 md:mt-0">
                        <Star className="h-4 w-4 fill-current" />
                        <span>{point.Note}</span>
                      </div>
                    </div>
                    <div className="mt-2 overflow-x-auto md:overflow-visible">
                      <table className="text-xs w-full min-w-[320px] md:min-w-0">
                        <tbody>
                          {formatHoraires(point.Horaires).map(({ jour, creneaux }) => (
                            <tr key={jour}>
                              <td className="pr-2 font-medium text-gray-700 whitespace-nowrap">{jour} :</td>
                              <td className="text-gray-600">
                                {creneaux.length > 0 ? creneaux.join(" / ") : <span className="text-gray-400">Fermé</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 mb-1">
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
                        className="w-full md:w-auto"
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