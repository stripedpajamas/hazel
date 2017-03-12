/**
 * Created by petersquicciarini on 3/9/17.
 */

const Botkit = require('botkit');
const winston = require('winston');
const url = require('url');
const http = require('http');
const quotes = require('./lib/quotes');
const freshservice = require('./lib/freshservice');
const request = require('request');

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
  ticketSystemAPIKey: process.env.ticketSystemAPIKey,
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
  winston.log('info', 'Hazel heard a ticket # pattern. Calling FreshService API for details...');
  const ticketID = message.match[1];
  if (process.env.ticketSystemAPIKey) {
    const reqOptions = freshservice(connectionInfo.ticketSystemUrl, connectionInfo.ticketSystemAPIKey, 'GET', `${ticketID}.json`);
    request(reqOptions, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        winston.log('warning', 'Hazel could not get ticket info from FreshService. Sending link instead...');
        bot.reply(message, url.resolve(connectionInfo.ticketSystemUrl, ticketID));
      } else {
        const ticketInfoMessage = {
          attachments: [{
            title: body.helpdesk_ticket.subject,
            title_link: url.resolve(connectionInfo.ticketSystemUrl, ticketID),
            fields: [
              {
                title: 'Description:',
                value: body.helpdesk_ticket.description_html || body.helpdesk_ticket.description,
                short: false,
              },
            ],
          }],
        };
        bot.reply(message, ticketInfoMessage);
      }
    });
  } else {
    bot.reply(message, url.resolve(connectionInfo.ticketSystemUrl, ticketID));
  }
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
