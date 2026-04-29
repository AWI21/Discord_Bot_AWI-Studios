const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { setConfig, getConfig, deleteConfig, addAutoRole, removeAutoRole, getAutoRoles } = require('../../database/db');
const { requirePerms, successEmbed, errorEmbed } = require('../../utils/helpers');

// Master config command: !config <key> [value]
module.exports = {
  name: 'config',
  aliases: ['setup', 'set'],
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ManageGuild)) return;

    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'help') return showHelp(message, prefix);

    // ── Channel configs ──────────────────────────────────────────────────────────
    const channelConfigs = {
      'log-channel': 'log_channel',
      'level-channel': 'level_channel',
      'birthday-channel': 'birthday_channel',
      'welcome-channel': 'welcome_channel',
      'yt-channel-notify': 'yt_notif_channel',
      'tiktok-channel': 'tiktok_notif_channel',
      'instagram-channel': 'instagram_notif_channel',
      'twitch-channel': 'twitch_notif_channel',
      'ticket-category': 'ticket_category',
    };

    // ── Role configs ─────────────────────────────────────────────────────────────
    const roleConfigs = {
      'birthday-role': 'birthday_role',
      'mod-role': 'mod_role',
      'trusted-fan-role': 'trusted_fan_role',
      'yt-ping-role': 'yt_ping_role',
      'twitch-ping-role': 'twitch_ping_role',
      'level-role-5': 'level_role_5',
      'level-role-10': 'level_role_10',
      'level-role-20': 'level_role_20',
      'level-role-30': 'level_role_30',
      'level-role-40': 'level_role_40',
      'level-role-50': 'level_role_50',
    };

    // ── Text/value configs ───────────────────────────────────────────────────────
    const valueConfigs = {
      'prefix': 'prefix',
      'yt-channel-id': 'yt_channel_id',
      'twitch-username': 'twitch_username',
      'tiktok-username': 'tiktok_username',
      'instagram-username': 'instagram_username',
      'trusted-fan-threshold': 'trusted_fan_threshold',
    };

    if (channelConfigs[sub]) {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply({ embeds: [errorEmbed(`Mention a channel: \`${prefix}config ${sub} #channel\``)] });
      setConfig(message.guild.id, channelConfigs[sub], channel.id);
      return message.reply({ embeds: [successEmbed(`**${sub}** set to ${channel}.`)] });
    }

    if (roleConfigs[sub]) {
      const role = message.mentions.roles.first();
      if (!role) return message.reply({ embeds: [errorEmbed(`Mention a role: \`${prefix}config ${sub} @role\``)] });
      setConfig(message.guild.id, roleConfigs[sub], role.id);
      return message.reply({ embeds: [successEmbed(`**${sub}** set to ${role}.`)] });
    }

    if (valueConfigs[sub]) {
      const val = args.slice(1).join(' ');
      if (!val) return message.reply({ embeds: [errorEmbed(`Provide a value: \`${prefix}config ${sub} <value>\``)] });
      setConfig(message.guild.id, valueConfigs[sub], val);
      return message.reply({ embeds: [successEmbed(`**${sub}** set to \`${val}\`.`)] });
    }

    // ── Status config ─────────────────────────────────────────────────────────────
    if (sub === 'status') {
      const type = args[1]?.toUpperCase();
      const text = args.slice(2).join(' ');
      if (!type || !text) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}config status <PLAYING|WATCHING|LISTENING|COMPETING> <text>\``)] });
      const types = { PLAYING: 0, STREAMING: 1, LISTENING: 2, WATCHING: 3, COMPETING: 5 };
      if (!types[type]) return message.reply({ embeds: [errorEmbed('Type must be: PLAYING, WATCHING, LISTENING, COMPETING')] });

      client.user.setPresence({ activities: [{ name: text, type: types[type] }] });
      setConfig(message.guild.id, 'bot_status', text);
      setConfig(message.guild.id, 'bot_status_type', type);
      return message.reply({ embeds: [successEmbed(`Bot status set to **${type}** ${text}`)] });
    }

    // ── Auto role management ───────────────────────────────────────────────────────
    if (sub === 'autorole') {
      const action = args[1]?.toLowerCase();
      const role = message.mentions.roles.first();

      if (action === 'add') {
        if (!role) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}config autorole add @role\``)] });
        addAutoRole(message.guild.id, role.id);
        return message.reply({ embeds: [successEmbed(`Auto-role **${role.name}** added. New members will receive it.`)] });
      }
      if (action === 'remove') {
        if (!role) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}config autorole remove @role\``)] });
        removeAutoRole(message.guild.id, role.id);
        return message.reply({ embeds: [successEmbed(`Auto-role **${role.name}** removed.`)] });
      }
      if (action === 'list') {
        const roles = getAutoRoles(message.guild.id);
        const embed = new EmbedBuilder().setColor(0x7c3aed).setTitle('⚙️ Auto Roles').setDescription(roles.length ? roles.map(r => `<@&${r}>`).join('\n') : 'None set.');
        return message.reply({ embeds: [embed] });
      }
    }

    // ── View all current config ────────────────────────────────────────────────────
    if (sub === 'view' || sub === 'show') {
      const allKeys = [
        ...Object.entries(channelConfigs),
        ...Object.entries(roleConfigs),
        ...Object.entries(valueConfigs),
      ];
      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('⚙️ Current Config')
        .setDescription(allKeys.map(([label, key]) => {
          const val = getConfig(message.guild.id, key);
          return `**${label}:** ${val ? (key.includes('channel') ? `<#${val}>` : key.includes('role') ? `<@&${val}>` : `\`${val}\``) : '_not set_'}`;
        }).join('\n'));
      return message.reply({ embeds: [embed] });
    }

    showHelp(message, prefix);
  },
};

function showHelp(message, prefix) {
  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle('⚙️ Config Commands')
    .addFields(
      { name: '📢 Channels', value: `\`${prefix}config log-channel\`\n\`${prefix}config level-channel\`\n\`${prefix}config birthday-channel\`\n\`${prefix}config welcome-channel\`\n\`${prefix}config yt-channel-notify\`\n\`${prefix}config tiktok-channel\`\n\`${prefix}config instagram-channel\`\n\`${prefix}config twitch-channel\`\n\`${prefix}config ticket-category\`` },
      { name: '🎖️ Roles', value: `\`${prefix}config birthday-role\`\n\`${prefix}config mod-role\`\n\`${prefix}config trusted-fan-role\`\n\`${prefix}config level-role-5\` (and 10, 20, 30, 40, 50)\n\`${prefix}config yt-ping-role\`\n\`${prefix}config twitch-ping-role\`` },
      { name: '🔧 Values', value: `\`${prefix}config prefix <symbol>\`\n\`${prefix}config yt-channel-id <id>\`\n\`${prefix}config twitch-username <name>\`\n\`${prefix}config trusted-fan-threshold <number>\`` },
      { name: '🤖 Bot', value: `\`${prefix}config status WATCHING <text>\`\n\`${prefix}config autorole add/remove/list\`\n\`${prefix}config view\`` },
    );
  message.reply({ embeds: [embed] });
}
