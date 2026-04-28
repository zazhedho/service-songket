-- Align RBAC and menu data with the current SONGKET modules.

INSERT INTO roles (id, name, display_name, description, is_system) VALUES
    (gen_random_uuid(), 'admin', 'Administrator', 'Full system access', TRUE),
    (gen_random_uuid(), 'main_dealer', 'Main Dealer', 'Operational access for main dealer users', TRUE),
    (gen_random_uuid(), 'dealer', 'Dealer', 'Operational access for dealer users', TRUE)
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    deleted_at = NULL,
    updated_at = NOW();

WITH permission_data(name, display_name, resource, action) AS (
    VALUES
        ('assign_menus', 'Assign Menus', 'roles', 'assign_menus'),

        ('list_orders', 'List Orders', 'orders', 'list'),
        ('list_all_orders', 'List All Orders', 'orders', 'list_all'),
        ('view_orders', 'View Order Detail', 'orders', 'view'),
        ('create_orders', 'Create Orders', 'orders', 'create'),
        ('update_orders', 'Update Orders', 'orders', 'update'),
        ('update_all_orders', 'Update All Orders', 'orders', 'update_all'),
        ('delete_orders', 'Delete Orders', 'orders', 'delete'),
        ('delete_all_orders', 'Delete All Orders', 'orders', 'delete_all'),

        ('list_motor_types', 'List Motor Types', 'motor_types', 'list'),
        ('view_motor_types', 'View Motor Type Detail', 'motor_types', 'view'),
        ('create_motor_types', 'Create Motor Types', 'motor_types', 'create'),
        ('update_motor_types', 'Update Motor Types', 'motor_types', 'update'),
        ('delete_motor_types', 'Delete Motor Types', 'motor_types', 'delete'),

        ('list_installments', 'List Installments', 'installments', 'list'),
        ('view_installments', 'View Installment Detail', 'installments', 'view'),
        ('create_installments', 'Create Installments', 'installments', 'create'),
        ('update_installments', 'Update Installments', 'installments', 'update'),
        ('delete_installments', 'Delete Installments', 'installments', 'delete'),

        ('list_jobs', 'List Jobs', 'jobs', 'list'),
        ('view_jobs', 'View Job Detail', 'jobs', 'view'),
        ('create_jobs', 'Create Jobs', 'jobs', 'create'),
        ('update_jobs', 'Update Jobs', 'jobs', 'update'),
        ('delete_jobs', 'Delete Jobs', 'jobs', 'delete'),

        ('list_net_income', 'List Net Income', 'net_income', 'list'),
        ('view_net_income', 'View Net Income Detail', 'net_income', 'view'),
        ('create_net_income', 'Create Net Income', 'net_income', 'create'),
        ('update_net_income', 'Update Net Income', 'net_income', 'update'),
        ('delete_net_income', 'Delete Net Income', 'net_income', 'delete'),

        ('list_business', 'List Business References', 'business', 'list'),
        ('list_all_business', 'List All Business Data', 'business', 'list_all'),
        ('create_business', 'Create Business References', 'business', 'create'),
        ('update_business', 'Update Business References', 'business', 'update'),
        ('delete_business', 'Delete Business References', 'business', 'delete'),
        ('view_business_metrics', 'View Business Metrics', 'business', 'view_metrics'),
        ('view_metrics_all_business', 'View All Business Metrics', 'business', 'view_metrics_all'),

        ('list_finance_dealers', 'List Finance Dealers', 'finance', 'list_dealers'),
        ('view_finance_metrics', 'View Finance Metrics', 'finance', 'view_metrics'),

        ('list_credit', 'List Credit Capability', 'credit', 'list'),
        ('list_all_credit', 'List All Credit Analytics', 'credit', 'list_all'),
        ('upsert_credit', 'Create Or Update Credit Capability', 'credit', 'upsert'),

        ('list_quadrants', 'List Quadrants', 'quadrants', 'list'),
        ('recompute_quadrants', 'Recompute Quadrants', 'quadrants', 'recompute'),

        ('list_news', 'List News', 'news', 'list'),
        ('view_news', 'View Latest News', 'news', 'view'),
        ('upsert_news', 'Create Or Update News Sources', 'news', 'upsert'),
        ('upsert_news_source', 'Upsert News Source', 'news', 'upsert_source'),
        ('delete_news', 'Delete News Items', 'news', 'delete'),
        ('scrape_news', 'Scrape News', 'news', 'scrape'),

        ('add_commodity_price', 'Add Commodity Price', 'commodities', 'add_price'),
        ('list_commodities', 'List Commodity Prices', 'commodities', 'list'),
        ('list_prices', 'List Latest Prices', 'commodities', 'list_prices'),
        ('create_commodities', 'Create Commodity Prices', 'commodities', 'create'),
        ('upsert_commodities', 'Create Or Update Commodities', 'commodities', 'upsert'),
        ('delete_commodities', 'Delete Commodity Prices', 'commodities', 'delete'),
        ('scrape_commodities', 'Scrape Commodity Prices', 'commodities', 'scrape'),
        ('scrape_prices', 'Scrape Prices', 'commodities', 'scrape_prices'),

        ('view_master_settings', 'View Master Settings', 'master_settings', 'view'),
        ('create_master_settings', 'Create Master Settings', 'master_settings', 'create'),
        ('update_master_settings', 'Update Master Settings', 'master_settings', 'update'),
        ('delete_master_settings', 'Delete Master Settings', 'master_settings', 'delete'),

        ('list_scrape_sources', 'List Scrape Sources', 'scrape_sources', 'list'),
        ('create_scrape_sources', 'Create Scrape Sources', 'scrape_sources', 'create'),
        ('update_scrape_sources', 'Update Scrape Sources', 'scrape_sources', 'update'),
        ('delete_scrape_sources', 'Delete Scrape Sources', 'scrape_sources', 'delete')
)
INSERT INTO permissions (id, name, display_name, resource, action)
SELECT gen_random_uuid(), pd.name, pd.display_name, pd.resource, pd.action
FROM permission_data pd
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    deleted_at = NULL,
    updated_at = NOW();

DELETE FROM permissions
WHERE name IN (
    'assign_role_users',
    'view_user_permissions',
    'assign_user_permissions',
    'manage_system_roles'
);

DELETE FROM menu_items
WHERE name IN (
    'profile',
    'finance',
    'dealer',
    'net_income',
    'motor_types',
    'role_menu_access',
    'finance_report',
    'report_finance'
);

WITH menu_data(name, display_name, path, icon, order_index, is_active) AS (
    VALUES
        ('dashboard', 'Dashboard', '/dashboard', 'bi-speedometer2', 1, TRUE),
        ('orders', 'Order In', '/orders', 'bi-journal-text', 2, TRUE),
        ('business', 'Business', '/business', 'bi-briefcase', 3, TRUE),
        ('credit', 'Credit Capability', '/credit', 'bi-credit-card', 4, TRUE),
        ('quadrants', 'Quadrants', '/quadrants', 'bi-grid', 5, TRUE),
        ('prices', 'Commodity Prices', '/prices', 'bi-cash-stack', 6, TRUE),
        ('news', 'News Portal', '/news', 'bi-newspaper', 7, TRUE),
        ('jobs', 'Jobs & Net Income', '/jobs', 'bi-briefcase', 8, TRUE),
        ('installments', 'Motor Types & Installments', '/installments', 'bi-wallet2', 9, TRUE),
        ('users', 'Users', '/users', 'bi-people', 90, TRUE),
        ('roles', 'Roles & Access', '/roles', 'bi-shield-lock', 91, TRUE),
        ('menus', 'Menus', '/menus', 'bi-list-ul', 92, TRUE),
        ('scrape_sources', 'Scrape Sources', '/scrape-sources', 'bi-link-45deg', 93, TRUE),
        ('master_settings', 'Master Settings', '/master-settings', 'bi-sliders', 94, TRUE)
)
INSERT INTO menu_items (id, name, display_name, path, icon, order_index, is_active)
SELECT gen_random_uuid(), md.name, md.display_name, md.path, md.icon, md.order_index, md.is_active
FROM menu_data md
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    order_index = EXCLUDED.order_index,
    is_active = EXCLUDED.is_active,
    deleted_at = NULL,
    updated_at = NOW();

INSERT INTO master_settings (id, key, is_active, interval_minutes, description)
VALUES
    (
        gen_random_uuid(),
        'cron_scrape_news',
        FALSE,
        5,
        'Background scheduler configuration for news scraping.'
    ),
    (
        gen_random_uuid(),
        'cron_scrape_prices',
        FALSE,
        5,
        'Background scheduler configuration for commodity price scraping.'
    )
ON CONFLICT (key) DO UPDATE
SET is_active = EXCLUDED.is_active,
    interval_minutes = EXCLUDED.interval_minutes,
    description = EXCLUDED.description,
    deleted_at = NULL,
    updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('superadmin', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'view_dashboard',
    'view_profile',
    'update_profile',
    'update_password_profile',
    'delete_profile',
    'list_orders',
    'view_orders',
    'list_prices',
    'view_news',
    'create_orders',
    'update_orders',
    'delete_orders'
)
WHERE r.name = 'dealer'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'view_dashboard',
    'view_profile',
    'update_profile',
    'update_password_profile',
    'delete_profile',
    'list_orders',
    'list_all_orders',
    'create_orders',
    'update_orders',
    'update_all_orders',
    'delete_orders',
    'delete_all_orders',
    'view_orders',
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
    'list_finance_dealers',
    'view_finance_metrics',
    'list_credit',
    'upsert_credit',
    'list_quadrants',
    'recompute_quadrants',
    'list_news',
    'view_news',
    'upsert_news',
    'delete_news',
    'scrape_news',
    'list_commodities',
    'list_prices',
    'create_commodities',
    'upsert_commodities',
    'delete_commodities',
    'scrape_commodities'
)
WHERE r.name = 'main_dealer'
ON CONFLICT DO NOTHING;
