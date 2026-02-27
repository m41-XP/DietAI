export const colors = {
  primary: '#7CC932',
  primaryDark: '#6AB82A',
  primaryLight: '#EBF7D9',
  background: '#FFFFFF',
  backgroundAlt: '#F7F8FA',
  card: '#F5F5F5',
  inputBg: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#BBBBBB',
  border: '#E8E8E8',
  error: '#FF4444',
  errorLight: '#FFF0F0',
  success: '#2D8A4E',
  successLight: '#F0FFF4',
  warning: '#F5A623',
  warningLight: '#FFF8EC',
  info: '#4A90E2',
  infoLight: '#EEF5FF',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.4)',
};

export const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 4,
};

export const shadowSm = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 30,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  hero: { fontSize: 32, fontWeight: /** @type {const} */ ('800'), color: colors.textPrimary },
  h1: { fontSize: 26, fontWeight: /** @type {const} */ ('700'), color: colors.textPrimary },
  h2: { fontSize: 20, fontWeight: /** @type {const} */ ('700'), color: colors.textPrimary },
  h3: { fontSize: 17, fontWeight: /** @type {const} */ ('600'), color: colors.textPrimary },
  body: { fontSize: 15, color: colors.textSecondary },
  caption: { fontSize: 13, color: colors.textMuted },
  button: { fontSize: 16, fontWeight: /** @type {const} */ ('700'), color: colors.white },
  label: { fontSize: 12, fontWeight: /** @type {const} */ ('600'), color: colors.textMuted, textTransform: /** @type {const} */ ('uppercase'), letterSpacing: 0.8 },
};
