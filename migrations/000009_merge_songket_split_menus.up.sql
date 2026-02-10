-- Merge split SONGKET menus into combined menus:
-- jobs + net_income => jobs
-- motor_types + installments => installments

-- Remove old split menu assignments first.
DELETE FROM role_menus
WHERE menu_item_id IN (
  SELECT id FROM menu_items WHERE name IN ('net_income', 'motor_types')
);

-- Delete old split menus.
DELETE FROM menu_items WHERE name IN ('net_income', 'motor_types');

-- Ensure combined menu metadata.
UPDATE menu_items
SET
  display_name = 'Jobs & Net Income',
  path = '/jobs',
  icon = 'bi-briefcase',
  order_index = 8,
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = NOW()
WHERE name = 'jobs';

UPDATE menu_items
SET
  display_name = 'Motor Types & Installments',
  path = '/installments',
  icon = 'bi-wallet2',
  order_index = 9,
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = NOW()
WHERE name = 'installments';

-- Keep jobs/installments menus restricted to superadmin + main_dealer.
DELETE FROM role_menus
WHERE menu_item_id IN (
  SELECT id FROM menu_items WHERE name IN ('jobs', 'installments')
)
AND role_id IN (
  SELECT id FROM roles WHERE name NOT IN ('superadmin', 'main_dealer')
);

INSERT INTO role_menus (id, role_id, menu_item_id)
SELECT gen_random_uuid(), r.id, m.id
FROM roles r
JOIN menu_items m ON m.name IN ('jobs', 'installments')
WHERE r.name IN ('superadmin', 'main_dealer')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;
