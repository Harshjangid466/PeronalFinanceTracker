export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  notation: amount >= 10000000 ? 'compact' : 'standard',
    compactDisplay: 'short',
  maximumSignificantDigits: amount >= 10000000 ? 3 : undefined,
  }).format(amount);
  return formatted;
}

export function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  notation: 'standard',
  }).format(amount);
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function isSameDay(iso: string): boolean {
  return iso === todayISO();
}

export function isSameMonth(iso: string): boolean {
  const today = todayISO();
  return iso.slice(0, 7) === today.slice(0, 7);
}

export function daysFromToday(iso: string): number {
  const today = new Date(todayISO() + 'T00:00:00');
  const target = new Date(iso + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso + 'T00:00:00');
  const day=d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  d.setDate(Math.min(day,lastDay));
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function addYears(iso: string, years: number): string { return addMonths(iso,years*12); }

export function toPaise(rupees: number): number {
  return Math.round((Number(rupees) || 0) * 100);
}

export function toRupees(paise: number): number {
  return (Number(paise) || 0) / 100;
}

export function getMonthStart(iso: string = todayISO()): string {
  return iso.slice(0, 7) + '-01';
}

export function getPreviousMonthStart(iso: string = todayISO()): string {
  return addMonths(iso.slice(0, 7) + '-01', -1);
}

export function getYearStart(iso: string = todayISO()): string {
  return iso.slice(0, 4) + '-01-01';
}

/**
 * Largest Remainder Method (Hare-Niemeyer / Hamilton Method)
 * Distributes percentages so that the integer values add up to exactly 100%.
 * If total is 0, returns an array of zeros.
 */
export function allocatePercentages(values: number[]): number[] {
  const total = values.reduce((sum, v) => sum + (v > 0 ? v : 0), 0);
  if (total <= 0) return values.map(() => 0);

  const exact = values.map((v) => (v > 0 ? (v / total) * 100 : 0));
  const integerParts = exact.map((e) => Math.floor(e));
  const sumFloors = integerParts.reduce((a, b) => a + b, 0);
  const remainder = 100 - sumFloors;

  // Rank by largest fractional part
  const fractions = exact.map((e, idx) => ({ idx, fraction: e - integerParts[idx] }));
  fractions.sort((a, b) => b.fraction - a.fraction);

  const result = [...integerParts];
  for (let i = 0; i < remainder && i < fractions.length; i++) {
    result[fractions[i].idx] += 1;
  }

  return result;
}

export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
