import { Message } from 'discord.js';

export interface Actions {
  [command: string]: Action;
}

export interface Action {
  run: (msg: Message) => void;
}
