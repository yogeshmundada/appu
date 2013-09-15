
function onauthrequired_cb(details, my_callback) {
    console.log("APPU DEBUG: RequestID: " + details.requestId);
    console.log("APPU DEBUG: URL: " + details.url);
    console.log("APPU DEBUG: Method: " + details.method);
    console.log("APPU DEBUG: FrameID: " + details.frameId);
    console.log("APPU DEBUG: Parent FrameID: " + details.parentFrameId);
    console.log("APPU DEBUG: Tab ID: " + details.tabId);
    console.log("APPU DEBUG: Type: " + details.type);
    console.log("APPU DEBUG: Timestamp: " + details.timeStamp);
    console.log("APPU DEBUG: Scheme: " + details.scheme);
    console.log("APPU DEBUG: Realm: " + details.realm);
    console.log("APPU DEBUG: Challenger: " + details.challenger);
    console.log("APPU DEBUG: ResponseHeaders: " + details.responseHeaders);
    console.log("APPU DEBUG: StatusLine: " + details.statusLine);
}


function cb_headers_received(details) {
    //console.log("APPU DEBUG: Web Request ID: " + details.requestId);
    if ("responseHeaders" in details) {
	var rh = details.responseHeaders;
	for (var i = 0; i < rh.length; i++) {
	    if (rh[i].name != "set-cookie") {
		continue;
	    }
	    console.log("APPU DEBUG: Response Header Name: " + rh[i].name);
	    if ("value" in rh[i]) {
		console.log("APPU DEBUG: Response Header Value: " + rh[i].value);
	    }
	    else if ("binaryValue" in rh[i]) {
		console.log("APPU DEBUG: Response Header Binary Value: " + rh[i].binaryValue);
	    }
	    else {
		console.log("APPU DEBUG: Response Header No Value Present");
	    }
	}
    }
}


function get_all_cookies(domain, handle_cookies) {
    if(!handle_cookies) {
	    console.log("APPU DEBUG: handle_cookies() is undefined");
    }
    chrome.cookies.getAll(
			  {
			      'domain' : domain,
				  }, 
			  handle_cookies);
}


function print_appu_session_store_cookies(domain, cookie_class) {
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];
    var tot_cookies = 0;
    var msg = "\n";

    for (c in cs.cookies) {
	if (cookie_class && (cs.cookies[c].cookie_class == cookie_class)) {
	    msg += sprintf(" %s,\n", c);
	    tot_cookies += 1;
	}
	else if (cookie_class == undefined) {
	    msg += sprintf(" %s(%s),\n", c, cs.cookies[c].cookie_class);
	    tot_cookies += 1;
	}
    }

    msg = "APPU DEBUG: Domain: " + domain + ", Total-cookies: " + tot_cookies + ", Cookie-names: " + msg;
    console.log(msg);
}


// Purely for debugging purpose.
// We don't need to actually access the cookie values
// in actual deployments
function print_cookie_values(domain, cookie_names) {
    for(var j = 0; j < cookie_names.length; j++) {
	chrome.cookies.getAll({
		'domain' : domain,
		    'name' : cookie_names[j]
		    }, 
	    function (all_cookies) {
		for (var i = 0; i < all_cookies.length; i++) {
		    var cookie_name = all_cookies[i].name;
		    var cookie_domain = all_cookies[i].domain;
		    var cookie_path = all_cookies[i].path;
		    var cookie_key = cookie_domain + cookie_path + ":" + cookie_name;
		    var expiry_time = 'no-expiry-time';
		    if ('expirationDate' in all_cookies[i]) {
			var exp_seconds = all_cookies[i].expirationDate;
			var d = new Date(0); 
			d.setUTCSeconds(exp_seconds);
			expiry_time = d;
		    }
		    else {
			expiry_time = 'browser-close';
		    }

		    var msg = sprintf("APPU DEBUG: Cookie-key: '%30s', Expiration: '%s', HostOnly: '%s', " +
				      "Secure: '%s', HttpOnly: '%s', Session: '%s', Value: '%s'",
				      cookie_key,
				      expiry_time,
				      all_cookies[i].hostOnly,
				      all_cookies[i].secure,
				      all_cookies[i].httpOnly,
				      all_cookies[i].session,
				      all_cookies[i].value);
		    console.log(msg);
		}
	    });
    }
}


//All cookies related to a particular domain
function print_all_cookies(domain, event_name, cookie_attributes) {
    var cb_cookies = (function(domain, event_name) {
	return function(all_cookies) {
	    var tot_hostonly = 0;
	    var tot_httponly = 0;
	    var tot_secure = 0;
	    var tot_session = 0;

	    console.log("APPU DEBUG: Printing all cookies for (EVENT:" + event_name + "): " + domain);
	    for (var i = 0; i < all_cookies.length; i++) {
		var cookie_str = "";
		var cookie_name = all_cookies[i].name;
		var cookie_domain = all_cookies[i].domain;
		var cookie_path = all_cookies[i].path;
		var cookie_key = cookie_domain + cookie_path + ":" + cookie_name;

		if (!cookie_attributes) {
		    cookie_str += "Cookie Key: " + cookie_key;
		    cookie_str += ", HostOnly: '" + all_cookies[i].hostOnly + "'";
		    cookie_str += ", Secure: '" + all_cookies[i].secure + "'";
		    cookie_str += ", HttpOnly: '" + all_cookies[i].httpOnly + "'";
		    cookie_str += ", Session: '" + all_cookies[i].session + "'";
		}
		else {
		    for (var k = 0; k < cookie_attributes.length; k++) {
			cookie_str += cookie_attributes[k] + " : " + all_cookies[i][cookie_attributes[k]];
			cookie_str += ", ";
		    }
		}

		if (all_cookies[i].hostOnly) {
		    tot_hostonly += 1;
		}

		if (all_cookies[i].secure) {
		    tot_secure += 1;
		}

		if (all_cookies[i].httpOnly) {
		    tot_httponly += 1;
		}

		if (all_cookies[i].session) {
		    tot_session += 1;
		}

		console.log("APPU DEBUG: " + cookie_str);
	    }
	    console.log("APPU DEBUG: Total HostOnly Cookies: " + tot_hostonly);
	    console.log("APPU DEBUG: Total HTTPOnly Cookies: " + tot_httponly);
	    console.log("APPU DEBUG: Total Secure Cookies: " + tot_secure);
	    console.log("APPU DEBUG: Total Session Cookies: " + tot_session);
	    console.log("APPU DEBUG: Total number of cookies: " + all_cookies.length);
	}
	})(domain, event_name);

    get_all_cookies(domain, cb_cookies);
}


//Returns true or false depending on if cookie exists and
//if expiry date is not reached.
function is_cookie_valid(cookie_name, domain, cb_cookie_valid) {

}

//Delete cookies in the array. For testing purpose.
function delete_cookies(domain, cookies) {
    var cb_cookies = (function(cookies_to_delete) {
	    return function(all_cookies) {
		console.log("APPU DEBUG: Total cookies: " + all_cookies.length);
		console.log("APPU DEBUG: Total cookies to be deleted: " + cookies_to_delete.length);
		var total_cookies_deleted = [];
		for (var i = 0; i < all_cookies.length; i++) {
		    if (cookies_to_delete.indexOf(all_cookies[i].name) == -1) {
			continue;
		    }

		    var protocol = "";
		    if (all_cookies[i].secure) {
			protocol = "https://";
		    }
		    else {
			protocol = "http://";
		    }
		    var url = protocol + all_cookies[i].domain + all_cookies[i].path;
		    chrome.cookies.remove({
			    "url": url, 
				"name": all_cookies[i].name});			
		    total_cookies_deleted.push(url);
		}
		console.log("APPU DEBUG: Deleted cookies number: " + total_cookies_deleted.length);
	    }
	})(cookies);
    
    chrome.cookies.getAll({
	    'domain' : domain,
		},
	cb_cookies);
}


// Test function to delete all cookies except account cookies
function delete_all_except_account_cookies(domain) {
    chrome.cookies.getAll({
	    'domain' : domain,
		},
	function(all_cookies) {
		var cookies_to_delete = [];
		var cs = pii_vault.aggregate_data.session_cookie_store[domain];
		for (var i = 0; i < all_cookies.length; i++) {
		    var cookie_name = all_cookies[i].name;
		    var cookie_domain = all_cookies[i].domain;
		    var cookie_path = all_cookies[i].path;
		    var cookie_key = cookie_domain + cookie_path + ":" + cookie_name;
		    if (cookie_key in cs.cookies &&
			cs.cookies[cookie_key].cookie_class == 'during') {
			continue;
		    }
		    cookies_to_delete.push(cookie_name);
		}
		delete_cookies(domain, cookies_to_delete);
	});
}

// Test function to clear all cookies
function delete_all_cookies(domain) {
    chrome.cookies.getAll({
	    'domain' : domain,
		},
	function(all_cookies) {
		var cookies_to_delete = [];
		for (var i = 0; i < all_cookies.length; i++) {
		    var cookie_name = all_cookies[i].name;
		    cookies_to_delete.push(cookie_name);
		}
		delete_cookies(domain, cookies_to_delete);
	});
}


//This means that a password element was detected on the page.
//So the user will probably attempt to login to the site.
//Record the current set of cookies to see what new cookies are
//created.
//Things to take care of:
// 1. What if the site simply overwrites an existing cookie 
//    instead of creating a new one? How often does that happen?
// 2. If the user is attempting to change the password, he will
//    already be logged in the site. In this case, he has to first
//    enter the old password. Appu has to avoid detecting that as
//    false login attempt.
//    Second, when he enters a new password, there will be two
//    password boxes. Appu has to detect that case as well.
// 3. If the account asks for other sensitive information
//    like CVV, CVV2, CVVC then that will be in a password box as well.
//    Appu should detect that case as well.
// 4. In some cases, even if you are logged into a site, it will 
//    still ask you for password to access sensitive information.
//    For example, if you have entered a credit card on Facebook,
//    and even if you are logged into facebook, it will still
//    ask you to enter password to access that information.
//    (perhaps its a wise choice considering how many security
//     holes were detected in FB recently as well as number of
//     apps that can access your profile).
//    Appu should detect such cases as well.
function record_prelogin_cookies(username, domain) {
    var cb_cookies = (function(username, domain) {
	    return function(all_cookies) {
		pre_login_cookies[domain] = {};
		pre_login_cookies[domain].cookies = {};
		for (var i = 0; i < all_cookies.length; i++) {
		    var hashed_cookie_val = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(all_cookies[i].value));
		    var cookie_name = all_cookies[i].name;
		    var cookie_domain = all_cookies[i].domain;
		    var cookie_path = all_cookies[i].path;
		    var cookie_key = cookie_domain + cookie_path + ":" + cookie_name;
		    pre_login_cookies[domain].username = username;
		    pre_login_cookies[domain].cookies[cookie_key] = hashed_cookie_val;
		}
	    }
	})(username, domain);

    get_all_cookies(domain, cb_cookies);
}


//After the successful login, detects which cookies have been set.
function detect_login_cookies(domain) {
    var cb_cookies = (function(domain) {
	    return function(all_cookies) {
		var login_state_cookies = {};
		login_state_cookies.username = pre_login_cookies[domain].username;
		login_state_cookies.cookies = {};

		for (var i = 0; i < all_cookies.length; i++) {
		    if (all_cookies[i].domain[0] != '.') {
			continue;
		    }

		    var cookie_name = all_cookies[i].name;
		    var cookie_domain = all_cookies[i].domain;
		    var cookie_path = all_cookies[i].path;
		    var cookie_key = cookie_domain + cookie_path + ":" + cookie_name;

		    var hashed_cookie_val = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(all_cookies[i].value));
		    if (cookie_key in pre_login_cookies[domain].cookies
			&& hashed_cookie_val == pre_login_cookies[domain].cookies[cookie_key]) {
			//This means that this cookie was either present before logging in 
			//and did not get a new value written to it during login process.
			//So probably *NOT* a login cookie 
			login_state_cookies.cookies[cookie_key] = {};
			login_state_cookies.cookies[cookie_key].cookie_class = 'before';
			login_state_cookies.cookies[cookie_key].hashed_cookie_val = hashed_cookie_val;
		    }
		    else {
			//Cookie is newly created or got a new value written to it.
			//Hence likely a login cookie
			login_state_cookies.cookies[cookie_key] = {};
			login_state_cookies.cookies[cookie_key].cookie_class = 'during';
			login_state_cookies.cookies[cookie_key].hashed_cookie_value = hashed_cookie_val;
		    }
		}

		//Empty the temporary cookie store.
		cleanup_prelogin_cookies(domain);
		pii_vault.aggregate_data.session_cookie_store[domain] = login_state_cookies;
		flush_session_cookie_store();
	    }
	})(domain);

    get_all_cookies(domain, cb_cookies);
}


function cleanup_prelogin_cookies(domain) {
    var d = get_domain(domain);
    pre_login_cookies[d] = {};
}


function cleanup_session_cookie_store(domain) {
    var d = get_domain(domain);
    delete pii_vault.aggregate_data.session_cookie_store[d];
    pii_vault.aggregate_data.session_cookie_store[d] = {};
    flush_session_cookie_store();
}

function check_if_still_logged_in(domain) {
    var domain_cookies = pii_vault.aggregate_data.session_cookie_store[domain];
    var logged_in = false;
    for (c in domain_cookies.cookies) {
	if (c.cookie_class == 'during') {
	    logged_in = true;
	    break;
	}
    }
    if (logged_in == true) {
	console.log("Here here: Domain: " + domain + ", Status: LOGGED-IN");
    }
    else {
	console.log("Here here: Domain: " + domain + ", Status: LOGGED-OUT");
    }
    return logged_in;
}

function cookie_change_detected(change_info) {
    var domain = change_info.cookie.domain;
    if (domain[0] == '.') {
	domain = domain.slice(1, domain.length);
    }
    domain = get_domain(domain);
    
    var cookie_name = change_info.cookie.name;
    var cookie_domain = change_info.cookie.domain;
    var cookie_path = change_info.cookie.path;
    var cookie_key = cookie_domain + cookie_path + ":" + cookie_name;
    
    var pvadcs = pii_vault.aggregate_data.session_cookie_store;
    
    if (pvadcs[domain]) {
	if ('cookies' in pvadcs[domain] && 
	    cookie_key in pvadcs[domain].cookies) {
	    var cookie_class = pvadcs[domain].cookies[cookie_key].cookie_class;
	    //No need to do anything if its just a 'before' cookie
	    if (cookie_class == 'during' || cookie_class == 'after') {
		//This cookie was added as a result of login process or after login process
		//No need to do anything if its cause if 'overwrite', it will be recreated shortly.
		if (change_info.removed && 
		    (change_info.cause == 'expired' || 
		     change_info.cause == 'expired_overwrite' ||
		     change_info.cause == 'explicit' ||
		     change_info.cause == 'overwrite' ||
		     change_info.cause == 'evicted')) {
		    delete pvadcs[domain].cookies[cookie_key];
		    flush_session_cookie_store();
		    
		    if (cookie_class == 'during') {
			console.log("APPU DEBUG: Deleted a 'during' cookie: " + cookie_key + ", cause: " + change_info.cause);
			//check_if_still_logged_in(domain);
			print_appu_session_store_cookies(domain, 'during');
		    }
		}
		else if (change_info.removed && change_info.cause != 'overwrite') {
		    console.log("APPU Error: Cookie removed with unknown cause: " + change_info.cause);
		}
	    }
	}
	else {
	    if ('cookies' in pvadcs[domain] && 
		(change_info.cause == 'expired_overwrite' ||
		 change_info.cause == 'overwrite')) {
		//This cookie was not present during login
		var hashed_cookie_val = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(change_info.cookie.value));
		console.log("APPU DEBUG: (" + domain + 
			    ") Creating a new cookie with class 'after': " + cookie_key);
		
		pvadcs[domain].cookies[cookie_key] = {};
		pvadcs[domain].cookies[cookie_key].cookie_class = 'after';
		pvadcs[domain].cookies[cookie_key].hashed_cookie_value = hashed_cookie_val;
		flush_session_cookie_store();
	    }
	}
    }
}

// Function that magically returns current username that 
// user has logged in on the site
function get_logged_in_username(domain) {
    var adcls = pii_vault.aggregate_data.current_loggedin_state;

    if (domain in adcls && adcls[domain].state == "logged-in") {
	var username_identifier = adcls[domain].username;
	var rc = get_idenfier_value(username_identifier);
	var username_length = rc[0];
	return [username_identifier, username_length];
    }
    var username = "";
    var username_identifier = get_username_identifier("");
    var username_length = username.length;

    return [username_identifier, username_length];
}

