"use strict";

const path = require("path");
const request = require("request");
const logger = require("winston");
const querystring = require('querystring');
const UserStatisticsWrapper = require("./stats_wrapper");
const { default: fetch } = require("node-fetch");
const config = require(path.join(__dirname, "../../config/config"));


function HiveClient (options) {
	if (!(this instanceof HiveClient)) {
		return new HiveClient(options);
	}
	this.baseUrl = config.hive2_url;
}

HiveClient.prototype.getUserStats = function (user, callback) {
	if (!user || !user.hive.id) {
		return callback(new Error("Invalid user instance supplied"));
	}
	return request({
		url: `${config.hive_url}/api/get/playerData/${user.hive.id}`,
		json: true
	}, (error, response, body) => {
		return callback(error, response, new UserStatisticsWrapper(body));
	});
};

HiveClient.prototype.getUserStatsV2 = function (user, callback) {
	if (!user || !user.hive.id) {
		return callback(new Error("Invalid user instance supplied"));
	}
	return request({
		url: `${config.hive2_url}/api/get/playerData/${user.hive.id}`,
		json: true
	}, (error, response, body) => {
		return callback(error, response, new UserStatisticsWrapper(body));
	});
};

HiveClient.prototype.getUserStatsV2 = function (user, callback) {
	if (!user || !user.hive.id) {
		return callback(new Error("Invalid user instance supplied"));
	}
	return request({
		url: `${config.hive2_url}/api/get/playerData/${user.hive.id}`,
		json: true
	}, (error, response, body) => {
		return callback(error, response, new UserStatisticsWrapper(body));
	});
};

HiveClient.prototype.getUserStatsPromise = async function (user) {
	if (!user || !user.hive.id) {
		return new Error("Invalid user instance supplied");
    }
    try {
        const url = `${config.hive2_url}/api/get/playerData/${user.hive.id}`;
        return await fetch(url).then(res => res.jons());
    } catch(err) {
        return err;
    }
};

module.exports = HiveClient;
