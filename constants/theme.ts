// ─── Professional HR Theme System ──────────────────────────────────────────
// Синхронизировано с Desktop/office веб-версией
// Dark theme: Deep Navy + Sky Blue — corporate HR platform aesthetic
// Light theme: Clean Light Blue + Blue accents

export type ThemeMode = 'dark' | 'light';

// ── Dark Theme (Deep Navy + Sky Blue) ─────────────────────────────────────────
// Соответствует .dark в globals.css веб-версии
export const DarkColors = {
  // Primary accent — bright blue (from web: --primary: #3b82f6)
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',

  // Secondary accent
  secondary: '#0d1e38',
  secondaryLight: '#93c5fd',
  secondaryDark: '#1d4ed8',

  // Accent cyan (from web: --accent: #38bdf8)
  accent: '#38bdf8',
  accentLight: '#7dd3fc',
  accentDark: '#0ea5e9',

  // Backgrounds — deep navy (from web: --background: #060e1e, --card: #0d1e38)
  bg: '#060e1e',
  bgCard: '#0d1e38',
  bgElevated: '#112344',
  bgMuted: '#0d1e38',
  bgSubtle: '#0d1e38',

  // Text (from web: --text-primary: #e8f0fe, --text-muted: #7ab3f5)
  textPrimary: '#e8f0fe',
  textSecondary: '#bdd4fa',
  textMuted: '#7ab3f5',
  textDisabled: '#2d5a9e',

  // Status (from web: --success: #34d399, --warning: #fbbf24, --destructive: #f87171)
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#3b82f6',

  // Leave status
  approved: '#34d399',
  pending: '#fbbf24',
  rejected: '#f87171',

  // Borders (from web: --border: #1a3460)
  border: '#1a3460',
  borderLight: '#2d5a9e',
  borderSubtle: '#0d1e38',

  // Leave type colors
  leaveTypes: {
    annual: '#3b82f6',
    sick: '#f87171',
    personal: '#60a5fa',
    unpaid: '#7ab3f5',
  },
};

// ── Light Theme (Clean Light Blue + Blue) ─────────────────────────────────────
// Соответствует :root в globals.css веб-версии
export const LightColors = {
  // Primary accent — blue (from web: --primary: #2563eb)
  primary: '#2563eb',
  primaryLight: '#60a5fa',
  primaryDark: '#1d4ed8',

  // Secondary accent (from web: --secondary: #e8f0fe)
  secondary: '#e8f0fe',
  secondaryLight: '#dbeafe',
  secondaryDark: '#1e3a6e',

  // Accent cyan (from web: --accent: #0ea5e9)
  accent: '#0ea5e9',
  accentLight: '#38bdf8',
  accentDark: '#0284c7',

  // Backgrounds — light blue tint (from web: --background: #f0f6ff, --card: #ffffff)
  bg: '#f0f6ff',
  bgCard: '#ffffff',
  bgElevated: '#f0f6ff',
  bgMuted: '#e8f0fe',
  bgSubtle: '#e8f0fe',

  // Text (from web: --text-primary: #0c1a2e, --text-muted: #4a6fa5)
  textPrimary: '#0c1a2e',
  textSecondary: '#1e3a6e',
  textMuted: '#4a6fa5',
  textDisabled: '#93bef7',

  // Status (from web: --success: #10b981, --warning: #f59e0b, --destructive: #ef4444)
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#2563eb',

  // Leave status
  approved: '#10b981',
  pending: '#f59e0b',
  rejected: '#ef4444',

  // Borders (from web: --border: #c7d9f5)
  border: '#c7d9f5',
  borderLight: '#e8f0fe',
  borderSubtle: '#e8f0fe',

  // Leave type colors
  leaveTypes: {
    annual: '#2563eb',
    sick: '#0ea5e9',
    personal: '#60a5fa',
    unpaid: '#93bef7',
  },
};

// Default export (dark — professional HR, used as static fallback)
export const Colors = DarkColors;

// ── Shadows ──────────────────────────────────────────────────────────────────
// Соответствует --shadow переменным в веб-версии
export const DarkShadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
};

export const LightShadows = {
  sm: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  md: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  lg: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
};

export const Shadows = DarkShadows;

// ── Typography ───────────────────────────────────────────────────────────────
export const Typography = {
  display: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1 },
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const },
  bodySemiBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  captionMedium: { fontSize: 13, fontWeight: '500' as const },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5 },
};

// ── Spacing & Radius ─────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
};

// ── Theme helper ─────────────────────────────────────────────────────────────
export function getThemeColors(mode: ThemeMode) {
  return mode === 'dark' ? DarkColors : LightColors;
}

export function getThemeShadows(mode: ThemeMode) {
  return mode === 'dark' ? DarkShadows : LightShadows;
}
