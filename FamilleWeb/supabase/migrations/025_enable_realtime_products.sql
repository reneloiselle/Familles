-- Realtime pour catalogue produits / magasins

ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE stores;
ALTER PUBLICATION supabase_realtime ADD TABLE product_store_placements;

ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE stores REPLICA IDENTITY FULL;
ALTER TABLE product_store_placements REPLICA IDENTITY FULL;
