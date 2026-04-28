DELETE FROM master_setting_histories
WHERE key IN ('cron_scrape_news', 'cron_scrape_prices');

DELETE FROM master_settings
WHERE key IN ('cron_scrape_news', 'cron_scrape_prices');

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


DELETE FROM permissions
WHERE name IN (
    'list_orders',
    'list_all_orders',
    'create_orders',
    'update_orders',
    'update_all_orders',
    'delete_orders',
    'delete_all_orders',
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
    'list_business',
    'list_all_business',
    'create_business',
    'update_business',
    'delete_business',
    'view_business_metrics',
    'view_metrics_all_business',
    'list_credit',
    'list_all_credit',
    'upsert_credit',
    'list_quadrants',
    'recompute_quadrants',
    'list_news',
    'upsert_news',
    'delete_news',
    'scrape_news',
    'list_commodities',
    'create_commodities',
    'upsert_commodities',
    'delete_commodities',
    'scrape_commodities',
    'view_master_settings',
    'create_master_settings',
    'update_master_settings',
    'delete_master_settings',
    'list_scrape_sources',
    'create_scrape_sources',
    'update_scrape_sources',
    'delete_scrape_sources'
);

DELETE FROM roles
WHERE name IN ('main_dealer', 'dealer');
