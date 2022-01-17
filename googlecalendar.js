const { client_email, private_key, apis } = require('./secrets.json').google;
const { google } = require('googleapis');
const { JWT } = google.auth;

module.exports = class GoogleCalendar {

    constructor(calendarId) {
      this.calendarId = calendarId;
      this.auth = new JWT(client_email, null, private_key, apis);
      this.calendar = google.calendar({ version: "v3", auth: this.auth });
    }

    createEvent(summary, location, startDate, endDate, timeZone) {
        const calEvent = {
            summary,
            location,
            start: {
                dateTime: startDate.toDate(),
                timeZone,
            },
            end: {
                dateTime: endDate.toDate(),
                timeZone,
            }
        };

        this.calendar.events.insert({
            calendarId: this.calendarId,
            resource: calEvent,
        }, (err, res) => {
            if (err) {
                console.log("Error: ", err);
                return;
            }
            console.log("Event Created: ", res.data.htmlLink);
        });
    }
    
}