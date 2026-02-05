-- Rollback for 000006: remove role_menus for target roles and delete seeded menus

DELETE FROM role_menus WHERE role_id IN (SELECT id FROM roles WHERE name IN ('superadmin','admin','main_dealer','dealer'));

DELETE FROM menu_items
WHERE name IN (
  'dashboard','orders','finance','credit','quadrants','prices','news',
  'users','roles','role_menu_access','menus','scrape_sources'
);
