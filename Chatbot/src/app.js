'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const TwilioBot = require('./twiliobot');
const TwilioBotConfig = require('./twiliobotconfig');

const REST_PORT = (process.env.PORT || 5000);
const DEV_CONFIG = process.env.DEVELOPMENT_CONFIG == 'true';

const APIAI_ACCESS_TOKEN = 'aa8f13b266e045428f34095f32bd05b9';
const APIAI_LANG = 'en';

// console timestamps
require('console-stamp')(console, 'yyyy.mm.dd HH:MM:ss.l');

const botConfig = new TwilioBotConfig(APIAI_ACCESS_TOKEN, APIAI_LANG);
const bot = new TwilioBot(botConfig);

const app = express();

app.use(bodyParser.urlencoded({extended: true}));

app.post('/sms', (req, res) => {

    console.log('POST sms received');

    try {
        bot.processMessage(req, res);
    } catch (err) {
        return res.status(400).send('Error while processing ' + err.message);
    }
});

app.listen(REST_PORT, function () {
    console.log('Rest service ready on port ' + REST_PORT);
});