/**
 * Created by petersquicciarini on 3/9/17.
 */

const Botkit = require('botkit');
const winston = require('winston');
const url = require('url');
const http = require('http');

if (!process.env.slackToken || !process.env.ticketSystemUrl) {
  winston.log('error', 'You need to provide the slackToken and ticketSystemUrl as env vars.');
  process.exit();
}

if (process.env.PORT) {
  http.createServer((req, res) => {
    res.end('Hazel says hi! Go to https://github.com/stripedpajamas/hazel for more info.');
  }).listen(process.env.PORT);
}

const connectionInfo = {
  slackToken: process.env.slackToken,
  ticketSystemUrl: process.env.ticketSystemUrl,
};
const controller = Botkit.slackbot({
  debug: false,
});

controller.spawn({
  token: connectionInfo.slackToken,
}).startRTM((err) => {
  if (err) {
    winston.log('error', 'Hazel could not connect to Slack. Sorry.');
  } else {
    winston.log('info', 'Hazel is connected to Slack!');
  }
});

controller.hears(['ticket ([0-9]+)'], ['ambient'], (bot, message) => {
  winston.log('info', 'Hazel heard a ticket # pattern. Sending reply...');
  bot.reply(message, url.resolve(connectionInfo.ticketSystemUrl, message.match[1]));
  // `${connectionInfo.ticketSystemUrl}${message.match[1]}`
});
