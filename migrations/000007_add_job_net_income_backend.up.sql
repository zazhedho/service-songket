-- Add backend support for separate Jobs and Net Income resources.

DO $$
BEGIN
  IF to_regclass('public.jobs') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS job_net_incomes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL UNIQUE,
      net_income NUMERIC(18,2) NOT NULL DEFAULT 0,
      area_net_income JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP,
      deleted_at TIMESTAMP,
      CONSTRAINT fk_job_net_incomes_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_job_net_incomes_deleted_at ON job_net_incomes(deleted_at);
  END IF;
END $$;

-- Cleanup legacy combined feature entries if present.
DELETE FROM role_menus
WHERE menu_item_id IN (SELECT id FROM menu_items WHERE name = 'job_net_income');

DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id FROM permissions WHERE name IN (
    'list_job_net_income',
    'view_job_net_income',
    'create_job_net_income',
    'update_job_net_income',
    'delete_job_net_income'
  )
);

DELETE FROM menu_items WHERE name = 'job_net_income';
DELETE FROM permissions WHERE name IN (
  'list_job_net_income',
  'view_job_net_income',
  'create_job_net_income',
  'update_job_net_income',
  'delete_job_net_income'
);

-- Legacy schema cleanup from old approach (if columns existed on jobs).
ALTER TABLE IF EXISTS jobs DROP COLUMN IF EXISTS area_net_income;
ALTER TABLE IF EXISTS jobs DROP COLUMN IF EXISTS net_income;

-- Upsert permissions for Jobs + Net Income.
WITH perm_data(name, display_name, resource, action) AS (
  VALUES
    ('list_jobs', 'List Jobs', 'jobs', 'list'),
    ('view_jobs', 'View Jobs', 'jobs', 'view'),
    ('create_jobs', 'Create Jobs', 'jobs', 'create'),
    ('update_jobs', 'Update Jobs', 'jobs', 'update'),
    ('delete_jobs', 'Delete Jobs', 'jobs', 'delete'),
    ('list_net_income', 'List Net Income', 'net_income', 'list'),
    ('view_net_income', 'View Net Income', 'net_income', 'view'),
    ('create_net_income', 'Create Net Income', 'net_income', 'create'),
    ('update_net_income', 'Update Net Income', 'net_income', 'update'),
    ('delete_net_income', 'Delete Net Income', 'net_income', 'delete')
)
INSERT INTO permissions (id, name, display_name, resource, action)
SELECT gen_random_uuid(), pd.name, pd.display_name, pd.resource, pd.action
FROM perm_data pd
ON CONFLICT (name)
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  deleted_at = NULL,
  updated_at = NOW();

-- Upsert menu items.
WITH menu_data(name, display_name, path, icon, order_index) AS (
  VALUES
    ('jobs', 'Nama Pekerjaan', '/jobs', 'bi-briefcase', 8),
    ('net_income', 'Net Income', '/net-income', 'bi-cash-coin', 9)
)
INSERT INTO menu_items (id, name, display_name, path, icon, order_index, is_active)
SELECT gen_random_uuid(), md.name, md.display_name, md.path, md.icon, md.order_index, TRUE
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

-- Ensure permission access only for main_dealer + superadmin.
DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id FROM permissions WHERE name IN (
    'list_jobs',
    'view_jobs',
    'create_jobs',
    'update_jobs',
    'delete_jobs',
    'list_net_income',
    'view_net_income',
    'create_net_income',
    'update_net_income',
    'delete_net_income'
  )
)
AND role_id IN (
  SELECT id FROM roles WHERE name NOT IN ('main_dealer', 'superadmin')
);

INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'list_jobs',
  'view_jobs',
  'create_jobs',
  'update_jobs',
  'delete_jobs',
  'list_net_income',
  'view_net_income',
  'create_net_income',
  'update_net_income',
  'delete_net_income'
)
WHERE r.name IN ('main_dealer', 'superadmin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ensure menu access only for main_dealer + superadmin.
DELETE FROM role_menus
WHERE menu_item_id IN (
  SELECT id FROM menu_items WHERE name IN ('jobs', 'net_income')
)
AND role_id IN (
  SELECT id FROM roles WHERE name NOT IN ('main_dealer', 'superadmin')
);

INSERT INTO role_menus (id, role_id, menu_item_id)
SELECT gen_random_uuid(), r.id, m.id
FROM roles r
JOIN menu_items m ON m.name IN ('jobs', 'net_income')
WHERE r.name IN ('main_dealer', 'superadmin')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;
