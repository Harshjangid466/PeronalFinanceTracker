export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
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
    maximumFractionDigits: 0,
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
  d.setMonth(d.getMonth() + months);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function addYears(iso: string, years: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setFullYear(d.getFullYear() + years);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

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
