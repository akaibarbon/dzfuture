// Public helpers only. The auth-password derivation lives in
// `serial-auth.server.ts` and is never shipped to the browser.
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
