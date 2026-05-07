const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requirePerms, errorEmbed } = require('../../utils/helpers');

module.exports = {
  name: 'embed',
  slashData: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create and send a rich embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Embed description').setRequired(false))
    .addStringOption(o => o.setName('color').setDescription('Hex color e.g. #7c3aed').setRequired(false))
    .addStringOption(o => o.setName('image').setDescription('Image URL').setRequired(false))
    .addStringOption(o => o.setName('thumbnail').setDescription('Thumbnail URL').setRequired(false))
    .addStringOption(o => o.setName('footer').setDescription('Footer text').setRequired(false))
    .addChannelOption(o => o.setName('channel').setDescription('Channel to send to (default: current)').setRequired(false)),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ManageMessages)) return;
    const sub = args[0]?.toLowerCase();
    if (sub !== 'send') {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x7c3aed).setTitle('📝 Embed Creator')
        .setDescription(`**Usage:**\n\`\`\`\n${prefix}embed send [#channel]\ntitle: Your Title\ndescription: Your text\ncolor: #7c3aed\nimage: https://...\nthumbnail: https://...\nfooter: Footer text\nfield: Name | Value | true\ntimestamp\n\`\`\``)
        .addFields({ name: 'Slash command', value: '`/embed` — fill in the fields directly!' })] });
    }
    const targetChannel = message.mentions.channels.first() || message.channel;
    const lines = message.content.split('\n').slice(1);
    const embed = new EmbedBuilder();
    let hasContent = false;
    for (const line of lines) {
      const [key, ...rest] = line.split(':');
      const val = rest.join(':').trim();
      const k = key.trim().toLowerCase();
      if (k === 'title' && val) { embed.setTitle(val); hasContent = true; }
      else if (k === 'description' && val) { embed.setDescription(val); hasContent = true; }
      else if (k === 'color' && val) { try { embed.setColor(val); } catch {} }
      else if (k === 'image' && val) { try { embed.setImage(val); } catch {} }
      else if (k === 'thumbnail' && val) { try { embed.setThumbnail(val); } catch {} }
      else if (k === 'footer' && val) { embed.setFooter({ text: val }); }
      else if (k === 'timestamp') { embed.setTimestamp(); }
      else if (k === 'field' && val) {
        const [name, value, inline] = val.split('|').map(s => s.trim());
        if (name && value) embed.addFields({ name, value, inline: inline === 'true' });
      }
    }
    if (!hasContent) return message.reply({ embeds: [errorEmbed('Your embed needs at least a title or description.')] });
    await targetChannel.send({ embeds: [embed] });
    if (targetChannel.id !== message.channel.id) await message.reply({ embeds: [new EmbedBuilder().setColor(0x22c55e).setDescription(`✅ Embed sent to ${targetChannel}.`)] });
    await message.delete().catch(() => {});
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const color = interaction.options.getString('color');
    const image = interaction.options.getString('image');
    const thumbnail = interaction.options.getString('thumbnail');
    const footer = interaction.options.getString('footer');
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    const embed = new EmbedBuilder().setTitle(title);
    if (description) embed.setDescription(description);
    if (color) { try { embed.setColor(color); } catch {} }
    if (image) { try { embed.setImage(image); } catch {} }
    if (thumbnail) { try { embed.setThumbnail(thumbnail); } catch {} }
    if (footer) embed.setFooter({ text: footer });

    await targetChannel.send({ embeds: [embed] });
    await interaction.editReply({ content: `✅ Embed sent to ${targetChannel}.` });
  },
};
