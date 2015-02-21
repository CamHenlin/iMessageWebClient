var sqlite3 = require('sqlite3').verbose();
var fs = require("fs");
var dir = process.env.HOME + '/Library/Messages/';
var file = process.env.HOME + '/Library/Messages/chat.db';
var applescript = require("./applescript/lib/applescript.js");
var exec = require('exec');
var glob = require('glob');
var express = require('express');
var bodyparser = require("body-parser");
var path = require("path");
var https = require("https");
var certsPath = path.join(__dirname, 'cert');
var caCertsPath = path.join(__dirname, 'ca');
var session = require('express-session');
var app = express();
var options = {};

if (process.argv[2] === "setkey") {
	function buildCerts(callback) {
		// console.log("checking for certs...");
		fs.exists('cert/my-server.key.pem', function (exists) {
			if (!exists) {
				// console.log("rebuilding certs...");
				exec('./buildcerts.sh', function (error, stdout, stderr) {
					// console.log(error);
					// console.log(stdout);
					// console.log(stderr);
					callback();
				});
				return;
			} else {
				// console.log("certs ok...");
			}

			callback();
		});
	}
	buildCerts(function() {
		var readline = require('readline');

		var rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		rl.question("Please enter your desired key: ", function(answer) {
			fs.writeFile('SERVER_KEY', answer, function (err) {
				if (err) return // console.log(err);
				// console.log("Key is set.");
			});

			rl.close();
		});
		return;
	});
} else {
	var key = fs.readFileSync('SERVER_KEY', 'utf8').replace('\n', '');
	if (key === "") {
		// console.log("WARNING: NO KEY HAS BEEN SET, PLEASE FIX BY EXITING WITH CTRL+C AND RUNNING `npm setkey`");
	}

	options = {
		key: fs.readFileSync(path.join(certsPath, 'my-server.key.pem')),
		cert: fs.readFileSync(path.join(certsPath, 'my-server.crt.pem')),
		requestCert: false,
		rejectUnauthorized: false
	};

	app.use(session({
		secret: 'keyboard cat',
		resave: false,
		saveUninitialized: true,
		cookie: { secure: true }
	}))

	app.use(bodyparser.urlencoded({ extended: false }))

	// parse application/json
	app.use(bodyparser.json())

	app.use('/', express.static(__dirname + '/webapp'));

	var exists = fs.existsSync(file);
	if (exists) {
		// console.log("we have a file to monitor!");
	} else {
		// console.log("no dice!");
		return;
	}

	// discover if we are running and old version of OS X or not
	var OLD_OSX = false;
	var os = require('os');
	if (os.release().split('.')[0] === "12") { // 12 is 10.8 Mountain Lion, which does not have named group chats
		OLD_OSX = true;
	}

	// discover whether the keyboard setting "Full Keyboard Access" is set to
	// "Text boxes and lists only" -- error or 1 or less
	// "All controls" (takes 2 tabs instead of one switching between elements in Messages.app) -- 2 or more
	var FULL_KEYBOARD_ACCESS = false; // false for text boxes and lists, true for all controls
	exec('defaults read NSGlobalDomain AppleKeyboardUIMode', function(err, out, code) {
		if (err instanceof Error) {
			// return because we already have false set and error means text boxes and lists only
			return;
		}
		if (parseInt(out) > 1) {
			FULL_KEYBOARD_ACCESS = true;
		}
	});

	// read the Messages.app sqlite db
	var db = new sqlite3.Database(file);

	// internally used variables
	var LAST_SEEN_ID = 0;
	var LAST_SEEN_CHAT_ID = 0;
	var ID_MISMATCH = false;
	var SELECTED_CHATTER = ""; // could be phone number or email address or groupchat id
	var SELECTED_CHATTER_NAME = ""; // should be a firstname and lastname if selected chatter exists in addressbook
	var GROUPCHAT_SELECTED = false;
	var SELECTED_GROUP = ""; // stores actual group title
	var MY_APPLE_ID = "";
	var ENABLE_OTHER_SERVICES = false;
	var sending = false;


	var userHasSentCorrectKey = false;
	function isAuthenticated(req) {
		if (req.session.userHasSentCorrectKey) {
			return true;
		}

		return false;
	}

	function getChatFriendlyName(req, chatUglyName, callback) {
		if (!isAuthenticated(req)) {
			res.end();
			return;
		}

		// console.log(chatUglyName);
		db.serialize(function() {
			var arr = [];
			var SQL = "SELECT DISTINCT message.date, handle.id, chat.chat_identifier, chat.display_name  FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.is_from_me = 0 AND message.service = 'iMessage' ORDER BY message.date DESC";
			if (OLD_OSX) {
				SQL = "SELECT DISTINCT message.date, handle.id, chat.chat_identifier FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.is_from_me = 0 AND message.service = 'iMessage' ORDER BY message.date DESC";
			}
			var found = false;

			db.all(SQL, function(err, rows) {
				if (err) throw err;
				for (var i = 0; i < rows.length; i++) {
					var row = rows[i];
					if (row.chat_identifier === chatUglyName) {
						found = true;
						callback(row.display_name);
						break;
					}
				}
			});

			setTimeout(function() {
				if (!found) {
					callback();
				}
			}, 250)
		});
	}

	app.get('/getNameFromPhone/:phone', function(req, res) {
		// console.log(req);
		if (!isAuthenticated(req)) {
			res.end();
			return;
		}

		var phone = req.params.phone.replace(/\(/g,'').replace(/\)/g,'').replace(/\-/g,'').replace(/\ /g,'').replace(/\+/g,'');
		// need to make a like statement so we can get the following phone, which is now in the format
		// 11231231234 into 1%123%123%1234
		// NOTE: this will probably not work for other countries since I assume they store their address differently?
		// fall back to phone number for that case for now
		// 1%
		phone = phone.substr(0, 1) + '%' + phone.substr(1);
		// 1%123
		phone = phone.substr(0, 5) + '%' + phone.substr(5);
		// 1%123%123
		phone = phone.substr(0, 9) + '%' + phone.substr(9);
		// comment out if you want to debug for another locality:
		// throw new Error(phone);

		glob(process.env.HOME + '/Library/Application\ Support/AddressBook/**/AddressBook-v22.abcddb', function (er, files) {
			var found = false;

			for (var i = 0; i < files.length; i++) {
				var file = files[i];
				var db = new sqlite3.Database(file);

				db.serialize(function() {
					var SQL = 'SELECT * FROM ZABCDCONTACTINDEX LEFT OUTER JOIN ZABCDPHONENUMBER ON ZABCDCONTACTINDEX.ZCONTACT = ZABCDPHONENUMBER.ZOWNER LEFT OUTER JOIN ZABCDEMAILADDRESS ON ZABCDEMAILADDRESS.ZOWNER = ZABCDCONTACTINDEX.ZCONTACT LEFT OUTER JOIN ZABCDMESSAGINGADDRESS ON ZABCDMESSAGINGADDRESS.ZOWNER = ZABCDCONTACTINDEX.ZCONTACT LEFT OUTER JOIN ZABCDRECORD ON ZABCDRECORD.Z_PK = ZABCDCONTACTINDEX.ZCONTACT WHERE ZFULLNUMBER LIKE "%'+phone+'%"';
					db.all(SQL, function(err, rows) {
						if (rows.length > 0 && !found) {
							try {
								res.send(rows[0].ZFIRSTNAME + ' ' + ((rows[0].ZLASTNAME) ? rows[0].ZLASTNAME : ""));
							} catch (e) {}
						}
					});
				});
			}

			setTimeout(function() {
				if (found) {
					return;
				} else {
					try {
						res.send();
					} catch (e) {}
				}
			}, 250);
		});
	});


	app.get('/getChats', function(req, res) {
		// console.log(req);
		if (!isAuthenticated(req)) {
			res.end();
			return;
		}

		db.serialize(function() {
			var arr = [];
			var SQL = "SELECT DISTINCT message.date, handle.id, chat.chat_identifier, chat.display_name  FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.is_from_me = 0 AND message.service = 'iMessage' ORDER BY message.date DESC";
			if (OLD_OSX) {
				SQL = "SELECT DISTINCT message.date, handle.id, chat.chat_identifier FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.is_from_me = 0 AND message.service = 'iMessage' ORDER BY message.date DESC";
			}

			if (ENABLE_OTHER_SERVICES) {
				SQL = SQL.replace("AND message.service = 'iMessage'", "");
			}

			db.all(SQL, function(err, rows) {
				if (err) throw err;
				for (var i = 0; i < rows.length; i++) {
					var row = rows[i];
					if (row.chat_identifier === null) {
						if (arr.indexOf(row.id) < 0 && row.id !== "" && typeof(row.id) !== "undefined") {
							arr.push(row.id);
						}
					} else if (arr.indexOf(row.chat_identifier) < 0 && arr.indexOf(row.display_name+'-'+row.chat_identifier) < 0) {
						if (row.chat_identifier.indexOf('chat') > -1) {
							if (row.display_name && row.display_name !== "" && typeof(row.display_name) !== "undefined" || OLD_OSX) {
								arr.push(row.display_name+'-'+row.chat_identifier);
							}

						} else {
							if (row.chat_identifier && row.chat_identifier !== "" && typeof(row.chat_identifier) !== "undefined") {
								arr.push(row.chat_identifier);
							}
						}

					}
				}

				res.send(arr);
			});
		});
	});

	app.get('/getAllMessagesInChat/:chatid', function(req, res) {
		// console.log(req);
		if (!isAuthenticated(req)) {
			res.end();
			return;
		}

		SELECTED_CHATTER = req.params.chatid;
		// console.log('getting ' + SELECTED_CHATTER);

		var SQL = "";
		if (SELECTED_CHATTER.indexOf('chat') > -1) { // this is a group chat
			SQL = "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND chat.chat_identifier = '"+SELECTED_CHATTER+"' ORDER BY message.date DESC LIMIT 50";
		} else { // this is one person
			SQL = "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND handle.id = '"+SELECTED_CHATTER+"' ORDER BY message.date DESC LIMIT 50";
		}

		if (ENABLE_OTHER_SERVICES) {
			SQL = SQL.replace("message.service = 'iMessage' AND ", "");
		}

		db.serialize(function() {
			var arr = [];
			db.all(SQL, function(err, rows) {
				if (err) throw err;
				for (var i = 0; i < rows.length; i++) {
					var row = rows[i];
					LAST_SEEN_CHAT_ID = row.ROWID;
					arr.push({chatter: ((!row.is_from_me) ? row.id : "me"), text: row.text });
					if (row.is_from_me) {
						MY_APPLE_ID = row.id;
					}
				}

				res.send(arr.reverse());
			});
		});
	});

	app.get('/getLastMessageInChat/:chatid', function(req, res) {
		// console.log(req);
		if (!isAuthenticated(req)) {
			res.end();
			return;
		}

		SELECTED_CHATTER = req.params.chatid;

		var SQL = "";
		if (SELECTED_CHATTER.indexOf('chat') > -1) { // this is a group chat
			SQL = "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND chat.chat_identifier = '"+SELECTED_CHATTER+"' ORDER BY message.date DESC LIMIT 1";
		} else { // this is one person
			SQL = "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND handle.id = '"+SELECTED_CHATTER+"' ORDER BY message.date DESC LIMIT 1";
		}

		if (ENABLE_OTHER_SERVICES) {
			SQL = SQL.replace("message.service = 'iMessage' AND ", "");
		}

		db.serialize(function() {
			var arr = [];
			db.all(SQL, function(err, rows) {
				if (err) throw err;
				for (var i = 0; i < rows.length; i++) {
					var row = rows[i];
					LAST_SEEN_CHAT_ID = row.ROWID;
					res.send({chatter: ((!row.is_from_me) ? row.id : "me"), text: row.text });
					if (row.is_from_me) {
						MY_APPLE_ID = row.id;
					}
				}
			});
		});
	});

	app.post('/sendNewMessage', function(req, res) {
		// console.log(req);
		if (!isAuthenticated(req)) {
			res.end();
			return;
		}

		// console.log(req.body);
		SELECTED_CHATTER = req.body.to;
		message = req.body.message;

		if (sending) { res.end(500); }
		else {
			// console.log('looks good!');
			res.send(true);
		}
		sending = true;

		if (SELECTED_CHATTER.indexOf('chat') > -1) {
			getChatFriendlyName(req, SELECTED_CHATTER, function(friendlyChatterName) {
				// console.log(friendlyChatterName)
				applescript.execFile(__dirname+'/sendmessage.AppleScript', [[friendlyChatterName], message, FULL_KEYBOARD_ACCESS], function(err, result) {
					if (err) {
						throw err;
					}

					sending = false;
				}.bind(this));
			}.bind(this))
		} else {
			applescript.execFile(__dirname+'/sendmessage_single.AppleScript', [[SELECTED_CHATTER], message, FULL_KEYBOARD_ACCESS, ENABLE_OTHER_SERVICES], function(err, result) {
				if (err) {
					throw err;
				}

				sending = false;
			}.bind(this));
		}
	});

	app.post('/checkKey', function(req, res) {
		// console.log(req);
		if (key === req.body.key) {
			req.session.userHasSentCorrectKey = true;
			res.send({data:"ok"});
		} else {
			res.send({data:"wrong"});
		}
	});

	app.get('/signout', function(req, res) {
		req.session.userHasSentCorrectKey = false
	});

	// app.listen(process.env.PORT || 3001);
	var server = https.createServer(options, app).listen(process.env.PORT || 443);

}






