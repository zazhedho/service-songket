const DEFAULT_FILTER_START_YEAR = 2024

export function buildFilterYearOptions(
  startYear = DEFAULT_FILTER_START_YEAR,
  endYear = new Date().getFullYear(),
) {
  const safeStartYear = Math.trunc(startYear)
  const safeEndYear = Math.max(Math.trunc(endYear), safeStartYear)
  const years: string[] = []

  for (let year = safeEndYear; year >= safeStartYear; year -= 1) {
    years.push(String(year))
  }

  return years
}

export function buildMonthOptions(locale = 'en-US') {
  return Array.from({ length: 12 }, (_, idx) => ({
    value: String(idx + 1),
    label: new Date(2000, idx, 1).toLocaleString(locale, { month: 'long' }),
  }))
}
