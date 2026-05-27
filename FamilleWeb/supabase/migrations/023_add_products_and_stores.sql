-- Catalogue produits et magasins (périmètre famille)

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  format TEXT,
  price NUMERIC(10, 2),
  upc TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT products_name_not_empty CHECK (char_length(trim(name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS products_family_upc_unique
  ON products (family_id, upc)
  WHERE upc IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_family_id ON products(family_id);
CREATE INDEX IF NOT EXISTS idx_products_family_name_lower ON products (family_id, lower(name));

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT stores_name_not_empty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_stores_family_id ON stores(family_id);

CREATE TABLE IF NOT EXISTS product_store_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  aisle TEXT,
  comment TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_product_store_placements_product_id
  ON product_store_placements(product_id);
CREATE INDEX IF NOT EXISTS idx_product_store_placements_store_id
  ON product_store_placements(store_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_store_placements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_user_access_product(p_product_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SELECT family_id INTO v_family_id
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN can_user_view_family(v_family_id, p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION can_user_access_store(p_store_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SELECT family_id INTO v_family_id
  FROM stores
  WHERE id = p_store_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN can_user_view_family(v_family_id, p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION format_product_label(
  p_name TEXT,
  p_brand TEXT DEFAULT NULL,
  p_format TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(
    p_name
    || CASE
      WHEN p_brand IS NOT NULL AND char_length(trim(p_brand)) > 0
      THEN ' — ' || trim(p_brand)
      ELSE ''
    END
    || CASE
      WHEN p_format IS NOT NULL AND char_length(trim(p_format)) > 0
      THEN ' (' || trim(p_format) || ')'
      ELSE ''
    END
  );
$$;

CREATE OR REPLACE FUNCTION normalize_product_upc(p_upc TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(trim(COALESCE(p_upc, '')), '[^0-9]', '', 'g'), '');
$$;

-- RLS products
CREATE POLICY "Family members can view products"
  ON products FOR SELECT
  USING (can_user_view_family(products.family_id, auth.uid()));

CREATE POLICY "Family members can create products"
  ON products FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND can_user_view_family(products.family_id, auth.uid())
  );

CREATE POLICY "Family members can update products"
  ON products FOR UPDATE
  USING (can_user_view_family(products.family_id, auth.uid()));

CREATE POLICY "Family members can delete products"
  ON products FOR DELETE
  USING (can_user_view_family(products.family_id, auth.uid()));

-- RLS stores
CREATE POLICY "Family members can view stores"
  ON stores FOR SELECT
  USING (can_user_view_family(stores.family_id, auth.uid()));

CREATE POLICY "Family members can create stores"
  ON stores FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND can_user_view_family(stores.family_id, auth.uid())
  );

CREATE POLICY "Family members can update stores"
  ON stores FOR UPDATE
  USING (can_user_view_family(stores.family_id, auth.uid()));

CREATE POLICY "Family members can delete stores"
  ON stores FOR DELETE
  USING (can_user_view_family(stores.family_id, auth.uid()));

-- RLS placements
CREATE POLICY "Family members can view product store placements"
  ON product_store_placements FOR SELECT
  USING (can_user_access_product(product_store_placements.product_id, auth.uid()));

CREATE POLICY "Family members can create product store placements"
  ON product_store_placements FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND can_user_access_product(product_store_placements.product_id, auth.uid())
    AND can_user_access_store(product_store_placements.store_id, auth.uid())
  );

CREATE POLICY "Family members can update product store placements"
  ON product_store_placements FOR UPDATE
  USING (can_user_access_product(product_store_placements.product_id, auth.uid()));

CREATE POLICY "Family members can delete product store placements"
  ON product_store_placements FOR DELETE
  USING (can_user_access_product(product_store_placements.product_id, auth.uid()));

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_store_placements_updated_at
  BEFORE UPDATE ON product_store_placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
