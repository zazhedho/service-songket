-- Rollback backend support for separate Jobs and Net Income resources.

DELETE FROM role_menus
WHERE menu_item_id IN (
  SELECT id FROM menu_items WHERE name IN ('jobs', 'net_income')
);

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
);

DELETE FROM menu_items WHERE name IN ('jobs', 'net_income');

DELETE FROM permissions WHERE name IN (
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
);

DROP TABLE IF EXISTS job_net_incomes;
