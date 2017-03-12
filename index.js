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
  winston.log('info', 'Hazel heard a ticket # pattern. Crafting reply...');
  const ticketID = message.match[1];
  if (process.env.ticketSystemAPIKey) {
    winston.log('info', 'Looks like an API key for FreshService was provided. Will try to get ticket info...');
    const reqOptions = freshservice(connectionInfo.ticketSystemUrl, connectionInfo.ticketSystemAPIKey, 'GET', `${ticketID}.json`);
    request(reqOptions, (err, res, body) => {
      winston.log('debug', 'Just sent request to FreshService.');
      if (err || res.statusCode !== 200) {
        winston.log('warning', 'Hazel could not get ticket info from FreshService. Sending link instead...');
        bot.reply(message, url.resolve(connectionInfo.ticketSystemUrl, ticketID));
      } else {
        winston.log('debug', 'Got a good response from FreshService. Sending ticket stub...');
        const ticketInfoMessage = {
          attachments: [{
            title: `Ticket ${ticketID}: ${body.helpdesk_ticket.subject}`,
            title_link: url.resolve(connectionInfo.ticketSystemUrl, ticketID),
            fields: [
              {
                title: 'Description',
                value: `${body.helpdesk_ticket.description.substring(0, 300)}...`,
                short: false,
              },
              {
                title: 'Requester',
                value: body.helpdesk_ticket.requester_name,
                short: true,
              },
              {
                title: 'Agent',
                value: body.helpdesk_ticket.responder_name,
                short: true,
              },
              {
                title: 'Status',
                value: body.helpdesk_ticket.status_name,
                short: true,
              },
              {
                title: 'Priority',
                value: body.helpdesk_ticket.priority_name,
                short: true,
              },
            ],
          }],
        };
        bot.reply(message, ticketInfoMessage);
      }
    });
  } else {
    winston.log('info', 'No API key provided, so just sending the URL to the ticket...');
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
