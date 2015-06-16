/**
 * Some jQuery extensions.
 */
$.extend({
	
	/**
	 * Setup storage for us to use within this users session.
	 */
	lv2 : {
		username : null,
		userlocation : null,
		token : null,
		token_duration : null,
		biller_token : null,
		id : null
	},

	state: {
		previous : null
	},

	/**
	 * populate the Xhr object before to send the request.
	 */
	beforeSendRequest : function(xhr) {
		if ($.lv2.username != null) {
			xhr.setRequestHeader('USERNAME', $.lv2.username);
		}
		if ($.lv2.token != null) {
			xhr.setRequestHeader('TOKEN', $.lv2.token);
		}
		xhr.setRequestHeader('SERVICE_KEY', serviceKey);
	},

	/**
	 * Post a new User to the /users API end-point.
	 *
	 * @param user -
	 *            A JSON representation of the user, see LV2 model object.
	 */
	addUser : function(user, callback) {
		var usergroup = {};

		var password = encodePassword(user.password);
		user.password = password;
		usergroup['user'] = user;
		usergroup['groupName'] = groupname;

		$.lv2.username = user.username;
		$.ajax({
			type : 'POST',
			url : apiContextURL + 'users',
			data : JSON.stringify(usergroup),
			contentType : 'application/json; charset=utf-8',
			dataType : 'text',
			success : function(data, textStatus, xhr) {
				addLvUser(user);
			},
			error : function(xhr, ajaxOptions, thrownError) {
				callback(false, getErrorMsg(xhr, 3));
			}
		});

		function addLvUser(user) {
			var usergroup = {};
			usergroup['user'] = user;
			usergroup['groupName'] = groupname;

			$.ajax({
				type : 'POST',
				url : apiContextURL + 'lv2users/registerLv2User',
				data : '',
				dataType : 'text',
				beforeSend : function(xhr) {
					$.beforeSendRequest(xhr);
				},
				success : function(data, textStatus, xhr) {
					callback(true, 'User successfully registered. An email has been sent to your email address to activate your account.');
				},
				error : function(xhr, ajaxOptions, thrownError) {
					callback(false, getErrorMsg(xhr, 3));
				}
			});
		}
		
	},

	checkIfAdmin : function(user, callback, errorCallback) {
		$.ajax({
			type: 'POST',
			url: apiContextURL + 'users/checkexists/com.terrapages.lv2.service.group.admin',
			data: { username: user },
			dataType : 'text',
			async : true,
			success : function(isAdmin, textStatus, xhr) {
				callback(isAdmin);
			},
			error : function(xhr, ajaxOptions, thrownError) {
				errorCallback(false, getErrorMsg(xhr, 3));
			}
		});
	},

	getUser : function(callback, errorCallback) {
		$.ajax({
			type : 'GET',
			url : apiContextURL + 'lv2users/',
			data : '',
			dataType : 'text',
			beforeSend : function(xhr) {
				$.beforeSendRequest(xhr);
			},
			success : function(data, textStatus, xhr) {
				if (data != null) {
					callback(JSON.parse( data ));
				} else {
					errorCallback('No data received');
				}
			},
			error : function(xhr, ajaxOptions, thrownError) {
				errorCallback(thrownError);
			}
		});
	},

	getUserData : function(user, callback, errorCallback) {
		$.ajax({
			type : 'GET',
			url : apiContextURL + 'lv2users/getUserData/' + user,
			data : '',
			dataType : 'text',
			beforeSend : function(xhr) {
				$.beforeSendRequest(xhr);
			},
			success : function(data, textStatus, xhr) {
				callback(data, user);
			},
			error : function(xhr, ajaxOptions, thrownError) {
				errorCallback(thrownError);
			}
		});
	},

	getUsersData : function(users, callback, errorCallback) {
		var ajaxCounter = 0;
		var totalData = [];
		var index = 0;
		var MAX_LENGTH = 1400; // rough limit (get request parameter string length)
		while (index < users.length) {
			var args = "";
			while (args.length < MAX_LENGTH && index < users.length) {
				args += users[index] + ",";
				++index;
			}
			args = args.substring(0, args.length - 1);

			++ajaxCounter;
			$.ajax({
				type : 'GET',
				url : apiContextURL + 'lv2users/getUsersData/' + args,
				data : '',
				dataType : 'text',
				beforeSend : function(xhr) {
					$.beforeSendRequest(xhr);
				},
				success : function(data, textStatus, xhr) {
					totalData = totalData.concat($.parseJSON(data));
					--ajaxCounter;
					if (ajaxCounter === 0) {
						callback(totalData);
					}
				},
				error : function(xhr, ajaxOptions, thrownError) {
					console.log(thrownError + ", " + ajaxOptions + ", " + getErrorMsg(xhr, 3));
					errorCallback();
					--ajaxCounter;
					if (ajaxCounter === 0) {
						callback(totalData);
					}
				}
			});
		}
	},

	getLV2ServiceUnixTime : function(callback) {
		$.ajax({
			type : 'GET',
			url : apiContextURL + 'realtime/currentTime',
			data : '',
			dataType : 'text',
			success : function(data, textStatus, xhr) {
				callback(data);
			},
			error : function(xhr, ajaxOptions, thrownError) {
				console.log(thrownError);
			}
		})
	},

	/**
	 * Authenticate the user.
	 *
	 * @param auth -
	 *            A JSON object with a username and password.
	 */
	authenticate : function(auth, callback) {
		$.lv2.username = auth.username;

		$.ajax({
			type : 'GET',
			url : apiContextURL + 'auth',
			data : '',
			async : true,
			dataType : 'text',
			beforeSend : function(xhr) {
				xhr.setRequestHeader('Authorization', hashAuth(auth));
				xhr.setRequestHeader('APPLICATION_ID', Properties.APPLICATION_ID);
				xhr.setRequestHeader('SERVICE_KEY', serviceKey);
			},
			success : function(data, textStatus, xhr) {
				$.lv2.token = xhr.getResponseHeader('TOKEN');
				$.lv2.token_duration = xhr.getResponseHeader('TOKEN_DURATION');
				$.lv2.username = xhr.getResponseHeader('USERNAME');
				getLvUser();
			},
			error : function(xhr, ajaxOptions, thrownError) {
				callback(false, getErrorMsg(xhr, 1));
			}
		});
		
		function getLvUser() {
			if (checkUser()) {
				$.ajax({
					type : 'GET',
					url : apiContextURL + 'lv2users',
					contentType : 'application/json; charset=utf-8',
					async : true,
					beforeSend : function(xhr) {
						$.beforeSendRequest(xhr);
					},
					success : function(data, textStatus, xhr) {
						$.lv2.id = data.id;
						$.lv2.email = data.email;
						$.lv2.avatarLink = data.avatarLink;
						sessionStorage.setItem('lv2', JSON.stringify($.lv2));
						//checkExists($.lv2.username, "com.terrapages.lv2.service.group.admin");
						callback(true);
					},
					error : function(xhr, ajaxOptions, thrownError) {
						callback(false, getErrorMsg(xhr, 1));
						console.log(xhr);
						console.log(thrownError);
					}
				});
			}
		}
		
	},

	getTPFeed : function(callback, errorCallback) {
		$.ajax({
			type : 'GET',
			url : Properties.ATOM_FEED_URL,
			data : '',
			dataType : 'text',
			success : function(data, textStatus, xhr) {
				callback(data);
			},
			error : function(xhr, ajaxOptions, thrownError) {
				errorCallback(thrownError);
			}
		})
	},

	logout : function() {
		if ($.lv2.username != null) {
			$.ajax({
				type : 'GET',
				url : apiContextURL + 'auth/' + $.lv2.username,
				data : '',
				dataType : 'text',
				beforeSend : function(xhr) {
					$.beforeSendRequest(xhr);
				}
			})
		}
		sessionStorage.clear();
		window.location.href = 'index.html';
	},

	/**
	 * GET a link in the user's email for password changing.
	 *
	 * @param fpass -
	 *            A JSON object with a username.
	 */
	forgotPassword : function(fpass, callback) {
		$.ajax({
			type : 'GET',
			url : apiContextURL + 'users/resetpwd/' + fpass.username,
			data : '',
			dataType : 'text',
			async : false,
			success : function(data, textStatus, xhr) {
				callback(true, 'A link has been sent to your email to reset your password.');
			},
			error : function(xhr, ajaxOptions, thrownError) {
				callback(false, getErrorMsg(xhr, 2));
			}
		});
	},

	/**
	 * Gets a list of all friends that are currently logged in + what apps they
	 * are logged in to
	 * 
	 * If force is false, then callback is only called when json value has changed 
	 * from previous call
	 */
	getCurrentlyLoggedIn : function(success, error, force) {
		$.ajax({
			type : 'GET',
			url : apiContextURL + 'users/currentlyLoggedIn/com.terrapages.mokbee.group.users',
			data : '',
			dataType : 'text',
			async : false,
			beforeSend : function(xhr) {
				$.beforeSendRequest(xhr);
			},
			success : function(data, textStatus, xhr) {
				if (data != null) {
					if ($.state.previous == null || force || $.state.previous !== data) {
						$.state.previous = data;
						success(JSON.parse( data ));
					}
				} else {
					error('No data received');
				}
			},
			error : function(xhr, ajaxOptions, thrownError) {
				error(thrownError);
			}
		});
	},

	/**
	 * POST to the devices API end-point.
	 *
	 * @param deviceName -
	 *            String representing the human readable name of the new device.
	 *
	 */
	addDevice : function(deviceForm) {
		if (checkUser()) {
			$.ajax({
				type : 'POST',
				url : apiContextURL + 'devices/registerDevice',
				data : deviceForm.serialize(),
				contentType : 'application/json; charset=utf-8',
				dataType : 'text',
				async : false,
				beforeSend : function(xhr) {
					$.beforeSendRequest(xhr);
				},
				success : function(data, textStatus, xhr) {
					$.feedBackResponse("#addDeviceResult", "Device has been created.", false);
				},
				error : function(xhr, ajaxOptions, thrownError) {
					// TODO - handle error
				}
			});
		}
	},

	/**
	 * Get deivce's API end-point. Specialized function for this test only.
	 */
	getDevices : function(callback) {
		if (checkUser()) {
			$.ajax({
				type : 'GET',
				url : apiContextURL + 'devices',
				contentType : 'application/json; charset=utf-8',
				async : false,
				beforeSend : function(xhr) {
					$.beforeSendRequest(xhr);
				},
				success : function(data, textStatus, xhr) {
					callback(data);
				},
				error : function(xhr, ajaxOptions, thrownError) {
					// TODO - handle error
				}
			});
		}
	},

	/**
	 * Post new device locations to the devices API end-point.
	 *
	 * @param device -
	 *            A JSON representation of the user, see LV2 model object.
	 */
	addDeviceLocations : function(locations) {
		if (checkUser() && locations.deviceId) {
			$.ajax({
				type : 'POST',
				url : apiContextURL + 'locations/add/',
				contentType : 'application/json; charset=utf-8',
				dataType : 'text',
				data : JSON.stringify(locations),
				async : false,
				beforeSend : function(xhr) {
					$.beforeSendRequest(xhr);
				},
				success : function(data, textStatus, xhr) {
					$.feedBackResponse("#addDeviceResult", "Locations have been stored", false);
				},
				error : function(xhr, ajaxOptions, thrownError) {
					// TODO - handle error
				}
			});
		} else {
			if (console && console.log) {
				console.info('An error occured trying to post a new set of' + 'locations to the API service, please check the' + 'device ID, seems to be null?');
			}
		}
	},

	/**
	 * Get the locations for a device and if specified the maximum number of
	 * locations to return.
	 *
	 * @param deviceID -
	 *            The ID of the device
	 * @param maxLocations -
	 *            The total maximum number of locations to return
	 */
	getLocations : function(onSuccess, onFail, limit) {
		if (checkUser()) {
			$.ajax({
				type : 'GET',
				url : apiContextURL + 'locations/trace/' + $.lv2.id + '/' + limit,
				async : false,
				beforeSend : function(xhr) {
					$.beforeSendRequest(xhr);
				}
			}).fail(function( jqXHR, textStatus, errorThrown) {
				if (console && console.log) {
					console.log('Error connecting to the LV2 API service, unable to call getLocations().');
				}
				if (onFail && $.isFunction(onFail)) {
					onFail();	
				}
			}).done(function(data, textStatus, jqXHR) {
				if (onSuccess && $.isFunction(onSuccess)) {
					onSuccess(data);
				}
			});
		} else {
			if (console && console.log) {
				console.info('An error occured trying to post a new set of' + 'locations to the API service, please check the' + 'device ID, seems to be null?');
			}
		}
	},

	getTraces : function(onSuccess, onFail, limit) {
		if (checkUser()) {
			$.ajax({
				type : 'GET',
				url : apiContextURL + 'traces/user/' + $.lv2.id + '/' + limit,
				async : false,
				beforeSend : function(xhr) {
					$.beforeSendRequest(xhr);
				}
			}).fail(function( jqXHR, textStatus, errorThrown) {
				if (console && console.log) {
					console.log('Error connecting to the LV2 API service, unable to call getLocations().');
				}
				if (onFail && $.isFunction(onFail)) {
					onFail();	
				}
			}).done(function(data, textStatus, jqXHR) {
				if (onSuccess && $.isFunction(onSuccess)) {
					onSuccess(data);
				}
			});
		} else {
			if (console && console.log) {
				console.info('An error occured trying to post a new set of' + 'locations to the API service, please check the' + 'device ID, seems to be null?');
			}
		}
	},
	
	/**
	 * Helper method to turn a form into a JSON object.
	 *
	 * @param formName -
	 *            The name of the form to interrogate.
	 */
	objectify : function(formName) {
		var obj = {};
		$.each($(formName).serializeArray(), function(i, o) {
			obj[o.name] = o.value;
		});
		return obj;
	}

});

/**
 * Checks if the user is logged-in 
 * 
 * @returns {Boolean}
 */
function checkUser() {
	if ($.lv2.username && $.lv2.token) {
		return true;
	} else {
		alert('The user is not logged in, please login.');
	}
	return false;
}

/**
 * Create a hash value from the authentication object.
 * 
 * @param authObject
 * @returns {String}
 */
function hashAuth(authObject) {
	var creds = authObject.username + ':' + encodePassword(authObject.password);
	var hash = btoa(creds);
	return 'Basic ' + hash;
}

/**
 * Encodes the password.
 * 
 * @param password
 * @returns
 */
function encodePassword(password) {
	var hashObj = new jsSHA(password, "TEXT");
	return hashObj.getHash("SHA-512", "HEX");
}

/**
 * Gets the error message from the response object.
 * 
 * @param xhr
 * @returns {String}
 */
function getErrorMsg (xhr, type) {
	var contentType = xhr.getResponseHeader('Content-Type');
	if (contentType.indexOf('text/html') != -1) {
		if (type == 1) {
			return getLoginMsg(xhr);
		} else if (type == 2) {
			return getForgotPasswordMsg(xhr);
		} else if (type == 3) {
			return getRegisterMsg(xhr);
		}
	} else if (contentType.indexOf('application/json') != -1) {
		return getJsonMsg(xhr);
	}
	return 'Unable to contact server due to server error.';
}

function getJsonMsg(xhr) {
	var json = $.parseJSON(xhr.responseText);
	switch (json.exceptionCode) {
		// Login messages
		case 'IMS_AUTHENTICATION_FAILED':
			return "Username/Password is invalid.";
			break;
		case 'IMS_USER_NOT_VERIFIED':
			return "Username/Password is invalid.";
			break;
		// Register messages
		case 'IMS_USER_EMAIL_ALREADY_IN_USE':
			return "Email is already in use.";
			break;
		case 'IMS_USER_ALREADY_EXISTS':
			return "Username is already in use.";
			break;
		case 'IMS_USER_NOT_SAME_EMAIL':
			return "Username is already in use.";
			break;
		// Forgot password messages
		case 'IMS_USER_NOT_FOUND':
			return "Username is invalid.";
			break;
		default:
			return 'Unable to contact server due to server error.';
			break;
	}
}

function getLoginMsg(xhr) {
	if (xhr.status == 403) {
		return "Username/Password is invalid.";
	}
	return 'Unable to contact server due to server error.';
}

function getForgotPasswordMsg(xhr) {
	if (xhr.status == 400) {
		return "Username is invalid.";
	}
	return 'Unable to contact server due to server error.';
}

function getRegisterMsg(xhr) {
	if (xhr.status == 400) {
		return "Username or Email is already in use.";
	} else if (xhr.status == 409) {
		return "Username and Email are already in use.";
	}
	return 'Unable to contact server due to server error.';
}