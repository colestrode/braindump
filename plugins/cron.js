const schedule = require('node-schedule');
const Promise = require('bluebird');
const request = Promise.promisify(require('request'));

module.exports = {
  init: (controller) => {
    schedule.scheduleJob('0/30 * * * *', () => {
      return controller.storage.teams.allAsync()
        .then((teams) => Promise.map(teams, sendMessages, { concurrency: 5 }))
    });
  }
};

function sendMessages(team) {
  // get all scheduled messages, get access token for APP
  const token = team.bot.app_token;
  const scheduledMessages = team.scheduledMessages || [];
  // TODO filter by time
  return Promise.map(scheduledMessages, (message) => sendMessage(token, message), { concurrency: 5 });
}

function sendMessage(token, message) {
  const userInfo = {
    method: 'post',
    url: 'https://slack.com/api/users.info',
    form: {
      token: token,
      user: message.sender
    }
  };

  const openIm = {
    method: 'post',
    url: 'https://slack.com/api/im.open',
    form: {
      token,
      user: message.recipient
    }
  };

  const postMessage = {
    method: 'post',
    url: 'https://slack.com/api/chat.postMessage',
    json: true,
    form: {
      token,
      as_user: false,
      text: message.message
    }
  };

  return request(userInfo)
    .then(sanitizeResponse)
    .then((body) => {
      const user = body.user;
      postMessage.form.icon_url = user.profile.image_48;
      postMessage.form.username = user.real_name;
      return request(openIm);
    })
    .then(sanitizeResponse)
    .then((body) => {
      postMessage.form.channel = body.channel.id;
      return request(postMessage);
    })
    // TODO need controller to delete message once sent
    // TODO send a copy to the sender
    .catch((err) => console.log(err)); // eslint-disable-line no-console;
}

function sanitizeResponse(response) {
  if (response.statusCode >= 400) {
    throw new Error('Error posting to Slack API', response.body);
  }

  const body = JSON.parse(response.body);
  if (response.body.ok) {
    throw new Error('Error posting to Slack API', response.body);
  }

  return body;
}
