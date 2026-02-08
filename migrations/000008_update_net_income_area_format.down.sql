-- Revert job_net_incomes.area_net_income to legacy array of strings (regency name/code).

DO $$
BEGIN
  IF to_regclass('public.job_net_incomes') IS NOT NULL THEN
    UPDATE job_net_incomes jni
    SET area_net_income = COALESCE((
      SELECT jsonb_agg(
        to_jsonb(
          CASE
            WHEN jsonb_typeof(elem) = 'string' THEN trim(both '"' from elem::text)
            WHEN jsonb_typeof(elem) = 'object' THEN COALESCE(NULLIF(elem->>'regency_name', ''), NULLIF(elem->>'regency_code', ''), '')
            ELSE ''
          END
        )
      )
      FROM jsonb_array_elements(COALESCE(jni.area_net_income, '[]'::jsonb)) elem
      WHERE jsonb_typeof(elem) IN ('string', 'object')
    ), '[]'::jsonb)
    WHERE jni.area_net_income IS NOT NULL;
  END IF;
END $$;
