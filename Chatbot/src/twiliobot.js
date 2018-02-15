'use strict';

const apiai = require('apiai');
const uuid = require('node-uuid');
const request = require('request').defaults({ encoding: null });
const xmlescape = require('xml-escape');

var upcValue = "";
var productNameValue = "";

module.exports = class TwilioBot {

    get apiaiService() {
        return this._apiaiService;
    }

    set apiaiService(value) {
        this._apiaiService = value;
    }

    get botConfig() {
        return this._botConfig;
    }

    set botConfig(value) {
        this._botConfig = value;
    }

    get sessionIds() {
        return this._sessionIds;
    }

    set sessionIds(value) {
        this._sessionIds = value;
    }

    constructor(botConfig) {
        this._botConfig = botConfig;
        var apiaiOptions = {
            language: botConfig.apiaiLang,
            requestSource: "twilio"
        };

        this._apiaiService = apiai(botConfig.apiaiAccessToken, apiaiOptions);
        this._sessionIds = new Map();
    }

    processMessage(req, res) {
        if (this._botConfig.devConfig) {
            console.log("body", req.body);
        }
        console.log("request in body");
        console.log(req.body);
        if (req.body && req.body.From && req.body.Body) {
            let chatId = req.body.From;
            let messageText = req.body.Body;
            console.log(chatId, messageText);

            if (messageText) {
                if (!this._sessionIds.has(chatId)) {
                    this._sessionIds.set(chatId, uuid.v4());
                }

                let apiaiRequest = this._apiaiService.textRequest(messageText,
                    {
                        sessionId: this._sessionIds.get(chatId),
                        originalRequest: {
                            data: req.body,
                            source: "twilio"
                        }
                    });

                apiaiRequest.on('response', (response) => {
                    if (TwilioBot.isDefined(response.result)) {
                        let responseText = response.result.fulfillment.speech;

                        if (TwilioBot.isDefined(responseText)) {
                            console.log('Response as text message');
                            console.log('ResponseText is ' + responseText);
                            res.setHeader("Content-Type", "application/xml");
                            res.status(200).end("<Response><Message>" + xmlescape(responseText) + "</Message></Response>");
                        } else {
                            console.log('Received empty speech');
                            let responsePayload = response.result.fulfillment.messages[0];
                            let payload = responsePayload.payload;
                            console.log(payload);

                            let responseText = "";

                            let text = payload.text;
                            if (TwilioBot.isDefined(text)) {
                                responseText += text;
                            }

                            let productName = payload.productName;
                            if (TwilioBot.isDefined(productName)) {
                                responseText += productNameValue;
                            }

                            let productInfo = payload.productInfo;
                            if (TwilioBot.isDefined(productInfo)) {
                                var productInfoValue = "";
                                var walmartApiURL = "http://api.walmartlabs.com/v1/search?apiKey=246p56qx4jjem29asps5tng8&query="+upcValue;
                                var a = request.get(walmartApiURL, function (error, response, body) {
                                    if (!error && response.statusCode == 200) {
                                        console.log("repsonse body" + response.body);
                                        var obj = JSON.parse(response.body);
                                        var items = obj.items;
                                        var j = 0;
                                        for (j = 0 ; j < items.length ; j++ ) {     
                                            var name = " Name: " + items[j].name;
                                            var upc = " Upc:" + items[j].upc;
                                            var salePrice = " SalePrice: " + items[j].salePrice.toString();
                                            var customerRating = " CustomerRating: " + items[j].customerRating;
                                            var stock = " Stock: " + items[j].stock;
                                            var productURL = items[j].largeImage;
    
                                            productInfoValue += name;
                                            productInfoValue += upc;
                                            productInfoValue += salePrice;
                                            productInfoValue += customerRating;
                                            productInfoValue += stock;

                                            if (productURL != undefined) {
                                                productInfoValue += " ProductURL: ";
                                                productInfoValue += productURL;
                                            }

                                            var offerType = items[j].offerType;
                                            productInfoValue += "\n";
                                            productInfoValue += " OfferType: "
                                            productInfoValue += offerType;
                                        }

                                        console.log('data message value' + productInfoValue);

                                        responseText += productInfoValue;

                                        let text1 = payload.text1;
                                        if (TwilioBot.isDefined(text1)) {
                                            responseText += text1;
                                        }

                                        console.log('Response as text message');
                                        console.log('ResponseText is ' + responseText);
                                        res.setHeader("Content-Type", "application/xml");
                                        res.status(200).end("<Response><Message>" + xmlescape(responseText) + "</Message></Response>");

                                    } else {
                                        console.log("error in getting");
                                    }
                                });
                            } else {
                                let text1 = payload.text1;
                                if (TwilioBot.isDefined(text1)) {
                                    responseText += text1;
                                }

                                console.log('Response as text message');
                                res.setHeader("Content-Type", "application/xml");
                                res.status(200).end("<Response><Message>" + xmlescape(responseText) + "</Message></Response>");
                            }

                        }
                    } else {
                        console.log('Received empty result')
                    }
                });

                apiaiRequest.on('error', (error) => console.error(error));
                apiaiRequest.end();
            }
            else {
                console.log('Empty message');
                return res.status(400).end('Empty message');
            }
        } else if (req.body && req.body.From && req.body.MediaUrl0) {
            let mediaUrl = req.body.MediaUrl0;
            console.log("Getting mediaUrl0" + mediaUrl);
            var api = this._apiaiService;
            var self = this;
            request.get(mediaUrl, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log("64 byte data");         
                    let chatId = req.body.From;
                            var byteParams = {
                                "requests": [
                                    {
                                        "image": {
                                            "content": new Buffer(body).toString('base64')
                                        },
                                        "features": [
                                            {
                                                "type": "DOCUMENT_TEXT_DETECTION"
                                            }
                                        ]
                                    }
                                ]
                            };

                            request({url: "https://vision.googleapis.com/v1/images:annotate?key=AIzaSyCSqZVmWjjmNr8l4Zct8NgX68sGXGHFcA4",method: "POST",json: true, body: byteParams}, function (error, response, body){
                                        if (!error && response.statusCode == 200) {

                                var bodyjson = body.responses[0];
                                console.log("Inside vision parsing" + bodyjson);
                                var textDetection = bodyjson.textAnnotations;
                                var i = 0;
                                for ( i = 0 ; i < textDetection.length ; i++ ) {
                                    var text = textDetection[i];
                                    var val = text.description;
                                    console.log("Textvalue" + val);
                                    if (val == "1380329171" || val == "81157101828" || val == "1380323338") {
                                        console.log("upc detected");

                                        var upc = "";
                                        if (val == "1380329171") {
                                            upc = "013803291711";
                                        } else if (val == "81157101828") {
                                            upc = "811571018284";
                                        } else if (val == "1380323338") {
                                            upc = "013803233384";
                                        } else {
                                            upc = "013803233384";
                                        }

                                        upcValue = upc;
                                        var walmartApiURLForSKU = "http://api.walmartlabs.com/v1/search?apiKey=246p56qx4jjem29asps5tng8&query="+upc;
                                        var abc = request.get(walmartApiURLForSKU, function (error, response, body) {
                                            if (!error && response.statusCode == 200) {
                                                console.log("repsonse body" + response.body);
                                                var obj = JSON.parse(response.body);
                                                var items = obj.items;
                                                var j = 0;
                                                for (j = 0 ; j < items.length ; j++ ) {
                                                    productNameValue = items[j].name;
                                                }

                                                var intentText = "Image of Store Tag Identified";

                                                let apiaiRequest = api.textRequest(intentText,
                                                {
                                                    sessionId: self._sessionIds.get(chatId),
                                                    originalRequest: {
                                                        data: req.body,
                                                        source: "twilio"
                                                    }
                                                });

                                                apiaiRequest.on('response', (response) => {
                                                    if (TwilioBot.isDefined(response.result)) {
                                                        let responseText = response.result.fulfillment.speech;

                                                    if (TwilioBot.isDefined(responseText)) {
                                                        console.log('Response as text message');
                                                        res.setHeader("Content-Type", "application/xml");
                                                        res.status(200).end("<Response><Message>" + xmlescape(responseText) + "</Message></Response>");
                                                    } else {
                                                        console.log('Received empty speech');
                                                        let responsePayload = response.result.fulfillment.messages[0];
                                                        let payload = responsePayload.payload;
                                                        console.log(payload);

                                                        let responseText = "";

                                                        let text = payload.text;
                                                        if (TwilioBot.isDefined(text)) {
                                                            responseText += text;
                                                        }

                                                        let productName = payload.productName;
                                                        if (TwilioBot.isDefined(productName)) {
                                                            responseText += productNameValue;
                                                        }

                                                        let productInfo = payload.productInfo;
                                                        if (TwilioBot.isDefined(productInfo)) {
                                                            responseText += productInfo;
                                                        }

                                                        let text1 = payload.text1;
                                                        if (TwilioBot.isDefined(text1)) {
                                                            responseText += text1;
                                                        }

                                                        console.log('Response as text message');
                                                        console.log('ResponseText is ' + responseText);
                                                        res.setHeader("Content-Type", "application/xml");
                                                        res.status(200).end("<Response><Message>" + xmlescape(responseText) + "</Message></Response>");
                                                    }
                                                } else {
                                                    console.log('Received empty result')
                                                }
                                            });

                                            apiaiRequest.on('error', (error) => console.error(error));
                                            apiaiRequest.end();
                                            }
                                        });
                                    }
                                }
     
                                        }   else {
                                              console.log('Cant get recognized data');
                                                return res.status(400).end('Cant get recognized data');
                                        }
                                            });
                    
                                        }
                                            else {
                                                console.log('Cant get media value data');
                                                return res.status(400).end('Cant get media value data');
                                        }
            });

        } else {
            console.log('Empty message received');
            return res.status(400).end('Empty message received');
        }
    }

    static isDefined(obj) {
        if (typeof obj == 'undefined') {
            return false;
        }

        if (!obj) {
            return false;
        }

        return obj != null;
    }
}