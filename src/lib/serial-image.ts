// Generates a downloadable PNG of a serial number card.
export function downloadSerialAsImage(serial: string, fullName?: string) {
  const W = 1080, H = 720;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0b1437");
  g.addColorStop(1, "#1a0e3a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Glow circle
  const rg = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 500);
  rg.addColorStop(0, "rgba(99,102,241,0.35)");
  rg.addColorStop(1, "rgba(99,102,241,0)");
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

  // Card
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.strokeStyle = "rgba(120,140,255,0.5)";
  ctx.lineWidth = 3;
  const cx = 80, cy = 120, cw = W - 160, ch = H - 220;
  roundRect(ctx, cx, cy, cw, ch, 32); ctx.fill(); ctx.stroke();

  // Title
  ctx.fillStyle = "#a5b4fc";
  ctx.font = "600 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CEM G.M — Hassan Bourghoud", W / 2, cy + 70);

  ctx.fillStyle = "#e5e7eb";
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillText("Your Serial Number / رقمك التسلسلي", W / 2, cy + 130);

  if (fullName) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 34px system-ui, sans-serif";
    ctx.fillText(fullName, W / 2, cy + 190);
  }

  // Serial big
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(99,102,241,0.9)"; ctx.shadowBlur = 30;
  ctx.font = "800 140px ui-monospace, Menlo, monospace";
  ctx.fillText(serial, W / 2, cy + ch / 2 + 70);
  ctx.shadowBlur = 0;

  // Footer
  ctx.fillStyle = "#fcd34d";
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillText("احفظ هذا الرقم في مكان آمن — هو مفتاح دخولك", W / 2, H - 60);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CEMGM-Serial-${serial}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, "image/png");
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
