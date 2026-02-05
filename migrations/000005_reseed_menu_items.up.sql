-- Reseed menu_items and role_menus to align with FE Layout requirements

-- 0) Safety: remove existing mappings then menus
DELETE FROM role_menus;
DELETE FROM menu_items;

-- 1) Ensure roles exist
INSERT INTO roles (id, name, display_name, description, is_system)
VALUES
  (gen_random_uuid(), 'superadmin', 'Superadmin', 'Full access', TRUE),
  (gen_random_uuid(), 'admin', 'Admin', 'Admin access', TRUE),
  (gen_random_uuid(), 'main_dealer', 'Main Dealer', 'Main Dealer access', TRUE),
  (gen_random_uuid(), 'dealer', 'Dealer', 'Dealer access', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 2) Insert menus exactly as FE Layout list
INSERT INTO menu_items (id, name, display_name, path, icon, order_index, is_active)
VALUES
  (gen_random_uuid(), 'dashboard', 'Dashboard', '/dashboard', 'bi-speedometer2', 1, TRUE),
  (gen_random_uuid(), 'orders', 'Form Order In', '/orders', 'bi-journal-text', 2, TRUE),
  (gen_random_uuid(), 'finance', 'Peta & Finance', '/finance', 'bi-geo-alt', 3, TRUE),
  (gen_random_uuid(), 'credit', 'Credit Capability', '/credit', 'bi-credit-card', 4, TRUE),
  (gen_random_uuid(), 'quadrants', 'Kuadran', '/quadrants', 'bi-grid', 5, TRUE),
  (gen_random_uuid(), 'prices', 'Harga Pangan', '/prices', 'bi-cash-stack', 6, TRUE),
  (gen_random_uuid(), 'news', 'Portal Berita', '/news', 'bi-newspaper', 7, TRUE),
  (gen_random_uuid(), 'users', 'Users', '/users', 'bi-people', 90, TRUE),
  (gen_random_uuid(), 'roles', 'Roles & Access', '/roles', 'bi-shield-lock', 91, TRUE),
  (gen_random_uuid(), 'role_menu_access', 'Roles Menu Access', '/role-menu-access', 'bi-diagram-3', 92, TRUE),
  (gen_random_uuid(), 'menus', 'Menus', '/menus', 'bi-list-ul', 93, TRUE),
  (gen_random_uuid(), 'scrape_sources', 'Scrape URL', '/scrape-sources', 'bi-link-45deg', 94, TRUE)
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    order_index = EXCLUDED.order_index,
    is_active = TRUE;

-- 3) Assign menus per role
-- superadmin: all menus
INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menu_items m
WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;

-- admin: all menus except role_menu_access
INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menu_items m
WHERE r.name = 'admin'
  AND m.name <> 'role_menu_access'
ON CONFLICT DO NOTHING;

-- main dealer: dashboard + core operational menus (no admin menus)
INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
JOIN menu_items m ON m.name IN ('dashboard','orders','finance','credit','quadrants','prices','news')
WHERE r.name = 'main_dealer'
ON CONFLICT DO NOTHING;

-- dealer: Form Order In only
INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
JOIN menu_items m ON m.name = 'orders'
WHERE r.name = 'dealer'
ON CONFLICT DO NOTHING;
