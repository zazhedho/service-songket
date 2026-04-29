CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS dealers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    regency TEXT,
    province TEXT,
    district TEXT,
    village TEXT,
    phone TEXT,
    address TEXT,
    lat NUMERIC,
    lng NUMERIC,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS user_dealer_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    dealer_id UUID NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_dealer_access_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_dealer_access_dealer
        FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_dealer_access UNIQUE (user_id, dealer_id)
);

CREATE INDEX IF NOT EXISTS idx_user_dealer_access_user_id ON user_dealer_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dealer_access_dealer_id ON user_dealer_access(dealer_id);

CREATE TABLE IF NOT EXISTS finance_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    province TEXT,
    regency TEXT,
    district TEXT,
    village TEXT,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS motor_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    variant_type TEXT,
    otr NUMERIC(18,2) NOT NULL DEFAULT 0,
    province_code TEXT,
    province_name TEXT,
    regency_code TEXT,
    regency_name TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    motor_type_id UUID NOT NULL,
    amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT fk_installments_motor_type
        FOREIGN KEY (motor_type_id) REFERENCES motor_types(id)
);

CREATE TABLE IF NOT EXISTS job_net_incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    net_income NUMERIC(18,2) NOT NULL DEFAULT 0,
    area_net_income JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT fk_job_net_incomes_job
        FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pooling_number TEXT NOT NULL,
    pooling_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    result_at TIMESTAMP WITHOUT TIME ZONE,
    dealer_id UUID NOT NULL,
    consumer_name TEXT NOT NULL,
    consumer_phone TEXT NOT NULL,
    province TEXT,
    regency TEXT,
    district TEXT,
    village TEXT,
    address TEXT,
    job_id UUID,
    motor_type_id UUID,
    installment NUMERIC(18,2) NOT NULL DEFAULT 0,
    otr NUMERIC(18,2) NOT NULL DEFAULT 0,
    dp_gross NUMERIC(18,2) NOT NULL DEFAULT 0,
    dp_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
    dp_pct NUMERIC(18,2) NOT NULL DEFAULT 0,
    tenor BIGINT NOT NULL DEFAULT 0,
    result_status TEXT,
    result_notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT fk_orders_dealer
        FOREIGN KEY (dealer_id) REFERENCES dealers(id),
    CONSTRAINT fk_orders_job
        FOREIGN KEY (job_id) REFERENCES jobs(id),
    CONSTRAINT fk_orders_motor_type
        FOREIGN KEY (motor_type_id) REFERENCES motor_types(id)
);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS installment NUMERIC(18,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS order_finance_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    finance_company_id UUID NOT NULL,
    attempt_no BIGINT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_orders_attempts
        FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_order_finance_attempts_finance_company
        FOREIGN KEY (finance_company_id) REFERENCES finance_companies(id)
);

CREATE TABLE IF NOT EXISTS credit_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province TEXT,
    regency TEXT,
    district TEXT,
    village TEXT,
    address TEXT,
    job_id UUID,
    score NUMERIC(18,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_credit_capabilities_job
        FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE IF NOT EXISTS quadrants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regency TEXT,
    job_id UUID,
    quadrant BIGINT NOT NULL DEFAULT 0,
    order_count BIGINT NOT NULL DEFAULT 0,
    credit_score NUMERIC(18,2) NOT NULL DEFAULT 0,
    computed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT fk_quadrants_job
        FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE IF NOT EXISTS commodities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    unit TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS commodity_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id UUID,
    price NUMERIC(18,2) NOT NULL DEFAULT 0,
    collected_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    source_url TEXT,
    CONSTRAINT fk_commodity_prices_commodity
        FOREIGN KEY (commodity_id) REFERENCES commodities(id)
);

CREATE TABLE IF NOT EXISTS news_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS news_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID,
    source_name TEXT,
    title TEXT,
    content TEXT,
    images JSONB NOT NULL DEFAULT '{}'::jsonb,
    url TEXT,
    category TEXT,
    published_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_news_items_source
        FOREIGN KEY (source_id) REFERENCES news_sources(id)
);

CREATE TABLE IF NOT EXISTS master_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    interval_minutes BIGINT NOT NULL DEFAULT 5,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS master_setting_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_id UUID NOT NULL,
    key TEXT NOT NULL,
    previous_is_active BOOLEAN NOT NULL DEFAULT FALSE,
    previous_interval_minutes BIGINT NOT NULL DEFAULT 1,
    new_is_active BOOLEAN NOT NULL DEFAULT FALSE,
    new_interval_minutes BIGINT NOT NULL DEFAULT 1,
    changed_by_user_id UUID,
    changed_by_name TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT fk_master_setting_histories_setting
        FOREIGN KEY (setting_id) REFERENCES master_settings(id)
);

CREATE TABLE IF NOT EXISTS scrape_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    url TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'prices',
    category TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(20),
    message TEXT,
    source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITHOUT TIME ZONE,
    finished_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS scrape_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID,
    commodity_name TEXT,
    price NUMERIC(18,2) NOT NULL DEFAULT 0,
    unit TEXT,
    source_url TEXT,
    scraped_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    raw JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_permissions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_permissions UNIQUE (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_dealers_deleted_at ON dealers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_finance_companies_deleted_at ON finance_companies(deleted_at);
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON jobs(deleted_at);

CREATE INDEX IF NOT EXISTS idx_motor_types_deleted_at ON motor_types(deleted_at);
CREATE INDEX IF NOT EXISTS idx_motor_types_province_code ON motor_types(province_code);
CREATE INDEX IF NOT EXISTS idx_motor_types_regency_code ON motor_types(regency_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_motor_types_area_identity
    ON motor_types (
        COALESCE(LOWER(name), ''),
        COALESCE(LOWER(brand), ''),
        COALESCE(LOWER(model), ''),
        COALESCE(LOWER(variant_type), ''),
        COALESCE(province_code, ''),
        COALESCE(regency_code, '')
    )
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_installments_deleted_at ON installments(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_installments_motor_type_unique_active
    ON installments(motor_type_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_net_incomes_deleted_at ON job_net_incomes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_job_net_incomes_job_id ON job_net_incomes(job_id);
CREATE INDEX IF NOT EXISTS idx_job_net_incomes_job_latest_active
    ON job_net_incomes(job_id, updated_at DESC, created_at DESC, id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_order_finance_attempts_order_id ON order_finance_attempts(order_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_regency_job ON credit_capabilities(regency, job_id);
CREATE INDEX IF NOT EXISTS idx_quadrants_deleted_at ON quadrants(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quadrant_regency_job ON quadrants(regency, job_id);

CREATE INDEX IF NOT EXISTS idx_commodities_deleted_at ON commodities(deleted_at);
CREATE INDEX IF NOT EXISTS idx_commodity_prices_commodity_id ON commodity_prices(commodity_id);
CREATE INDEX IF NOT EXISTS idx_commodity_prices_collected_at ON commodity_prices(collected_at);

CREATE INDEX IF NOT EXISTS idx_news_sources_deleted_at ON news_sources(deleted_at);
CREATE INDEX IF NOT EXISTS idx_news_items_source_id ON news_items(source_id);
CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON news_items(published_at);

CREATE INDEX IF NOT EXISTS idx_master_settings_deleted_at ON master_settings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_master_setting_histories_setting_id ON master_setting_histories(setting_id);
CREATE INDEX IF NOT EXISTS idx_master_setting_histories_key ON master_setting_histories(key);
CREATE INDEX IF NOT EXISTS idx_master_setting_histories_changed_by_user_id ON master_setting_histories(changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_master_setting_histories_deleted_at ON master_setting_histories(deleted_at);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_results_job_id ON scrape_results(job_id);
