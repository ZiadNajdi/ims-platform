/**
 * IMS-Viviana Design Tokens
 * Matches the web app's industrial-editorial aesthetic.
 */

const tintLight = '#6366f1';
const tintDark = '#818cf8';

export default {
  light: {
    text: '#0f172a',
    textSecondary: '#64748b',
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceHover: '#f1f5f9',
    border: '#e2e8f0',
    muted: '#64748b',
    primary: '#6366f1',
    primaryForeground: '#ffffff',
    accent: '#8b5cf6',
    accentForeground: '#ffffff',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    tint: tintLight,
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintLight,
    card: '#ffffff',
    tabBar: '#ffffff',
    tabBarBorder: '#e2e8f0',
  },
  dark: {
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    background: '#0b0e14',
    surface: '#141820',
    surfaceHover: '#1c2230',
    border: '#1e293b',
    muted: '#94a3b8',
    primary: '#818cf8',
    primaryForeground: '#0f0f23',
    accent: '#a78bfa',
    accentForeground: '#0f0f23',
    success: '#4ade80',
    warning: '#fbbf24',
    danger: '#f87171',
    tint: tintDark,
    tabIconDefault: '#475569',
    tabIconSelected: tintDark,
    card: '#141820',
    tabBar: '#0f1219',
    tabBarBorder: '#1e293b',
  },
};
