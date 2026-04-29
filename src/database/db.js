const Database = require('better-sqlite3');
const path = require('path');
const chalk = require('chalk');

const DB_PATH = path.join(__dirname, '../../data/wolfy.db');
let db;

function initDatabase() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      PRIMARY KEY (guild_id, key)
    );

    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      messages INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS birthdays (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS vouches (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS vouch_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      points INTEGER NOT NULL,
      given_by TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      requirement_type TEXT NOT NULL,
      requirement_value INTEGER NOT NULL,
      reward_role_id TEXT,
      reward_xp INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      achievement_id INTEGER NOT NULL,
      earned_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, guild_id, achievement_id),
      FOREIGN KEY (achievement_id) REFERENCES achievements(id)
    );

    CREATE TABLE IF NOT EXISTS custom_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      trigger TEXT NOT NULL,
      response TEXT NOT NULL,
      UNIQUE(guild_id, trigger)
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT UNIQUE NOT NULL,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_cache (
      id TEXT NOT NULL,
      platform TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      posted_at INTEGER NOT NULL,
      PRIMARY KEY (id, platform, guild_id)
    );

    CREATE TABLE IF NOT EXISTS auto_roles (
      guild_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, role_id)
    );
  `);

  console.log(chalk.green('✅ Database initialized'));
}

function getDb() {
  return db;
}

// ── Generic config helpers ──────────────────────────────────────────────────
function getConfig(guildId, key) {
  const row = db.prepare('SELECT value FROM guild_config WHERE guild_id = ? AND key = ?').get(guildId, key);
  return row ? row.value : null;
}

function setConfig(guildId, key, value) {
  db.prepare('INSERT OR REPLACE INTO guild_config (guild_id, key, value) VALUES (?, ?, ?)').run(guildId, key, String(value));
}

function deleteConfig(guildId, key) {
  db.prepare('DELETE FROM guild_config WHERE guild_id = ? AND key = ?').run(guildId, key);
}

// ── User XP helpers ─────────────────────────────────────────────────────────
function getUser(userId, guildId) {
  return db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}

function ensureUser(userId, guildId) {
  db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
}

function addXP(userId, guildId, amount) {
  ensureUser(userId, guildId);
  db.prepare('UPDATE users SET xp = xp + ?, messages = messages + 1 WHERE user_id = ? AND guild_id = ?').run(amount, userId, guildId);
  return db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}

function setLevel(userId, guildId, level) {
  db.prepare('UPDATE users SET level = ? WHERE user_id = ? AND guild_id = ?').run(level, userId, guildId);
}

function getLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM users WHERE guild_id = ? ORDER BY xp DESC LIMIT ?').all(guildId, limit);
}

function getUserRank(userId, guildId) {
  const users = db.prepare('SELECT user_id FROM users WHERE guild_id = ? ORDER BY xp DESC').all(guildId);
  const index = users.findIndex(u => u.user_id === userId);
  return index === -1 ? null : index + 1;
}

// ── Warning helpers ──────────────────────────────────────────────────────────
function addWarning(userId, guildId, reason, moderatorId) {
  return db.prepare('INSERT INTO warnings (user_id, guild_id, reason, moderator_id, timestamp) VALUES (?, ?, ?, ?, ?)').run(userId, guildId, reason, moderatorId, Date.now());
}

function getWarnings(userId, guildId) {
  return db.prepare('SELECT * FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY timestamp DESC').all(userId, guildId);
}

function clearWarnings(userId, guildId) {
  return db.prepare('DELETE FROM warnings WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}

function removeWarning(warningId) {
  return db.prepare('DELETE FROM warnings WHERE id = ?').run(warningId);
}

// ── Birthday helpers ─────────────────────────────────────────────────────────
function setBirthday(userId, guildId, month, day) {
  db.prepare('INSERT OR REPLACE INTO birthdays (user_id, guild_id, month, day) VALUES (?, ?, ?, ?)').run(userId, guildId, month, day);
}

function getBirthday(userId, guildId) {
  return db.prepare('SELECT * FROM birthdays WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}

function getTodayBirthdays(month, day) {
  return db.prepare('SELECT * FROM birthdays WHERE month = ? AND day = ?').all(month, day);
}

// ── Vouch helpers ────────────────────────────────────────────────────────────
function addVouch(targetId, guildId, points, giverId) {
  db.prepare('INSERT OR IGNORE INTO vouches (user_id, guild_id) VALUES (?, ?)').run(targetId, guildId);
  db.prepare('UPDATE vouches SET points = points + ? WHERE user_id = ? AND guild_id = ?').run(points, targetId, guildId);
  db.prepare('INSERT INTO vouch_log (target_id, guild_id, points, given_by, timestamp) VALUES (?, ?, ?, ?, ?)').run(targetId, guildId, points, giverId, Date.now());
}

function getVouches(userId, guildId) {
  return db.prepare('SELECT * FROM vouches WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}

function getVouchLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM vouches WHERE guild_id = ? ORDER BY points DESC LIMIT ?').all(guildId, limit);
}

// ── Achievement helpers ──────────────────────────────────────────────────────
function createAchievement(guildId, name, description, requirementType, requirementValue, rewardRoleId, rewardXp) {
  return db.prepare('INSERT INTO achievements (guild_id, name, description, requirement_type, requirement_value, reward_role_id, reward_xp) VALUES (?, ?, ?, ?, ?, ?, ?)').run(guildId, name, description, requirementType, requirementValue, rewardRoleId || null, rewardXp || 0);
}

function getAchievements(guildId) {
  return db.prepare('SELECT * FROM achievements WHERE guild_id = ?').all(guildId);
}

function getUserAchievements(userId, guildId) {
  return db.prepare(`
    SELECT a.*, ua.earned_at FROM achievements a
    JOIN user_achievements ua ON a.id = ua.achievement_id
    WHERE ua.user_id = ? AND ua.guild_id = ?
  `).all(userId, guildId);
}

function grantAchievement(userId, guildId, achievementId) {
  try {
    db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, guild_id, achievement_id, earned_at) VALUES (?, ?, ?, ?)').run(userId, guildId, achievementId, Date.now());
    return true;
  } catch { return false; }
}

function hasAchievement(userId, guildId, achievementId) {
  return !!db.prepare('SELECT 1 FROM user_achievements WHERE user_id = ? AND guild_id = ? AND achievement_id = ?').get(userId, guildId, achievementId);
}

// ── Custom command helpers ───────────────────────────────────────────────────
function addCustomCommand(guildId, trigger, response) {
  db.prepare('INSERT OR REPLACE INTO custom_commands (guild_id, trigger, response) VALUES (?, ?, ?)').run(guildId, trigger.toLowerCase(), response);
}

function removeCustomCommand(guildId, trigger) {
  return db.prepare('DELETE FROM custom_commands WHERE guild_id = ? AND trigger = ?').run(guildId, trigger.toLowerCase());
}

function getCustomCommand(guildId, trigger) {
  return db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? AND trigger = ?').get(guildId, trigger.toLowerCase());
}

function getAllCustomCommands(guildId) {
  return db.prepare('SELECT * FROM custom_commands WHERE guild_id = ?').all(guildId);
}

// ── Ticket helpers ───────────────────────────────────────────────────────────
function createTicket(channelId, guildId, userId) {
  return db.prepare('INSERT INTO tickets (channel_id, guild_id, user_id, created_at) VALUES (?, ?, ?, ?)').run(channelId, guildId, userId, Date.now());
}

function getTicket(channelId) {
  return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
}

function updateTicketStatus(channelId, status) {
  db.prepare('UPDATE tickets SET status = ? WHERE channel_id = ?').run(status, channelId);
}

// ── Notification cache helpers ───────────────────────────────────────────────
function hasPosted(id, platform, guildId) {
  return !!db.prepare('SELECT 1 FROM notification_cache WHERE id = ? AND platform = ? AND guild_id = ?').get(id, platform, guildId);
}

function markPosted(id, platform, guildId) {
  db.prepare('INSERT OR IGNORE INTO notification_cache (id, platform, guild_id, posted_at) VALUES (?, ?, ?, ?)').run(id, platform, guildId, Date.now());
}

// ── Auto role helpers ────────────────────────────────────────────────────────
function addAutoRole(guildId, roleId) {
  db.prepare('INSERT OR IGNORE INTO auto_roles (guild_id, role_id) VALUES (?, ?)').run(guildId, roleId);
}

function removeAutoRole(guildId, roleId) {
  db.prepare('DELETE FROM auto_roles WHERE guild_id = ? AND role_id = ?').run(guildId, roleId);
}

function getAutoRoles(guildId) {
  return db.prepare('SELECT role_id FROM auto_roles WHERE guild_id = ?').all(guildId).map(r => r.role_id);
}

module.exports = {
  initDatabase, getDb,
  getConfig, setConfig, deleteConfig,
  getUser, ensureUser, addXP, setLevel, getLeaderboard, getUserRank,
  addWarning, getWarnings, clearWarnings, removeWarning,
  setBirthday, getBirthday, getTodayBirthdays,
  addVouch, getVouches, getVouchLeaderboard,
  createAchievement, getAchievements, getUserAchievements, grantAchievement, hasAchievement,
  addCustomCommand, removeCustomCommand, getCustomCommand, getAllCustomCommands,
  createTicket, getTicket, updateTicketStatus,
  hasPosted, markPosted,
  addAutoRole, removeAutoRole, getAutoRoles,
};
