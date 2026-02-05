-- Align menu items with SONGKET requirements (Dealer/Main Dealer/Superadmin)
-- Creates missing roles, upserts menus, and assigns menu access per role.

-- 1) Ensure roles exist
INSERT INTO roles (id, name, display_name, description, is_system)
VALUES
  (gen_random_uuid(), 'dealer', 'Dealer', 'Dealer role (Form Order In only)', TRUE),
  (gen_random_uuid(), 'main_dealer', 'Main Dealer', 'Main Dealer role', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 2) Upsert menu items used by FE
WITH menu_data(name, display_name, path, icon, order_index) AS (
  VALUES
    ('dashboard', 'Dashboard', '/dashboard', 'bi-speedometer2', 1),
    ('orders', 'Form Order In', '/orders', 'bi-journal-text', 2),
    ('finance', 'Finance Map', '/finance', 'bi-geo-alt', 3),
    ('credit', 'Credit Capabilities', '/credit', 'bi-credit-card', 4),
    ('quadrants', 'Kuadran', '/quadrants', 'bi-grid', 5),
    ('prices', 'Harga Pangan', '/prices', 'bi-cash-stack', 6),
    ('news', 'Portal Berita', '/news', 'bi-newspaper', 7),
    ('role_menu_access', 'Roles Menu Access', '/role-menu-access', 'bi-diagram-3', 90),
    ('users', 'Users', '/users', 'bi-people', 91),
    ('roles', 'Roles', '/roles', 'bi-shield-lock', 92),
    ('menus', 'Menus', '/menus', 'bi-list-ul', 93)
)
INSERT INTO menu_items (id, name, display_name, path, icon, order_index, is_active)
SELECT gen_random_uuid(), md.name, md.display_name, md.path, md.icon, md.order_index, TRUE
FROM menu_data md
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    order_index = EXCLUDED.order_index,
    is_active = TRUE;

-- 3) Reset menu mapping for dealer & main dealer, then re-assign per requirement
WITH role_ids AS (
  SELECT id, name FROM roles WHERE name IN ('dealer', 'main_dealer')
)
DELETE FROM role_menus WHERE role_id IN (SELECT id FROM role_ids);

-- Assign Dealer: Form Order In only
INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
JOIN menu_items m ON m.name = 'orders'
WHERE r.name = 'dealer'
ON CONFLICT DO NOTHING;

-- Assign Main Dealer: Order, finance map, credit, quadrants, prices, news, dashboard
INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
JOIN menu_items m ON m.name IN ('orders','finance','credit','quadrants','prices','news','dashboard')
WHERE r.name = 'main_dealer'
ON CONFLICT DO NOTHING;

-- 4) Ensure superadmin gets all active menus (including new ones)
INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menu_items m
WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;
