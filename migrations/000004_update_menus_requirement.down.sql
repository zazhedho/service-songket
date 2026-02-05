-- Revert menu additions and role menu mappings introduced in 000004

-- Remove role_menus entries for the targeted roles and menus
DELETE FROM role_menus
WHERE role_id IN (SELECT id FROM roles WHERE name IN ('dealer','main_dealer','superadmin'))
  AND menu_item_id IN (SELECT id FROM menu_items WHERE name IN ('orders','finance','credit','quadrants','prices','news','role_menu_access'));

-- Optionally remove menu items that were added (keep dashboard/users/roles/menus since they existed previously)
DELETE FROM menu_items WHERE name IN ('orders','finance','credit','quadrants','prices','news','role_menu_access');

-- Remove the roles we introduced
DELETE FROM roles WHERE name IN ('dealer','main_dealer');
