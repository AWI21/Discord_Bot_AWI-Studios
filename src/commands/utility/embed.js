const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePerms, errorEmbed } = require('../../utils/helpers');

// !embed send #channel title | description | color | image_url | footer
// !embed builder (interactive)
module.exports = {
  name: 'embed',
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ManageMessages)) return;

    const sub = args[0]?.toLowerCase();

    if (sub === 'send') {
      // !embed send #channel "Title" | "Description" | color | image | footer | thumbnail | author | field:Name:Value
      const targetChannel = message.mentions.channels.first() || message.channel;
      const content = message.content.split('\n').slice(1).join('\n') || args.slice(2).join(' ');

      if (!content) {
        const help = new EmbedBuilder()
          .setColor(0x7c3aed)
          .setTitle('📝 Embed Creator — Help')
          .setDescription(`**Usage:**\n\`\`\`\n${prefix}embed send [#channel]\ntitle: Your Title\ndescription: Your description here\ncolor: #7c3aed\nimage: https://...\nthumbnail: https://...\nfooter: Footer text\nauthor: Author name\nfield: Field Name | Field Value\nfield: Another | Value | true (inline)\n\`\`\``)
          .setFooter({ text: 'Separate options with newlines' });
        return message.reply({ embeds: [help] });
      }

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
        else if (k === 'author' && val) { embed.setAuthor({ name: val }); }
        else if (k === 'timestamp') { embed.setTimestamp(); }
        else if (k === 'field' && val) {
          const [name, value, inline] = val.split('|').map(s => s.trim());
          if (name && value) embed.addFields({ name, value, inline: inline === 'true' });
        }
      }

      if (!hasContent) return message.reply({ embeds: [errorEmbed('Your embed needs at least a title or description.')] });

      await targetChannel.send({ embeds: [embed] });
      if (targetChannel.id !== message.channel.id) {
        await message.reply({ embeds: [new EmbedBuilder().setColor(0x22c55e).setDescription(`✅ Embed sent to ${targetChannel}.`)] });
      }
      await message.delete().catch(() => {});

    } else if (sub === 'raw') {
      // !embed raw — send raw JSON embed (for advanced users)
      const jsonStr = args.slice(1).join(' ');
      try {
        const data = JSON.parse(jsonStr);
        const embed = EmbedBuilder.from(data);
        await message.channel.send({ embeds: [embed] });
        await message.delete().catch(() => {});
      } catch {
        message.reply({ embeds: [errorEmbed('Invalid JSON for embed.')] });
      }

    } else {
      const help = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('📝 Embed Creator')
        .addFields(
          { name: `${prefix}embed send [#channel]`, value: 'Create and send a rich embed.\nAdd options on new lines after the command.' },
          { name: 'Options', value: 'title: | description: | color: | image: | thumbnail: | footer: | author: | field: Name|Value|inline | timestamp' },
          { name: `${prefix}embed raw <json>`, value: 'Send a raw JSON embed.' },
        );
      message.reply({ embeds: [help] });
    }
  },
};
