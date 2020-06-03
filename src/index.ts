// TODO: Figure out deployment...
import Discord, { TextChannel } from 'discord.js';
import TwitchClient from 'twitch';
import mongoose from 'mongoose';

import {
  Streamer,
  Channel,
  Role,
} from './models';

const TWITCH_CLIENT_ID: string = <string>process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET: string = <string>process.env.TWITCH_CLIENT_SECRET;
const DISCORD_TOKEN: string= <string>process.env.DISCORD_TOKEN;
const MONGO_URI: string= <string>process.env.MONGO_URI;

const tc = TwitchClient.withClientCredentials(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);
const client = new Discord.Client();

// TODO: Hard coded for now, in the future this should be stored in the
// database or check for certain role privileges
const authorizedUsers: string[] = [
  '120743234426109954',
  '120742114152677376',
];

client.login(DISCORD_TOKEN);
mongoose.connect(MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;

client.on('ready', () => {
  console.log('discord bot ready!');
});

db.on('open', () => {
  console.log('database ready!');
});

db.on('error', () => {
  throw Error;
});

// Need to fetch
let announcementChannel: TextChannel;
let streamerList: string[] = [];
let liveStreamers: string[] = [];
let notifyRole = '';

// TODO: Should scope this out somewhere else
// TODO: Send response messages through bot
client.on('message', async (msg) => {
  // TODO: If not in server, then return
  if (!msg.guild) return 

  const content = msg.content.split(' ');

  const command = content[0];
  const param = content[1];

  if (command == '!addstreamer') {
    // TODO: Check if streamer exists on Twitch

    if (!authorizedUsers.includes(msg.author.id)) {
      msg.channel.send('You are not authorized.')
    }

    // Create new model
    const newStreamer = new Streamer({
      username: param,
    });

    // Add to in-memory list
    streamerList.push(param);

    // Add to live streamer list if they're already live so we don't ping
    if (await isStreamLive(param)) {
      liveStreamers.push(param);
    }

    // Save to DB
    await newStreamer.save();

    msg.channel.send(`Added ${param} to streamer list!`);

  } else if(command == '!removestreamer') {
    if (!authorizedUsers.includes(msg.author.id)) {
      msg.channel.send('You are not authorized.')
    }

    // Delete the streamer from database
    await Streamer.deleteOne({ username: param });

    // Remove from in-memory list and live streamer list
    streamerList = streamerList.filter(e => e != param);
    liveStreamers = liveStreamers.filter(e => e != param);

    msg.channel.send(`Removed ${param} from streamer list!`);

  } else if(command == '!setchannel') {
    // TODO: Check if valid channel in guild
    
    if (!authorizedUsers.includes(msg.author.id)) {
      msg.channel.send('You are not authorized.')
    }

    // TODO: Check if param is set, then decide how to set channel
    const channelName: string = msg.channel.id;

    // If channelName is set, then delete it from database
    if (announcementChannel) {
     await Channel.deleteMany({ name: /[0-9]*/ });
    }

    // Set new channel
    announcementChannel = <TextChannel>(await client.channels.fetch(channelName));

    const newChannel = new Channel({
      name: channelName,
    });

    await newChannel.save();

    msg.channel.send(`Set notification channel to ${channelName}!`);

  } else if(command == '!setrole') {
    // TODO: Check if valid role in guild

    if (!authorizedUsers.includes(msg.author.id)) {
      msg.channel.send('You are not authorized.')
    }

    if (!param) return;

    // If notifyRole is set, then delete it from database
    if (notifyRole.length != 0) {
     await Role.deleteMany({ name: /[a-zA-Z0-9]*/ });
    }

    notifyRole = param;

    const newRole = new Role({
      name: param,
    });

    msg.channel.send(`Set new role to ${param}!`);

    await newRole.save();
  }
});

async function isStreamLive(userName: string) {
	const user = await tc.helix.users.getUserByName(userName);
	if (!user) {
		return false;
	}
	return await user.getStream() !== null;
}

const sleep = (waitTimeInMs: number) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

async function start() {
  // Fetch needed data
  const fetchChannel = await Channel.findOne();
  const channelName = (fetchChannel) ? fetchChannel.name : '';
  announcementChannel = <TextChannel>(await client.channels.fetch(channelName));

  const fetchStreamers = await Streamer.find();
  streamerList = fetchStreamers.map(e => e.username);

  const fetchRole = await Role.findOne();
  notifyRole = (fetchRole) ? fetchRole.name : '';

  for (const streamer of streamerList) {
    const isLive = await isStreamLive(streamer);

    if (isLive) {
      liveStreamers.push(streamer);
    }
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (const streamer of streamerList) {
      const isLive = await isStreamLive(streamer);

      if (isLive && !liveStreamers.includes(streamer)) {
        // If there is no notifiable role, then break
        if (notifyRole.length == 0) return;

        announcementChannel.send(`Hey <@&${notifyRole}>s, ${streamer} is streaming! https://twitch.tv/${streamer}`);
        liveStreamers.push(streamer);
      } else if (!isLive && liveStreamers.includes(streamer)) {
        liveStreamers = liveStreamers.filter((e) => e != streamer);
      }
    }
    console.log('liveStreamers', liveStreamers);
    await sleep(60000);
  }
}

start();

