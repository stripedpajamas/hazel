/**
 * Created by petersquicciarini on 3/9/17.
 */

const Botkit = require('botkit');
const winston = require('winston');
const url = require('url');
const http = require('http');
const quotes = require('./quotes');

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

const hazel = controller.spawn({
  token: connectionInfo.slackToken,
});

let startCount = 0;

function startHazel() {
  if (startCount >= 10) {
    winston.log('error', 'Something went wrong. Hazel tried 10 times to connect to Slack without success.');
    process.exit();
  }
  hazel.startRTM((err) => {
    if (err) {
      winston.log('warning', 'Hazel could not connect to Slack. Retrying in 10 seconds...');
      setTimeout(() => {
        winston.log('info', '10 seconds are up. Retrying...');
        startCount += 1;
        winston.log('warning', `Have tried getting Hazel up and going ${startCount} times now.`);
        startHazel();
      }, 10000);
    } else {
      winston.log('info', 'Hazel is connected to Slack!');
      startCount = 0;
    }
  });
}

startHazel();


controller.hears(['ticket ([0-9]+)'], ['ambient'], (bot, message) => {
  winston.log('info', 'Hazel heard a ticket # pattern. Sending reply...');
  bot.reply(message, url.resolve(connectionInfo.ticketSystemUrl, message.match[1]));
});

controller.hears(['quote', 'proverb', 'wisdom'], ['direct_mention'], (bot, message) => {
  winston.log('info', 'Hazel heard someone mention her directly. Sending reply...');
  bot.reply(message, quotes.getRandomQuote());
});

controller.on('rtm_close', () => {
  winston.log('warning', 'Hazel somehow lost connection to Slack. Going to try to connect again.');
  startCount += 1;
  startHazel();
});