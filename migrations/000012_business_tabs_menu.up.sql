-- Keep one SONGKET root menu for business tabs.
-- Finance and Dealer are now tabs under Business page, not standalone menus.

INSERT INTO menu_items (id, name, display_name, path, icon, order_index, is_active)
VALUES (gen_random_uuid(), 'business', 'Business', '/business', 'bi-briefcase', 3, TRUE)
ON CONFLICT (name)
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  is_active = EXCLUDED.is_active,
  parent_id = NULL,
  deleted_at = NULL,
  updated_at = NOW();

UPDATE menu_items
SET is_active = FALSE,
    updated_at = NOW()
WHERE path IN ('/dealer', '/finance', '/finance-report')
   OR name IN ('dealer', 'finance_report', 'report_finance');

DELETE FROM role_menus
WHERE menu_item_id IN (
  SELECT id
  FROM menu_items
  WHERE path IN ('/dealer', '/finance', '/finance-report')
     OR name IN ('dealer', 'finance_report', 'report_finance')
);

INSERT INTO role_menus (id, role_id, menu_item_id)
SELECT gen_random_uuid(), r.id, m.id
FROM roles r
JOIN menu_items m ON m.name = 'business'
WHERE r.name IN ('superadmin', 'admin', 'main_dealer')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;
