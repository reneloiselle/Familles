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
