-- Rollback split menu changes for Business/Dealer/Finance.

DELETE FROM role_menus
WHERE menu_item_id IN (
  SELECT id FROM menu_items WHERE name IN ('business', 'dealer')
);

DELETE FROM menu_items
WHERE name IN ('business', 'dealer');

UPDATE menu_items
SET display_name = 'Finance',
    path = '/finance',
    icon = 'bi-geo-alt',
    order_index = 3,
    parent_id = NULL,
    is_active = TRUE,
    deleted_at = NULL,
    updated_at = NOW()
WHERE name = 'finance';

UPDATE menu_items
SET is_active = TRUE,
    updated_at = NOW()
WHERE path = '/finance-report'
   OR name IN ('finance_report', 'report_finance');
