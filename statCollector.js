const redis = require("redis");
var redisClient = redis.createClient({
    host: "redis-11449.c13.us-east-1-3.ec2.cloud.redislabs.com",
    port: 11449
});


var filter = {};
var connectionsCount = 0; 
var totalWorkSubmiteb = 0; 
var validBeesCount = 0;

var trafficQuality = function () {
    return ValidBeesCount / connectionsCount;
};
var trafficEffectiveness = function () {
    return totalWorkSubmiteb / ValidBeesCount; 
};

var setConnection = function (count){
    connectionsCount = count;
}
var setWork = function (count) {
    totalWorkSubmiteb = count;
}
var setBees = function (count) {
    ValidBeesCount = count;
}
