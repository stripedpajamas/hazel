/**
 * Created by petersquicciarini on 3/9/17.
 */

const winston = require('winston');

if (!process.env.slackClientID || !process.env.slackClientSecret ||
  !process.env.ticketSystemUrl || !process.env.PORT || !process.env.mongoUri ||
  !process.env.escalationTeam) {
  winston.log('error', 'Please see README for required env vars.');
  process.exit();
}

const Botkit = require('botkit');
const mongoStorage = require('botkit-storage-mongo')({ mongoUri: process.env.mongoUri });
const url = require('url');
const quotes = require('./lib/quotes');
const freshservice = require('./lib/freshservice');
const request = require('request');

const connectionInfo = {
  slackClientID: process.env.slackClientID,
  slackClientSecret: process.env.slackClientSecret,
  ticketSystemUrl: process.env.ticketSystemUrl,
  ticketSystemAPIKey: process.env.ticketSystemAPIKey,
};
const controller = Botkit.slackbot({
  storage: mongoStorage,
}).configureSlackApp({
  clientId: connectionInfo.slackClientID,
  clientSecret: connectionInfo.slackClientSecret,
  scopes: ['bot', 'chat:write:bot', 'users:read', 'channels:read'],
});

controller.setupWebserver(process.env.PORT, () => {
  controller.createWebhookEndpoints(controller.webserver);
  controller.createHomepageEndpoint(controller.webserver);
  controller.createOauthEndpoints(controller.webserver, (err, req, res) => {
    if (err) {
      res.status(500).send(`ERROR: ${err}`);
    } else {
      res.send('Success!');
    }
  });
});


// just a simple way to make sure we don't
// connect to the RTM twice for the same team
const activeBots = {};
function trackBot(bot) {
  activeBots[bot.config.token] = bot;
}

controller.on('create_bot', (bot) => {
  if (activeBots[bot.config.token]) {
    // already online! do nothing.
  } else {
    bot.startRTM((err) => {
      if (!err) {
        trackBot(bot);
      }
    });
  }
});

controller.storage.teams.all((err, teams) => {
  if (err) {
    throw new Error(err);
  }
  // connect all teams with bots up to slack!
  Object.keys(teams).forEach((t) => {
    if (teams[t].bot) {
      controller.spawn(teams[t]).startRTM((startErr, bot) => {
        if (startErr) {
          winston.log('error', 'Could not connect to Slack RTM.');
        } else {
          trackBot(bot);
        }
      });
    }
  });
});
controller.on('rtm_open', () => {
  winston.log('info', '** The RTM api just connected!');
});
controller.on('rtm_close', (bot) => {
  winston.log('warn', '** The RTM api just closed');
  bot.startRTM((err) => {
    if (!err) {
      trackBot(bot);
    }
  });
});


// *** Begin Ticket Info/Link Handler *** //
controller.hears(['ticket ([0-9]+)'], ['ambient'], (bot, message) => {
  winston.log('info', 'Hazel heard a ticket # pattern. Crafting reply...');
  bot.api.channels.info({ channel: message.channel }, (err, info) => {
    if (err) {
      winston.log('error', 'Hazel could not get channel info.');
    } else {
      winston.log('debug', 'Hazel got the channel info.');
      if (info.channel.name === 'emg') {
        winston.log('info', 'We are in the EMG channel. Sending buttons...');
        const emgTicketReply = {
          username: 'hazel',
          icon_emoji: ':octopus:',
          text: "On Call Tech: Let everyone know you're taking care of it, and escalate if you need to:",
          attachments: [
            {
              fallback: "(Sorry. I couldn't make the cool buttons this time.)",
              callback_id: 'emgResponse',
              actions: [
                {
                  name: 'acceptEmg',
                  text: "I've got it.",
                  style: 'primary',
                  type: 'button',
                },
                {
                  name: 'escalateEmg',
                  text: 'I need to escalate!',
                  type: 'button',
                },
              ],
            },
          ],
        };
        bot.reply(message, emgTicketReply);
      } else {
        const ticketID = message.match[1];
        if (process.env.ticketSystemAPIKey) {
          bot.startTyping(message);
          winston.log('info', 'Looks like an API key for FreshService was provided. Will try to get ticket info...');
          const reqOptions = freshservice(connectionInfo.ticketSystemUrl, connectionInfo.ticketSystemAPIKey, 'GET', `${ticketID}.json`);
          request(reqOptions, (reqErr, res, body) => {
            winston.log('debug', 'Just sent request to FreshService.');
            if (err || res.statusCode !== 200) {
              winston.log('warning', 'Hazel could not get ticket info from FreshService. Sending link instead...');
              bot.reply(message, {
                text: url.resolve(connectionInfo.ticketSystemUrl, ticketID),
                username: 'hazel',
                icon_emoji: ':octopus:',
              });
            } else {
              winston.log('debug', 'Got a good response from FreshService. Sending ticket stub...');
              const ticketInfoMessage = {
                username: 'hazel',
                icon_emoji: ':octopus:',
                attachments: [{
                  title: `Ticket ${ticketID}: ${body.helpdesk_ticket.subject}`,
                  title_link: url.resolve(connectionInfo.ticketSystemUrl, ticketID),
                  fields: [
                    {
                      title: 'Description',
                      value: `${body.helpdesk_ticket.description.substring(0, 300)}...`,
                      short: false,
                    },
                    /*
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
                    */
                  ],
                }],
              };
              bot.stopTyping(message);
              bot.reply(message, ticketInfoMessage);
            }
          });
        } else {
          winston.log('info', 'No API key provided, so just sending the URL to the ticket...');
          bot.reply(message, {
            text: url.resolve(connectionInfo.ticketSystemUrl, ticketID),
            username: 'hazel',
            icon_emoji: ':octopus:',
          });
        }
      }
    }
  });
});
// *** End Ticket Info/Link Handler *** //

// *** Begin Quote Handler *** //
controller.hears(['quote', 'proverb', 'wisdom'], ['direct_mention'], (bot, message) => {
  winston.log('info', 'Hazel heard someone mention her directly. Sending reply...');
  bot.reply(message, {
    username: 'hazel',
    icon_emoji: ':octopus:',
    text: quotes.getRandomQuote(),
  });
});
// *** End Quote Handler *** //

// *** Begin EMG Buttons Handler *** //
controller.on('interactive_message_callback', (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, info) => {
    let buttonPresser = null;
    if (err) {
      winston.log('error', 'Could not get user name of button presser');
    } else {
      buttonPresser = info.user.name;
    }
    if (message.actions[0].name === 'acceptEmg') {
      bot.replyInteractive(message, {
        username: 'hazel',
        icon_emoji: ':octopus:',
        text: message.original_message.text,
        attachments: [
          {
            fallback: "(Sorry. I couldn't make the cool buttons this time.)",
            callback_id: 'emgResponse',
            actions: [
              {
                name: 'escalateEmg',
                text: 'I need to escalate!',
                type: 'button',
              },
            ],
          },
        ],
      });
      bot.reply(message, {
        text: `<!everyone> ${buttonPresser || 'A tech'} is taking care of this emergency.`,
        username: 'hazel',
        icon_emoji: ':octopus:',
      });
    }
    if (message.actions[0].name === 'escalateEmg') {
      bot.replyInteractive(message, {
        username: 'hazel',
        icon_emoji: ':octopus:',
        text: message.original_message.text,
        attachments: [
          {
            fallback: 'Tech needs to escalate!',
            text: '*Message sent to the escalation team for help.*',
            mrkdwn_in: ['text'],
          },
        ],
      });
      const escalationTeam = process.env.escalationTeam.split(/,\s?/);
      escalationTeam.forEach((person) => {
        bot.say({
          username: 'hazel',
          icon_emoji: ':octopus:',
          channel: `@${person}`,
          text: `${buttonPresser || 'The On Call Tech'} needs to escalate the emergency.`,
        });
      });
    }
  });
});
// *** End EMG Buttons Handler *** //
