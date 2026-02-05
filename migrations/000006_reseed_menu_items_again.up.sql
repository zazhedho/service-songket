-- Reseed menu_items and role_menus to match FE layout (idempotent)

-- 1) Ensure roles exist
INSERT INTO roles (id, name, display_name, description, is_system)
VALUES
  (gen_random_uuid(), 'superadmin', 'Superadmin', 'Full access', TRUE),
  (gen_random_uuid(), 'admin', 'Admin', 'Admin access', TRUE),
  (gen_random_uuid(), 'main_dealer', 'Main Dealer', 'Main Dealer access', TRUE),
  (gen_random_uuid(), 'dealer', 'Dealer', 'Dealer access', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 2) Upsert menu items according to FE layout
WITH menu_data(name, display_name, path, icon, order_index) AS (
  VALUES
    ('dashboard', 'Dashboard', '/dashboard', 'bi-speedometer2', 1),
    ('orders', 'Form Order In', '/orders', 'bi-journal-text', 2),
    ('finance', 'Peta & Finance', '/finance', 'bi-geo-alt', 3),
    ('credit', 'Credit Capability', '/credit', 'bi-credit-card', 4),
    ('quadrants', 'Kuadran', '/quadrants', 'bi-grid', 5),
    ('prices', 'Harga Pangan', '/prices', 'bi-cash-stack', 6),
    ('news', 'Portal Berita', '/news', 'bi-newspaper', 7),
    ('users', 'Users', '/users', 'bi-people', 90),
    ('roles', 'Roles & Access', '/roles', 'bi-shield-lock', 91),
    ('role_menu_access', 'Roles Menu Access', '/role-menu-access', 'bi-diagram-3', 92),
    ('menus', 'Menus', '/menus', 'bi-list-ul', 93),
    ('scrape_sources', 'Scrape URL', '/scrape-sources', 'bi-link-45deg', 94)
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

-- 3) Reset role_menus for target roles then re-assign
DELETE FROM role_menus WHERE role_id IN (SELECT id FROM roles WHERE name IN ('superadmin','admin','main_dealer','dealer'));

-- superadmin: all menus
INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menu_items m
WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;

-- admin: all menus except role_menu_access (khusus superadmin)
INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menu_items m
WHERE r.name = 'admin'
  AND m.name <> 'role_menu_access'
ON CONFLICT DO NOTHING;

-- main dealer: dashboard + operasional (tanpa admin)
INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
JOIN menu_items m ON m.name IN ('dashboard','orders','finance','credit','quadrants','prices','news')
WHERE r.name = 'main_dealer'
ON CONFLICT DO NOTHING;

-- dealer: Form Order In saja
INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
JOIN menu_items m ON m.name = 'orders'
WHERE r.name = 'dealer'
ON CONFLICT DO NOTHING;
