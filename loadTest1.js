var app = require('./server.js');
var async = require('async');
const redis = require("redis");
var redisClient = redis.createClient({
    host: "redis-11449.c13.us-east-1-3.ec2.cloud.redislabs.com",
    port: 11449
});

var Chance = require('chance');
var chance = new Chance();

var test = function (n, next) {

    var ip = chance.ip();

    app.test('{"ip":"' + ip + '"}', function (err, ip) {
        console.log("ip", ip);
    });

    next();
};
async.timesLimit(500, 50, test, function (err) { });




