export type Theme = 'dark' | 'light';
const key = 'finance-tracker-theme';
export function getTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f8fafc');
  try { localStorage.setItem(key, theme); } catch { /* Theme still works if browser storage is unavailable. */ }
}
let initial: Theme = 'dark';
try { if (localStorage.getItem(key) === 'light') initial = 'light'; } catch { /* Use dark mode by default. */ }
setTheme(initial);
