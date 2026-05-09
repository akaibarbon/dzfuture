export function generateSerialNumber() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return (
    letters[Math.floor(Math.random() * 26)] +
    letters[Math.floor(Math.random() * 26)] +
    Math.floor(1000 + Math.random() * 9000).toString()
  );
}

export function normalizeSerial(serial: string) {
  return serial.trim().toUpperCase();
}

export function serialToAuthPassword(serial: string) {
  return `CEM-GM-${normalizeSerial(serial)}-2026!`;
}

export function serialPasswordCandidates(serial: string) {
  const normalized = normalizeSerial(serial);
  return Array.from(new Set([serialToAuthPassword(normalized), normalized]));
}