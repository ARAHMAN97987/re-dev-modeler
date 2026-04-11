/**
 * Shared button style constants.
 * Build on top of the base token set in styles.js so callers can import
 * from one place without duplicating the base object.
 */
import { btnS, btnPrim, btnSm } from "./styles";

export { btnS, btnPrim, btnSm };

/** Secondary / outlined button */
export const btnSec = {
  ...btnS,
  background: "var(--nav-btn-bg, #f0f1f5)",
  color: "var(--nav-btn-text, #1a1d23)",
  border: "0.5px solid var(--nav-btn-border, #d1d5db)",
  fontWeight: 500,
};

/** Destructive / danger button */
export const btnDanger = {
  ...btnS,
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fca5a5",
  fontWeight: 600,
};

/** Large button size modifier — combine with btnPrim / btnSec etc. */
export const btnLg = {
  padding: "12px 24px",
  fontSize: 14,
  borderRadius: "var(--radius-md, 8px)",
};
