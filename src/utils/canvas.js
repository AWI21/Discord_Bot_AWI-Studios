const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

// Rejestracja pliku TTF pod nazwą "Bryndan Write"
GlobalFonts.registerFromPath(
    path.join(__dirname, '../assets/fonts/BryndanWriteBook-nGPM.ttf'),
    'Bryndan Write'
);

const CARD_WIDTH = 934;
const CARD_HEIGHT = 282;

const FONTS = {
  main: '"Bryndan Write", sans-serif',
  clean: 'system-ui, -apple-system, sans-serif'
};

const COLORS = {
  background: '#161a6f',
  backgroundAlt: '#0c0e3e',
  accent: '#2721e3',
  accentLight: '#38b6ff',
  barBg: '#1e2480',
  barFill: '#2721e3',
  barFillEnd: '#38b6ff',
  textPrimary: '#ffffff',
  textSecondary: '#38b6ff',
  textMuted: '#6f7bb0',
  avatarBorder: '#38b6ff',
};

async function generateLevelCard({ user, xp, nextLevelXp, level, rank, totalXp }) {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background Gradient
  const bgGradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bgGradient.addColorStop(0, COLORS.background);
  bgGradient.addColorStop(1, COLORS.backgroundAlt);
  ctx.fillStyle = bgGradient;
  roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 20);
  ctx.fill();

  // Side Bar
  const sideGrad = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  sideGrad.addColorStop(0, COLORS.accent);
  sideGrad.addColorStop(1, COLORS.accentLight);
  ctx.fillStyle = sideGrad;
  roundRect(ctx, 0, 0, 8, CARD_HEIGHT, [20, 0, 0, 20]);
  ctx.fill();

  // Glow Circle
  ctx.fillStyle = 'rgba(56, 182, 255, 0.05)';
  ctx.beginPath();
  ctx.arc(CARD_WIDTH - 100, CARD_HEIGHT / 2, 130, 0, Math.PI * 2);
  ctx.fill();

  // Avatar
  const avatarX = 50, avatarY = CARD_HEIGHT / 2, avatarRadius = 85;
  try {
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);
    ctx.shadowColor = COLORS.accentLight;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = COLORS.avatarBorder;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
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

  const contentX = avatarX + avatarRadius * 2 + 30;
  const contentWidth = CARD_WIDTH - contentX - 40;

  // Username (Bryndan Write)
  ctx.font = `bold 42px ${FONTS.main}`;
  ctx.fillStyle = COLORS.textPrimary;
  ctx.fillText(user.username, contentX, 78);

  // XP Progress Text (Clean Font)
  ctx.font = `18px ${FONTS.clean}`;
  ctx.fillStyle = COLORS.textSecondary;
  const xpText = `${xp} / ${nextLevelXp} XP`;
  const xpTextWidth = ctx.measureText(xpText).width;
  ctx.fillText(xpText, CARD_WIDTH - xpTextWidth - 40, 78);

  // XP Progress Bar
  const barY = 110, barHeight = 28, barX = contentX, barWidth = contentWidth;
  const progress = Math.min(xp / nextLevelXp, 1);
  ctx.fillStyle = COLORS.barBg;
  roundRect(ctx, barX, barY, barWidth, barHeight, 14);
  ctx.fill();

  if (progress > 0) {
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + barWidth * progress, 0);
    fillGrad.addColorStop(0, COLORS.barFill);
    fillGrad.addColorStop(1, COLORS.barFillEnd);
    ctx.fillStyle = fillGrad;
    roundRect(ctx, barX, barY, Math.max(barWidth * progress, 28), barHeight, 14);
    ctx.fill();
    ctx.shadowColor = COLORS.accentLight;
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, barX, barY, Math.max(barWidth * progress, 28), barHeight / 2, [14, 14, 0, 0]);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Stats Breakdown
  const statsY = 175, statSpacing = contentWidth / 3;
  drawStat(ctx, contentX, statsY, 'RANK', `#${rank}`, COLORS.accentLight);
  drawStat(ctx, contentX + statSpacing, statsY, 'LEVEL', String(level), COLORS.accentLight);
  drawStat(ctx, contentX + statSpacing * 2, statsY, 'TOTAL XP', formatNumber(totalXp), COLORS.accentLight);

  // Milestone Badges
  const milestones = [5, 10, 20, 30, 40, 50, 100];
  const badgeY = 240, badgeSpacing = 44, badgeStartX = contentX;

  milestones.forEach((milestone, i) => {
    const bx = badgeStartX + i * badgeSpacing;
    const reached = level >= milestone;
    const badgeGrad = ctx.createRadialGradient(bx + 14, badgeY - 14, 0, bx + 14, badgeY - 14, 14);
    if (reached) {
      badgeGrad.addColorStop(0, COLORS.accentLight);
      badgeGrad.addColorStop(1, COLORS.accent);
      ctx.fillStyle = badgeGrad;
      ctx.shadowColor = COLORS.accentLight;
      ctx.shadowBlur = 8;
    } else {
      ctx.fillStyle = COLORS.barBg;
      ctx.shadowBlur = 0;
    }
    ctx.beginPath();
    ctx.arc(bx + 14, badgeY - 14, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = `bold 13px ${FONTS.main}`;
    ctx.fillStyle = reached ? '#ffffff' : COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText(milestone, bx + 14, badgeY - 9);
    ctx.textAlign = 'left';
  });

  ctx.font = `13px ${FONTS.clean}`;
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('milestone levels', badgeStartX + milestones.length * badgeSpacing + 10, badgeY - 9);

  return canvas.toBuffer('image/png');
}

function drawStat(ctx, x, y, label, value, valueColor) {
  // Label (Clean Font)
  ctx.font = `12px ${FONTS.clean}`;
  ctx.fillStyle = '#6f7bb0';
  ctx.fillText(label, x, y);

  // Value (Bryndan Write)
  ctx.font = `bold 32px ${FONTS.main}`;
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

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

module.exports = { generateLevelCard };