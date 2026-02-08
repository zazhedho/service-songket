-- Normalize job_net_incomes.area_net_income into structured objects:
-- [{province_code, province_name, regency_code, regency_name}, ...]

DO $$
BEGIN
  IF to_regclass('public.job_net_incomes') IS NOT NULL THEN
    UPDATE job_net_incomes jni
    SET area_net_income = COALESCE((
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'string' THEN
            jsonb_build_object(
              'province_code', '',
              'province_name', '',
              'regency_code', trim(both '"' from elem::text),
              'regency_name', trim(both '"' from elem::text)
            )
          WHEN jsonb_typeof(elem) = 'object' THEN
            jsonb_build_object(
              'province_code', COALESCE(elem->>'province_code', ''),
              'province_name', COALESCE(elem->>'province_name', ''),
              'regency_code', COALESCE(NULLIF(elem->>'regency_code', ''), elem->>'regency_name', ''),
              'regency_name', COALESCE(NULLIF(elem->>'regency_name', ''), elem->>'regency_code', '')
            )
          ELSE NULL
        END
      )
      FROM jsonb_array_elements(COALESCE(jni.area_net_income, '[]'::jsonb)) elem
      WHERE jsonb_typeof(elem) IN ('string', 'object')
    ), '[]'::jsonb)
    WHERE jni.area_net_income IS NOT NULL;
  END IF;
END $$;
