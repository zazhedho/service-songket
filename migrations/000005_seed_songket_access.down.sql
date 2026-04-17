DELETE FROM master_setting_histories
WHERE key IN ('cron_scrape_news', 'cron_scrape_prices');

DELETE FROM master_settings
WHERE key IN ('cron_scrape_news', 'cron_scrape_prices');

DELETE FROM role_menus;

DELETE FROM menu_items
WHERE name IN (
    'orders',
    'business',
    'credit',
    'quadrants',
    'prices',
    'news',
    'jobs',
    'installments',
    'scrape_sources',
    'master_settings'
);

INSERT INTO menu_items (id, name, display_name, path, icon, order_index, is_active)
VALUES
    (gen_random_uuid(), 'dashboard', 'Dashboard', '/dashboard', 'bi-speedometer2', 1, TRUE),
    (gen_random_uuid(), 'profile', 'Profile', '/profile', 'bi-person-circle', 2, TRUE),
    (gen_random_uuid(), 'users', 'Users', '/users', 'bi-people', 900, TRUE),
    (gen_random_uuid(), 'roles', 'Roles', '/roles', 'bi-shield-lock', 901, TRUE),
    (gen_random_uuid(), 'menus', 'Menus', '/menus', 'bi-list-ul', 902, TRUE)
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    order_index = EXCLUDED.order_index,
    is_active = EXCLUDED.is_active,
    deleted_at = NULL,
    updated_at = NOW();

INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menu_items m
WHERE r.name = 'superadmin'
  AND m.name IN ('dashboard', 'profile', 'users', 'roles', 'menus')
ON CONFLICT DO NOTHING;

INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menu_items m
WHERE r.name = 'admin'
  AND m.name IN ('dashboard', 'profile', 'users', 'roles', 'menus')
ON CONFLICT DO NOTHING;

INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menu_items m
WHERE r.name = 'staff'
  AND m.name IN ('dashboard', 'profile')
ON CONFLICT DO NOTHING;

INSERT INTO role_menus (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menu_items m
WHERE r.name = 'viewer'
  AND m.name IN ('dashboard', 'profile')
ON CONFLICT DO NOTHING;

DELETE FROM permissions
WHERE name IN (
    'list_orders',
    'create_orders',
    'update_orders',
    'delete_orders',
    'list_motor_types',
    'view_motor_types',
    'create_motor_types',
    'update_motor_types',
    'delete_motor_types',
    'list_installments',
    'view_installments',
    'create_installments',
    'update_installments',
    'delete_installments',
    'list_jobs',
    'view_jobs',
    'create_jobs',
    'update_jobs',
    'delete_jobs',
    'list_net_income',
    'view_net_income',
    'create_net_income',
    'update_net_income',
    'delete_net_income',
    'list_finance_dealers',
    'view_finance_metrics',
    'list_credit',
    'upsert_credit',
    'list_quadrants',
    'recompute_quadrants',
    'view_news',
    'upsert_news_sources',
    'scrape_news',
    'list_commodity_prices',
    'upsert_commodities',
    'add_commodity_price',
    'scrape_commodity_prices',
    'list_scrape_sources',
    'create_scrape_sources',
    'update_scrape_sources',
    'delete_scrape_sources'
);

DELETE FROM roles
WHERE name IN ('member', 'main_dealer', 'dealer');
