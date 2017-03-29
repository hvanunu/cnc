'use strict';

const async = require('async');
const http = require('http');
const redis = require("redis");
const getIP = require('ipware')().get_ip;
const maxmind = require('maxmind');
const port = 80;

var redisClient = redis.createClient({
    host: "redis-11449.c13.us-east-1-3.ec2.cloud.redislabs.com",
    port: 11449
});
var server = http.createServer(function (req, res) {
    if (req.method == 'POST') {
        var bodyPlain = '';
        req.on('data', function (data) {
            bodyPlain += data;
        });
        req.on('end', function () {
            var ipInfo = getIP(req);

            switchboard(bodyPlain, ipInfo.clientIp, function (err, ip) {
                if (err) console.log(err)
            });

            setHeaders(res);
            res.end(Date.now().toString());
        });
    }
    else {
        setHeaders(res);
        res.end(Date.now().toString());
    }
});
var setHeaders = function (res) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', false);
    res.writeHead(200, { 'Content-Type': 'text/html' });
};
var setStatsInRedis = function (key, value) {
    var date = new Date();
    var min = date.getMinutes();
    var hour = date.getHours();
    var day = date.getDate();
    var month = date.getMonth();
    var year = date.getFullYear();

    var timeSlotN = year + ":" + month + ":" + day + ":" + hour + ":" + min;
    var timeSlotH = year + ":" + month + ":" + day + ":" + hour
    var timeSlotD = year + ":" + month + ":" + day;
    var timeSlotM = year + ":" + month 
    var timeSlotY = year;

    redisClient.hincrby(timeSlotN + ":" + key, value, 1);
    redisClient.hincrby(timeSlotH + ":" + key, value, 1);
    redisClient.hincrby(timeSlotD + ":" + key, value, 1);
    redisClient.hincrby(timeSlotM + ":" + key, value, 1);
    redisClient.hincrby(timeSlotY + ":" + key, value, 1);
};

var setLocation = function (body, callback) {
    var max = maxmind.open('GeoLite2-City.mmdb', function (err, lookup) {
        var location = lookup.get(body.ip);
        if (location) {
            if (location.continent) body.continentCode = location.continent.code;
            if (location.continent && location.continent.names) body.continentName = location.continent.names.en;
            if (location.country) body.countryCode = location.country.iso_code;
            if (location.country && location.country.names) body.countryName = location.country.names.en;
            if (location.city && location.city.names) body.cityName = location.city.names.en;
            if (location.location) body.longitude = location.location.longitude;
            if (location.location) body.latitude = location.location.latitude;
            callback();
        }
        else {
            callback();
        }
    });
};
var fileReport = function (body, callback) {
    redisClient.hmset(body.ip, body, function (err) {
        if (!err) {
            redisClient.expire([body.ip, 60], function (err) {
                if (err) {
                    console.log(err);
                }
                else {
                    return callback();
                }
            });
        }
        else {
            console.log(err);
        }
    });
};
var collectStats = function (body, callback) {
    async.forEachOf(body,
        function (value, key, iteratorCallback) {
            setStatsInRedis(key, value);
            iteratorCallback();
        },
        function (err) {
            callback();
        }
    );
}

var switchboard = function (body, callback) {
    var profileFlow = [setLocation, fileReport, collectStats];

    if (!body) return callback('nobody');

    var jsonMessage;
    try { jsonMessage = JSON.parse(body) } catch (e) { return callback(e);}

    if (jsonMessage) {
        async.applyEachSeries(profileFlow, jsonMessage,
            function (err) {
                if (err) callback(err, null);
                else callback(null, jsonMessage.ip);
            });
    }
};

module.exports.test = function (body, callback) {
    switchboard(body, callback);
}

redisClient.on("error", function (err) {
    console.log("Error " + err);
});
server.listen(port);
console.log('Listening at port: ' + port);
