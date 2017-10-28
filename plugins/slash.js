const moment = require('moment-timezone');
const _ = require('lodash');
const hours = [{
  label: '9:00 AM',
  value: '09:00'
}, {
  label: '9:30 AM',
  value: '09:30'
}, {
  label: '10:00 AM',
  value: '10:00'
}, {
  label: '10:30 AM',
  value: '10:30'
}, {
  label: '11:00 AM',
  value: '11:00'
}, {
  label: '11:30 AM',
  value: '11:30'
}, {
  label: '12:00 PM',
  value: '12:00'
}, {
  label: '12:30 PM',
  value: '12:30'
}, {
  label: '1:00 PM',
  value: '13:00'
}, {
  label: '1:30 PM',
  value: '13:30'
}, {
  label: '2:00 PM',
  value: '14:00'
}, {
  label: '2:30 PM',
  value: '14:30'
}, {
  label: '3:00 PM',
  value: '15:00'
}, {
  label: '3:30 PM',
  value: '15:30'
}, {
  label: '4:00 PM',
  value: '16:00'
}, {
  label: '4:30 PM',
  value: '16:30'
}, {
  label: '5:00 PM',
  value: '17:00'
}, {
  label: '5:30 PM',
  value: '17:30'
}, {
  label: '6:00 PM',
  value: '18:00'
}, {
  label: '6:30 PM',
  value: '18:30'
}, {
  label: '7:00 PM',
  value: '19:00'
}, {
  label: '7:30 PM',
  value: '19:30'
}, {
  label: '8:00 PM',
  value: '20:00'
}, {
  label: '8:30 PM',
  value: '20:30'
}, {
  label: '9:00 PM',
  value: '21:00'
}, {
  label: '9:30 PM',
  value: '21:30'
}, {
  label: '10:00 PM',
  value: '22:00'
}, {
  label: '10:30 PM',
  value: '22:30'
}, {
  label: '11:00 PM',
  value: '23:00'
}, {
  label: '11:30 PM',
  value: '23:30'
}, {
  label: '12:00 AM',
  value: '00:00'
}, {
  label: '12:30 AM',
  value: '00:30'
}, {
  label: '1:00 AM',
  value: '01:00'
}, {
  label: '1:30 AM',
  value: '01:30'
}, {
  label: '2:00 AM',
  value: '02:00'
}, {
  label: '2:30 AM',
  value: '02:30'
}, {
  label: '3:00 AM',
  value: '03:00'
}, {
  label: '3:30 AM',
  value: '03:30'
}, {
  label: '4:00 AM',
  value: '04:00'
}, {
  label: '4:30 AM',
  value: '04:30'
}, {
  label: '5:00 AM',
  value: '05:00'
}, {
  label: '6:30 AM',
  value: '06:30'
}, {
  label: '7:00 AM',
  value: '07:00'
}, {
  label: '7:30 AM',
  value: '07:30'
}, {
  label: '8:00 AM',
  value: '08:00'
}, {
  label: '8:30 AM',
  value: '08:30'
}];

module.exports = {
  init: (controller) => {
    controller.on('slash_command', (bot, message) => {

      if (message.command !== '/braindump') {
        return true;
      }

      const dates = [];
      const currentDate = moment.utc().startOf('day');
      for(let i = 0; i < 7; i++) {
        dates.push({
          label: currentDate.format('dddd, MMMM Do'),
          value: currentDate.format('YYYY-MM-DD')
        });
        currentDate.add(1, 'days');
      }

      dates[0].label += ' (today)';

      const dialog = bot.createDialog()
        .title('Schedule a Message')
        .callback_id('braindump')
        .submit_label('Schedule')
        .addTextarea('Send This Message', 'message', null, { placeholder: 'Here is my message' })
        .addText('To', 'to', null, { placeholder: '@someone'})
        .addSelect('On', 'date', null, dates, { placeholder: 'Choose a date' })
        .addSelect('At (their local time)', 'time', null, hours, { placeholder: 'Choose a time' });
      
      bot.replyWithDialog(message, dialog.asObject(), (err, res) => {
        if (err) {
          console.log('error replying with dialog', err.message); // eslint-disable-line no-console          
        }
      });
    });

    controller.middleware.receive.use((bot, message, next) => {
      if (!(message.type === 'dialog_submission' && message.callback_id === 'braindump')) {
        return next();
      }

      const submission = message.submission;
      
      bot.api.users.list({}, (err, res) => {
        if (err) {
          return console.log('error fetching users', err.message); // eslint-disable-line no-console
        }

        const errors = [];

        const name = submission.to.replace(/^@/, '');
        submission.user = _.find(res.members, { name });
        if (!submission.user) {
          return bot.dialogError({
            name: 'to',
            error: 'User not found'
          });
        }

        submission.scheduleDate = moment.tz(`${submission.date}T${submission.time}`, submission.user.tz).toISOString();

        const now = moment();
        if (!now.isBefore(submission.scheduleDate)) {

          let validationField = 'date';
          if (now.isSame(submission.scheduleDate, 'day')) {
            validationField = 'time';
          }

          return bot.dialogError({
            name: validationField,
            error: 'Messages must be scheduled in the future.'
          });
        }
        
        next();
      });
    });

    controller.on('dialog_submission', (bot, message) => {
      const errorMessage = "Error saving message";
      const submission = message.submission;
      const teamId = message.team.id;
      controller.storage.teams.get(teamId, (err, team) => {
        if (err) {
          console.log(teamId); // eslint-disable-line no-console
          return console.log(errorMessage, err); // eslint-disable-line no-console
        }

        if (!team.scheduledMessages) {
          team.scheduledMessages = [];
        }

        team.scheduledMessages.push({
          scheduleDate: submission.scheduleDate,
          userId: submission.user.id,
          message: submission.message
        });

        controller.storage.teams.save(team, (err) => {
          if (err) {
            return console.log(errorMessage, err); // eslint-disable-line no-console
          }
          bot.dialogOk();
        });
      });
    });
  }
}