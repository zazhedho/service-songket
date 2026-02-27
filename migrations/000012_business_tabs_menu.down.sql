-- Rollback business-only menu mode.

UPDATE menu_items
SET is_active = TRUE,
    updated_at = NOW()
WHERE path IN ('/dealer', '/finance', '/finance-report')
   OR name IN ('dealer', 'finance', 'finance_report', 'report_finance');

INSERT INTO role_menus (id, role_id, menu_item_id)
SELECT gen_random_uuid(), r.id, m.id
FROM roles r
JOIN menu_items m ON m.name IN ('dealer', 'finance')
WHERE r.name IN ('superadmin', 'admin', 'main_dealer')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;
