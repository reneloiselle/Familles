-- Migrations 023 + 024 + 025 — à exécuter dans le SQL Editor Supabase (projet evneffktqnorlszypyjg)
-- Ordre: 023 → 024 → 025

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

-- ========== 024 ==========

-- Lien optionnel liste partagée → produit catalogue + fonctions RPC

ALTER TABLE shared_list_items
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shared_list_items_product_id
  ON shared_list_items(product_id);

CREATE OR REPLACE FUNCTION product_belongs_to_list_family(
  p_product_id UUID,
  p_list_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list_family_id UUID;
  v_product_family_id UUID;
BEGIN
  SELECT family_id INTO v_list_family_id
  FROM shared_lists
  WHERE id = p_list_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT family_id INTO v_product_family_id
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN v_list_family_id = v_product_family_id;
END;
$$;

DROP POLICY IF EXISTS "Family members can create list items" ON shared_list_items;
CREATE POLICY "Family members can create list items"
  ON shared_list_items FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND can_user_access_list(shared_list_items.list_id, auth.uid())
    AND (
      shared_list_items.product_id IS NULL
      OR product_belongs_to_list_family(shared_list_items.product_id, shared_list_items.list_id)
    )
  );

DROP POLICY IF EXISTS "Family members can update list items" ON shared_list_items;
CREATE POLICY "Family members can update list items"
  ON shared_list_items FOR UPDATE
  USING (
    can_user_access_list(shared_list_items.list_id, auth.uid())
  )
  WITH CHECK (
    can_user_access_list(shared_list_items.list_id, auth.uid())
    AND (
      shared_list_items.product_id IS NULL
      OR product_belongs_to_list_family(shared_list_items.product_id, shared_list_items.list_id)
    )
  );

CREATE OR REPLACE FUNCTION resolve_or_create_product(
  p_family_id UUID,
  p_user_id UUID,
  p_name TEXT,
  p_brand TEXT DEFAULT NULL,
  p_format TEXT DEFAULT NULL,
  p_price NUMERIC DEFAULT NULL,
  p_upc TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
  v_name TEXT;
  v_upc TEXT;
BEGIN
  IF NOT can_user_view_family(p_family_id, p_user_id) THEN
    RAISE EXCEPTION 'Accès famille refusé';
  END IF;

  v_name := trim(p_name);
  IF char_length(v_name) = 0 THEN
    RAISE EXCEPTION 'Le nom du produit est obligatoire';
  END IF;

  v_upc := normalize_product_upc(p_upc);

  IF v_upc IS NOT NULL THEN
    SELECT id INTO v_product_id
    FROM products
    WHERE family_id = p_family_id AND upc = v_upc
    LIMIT 1;

    IF v_product_id IS NOT NULL THEN
      RETURN v_product_id;
    END IF;
  ELSIF (
    SELECT count(*)::int
    FROM products
    WHERE family_id = p_family_id
      AND lower(trim(name)) = lower(v_name)
  ) = 1 THEN
    SELECT id INTO v_product_id
    FROM products
    WHERE family_id = p_family_id
      AND lower(trim(name)) = lower(v_name)
    LIMIT 1;

    RETURN v_product_id;
  END IF;

  INSERT INTO products (
    family_id, name, brand, format, price, upc, created_by
  ) VALUES (
    p_family_id,
    v_name,
    NULLIF(trim(COALESCE(p_brand, '')), ''),
    NULLIF(trim(COALESCE(p_format, '')), ''),
    p_price,
    v_upc,
    p_user_id
  )
  RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION add_shared_list_items_with_products(
  p_list_id UUID,
  p_user_id UUID,
  p_lines TEXT[],
  p_link_products BOOLEAN DEFAULT TRUE
)
RETURNS SETOF shared_list_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
  v_line TEXT;
  v_product_id UUID;
  v_display TEXT;
  v_row shared_list_items%ROWTYPE;
BEGIN
  IF NOT can_user_access_list(p_list_id, p_user_id) THEN
    RAISE EXCEPTION 'Accès liste refusé';
  END IF;

  SELECT family_id INTO v_family_id
  FROM shared_lists
  WHERE id = p_list_id;

  FOREACH v_line IN ARRAY p_lines
  LOOP
    v_line := trim(v_line);
    IF char_length(v_line) = 0 THEN
      CONTINUE;
    END IF;

    v_product_id := NULL;
    v_display := v_line;

    IF p_link_products THEN
      v_product_id := resolve_or_create_product(
        v_family_id,
        p_user_id,
        v_line,
        NULL,
        NULL,
        NULL,
        NULL
      );

      SELECT format_product_label(name, brand, format)
      INTO v_display
      FROM products
      WHERE id = v_product_id;
    END IF;

    INSERT INTO shared_list_items (
      list_id, text, product_id, created_by
    ) VALUES (
      p_list_id, v_display, v_product_id, p_user_id
    )
    RETURNING * INTO v_row;

    RETURN NEXT v_row;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_or_create_product TO authenticated;
GRANT EXECUTE ON FUNCTION add_shared_list_items_with_products TO authenticated;
GRANT EXECUTE ON FUNCTION format_product_label TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_product_upc TO authenticated;

-- ========== 025 ==========

-- Realtime pour catalogue produits / magasins

ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE stores;
ALTER PUBLICATION supabase_realtime ADD TABLE product_store_placements;

ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE stores REPLICA IDENTITY FULL;
ALTER TABLE product_store_placements REPLICA IDENTITY FULL;
