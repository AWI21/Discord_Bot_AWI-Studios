const { createCanvas, loadImage } = require('@napi-rs/canvas');

const CARD_WIDTH = 934;
const CARD_HEIGHT = 282;

const COLORS = {
  background: '#1a1a2e',
  backgroundAlt: '#16213e',
  accent: '#7c3aed',
  accentLight: '#a78bfa',
  barBg: '#2d2d4e',
  barFill: '#7c3aed',
  barFillEnd: '#06b6d4',
  textPrimary: '#ffffff',
  textSecondary: '#a0a0b0',
  textMuted: '#6b6b80',
  avatarBorder: '#7c3aed',
};

function xpForLevel(level) {
  return 5 * (level * level) + 50 * level + 100;
}

async function generateLevelCard({ user, xp, level, rank, guildName }) {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // ── Background ──────────────────────────────────────────────────────────────
  const bgGradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bgGradient.addColorStop(0, COLORS.background);
  bgGradient.addColorStop(1, COLORS.backgroundAlt);
  ctx.fillStyle = bgGradient;
  roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 20);
  ctx.fill();

  // ── Decorative side bar ─────────────────────────────────────────────────────
  const sideGrad = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  sideGrad.addColorStop(0, COLORS.accent);
  sideGrad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = sideGrad;
  roundRect(ctx, 0, 0, 8, CARD_HEIGHT, [20, 0, 0, 20]);
  ctx.fill();

  // ── Decorative wolf silhouette (simple polygon) ─────────────────────────────
  ctx.fillStyle = 'rgba(124, 58, 237, 0.06)';
  ctx.beginPath();
  ctx.arc(CARD_WIDTH - 100, CARD_HEIGHT / 2, 130, 0, Math.PI * 2);
  ctx.fill();

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const avatarX = 50;
  const avatarY = CARD_HEIGHT / 2;
  const avatarRadius = 85;

  try {
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);

    // Glow
    ctx.shadowColor = COLORS.accent;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = COLORS.avatarBorder;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Clip and draw
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY, avatarRadius - 4, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, avatarX + 4, avatarY - avatarRadius + 4, (avatarRadius - 4) * 2, (avatarRadius - 4) * 2);
    ctx.restore();
  } catch {
    ctx.fillStyle = COLORS.accent;
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY, avatarRadius - 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Content area ────────────────────────────────────────────────────────────
  const contentX = avatarX + avatarRadius * 2 + 30;
  const contentWidth = CARD_WIDTH - contentX - 40;

  // Username
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = COLORS.textPrimary;
  ctx.fillText(user.username, contentX, 80);

  // Discriminator / tag
  if (user.discriminator && user.discriminator !== '0') {
    const usernameWidth = ctx.measureText(user.username).width;
    ctx.font = '24px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(`#${user.discriminator}`, contentX + usernameWidth + 6, 80);
  }

  // ── XP numbers (right side) ──────────────────────────────────────────────────
  const currentLevelXP = xpForLevel(level);
  const xpProgress = xp - getTotalXPForLevel(level);
  const xpNeeded = xpForLevel(level + 1);

  ctx.font = '22px sans-serif';
  ctx.fillStyle = COLORS.textSecondary;
  const xpText = `${formatNumber(xpProgress)} / ${formatNumber(xpNeeded)} XP`;
  const xpTextWidth = ctx.measureText(xpText).width;
  ctx.fillText(xpText, CARD_WIDTH - xpTextWidth - 40, 80);

  // ── XP Bar ───────────────────────────────────────────────────────────────────
  const barY = 110;
  const barHeight = 28;
  const barX = contentX;
  const barWidth = contentWidth;
  const progress = Math.min(xpProgress / xpNeeded, 1);

  // Bar background
  ctx.fillStyle = COLORS.barBg;
  roundRect(ctx, barX, barY, barWidth, barHeight, 14);
  ctx.fill();

  // Bar fill
  if (progress > 0) {
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + barWidth * progress, 0);
    fillGrad.addColorStop(0, COLORS.barFill);
    fillGrad.addColorStop(1, COLORS.barFillEnd);
    ctx.fillStyle = fillGrad;
    roundRect(ctx, barX, barY, Math.max(barWidth * progress, 28), barHeight, 14);
    ctx.fill();

    // Glow on bar
    ctx.shadowColor = COLORS.accent;
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, barX, barY, Math.max(barWidth * progress, 28), barHeight / 2, [14, 14, 0, 0]);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── Stats row ─────────────────────────────────────────────────────────────────
  const statsY = 175;
  const statSpacing = contentWidth / 3;

  // Rank
  drawStat(ctx, contentX, statsY, 'RANK', `#${rank}`, COLORS.accentLight);
  // Level
  drawStat(ctx, contentX + statSpacing, statsY, 'LEVEL', String(level), COLORS.accentLight);
  // Total XP
  drawStat(ctx, contentX + statSpacing * 2, statsY, 'TOTAL XP', formatNumber(xp), COLORS.accentLight);

  // ── Level badges (filled dots for milestone levels) ──────────────────────────
  const milestones = [5, 10, 20, 30, 40, 50];
  const badgeY = 240;
  const badgeSpacing = 44;
  const badgeStartX = contentX;

  ctx.font = 'bold 12px sans-serif';
  milestones.forEach((milestone, i) => {
    const bx = badgeStartX + i * badgeSpacing;
    const reached = level >= milestone;
    const badgeGrad = ctx.createRadialGradient(bx + 14, badgeY - 14, 0, bx + 14, badgeY - 14, 14);

    if (reached) {
      badgeGrad.addColorStop(0, COLORS.accentLight);
      badgeGrad.addColorStop(1, COLORS.accent);
      ctx.fillStyle = badgeGrad;
      ctx.shadowColor = COLORS.accent;
      ctx.shadowBlur = 8;
    } else {
      ctx.fillStyle = COLORS.barBg;
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.arc(bx + 14, badgeY - 14, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = reached ? '#ffffff' : COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText(milestone, bx + 14, badgeY - 9);
    ctx.textAlign = 'left';
  });

  // Milestone label
  ctx.font = '13px sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('milestone levels', badgeStartX + milestones.length * badgeSpacing + 10, badgeY - 9);

  return canvas.toBuffer('image/png');
}

function drawStat(ctx, x, y, label, value, valueColor) {
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#6b6b80';
  ctx.fillText(label, x, y);

  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = valueColor;
  ctx.fillText(value, x, y + 30);
}

function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = [r, r, r, r];
  const [tl, tr, br, bl] = r;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

function getTotalXPForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i + 1);
  return total;
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

module.exports = { generateLevelCard, xpForLevel, getTotalXPForLevel };
