CREATE INDEX IF NOT EXISTS idx_orders_created_by_pooling_active
    ON orders(created_by, pooling_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_dealer_status_pooling_active
    ON orders(dealer_id, result_status, pooling_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_pooling_dealer_created_active
    ON orders(pooling_number, dealer_id, created_at, id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_order_finance_attempts_order_attempt_latest
    ON order_finance_attempts(order_id, attempt_no, created_at DESC, id DESC)
    INCLUDE (finance_company_id, status, notes);

CREATE INDEX IF NOT EXISTS idx_order_finance_attempts_attempt_finance_order
    ON order_finance_attempts(attempt_no, finance_company_id, order_id)
    INCLUDE (status);

CREATE INDEX IF NOT EXISTS idx_order_finance_attempts_attempt_status_order
    ON order_finance_attempts(attempt_no, status, order_id)
    INCLUDE (finance_company_id);

CREATE INDEX IF NOT EXISTS idx_installments_motor_type_latest_active
    ON installments(motor_type_id, updated_at DESC, created_at DESC)
    INCLUDE (amount)
    WHERE deleted_at IS NULL;
