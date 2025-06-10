import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Edit, Trash2, Copy, Percent, Euro, Calendar, Users, Package, Tags } from "lucide-react";
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
  application_type: 'all' | 'specific_product' | 'category';
  product_id?: string;
  product_title?: string;
  category_name?: string;
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
  
  const [availableProducts, setAvailableProducts] = useState<{id: string, title: string}[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    application_type: 'all' as 'all' | 'specific_product' | 'category',
    product_id: '',
    category_name: '',
    minimum_amount: '',
    maximum_discount: '',
    usage_limit: '',
    expires_at: '',
    is_active: true
  });

  const loadAvailableProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .like('content_key', 'product_%_title');

      if (error) throw error;

      const products = data.map(item => ({
        id: item.content_key.replace('product_', '').replace('_title', ''),
        title: item.content
      })).filter(product => product.title && product.title.trim() !== '');

      setAvailableProducts(products);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      setAvailableProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadAvailableCategories = async () => {
    try {
      const categories = [
        'Aquariums',
        'Poissons',
        'Plantes aquatiques',
        'Filtration',
        'Éclairage',
        'Chauffage',
        'Décoration',
        'Nourriture',
        'Accessoires',
        'Entretien'
      ];
      setAvailableCategories(categories);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      setAvailableCategories([]);
    }
  };

  const loadPromoCodes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPromoCodes(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setPromoCodes([]);
      toast({
        title: "Erreur",
        description: "Impossible de charger les codes promo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPromoCodes();
    loadAvailableProducts();
    loadAvailableCategories();
  }, []);

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      type: 'percentage',
      value: 0,
      application_type: 'all',
      product_id: '',
      category_name: '',
      minimum_amount: '',
      maximum_discount: '',
      usage_limit: '',
      expires_at: '',
      is_active: true
    });
    setEditingCode(null);
  };

  const openDialog = (code?: PromoCode) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        code: code.code,
        description: code.description,
        type: code.type,
        value: code.value,
        application_type: code.application_type || 'all',
        product_id: code.product_id || '',
        category_name: code.category_name || '',
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

    if (formData.application_type === 'specific_product' && !formData.product_id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un produit spécifique",
        variant: "destructive",
      });
      return;
    }

    if (formData.application_type === 'category' && !formData.category_name) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une catégorie",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      let productTitle = '';
      if (formData.application_type === 'specific_product' && formData.product_id) {
        const product = availableProducts.find(p => p.id === formData.product_id);
        productTitle = product?.title || '';
      }

      const promoData = {
        code: formData.code.toUpperCase().trim(),
        description: formData.description.trim(),
        type: formData.type,
        value: formData.value,
        application_type: formData.application_type,
        product_id: formData.application_type === 'specific_product' ? formData.product_id : null,
        product_title: formData.application_type === 'specific_product' ? productTitle : null,
        category_name: formData.application_type === 'category' ? formData.category_name : null,
        minimum_amount: formData.minimum_amount ? parseFloat(formData.minimum_amount) : null,
        maximum_discount: formData.maximum_discount ? parseFloat(formData.maximum_discount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at + 'T23:59:59').toISOString() : null,
        is_active: formData.is_active
      };

      if (editingCode) {
        const { data, error } = await supabase
          .from('promo_codes')
          .update(promoData)
          .eq('id', editingCode.id)
          .select()
          .single();

        if (error) throw error;

        setPromoCodes(promoCodes.map(code => code.id === editingCode.id ? data : code));
      } else {
        const { data, error } = await supabase
          .from('promo_codes')
          .insert(promoData)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            toast({
              title: "Erreur",
              description: "Ce code promo existe déjà",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }

        setPromoCodes([data, ...promoCodes]);
      }

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

  const deletePromoCode = async (id: string, code: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le code "${code}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPromoCodes(promoCodes.filter(c => c.id !== id));

      toast({
        title: "Succès",
        description: "Code promo supprimé",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le code promo",
        variant: "destructive",
      });
    }
  };

  const togglePromoCode = async (id: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setPromoCodes(promoCodes.map(code => code.id === id ? data : code));

      toast({
        title: "Succès",
        description: `Code promo ${isActive ? 'activé' : 'désactivé'}`,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le code promo",
        variant: "destructive",
      });
    }
  };

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

  const formatValue = (type: string, value: number) => {
    return type === 'percentage' ? `${value}%` : `${value.toFixed(2)}€`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

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
                    <Label htmlFor="application_type">Type d'application *</Label>
                    <Select value={formData.application_type} onValueChange={(value: 'all' | 'specific_product' | 'category') => setFormData({ ...formData, application_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les produits</SelectItem>
                        <SelectItem value="specific_product">Produit spécifique</SelectItem>
                        <SelectItem value="category">Catégorie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.application_type === 'specific_product' && (
                    <div>
                      <Label htmlFor="product_id">Produit</Label>
                      <Select value={formData.product_id} onValueChange={(value: string) => setFormData({ ...formData, product_id: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.application_type === 'category' && (
                    <div>
                      <Label htmlFor="category_name">Catégorie</Label>
                      <Select value={formData.category_name} onValueChange={(value: string) => setFormData({ ...formData, category_name: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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

        {/* Statistiques par type d'application */}
        {promoCodes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Tous produits</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {promoCodes.filter(code => code.application_type === 'all' || !code.application_type).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Produits spécifiques</p>
                    <p className="text-2xl font-bold text-green-600">
                      {promoCodes.filter(code => code.application_type === 'specific_product').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Tags className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">Par catégorie</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {promoCodes.filter(code => code.application_type === 'category').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-600">Actifs</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {promoCodes.filter(code => code.is_active).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
                    <TableHead>Application</TableHead>
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
                            {code.application_type === 'all' && (
                              <>
                                <Package className="h-3 w-3 text-blue-500" />
                                <span className="text-sm text-blue-600">Tous les produits</span>
                              </>
                            )}
                            {code.application_type === 'specific_product' && (
                              <>
                                <Package className="h-3 w-3 text-green-500" />
                                <div className="flex flex-col">
                                  <span className="text-sm text-green-600">Produit spécifique</span>
                                  <span className="text-xs text-gray-500 truncate max-w-[120px]">
                                    {code.product_title || `ID: ${code.product_id}`}
                                  </span>
                                </div>
                              </>
                            )}
                            {code.application_type === 'category' && (
                              <>
                                <Tags className="h-3 w-3 text-purple-500" />
                                <div className="flex flex-col">
                                  <span className="text-sm text-purple-600">Catégorie</span>
                                  <span className="text-xs text-gray-500">{code.category_name}</span>
                                </div>
                              </>
                            )}
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