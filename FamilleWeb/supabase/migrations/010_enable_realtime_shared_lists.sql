-- Enable Realtime for shared_lists table
ALTER PUBLICATION supabase_realtime ADD TABLE shared_lists;

-- Enable Realtime for shared_list_items table
ALTER PUBLICATION supabase_realtime ADD TABLE shared_list_items;

