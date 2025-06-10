import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Edit, Trash2, Copy, Percent, Euro, Calendar, Users } from "lucide-react";
import AdminHeader from "@/components/admin/layout/AdminHeader";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PromoCode {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  minimum_amount?: number;
  maximum_discount?: number;
  usage_limit?: number;
  used_count: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const PromoCodesPage = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // États du formulaire
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    minimum_amount: '',
    maximum_discount: '',
    usage_limit: '',
    expires_at: '',
    is_active: true
  });

  // Charger les codes promo depuis la base
  const loadPromoCodes = async () => {
    setIsLoading(true);
    try {
      // Pour l'instant on simule avec du local storage, plus tard on utilisera Supabase
      const savedCodes = localStorage.getItem('promo_codes');
      const codes = savedCodes ? JSON.parse(savedCodes) : [];
      setPromoCodes(codes);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setPromoCodes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPromoCodes();
  }, []);

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      type: 'percentage',
      value: 0,
      minimum_amount: '',
      maximum_discount: '',
      usage_limit: '',
      expires_at: '',
      is_active: true
    });
    setEditingCode(null);
  };

  // Ouvrir le dialog
  const openDialog = (code?: PromoCode) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        code: code.code,
        description: code.description,
        type: code.type,
        value: code.value,
        minimum_amount: code.minimum_amount?.toString() || '',
        maximum_discount: code.maximum_discount?.toString() || '',
        usage_limit: code.usage_limit?.toString() || '',
        expires_at: code.expires_at ? code.expires_at.split('T')[0] : '',
        is_active: code.is_active
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  // Sauvegarder un code promo
  const savePromoCode = async () => {
    if (!formData.code.trim()) {
      toast({
        title: "Erreur",
        description: "Le code promo est obligatoire",
        variant: "destructive",
      });
      return;
    }

    if (formData.value <= 0) {
      toast({
        title: "Erreur",
        description: "La valeur doit être supérieure à 0",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const newCode: PromoCode = {
        id: editingCode?.id || Date.now().toString(),
        code: formData.code.toUpperCase().trim(),
        description: formData.description.trim(),
        type: formData.type,
        value: formData.value,
        minimum_amount: formData.minimum_amount ? parseFloat(formData.minimum_amount) : undefined,
        maximum_discount: formData.maximum_discount ? parseFloat(formData.maximum_discount) : undefined,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : undefined,
        used_count: editingCode?.used_count || 0,
        expires_at: formData.expires_at ? new Date(formData.expires_at + 'T23:59:59').toISOString() : undefined,
        is_active: formData.is_active,
        created_at: editingCode?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let updatedCodes;
      if (editingCode) {
        updatedCodes = promoCodes.map(code => code.id === editingCode.id ? newCode : code);
      } else {
        // Vérifier que le code n'existe pas déjà
        if (promoCodes.some(code => code.code === newCode.code)) {
          toast({
            title: "Erreur",
            description: "Ce code promo existe déjà",
            variant: "destructive",
          });
          return;
        }
        updatedCodes = [...promoCodes, newCode];
      }

      localStorage.setItem('promo_codes', JSON.stringify(updatedCodes));
      setPromoCodes(updatedCodes);

      toast({
        title: "Succès",
        description: editingCode ? "Code promo mis à jour" : "Code promo créé",
      });

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le code promo",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Supprimer un code promo
  const deletePromoCode = async (id: string, code: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le code "${code}" ?`)) {
      return;
    }

    const updatedCodes = promoCodes.filter(c => c.id !== id);
    localStorage.setItem('promo_codes', JSON.stringify(updatedCodes));
    setPromoCodes(updatedCodes);

    toast({
      title: "Succès",
      description: "Code promo supprimé",
    });
  };

  // Activer/désactiver un code promo
  const togglePromoCode = async (id: string, isActive: boolean) => {
    const updatedCodes = promoCodes.map(code => 
      code.id === id 
        ? { ...code, is_active: isActive, updated_at: new Date().toISOString() }
        : code
    );
    
    localStorage.setItem('promo_codes', JSON.stringify(updatedCodes));
    setPromoCodes(updatedCodes);

    toast({
      title: "Succès",
      description: `Code promo ${isActive ? 'activé' : 'désactivé'}`,
    });
  };

  // Copier un code
  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Copié !",
        description: `Le code "${code}" a été copié`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive",
      });
    }
  };

  // Formater la valeur
  const formatValue = (type: string, value: number) => {
    return type === 'percentage' ? `${value}%` : `${value.toFixed(2)}€`;
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Calculer le statut
  const getCodeStatus = (code: PromoCode) => {
    if (!code.is_active) return { label: 'Inactif', color: 'secondary' };
    if (code.expires_at && new Date(code.expires_at) < new Date()) return { label: 'Expiré', color: 'destructive' };
    if (code.usage_limit && code.used_count >= code.usage_limit) return { label: 'Épuisé', color: 'destructive' };
    return { label: 'Actif', color: 'default' };
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <AdminHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Codes de réduction</h1>
            <p className="text-gray-600">Gérez vos codes promo pour le checkout</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau code promo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCode ? 'Modifier le code promo' : 'Nouveau code promo'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="code">Code promo *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="PROMO2024"
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du code promo..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type *</Label>
                    <Select value={formData.type} onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage</SelectItem>
                        <SelectItem value="fixed">Montant fixe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="value">
                      Valeur * {formData.type === 'percentage' ? '(%)' : '(€)'}
                    </Label>
                    <Input
                      id="value"
                      type="number"
                      min="0"
                      step={formData.type === 'percentage' ? '1' : '0.01'}
                      max={formData.type === 'percentage' ? '100' : undefined}
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minimum_amount">Panier minimum (€)</Label>
                    <Input
                      id="minimum_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minimum_amount}
                      onChange={(e) => setFormData({ ...formData, minimum_amount: e.target.value })}
                      placeholder="Optionnel"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maximum_discount">Réduction max (€)</Label>
                    <Input
                      id="maximum_discount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.maximum_discount}
                      onChange={(e) => setFormData({ ...formData, maximum_discount: e.target.value })}
                      placeholder="Optionnel"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="usage_limit">Limite d'utilisation</Label>
                    <Input
                      id="usage_limit"
                      type="number"
                      min="0"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                      placeholder="Illimité"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expires_at">Date d'expiration</Label>
                    <Input
                      id="expires_at"
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Code actif</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => setIsDialogOpen(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={savePromoCode}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingCode ? 'Modifier' : 'Créer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Liste des codes promo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Codes promo ({promoCodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Chargement...</span>
              </div>
            ) : promoCodes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Percent className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">Aucun code promo</p>
                <p>Créez votre premier code de réduction</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Réduction</TableHead>
                    <TableHead>Utilisation</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((code) => {
                    const status = getCodeStatus(code);
                    return (
                      <TableRow key={code.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{code.code}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(code.code)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm truncate">{code.description || 'Aucune description'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {code.type === 'percentage' ? <Percent className="h-3 w-3" /> : <Euro className="h-3 w-3" />}
                            <span className="font-medium">{formatValue(code.type, code.value)}</span>
                          </div>
                          {code.minimum_amount && (
                            <p className="text-xs text-gray-500">Min: {code.minimum_amount}€</p>
                          )}
                          {code.maximum_discount && (
                            <p className="text-xs text-gray-500">Max: {code.maximum_discount}€</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{code.used_count}</span>
                            {code.usage_limit && (
                              <span className="text-gray-500">/ {code.usage_limit}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {code.expires_at ? formatDate(code.expires_at) : 'Jamais'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.color as any}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={code.is_active}
                              onCheckedChange={(checked) => togglePromoCode(code.id, checked)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDialog(code)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletePromoCode(code.id, code.code)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PromoCodesPage; 