import { Client, Message, MessageEmbed, PartialUser, TextChannel, User } from 'discord.js';
import { PredefinedEvent } from '../const/predefined-events';
import moment from 'moment';
import { Emojis } from './emojis';
import * as BotConfig from '../bot-config.json';

export class CreatedEvent {
  static fromData(event: CreatedEvent) {
    const newEvent = new CreatedEvent(event.event, event.date);
    newEvent.msgId = event.msgId;
    newEvent.players = event.players;
    return newEvent;
  }

  constructor(event: PredefinedEvent, date: Date) {
    this.msgId = '';
    this.event = event;
    this.players = {
      tank: [],
      healer: [],
      mDps: [],
      prDps: [],
      mrDps: []
    };
    this.date = date;
  }

  msgId: string;
  event: PredefinedEvent;
  players: {
    [job: string]: string[];
  }
  date: Date;

  private static getEmojis(client: Client): Emojis {
    const tank = client.emojis.cache.find(emoji => emoji.name === BotConfig.EMOJI_NAMES.TANK)?.toString() ?? '';
    const healer = client.emojis.cache.find(emoji => emoji.name === BotConfig.EMOJI_NAMES.HEALER)?.toString() ?? '';
    const mDps = client.emojis.cache.find(emoji => emoji.name === BotConfig.EMOJI_NAMES.M_DPS)?.toString() ?? '';
    const prDps = client.emojis.cache.find(emoji => emoji.name === BotConfig.EMOJI_NAMES.PR_DPS)?.toString() ?? '';
    const mrDps = client.emojis.cache.find(emoji => emoji.name === BotConfig.EMOJI_NAMES.MR_DPS)?.toString() ?? '';

    return {
      tank,
      healer,
      mDps,
      prDps,
      mrDps
    };
  }

  private getEmbedMessage(emojis: Emojis) {
    return new MessageEmbed()
      .setTitle(this.event.eventTitle)
      .setDescription('請在下方勾選要出的職業類型')
      .addFields(
        {name: '時間', value: moment(this.date).locale('zh-TW').format('YYYY/MM/DD(dd) HH:mm')},
        ...this.getFields(emojis)
      );
  }

  private getFields(emojis: Emojis) {
    const tankValue = this.players.tank.length === 0 ? '-' : this.getFieldValue(emojis.tank, this.players.tank);
    const healerValue = this.players.healer.length === 0 ? '-' : this.getFieldValue(emojis.healer, this.players.healer);
    const dpsValue = this.players.mDps.length + this.players.prDps.length + this.players.mrDps.length === 0 ? '-' : this.getFieldValue(emojis.mDps, this.players.mDps) + this.getFieldValue(emojis.prDps, this.players.prDps) + this.getFieldValue(emojis.mrDps, this.players.mrDps);

    return [
      {name: `${emojis.tank} 坦克 (${this.players.tank.length}/2)`, value: tankValue, inline: true},
      {name: `${emojis.healer} 補師 (${this.players.healer.length}/2)`, value: healerValue, inline: true},
      {
        name: `${emojis.mDps}${emojis.prDps}${emojis.mrDps} DPS (${this.players.mDps.length + this.players.prDps.length + this.players.mrDps.length}/4)`,
        value: dpsValue,
        inline: true
      }
    ];
  }

  private getFieldValue(emoji: string, nameList: string[]) {
    return nameList.map(name => `> ${emoji} ${name}`).join('\n') + '\n';
  }

  async sendInitEventMsg(client: Client, channel: TextChannel): Promise<Message> {
    const emojis = CreatedEvent.getEmojis(client);
    const embed = this.getEmbedMessage(emojis);
    const msg = await channel.send(embed);

    await Promise.all([
      msg.react(emojis.tank),
      msg.react(emojis.healer),
      msg.react(emojis.mDps),
      msg.react(emojis.prDps),
      msg.react(emojis.mrDps)
    ]);

    this.msgId = msg.id;

    return msg;
  }

  userReact(user: User | PartialUser, reaction: string, add: boolean) {
    if (add) {
      if (!this.players[reaction].includes(user.toString())) {
        this.players[reaction].push(user.toString());
      }
    } else {
      this.players[reaction] = this.players[reaction].filter(oldUser => oldUser !== user.toString());
    }
  }

  async updateEventMsg(client: Client, msg: Message) {
    const emojis = CreatedEvent.getEmojis(client);
    await msg.edit(this.getEmbedMessage(emojis));
  }
}
