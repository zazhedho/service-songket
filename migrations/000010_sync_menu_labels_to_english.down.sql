-- Revert English menu labels to previous labels.

WITH menu_data(name, display_name, path, icon, order_index, is_active) AS (
  VALUES
    ('dashboard', 'Dashboard', '/dashboard', 'bi-speedometer2', 1, TRUE),
    ('orders', 'Form Order In', '/orders', 'bi-journal-text', 2, TRUE),
    ('finance', 'Peta & Finance', '/finance', 'bi-geo-alt', 3, TRUE),
    ('credit', 'Credit Capability', '/credit', 'bi-credit-card', 4, TRUE),
    ('quadrants', 'Kuadran', '/quadrants', 'bi-grid', 5, TRUE),
    ('prices', 'Harga Pangan', '/prices', 'bi-cash-stack', 6, TRUE),
    ('news', 'Portal Berita', '/news', 'bi-newspaper', 7, TRUE),
    ('jobs', 'Jobs & Net Income', '/jobs', 'bi-briefcase', 8, TRUE),
    ('installments', 'Motor Types & Installments', '/installments', 'bi-wallet2', 9, TRUE),
    ('users', 'Users', '/users', 'bi-people', 90, TRUE),
    ('roles', 'Roles & Access', '/roles', 'bi-shield-lock', 91, TRUE),
    ('role_menu_access', 'Roles Menu Access', '/role-menu-access', 'bi-diagram-3', 92, TRUE),
    ('menus', 'Menus', '/menus', 'bi-list-ul', 93, TRUE),
    ('scrape_sources', 'Scrape URL', '/scrape-sources', 'bi-link-45deg', 94, TRUE),
    ('master_settings', 'Master Setting', '/master-settings', 'bi-sliders', 95, TRUE)
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
