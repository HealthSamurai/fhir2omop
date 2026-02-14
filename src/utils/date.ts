/** Parse a FHIR date string (YYYY, YYYY-MM, or YYYY-MM-DD) into components */
export function parseFhirDate(date: string): {
  year: number;
  month: number | null;
  day: number | null;
} {
  const parts = date.split("-");
  return {
    year: parseInt(parts[0], 10),
    month: parts.length >= 2 ? parseInt(parts[1], 10) : null,
    day: parts.length >= 3 ? parseInt(parts[2], 10) : null,
  };
}

/** Build an ISO datetime string with padding for partial dates */
export function toBirthDatetime(date: string): string {
  const { year, month, day } = parseFhirDate(date);
  const m = String(month ?? 1).padStart(2, "0");
  const d = String(day ?? 1).padStart(2, "0");
  return `${year}-${m}-${d}T00:00:00`;
}

/** Extract ISO date (YYYY-MM-DD) from a FHIR dateTime string */
export function toDate(datetime: string): string {
  return datetime.substring(0, 10);
}
