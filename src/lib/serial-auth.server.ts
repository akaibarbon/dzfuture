import { createHmac } from "crypto";
import { normalizeSerial } from "@/lib/serial-auth";

// Server-only password derivation. A secret salt keeps the derivation
// non-reproducible from public code. Falls back to a fixed string if the
// secret is not configured so existing accounts keep working — set
// SERIAL_PASSWORD_SALT in production for full strength.
function salt() {
  return process.env.SERIAL_PASSWORD_SALT || "cemgm-default-salt-v1";
}

export function serialToAuthPassword(serial: string) {
  const norm = normalizeSerial(serial);
  const mac = createHmac("sha256", salt()).update(norm).digest("base64url");
  // 24-char base64url + suffix to satisfy any password complexity rule
  return `S1!${mac.slice(0, 24)}`;
}

// Legacy derivation kept ONLY for one-shot migration from older accounts.
// Never expose to the client.
function legacySerialToAuthPassword(serial: string) {
  return `CEM-GM-${normalizeSerial(serial)}-2026!`;
}

export function serialPasswordCandidates(serial: string) {
  const norm = normalizeSerial(serial);
  return Array.from(
    new Set([serialToAuthPassword(norm), legacySerialToAuthPassword(norm), norm]),
  );
}
