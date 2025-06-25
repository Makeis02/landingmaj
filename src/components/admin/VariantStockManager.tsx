import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Variant {
  idx: number;
  label: string;
  options: string[];
}

interface VariantStockManagerProps {
  productId: string;
  productTitle: string;
  onSave: () => void; // Callback to refresh data on parent
}

export const VariantStockManager = ({ productId, productTitle, onSave }: VariantStockManagerProps) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [stocks, setStocks] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVariantData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('editable_content')
          .select('content_key, content')
          .like('content_key', `product_${productId}_variant_%`);

        if (error) throw error;

        const variantMap: Record<number, Variant> = {};
        const stockMap: Record<string, string> = {};

        data.forEach(item => {
          let match;

          match = item.content_key.match(/^product_.+?_variant_(\d+)_label$/);
          if (match) {
            const idx = parseInt(match[1]);
            if (!variantMap[idx]) variantMap[idx] = { idx, label: '', options: [] };
            variantMap[idx].label = item.content;
          }

          match = item.content_key.match(/^product_.+?_variant_(\d+)_options$/);
          if (match) {
            const idx = parseInt(match[1]);
            if (!variantMap[idx]) variantMap[idx] = { idx, label: '', options: [] };
            variantMap[idx].options = (item.content || '').split('/').map(o => o.trim()).filter(Boolean);
          }
          
          match = item.content_key.match(/^product_.+?_variant_(\d+)_option_(.+)_stock$/);
          if (match) {
            const comboKey = `${match[1]}:${match[2]}`; // "idx:option"
            stockMap[comboKey] = item.content;
          }
        });
        
        const loadedVariants = Object.values(variantMap).sort((a, b) => a.idx - b.idx);
        setVariants(loadedVariants);
        setStocks(stockMap);
        
      } catch (error) {
        console.error("Erreur chargement des variantes:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les données des variantes." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVariantData();
  }, [productId, toast]);

  const handleStockSave = async () => {
    setIsLoading(true);
    try {
      const updates = variants.flatMap(v => 
        v.options.map(opt => {
          const comboKey = `${v.idx}:${opt}`;
          const stockValue = stocks[comboKey];
          // Update only if the value is a valid number
          if (stockValue !== undefined && stockValue !== '' && !isNaN(Number(stockValue))) {
            return {
              content_key: `product_${productId}_variant_${v.idx}_option_${opt}_stock`,
              content: String(Number(stockValue)),
            };
          }
          return null;
        })
      ).filter(Boolean);
      
      if (updates.length > 0) {
        const { error } = await supabase.from('editable_content').upsert(updates, { onConflict: 'content_key' });
        if (error) throw error;
      }

      toast({ title: "Stocks mis à jour", description: "Les stocks des variantes ont été sauvegardés." });
      onSave(); // Trigger refresh on the parent page
    } catch (error) {
        console.error("Erreur sauvegarde stocks variantes:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder les stocks." });
    } finally {
        setIsLoading(false);
    }
  };

  if (isLoading && variants.length === 0) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">{productTitle}</h3>
      <p className="text-sm text-gray-500 mb-4">Gérez le stock pour chaque option de variante.</p>
      
      <div className="max-h-[50vh] overflow-y-auto pr-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variante</TableHead>
              <TableHead>Option</TableHead>
              <TableHead className="w-32">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">Aucune variante n'a été configurée pour ce produit.</TableCell></TableRow>}
            {variants.map(variant =>
              variant.options.map((option, optIdx) => (
                <TableRow key={`${variant.idx}-${optIdx}`}>
                  {optIdx === 0 && <TableCell rowSpan={variant.options.length} className="font-medium align-top pt-3">{variant.label}</TableCell>}
                  <TableCell>{option}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      className="h-8"
                      value={stocks[`${variant.idx}:${option}`] || ''}
                      onChange={e => {
                        setStocks(prev => ({
                          ...prev,
                          [`${variant.idx}:${option}`]: e.target.value,
                        }));
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-6 flex justify-end">
        <Button onClick={handleStockSave} disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
          Enregistrer les stocks
        </Button>
      </div>
    </div>
  );
}; 