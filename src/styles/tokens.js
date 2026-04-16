// ============================================
// HASEEF DESIGN SYSTEM — JS tokens
// Apple HIG aligned (Sonoma / iOS 17)
// Mirror of design-tokens.css, for use in JSX
// inline styles and JS helpers.
// ============================================

export const color = {
  // Apple system colors (light)
  sys: {
    blue:   "#007AFF",
    green:  "#34C759",
    indigo: "#5856D6",
    orange: "#FF9500",
    pink:   "#FF2D55",
    purple: "#AF52DE",
    red:    "#FF3B30",
    teal:   "#30B0C7",
    yellow: "#FFCC00",
    mint:   "#00C7BE",
    cyan:   "#32ADE6",
    brown:  "#A2845E",
  },

  // Grays (Sonoma)
  gray: {
    1: "#8E8E93",
    2: "#AEAEB2",
    3: "#C7C7CC",
    4: "#D1D1D6",
    5: "#E5E5EA",
    6: "#F2F2F7",
  },

  // Semantic
  successBg:  "#E8F8EF", successText: "#1E7A3F", success: "#34C759",
  dangerBg:   "#FEECEC", dangerText:  "#C1332A", danger:  "#FF3B30",
  warningBg:  "#FFF6E5", warningText: "#8C6900", warning: "#FF9500",
  infoBg:     "#E7F1FE", infoText:    "#054DA7", info:    "#007AFF",

  // Surfaces
  page:      "#F5F5F7",
  card:      "#FFFFFF",
  sidebar:   "#F7F7F8",
  input:     "#F2F2F7",
  hover:     "#F9F9FB",
  active:    "#EEEEF1",
  separator: "#F2F2F7",

  // Text (Apple label hierarchy)
  textPrimary:    "#1D1D1F",
  textSecondary:  "rgba(60,60,67,0.6)",
  textTertiary:   "rgba(60,60,67,0.3)",
  textQuaternary: "rgba(60,60,67,0.14)",
  textInverse:    "#FFFFFF",
  textLink:       "#007AFF",
  textPositive:   "#1E7A3F",
  textNegative:   "#C1332A",

  // Borders
  borderDefault: "rgba(60,60,67,0.18)",
  borderHover:   "rgba(60,60,67,0.29)",
  borderFocus:   "#007AFF",

  // ZAN brand (dark navigation)
  navy:  "#162D4A",
  navy2: "#1E3A52",
  gold:  "#C8A951",
  teal:  "#1B6B93",
};

// Semantic CSS var names (prefer these — they auto-switch light/dark)
export const cssVar = {
  // surfaces
  page:       "var(--surface-page)",
  card:       "var(--surface-card)",
  sidebar:    "var(--surface-sidebar)",
  input:      "var(--surface-input)",
  hover:      "var(--surface-hover)",
  active:     "var(--surface-active)",
  separator:  "var(--surface-separator)",
  glass:      "var(--surface-glass)",

  // text
  textPrimary:    "var(--text-primary)",
  textSecondary:  "var(--text-secondary)",
  textTertiary:   "var(--text-tertiary)",
  textInverse:    "var(--text-inverse)",
  textLink:       "var(--text-link)",
  textPositive:   "var(--text-positive)",
  textNegative:   "var(--text-negative)",

  // borders
  borderDefault: "var(--border-default)",
  borderHover:   "var(--border-hover)",
  borderFocus:   "var(--border-focus)",

  // systemic
  sysBlue:  "var(--sys-blue)",
  sysGreen: "var(--sys-green)",
  sysRed:   "var(--sys-red)",
  sysOrange:"var(--sys-orange)",

  // semantic
  success:     "var(--color-success)",
  successBg:   "var(--color-success-bg)",
  successText: "var(--color-success-text)",
  danger:      "var(--color-danger)",
  dangerBg:    "var(--color-danger-bg)",
  dangerText:  "var(--color-danger-text)",
  warning:     "var(--color-warning)",
  warningBg:   "var(--color-warning-bg)",
  warningText: "var(--color-warning-text)",
  info:        "var(--color-info)",
  infoBg:      "var(--color-info-bg)",
  infoText:    "var(--color-info-text)",
};

export const font = {
  family:  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif",
  arabic:  "-apple-system, 'SF Arabic', 'SF Pro AR', 'Geeza Pro', 'Noto Sans Arabic', system-ui, sans-serif",
  mono:    "ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, 'Cascadia Code', monospace",
  rounded: "-apple-system, 'SF Pro Rounded', ui-rounded, system-ui, sans-serif",
};

// Apple HIG text styles
export const text = {
  largeTitle: { fontSize: 34, fontWeight: 700, letterSpacing: "-0.024em", lineHeight: 1.15 },
  title1:     { fontSize: 28, fontWeight: 700, letterSpacing: "-0.024em", lineHeight: 1.15 },
  title2:     { fontSize: 22, fontWeight: 700, letterSpacing: "-0.020em", lineHeight: 1.2 },
  title3:     { fontSize: 20, fontWeight: 600, letterSpacing: "-0.016em", lineHeight: 1.25 },
  headline:   { fontSize: 17, fontWeight: 600, letterSpacing: "-0.014em", lineHeight: 1.3 },
  body:       { fontSize: 15, fontWeight: 400, letterSpacing: "-0.008em", lineHeight: 1.45 },
  callout:    { fontSize: 15, fontWeight: 400, letterSpacing: "-0.008em", lineHeight: 1.4 },
  subhead:    { fontSize: 14, fontWeight: 400, letterSpacing: "-0.008em", lineHeight: 1.4 },
  footnote:   { fontSize: 13, fontWeight: 400, letterSpacing: "-0.004em", lineHeight: 1.4 },
  caption1:   { fontSize: 12, fontWeight: 400, letterSpacing: "0",        lineHeight: 1.4 },
  caption2:   { fontSize: 11, fontWeight: 400, letterSpacing: "0.004em",  lineHeight: 1.4 },
};

export const weight = {
  regular:  400,
  medium:   500,
  semibold: 600,
  bold:     700,
};

export const space = {
  0:   0,
  0.5: 2,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  10:  40,
  12:  48,
  16:  64,
  20:  80,
};

export const radius = {
  xs:   4,
  sm:   6,
  md:   8,
  lg:   10,
  xl:   12,
  "2xl":16,
  "3xl":20,
  pill: 9999,
  full: 9999,
};

export const shadow = {
  xs:           "0 1px 1px rgba(0,0,0,0.03)",
  sm:           "0 1px 2px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)",
  md:           "0 4px 12px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04)",
  lg:           "0 12px 28px rgba(0,0,0,0.1), 0 0 0 0.5px rgba(0,0,0,0.06)",
  xl:           "0 24px 60px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.08)",
  focus:        "0 0 0 4px rgba(0,122,255,0.25)",
  focusDanger:  "0 0 0 4px rgba(255,59,48,0.25)",
};

export const motion = {
  easeOutQuart: "cubic-bezier(0.25, 1, 0.5, 1)",
  easeOutExpo:  "cubic-bezier(0.16, 1, 0.3, 1)",
  easeSpring:   "cubic-bezier(0.34, 1.56, 0.64, 1)",
  fast:   "120ms cubic-bezier(0.25, 1, 0.5, 1)",
  normal: "200ms cubic-bezier(0.25, 1, 0.5, 1)",
  slow:   "320ms cubic-bezier(0.16, 1, 0.3, 1)",
};

export const control = {
  heightXs: 22,
  heightSm: 28,
  heightMd: 32,
  heightLg: 40,
  heightXl: 48,
};

// Convenience aliases
export const tokens = { color, cssVar, font, text, weight, space, radius, shadow, motion, control };
export default tokens;
