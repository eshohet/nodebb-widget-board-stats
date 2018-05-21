'use strict';

var async = module.parent.require('async');
var nconf = module.parent.require('nconf');
var db = module.parent.require('./database');
var user = module.parent.require('./user');
var utils = module.parent.require('./utils');

var socketPlugins = module.parent.require('./socket.io/plugins');

var app;

var Widget = module.exports;

Widget.init = function (params, callback) {
	app = params.app;
	callback();
};

socketPlugins.boardStats = {};
socketPlugins.boardStats.get = function (socket, tid, callback) {
	getWidgetData(callback);
};


function getWidgetData(callback) {
	async.parallel({
		global: function (next) {
			db.getObjectFields('global', ['topicCount', 'postCount', 'userCount'], next);
		},
		latestUser: getLatestUser,
		activeUsers: getActiveUsers,
		onlineUsers: Widget.updateAndGetOnlineUsers,
	}, function (err, results) {
		if (err) {
			return callback(err);
		}

		var data = {
			count: utils.makeNumberHumanReadable(results.onlineUsers.onlineCount + results.onlineUsers.guestCount),
			members: utils.makeNumberHumanReadable(results.onlineUsers.onlineCount),
			guests: utils.makeNumberHumanReadable(results.onlineUsers.guestCount),
			list: joinUsers(results.activeUsers),
			posts: utils.makeNumberHumanReadable(results.global.postCount ? results.global.postCount : 0),
			topics: utils.makeNumberHumanReadable(results.global.topicCount ? results.global.topicCount : 0),
			registered: utils.makeNumberHumanReadable(results.global.userCount ? results.global.userCount : 0),
			latest: joinUsers(results.latestUser),
			relative_path: nconf.get('relative_path'),
			mostUsers: {
				date: (new Date(parseInt(results.onlineUsers.timestamp, 10))).toDateString(),
				total: results.onlineUsers.total,
			},
		};


		callback(null, data);
	});
}

function getActiveUsers(callback) {
	async.waterfall([
		function (next) {
            db.getSortedSetRevRangeByScore('users:online', 0, 1000, '+inf', + new Date() - 300000*12*24, next);
			// user.getUidsFromSet('users:online', 0, 19, next);
		},
		function (uids, next) {
			user.getUsersFields(uids, ['username', 'userslug', 'status'], next);
		},
	], function (err, data) {
		if (err) {
			return callback(err);
		}

		// data = data.filter(function (a) { return a.status === 'online'; });
		callback(err, data);
	});
}

function getLatestUser(callback) {
	async.waterfall([
		function (next) {
			user.getUidsFromSet('users:joindate', 0, 0, next);
		},
		function (uids, next) {
			user.getUsersWithFields(uids, ['username', 'userslug'], 0, next);
		},
	], callback);
}

function joinUsers(usersData) {
	var str = [];
	for (var i = 0, ii = usersData.length; i < ii; i++) {
		str.push('<a href="' + nconf.get('relative_path') + '/user/' + usersData[i].userslug + '">' + usersData[i].username + '</a>');
	}

	return str.join(', ');
}

Widget.updateAndGetOnlineUsers = function (callback) {
	callback = typeof callback === 'function' ? callback : function () {};

	async.waterfall([
		function (next) {
			var now = Date.now();
			db.sortedSetCount('users:online', now - 300000*12*24, '+inf', next);
		},
		function (onlineCount, next) {
            db.sortedSetCount('ip:recent', + new Date() - 86400000, '+inf', (err, results) => next(err, {
                onlineCount: parseInt(onlineCount, 10),
                guestCount: parseInt(results, 10),
			}));
		},
		function (users, next) {
			db.getObjectFields('plugin:widget-board-stats', ['total', 'timestamp'], function (err, data) {
				if (err) {
					return next(err);
				}

				var totalUsers = users.onlineCount + users.guestCount;
				data.timestamp = data.timestamp || Date.now();

				if (parseInt(data.total || 0, 10) <= totalUsers) {
					data.timestamp = Date.now();
					data.total = totalUsers;
					db.setObject('plugin:widget-board-stats', data);
				}

				data.onlineCount = users.onlineCount;
				data.guestCount = users.guestCount;
				return next(null, data);
			});
		},
	], callback);
};

Widget.renderWidget = function (widget, callback) {
	getWidgetData(function (err, data) {
		if (err) {
			return callback(err);
		}

		app.render('widgets/board-stats', data, callback);
	});
};

Widget.defineWidgets = function (widgets, callback) {
	var widget = {
		widget: 'board-stats',
		name: 'Board Stats',
		description: 'Classical board stats widget in real-time.',
		content: 'admin/board-stats',
	};

	app.render(widget.content, {}, function (err, html) {
		widget.content = html;
		widgets.push(widget);
		callback(err, widgets);
	});
};
