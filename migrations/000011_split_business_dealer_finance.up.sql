-- Split SONGKET menu into 3 root menus:
-- Business, Dealer, Finance.

WITH menu_data(name, display_name, path, icon, order_index, is_active) AS (
  VALUES
    ('business', 'Business', '/business', 'bi-briefcase', 3, TRUE),
    ('dealer', 'Dealer', '/dealer', 'bi-shop', 4, TRUE),
    ('finance', 'Finance', '/finance', 'bi-geo-alt', 5, TRUE)
)
INSERT INTO menu_items (id, name, display_name, path, icon, order_index, is_active)
SELECT gen_random_uuid(), md.name, md.display_name, md.path, md.icon, md.order_index, md.is_active
FROM menu_data md
ON CONFLICT (name)
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = NOW();

-- Force these menus to be root-level.
UPDATE menu_items
SET parent_id = NULL,
    is_active = TRUE,
    deleted_at = NULL,
    updated_at = NOW()
WHERE name IN ('business', 'dealer', 'finance')
   OR path IN ('/business', '/dealer', '/finance');

-- Hide legacy report finance menu if still present.
UPDATE menu_items
SET is_active = FALSE,
    updated_at = NOW()
WHERE path = '/finance-report'
   OR name IN ('finance_report', 'report_finance');

DELETE FROM role_menus
WHERE menu_item_id IN (
  SELECT id
  FROM menu_items
  WHERE path = '/finance-report'
     OR name IN ('finance_report', 'report_finance')
);

-- Grant access for the main operational roles.
INSERT INTO role_menus (id, role_id, menu_item_id)
SELECT gen_random_uuid(), r.id, m.id
FROM roles r
JOIN menu_items m ON m.name IN ('business', 'dealer', 'finance')
WHERE r.name IN ('superadmin', 'admin', 'main_dealer')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;
