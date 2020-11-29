import Discord, { MessageReaction, PartialUser, TextChannel, User } from 'discord.js';
import { Actions } from './interface/action';
import { PredefinedEvents } from './const/predefined-events';
import { CreatedEvent } from './interface/created-event';
import moment from 'moment';
import { Jobs } from './interface/jobs';
import lowdb from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import * as BotConfig from './bot-config.json';

const client = new Discord.Client({partials: ['MESSAGE', 'REACTION']});
const dbCreatedEventsKey = 'createdEvents';

const db = lowdb(new FileSync(BotConfig.LOWDB_FILENAME));
db.defaults({ createdEvents: []}).write();

const helpMsg = "!create [event] [time] [date]\nEx. !create e7s 22:00 11/30";
const actions: Actions = {
  help: {
    run: (msg) => {
      msg.channel.send(helpMsg);
    }
  },
  create: {
    run: async (msg) => {
      if (msg.channel instanceof TextChannel) {
        const params = msg.content.split(/\s+/).filter(Boolean).splice(1);
        // [ 'e7s', '23:00', '11/28' ]
        const eventName  = params[0].toLowerCase();
        const timeString = params[1];
        const dateString = params[2];

        const eventDate = moment(`${dateString} ${timeString}`, ['MM/DD HH:mm', 'YYYY/MM/DD HH:mm']).toDate()

        const event = PredefinedEvents[eventName];
        if (event) {
          const createdEvent: CreatedEvent = new CreatedEvent(event, eventDate);
          await createdEvent.sendInitEventMsg(client, msg.channel);
          // @ts-ignore
          db.get(dbCreatedEventsKey).push(createdEvent).write();
        }
      }
    }
  }
};

client.on("ready", () => {
  if (client.user) {
    console.log(`Logged in as ${client.user.tag}!`);
  }
});

client.on("message", (msg) => {
  if (
    msg.channel instanceof TextChannel &&
    msg.channel.name === BotConfig.CHANNEL &&
    msg.content.startsWith(BotConfig.START_WORD) &&
    BotConfig.PERMITTED_USERS.includes(msg.author.id)
  ) {
    const actionString = msg.content.split(/\s+/)[0].substr(1);
    const action = actions[actionString];
    if (action) {
      action.run(msg);
    } else {
      console.warn(`action ${actionString} not found.`);
    }
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  await updateCreatedEventMsg(reaction, user, true);
});

client.on('messageReactionRemove', async (reaction, user) => {
  await updateCreatedEventMsg(reaction, user, false);
});

async function fetchReaction(reaction: MessageReaction) {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Something went wrong when fetching the message: ', error);
      return;
    }
  }
}

async function updateCreatedEventMsg(reaction: MessageReaction, user: User | PartialUser, add: boolean) {
  await fetchReaction(reaction);
  const msg = reaction.message;
  if (msg.author.id === client.user?.id) {
    if (msg.embeds[0].title?.includes('出團調查')) {
      const createdEventData = findEventByMsgId(msg.id).value();
      if (createdEventData) {
        const createdEvent = CreatedEvent.fromData(createdEventData);
        createdEvent.userReact(user, reaction.emoji.name as Jobs, add);
        await createdEvent.updateEventMsg(client, msg);
        findEventByMsgId(msg.id).assign(createdEvent).write();
      }
    }
  }
}

function findEventByMsgId(msgId: string) {
  // @ts-ignore
  return db.get(dbCreatedEventsKey).find({'msgId': msgId});
}

client.login(BotConfig.BOT_TOKEN);
