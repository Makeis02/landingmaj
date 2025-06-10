-- Migration pour créer les tables des codes promo
-- Fichier: 20241214000001_create_promo_codes_tables.sql

-- Table des codes promo
CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value DECIMAL(10,2) NOT NULL CHECK (value > 0),
    application_type VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (application_type IN ('all', 'specific_product', 'category')),
    product_id VARCHAR(100),
    product_title VARCHAR(255),
    category_name VARCHAR(100),
    minimum_amount DECIMAL(10,2),
    maximum_discount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de l'historique d'utilisation des codes promo
CREATE TABLE promo_code_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    order_id VARCHAR(255) NOT NULL,
    user_id UUID,
    user_email VARCHAR(255),
    discount_amount DECIMAL(10,2) NOT NULL,
    order_total DECIMAL(10,2) NOT NULL,
    applied_to_products JSONB, -- Détails des produits concernés
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX idx_promo_codes_application_type ON promo_codes(application_type);
CREATE INDEX idx_promo_codes_product_id ON promo_codes(product_id);
CREATE INDEX idx_promo_codes_category ON promo_codes(category_name);
CREATE INDEX idx_promo_codes_expires_at ON promo_codes(expires_at);

CREATE INDEX idx_promo_code_usages_code_id ON promo_code_usages(promo_code_id);
CREATE INDEX idx_promo_code_usages_order_id ON promo_code_usages(order_id);
CREATE INDEX idx_promo_code_usages_user_id ON promo_code_usages(user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour updated_at
CREATE TRIGGER update_promo_codes_updated_at
    BEFORE UPDATE ON promo_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour incrémenter le compteur d'utilisation
CREATE OR REPLACE FUNCTION increment_promo_code_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE promo_codes 
    SET used_count = used_count + 1 
    WHERE id = NEW.promo_code_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour incrémenter automatiquement used_count
CREATE TRIGGER increment_usage_count
    AFTER INSERT ON promo_code_usages
    FOR EACH ROW
    EXECUTE FUNCTION increment_promo_code_usage();

-- Policies RLS (Row Level Security)
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usages ENABLE ROW LEVEL SECURITY;

-- Policy pour les administrateurs (accès complet)
CREATE POLICY "Admins can manage promo codes"
    ON promo_codes
    FOR ALL
    USING (auth.role() = 'service_role');

-- Policy pour lecture publique des codes promo actifs (pour validation côté client)
CREATE POLICY "Public can read active promo codes"
    ON promo_codes
    FOR SELECT
    USING (is_active = true);

-- Policy pour les usages (admins seulement)
CREATE POLICY "Admins can manage promo code usages"
    ON promo_code_usages
    FOR ALL
    USING (auth.role() = 'service_role');

-- Insertion de quelques codes promo d'exemple
INSERT INTO promo_codes (code, description, type, value, application_type) VALUES
('BIENVENUE20', 'Code de bienvenue - 20% de réduction', 'percentage', 20, 'all'),
('NOEL2024', 'Promo de Noël - 15 euros de réduction', 'fixed', 15, 'all'),
('AQUARIUM50', 'Réduction spéciale aquariums', 'percentage', 10, 'category'); 