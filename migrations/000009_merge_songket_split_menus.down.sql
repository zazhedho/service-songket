-- Revert merged SONGKET menus back to split menus.

-- Restore jobs/installments display metadata.
UPDATE menu_items
SET
  display_name = 'Nama Pekerjaan',
  path = '/jobs',
  icon = 'bi-briefcase',
  order_index = 8,
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = NOW()
WHERE name = 'jobs';

UPDATE menu_items
SET
  display_name = 'Angsuran',
  path = '/installments',
  icon = 'bi-wallet2',
  order_index = 11,
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = NOW()
WHERE name = 'installments';

-- Recreate net_income and motor_types menus.
INSERT INTO menu_items (id, name, display_name, path, icon, order_index, is_active)
VALUES
  (gen_random_uuid(), 'net_income', 'Net Income', '/net-income', 'bi-cash-coin', 9, TRUE),
  (gen_random_uuid(), 'motor_types', 'Jenis Motor', '/motor-types', 'bi-bicycle', 10, TRUE)
ON CONFLICT (name)
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = NOW();

-- Restore menu access for superadmin + main_dealer.
INSERT INTO role_menus (id, role_id, menu_item_id)
SELECT gen_random_uuid(), r.id, m.id
FROM roles r
JOIN menu_items m ON m.name IN ('jobs', 'net_income', 'motor_types', 'installments')
WHERE r.name IN ('superadmin', 'main_dealer')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;
