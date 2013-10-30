

// 2^25 = 32MB.
// Do not want to test more cookies than that.
var MAX_COOKIE_TEST = 25;
var MAX_RANDOM_COOKIESETS_TEST_ATTEMPTS = 3;

// **** All functions that dump internal status - BEGIN
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


// This is just a test function
// prints "set-cookie" commands in a HTTP Response.
function cb_headers_received(details) {
    if ("responseHeaders" in details) {
	var rh = details.responseHeaders;
	for (var i = 0; i < rh.length; i++) {
	    if (rh[i].name.toLowerCase() != "set-cookie") {
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


function print_expiry_date(exp_seconds) {
    var d = new Date(0); 
    d.setUTCSeconds(exp_seconds);
    console.log("APPU DEBUG: Expiry date for(" + exp_seconds + "): " + d);
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
	    msg += sprintf("(%s) %s,\n", cs.cookies[c].current_state, c);
	    tot_cookies += 1;
	}
	else if (cookie_class == undefined) {
	    msg += sprintf("(%s) %s(%s),\n", cs.cookies[c].current_state, c, cs.cookies[c].cookie_class);
	    tot_cookies += 1;
	}
    }

    msg = "APPU DEBUG: Domain: " + domain + ", Total-cookies: " + tot_cookies + ", Cookie-names: " + msg;
    console.log(msg);
}


function print_account_cookies(domain) {
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];
    var account_cookies = [];

    for (c in cs.cookies) {
	if (cs.cookies[c].cookie_class == 'during') {
	    account_cookies.push(c.split(":")[2]);
	}
    }

    print_cookie_values(domain, account_cookies);
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
		    var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
		    var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;
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


// All cookies related to a particular domain
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
		var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
		var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;

		if (!cookie_attributes) {
		    cookie_str += "Cookie Key: " + cookie_key;
		    cookie_str += ", HostOnly: '" + all_cookies[i].hostOnly + "'";
		    cookie_str += ", Secure: '" + all_cookies[i].secure + "'";
		    cookie_str += ", HttpOnly: '" + all_cookies[i].httpOnly + "'";
		    cookie_str += ", Session: '" + all_cookies[i].session + "'";
		    cookie_str += ", Value: '" + all_cookies[i].value + "'";
		    cookie_str += ", Expiration: '" + all_cookies[i].expirationDate + "'";
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


function print_redirect_information(details) {
    if (get_domain(details.redirectUrl.split("/")[2]) != 'live.com') { 
// 	console.log("Here here: YYYYYYYYYYY Current URL: " + details.url +
// 		    ", FrameID: " + details.frameId + 
// 		    ", type: " + details.type);
// 	console.log("Here here: ZZZZZZZZZZZ Redirection URL: " + details.redirectUrl +
// 		    ", FrameID: " + details.frameId + 
// 		    ", type: " + details.type);
    }
}


function print_sent_headers(details) {
    if (get_domain(details.url.split("/")[2]) != 'live.com') {
	console.log("Here here: Sent headers: " + JSON.stringify(details));
    }
}

// **** All functions that dump internal status - END


function cookie_backup(domain, backup_store) {
    var cb_cookies = (function(domain, backup_store) {
	return function(all_cookies) {
	    backup_store.cookies = all_cookies;
	}
	})(domain, backup_store);

    get_all_cookies(domain, cb_cookies);
}


function restore_cookie_backup(backup_store) {
    var all_cookies = backup_store.cookies;
    for (var i = 0; i < all_cookies.length; i++) {
	var my_url = all_cookies[i].secure ? "https://" : "http://";
	my_url += all_cookies[i].domain + all_cookies[i].path;
	all_cookies[i].url = my_url;
	if (all_cookies[i].hostOnly) {
	    delete all_cookies[i].domain;
	}
	if (all_cookies[i].session) {
	    delete all_cookies[i].expirationDate;
	}
	delete all_cookies[i].hostOnly;
	delete all_cookies[i].session;
	chrome.cookies.set(all_cookies[i]);
    }
}


// Returns true or false depending on if cookie exists and
// if expiry date is not reached.
function is_cookie_valid(cookie_name, domain, cb_cookie_valid) {

}


// Delete cookies in the array. For testing purpose.
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


// Delete all cookies except the cookies in this array. For testing purpose.
function delete_all_except_selected_cookies(domain, selected_cookies) {
    if (selected_cookies == undefined || selected_cookies.length == 0) {
	console.log("APPU DEBUG: selected_cookies array is not populated. Doing nothing.");
	return;
    }

    var cb_cookies = (function(selected_cookies) {
	    return function(all_cookies) {
		console.log("APPU DEBUG: Total cookies: " + all_cookies.length);
		console.log("APPU DEBUG: Total cookies to be deleted: " + 
			    (all_cookies.length - selected_cookies.length));

		var total_cookies_deleted = [];
		for (var i = 0; i < all_cookies.length; i++) {
		    if (selected_cookies.indexOf(all_cookies[i].name) != -1) {
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
	})(selected_cookies);
    
    chrome.cookies.getAll({
	    'domain' : domain,
		},
	cb_cookies);
}


// Test function to delete all cookies except SUSPECTED account cookies
function delete_all_except_during_cookies(domain) {
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
		    var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
		    var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;
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


// This means that a password element was detected on the page.
// So the user will probably attempt to login to the site.
// Record the current set of cookies to see what new cookies are
// created.
// Things to take care of:
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
		    var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
		    var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;
		    pre_login_cookies[domain].username = username;
		    pre_login_cookies[domain].cookies[cookie_key] = hashed_cookie_val;
		}
	    }
	})(username, domain);

    get_all_cookies(domain, cb_cookies);
}


// After the successful login, detects which cookies have been set.
function detect_login_cookies(domain) {
    var cb_cookies = (function(domain) {
	    return function(all_cookies) {
		console.log("APPU DEBUG: Detecting login cookies for: " + domain);
		var login_state_cookies = {};
		login_state_cookies.username = pre_login_cookies[domain].username;
		login_state_cookies.cookies = {};

		for (var i = 0; i < all_cookies.length; i++) {
		    // Following is not necessarily true.
		    // For e.g. "github.com" does not set
		    // their account-cookies to "https://.github.com" but
		    // rather "https://github.com"
		    //   if (all_cookies[i].domain[0] != '.') {
		    //  	continue;
		    //   }

		    var cookie_name = all_cookies[i].name;
		    var cookie_domain = all_cookies[i].domain;
		    var cookie_path = all_cookies[i].path;
		    var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
		    var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;

		    var hashed_cookie_val = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(all_cookies[i].value));
		    if (cookie_key in pre_login_cookies[domain].cookies
			&& hashed_cookie_val == pre_login_cookies[domain].cookies[cookie_key]) {
			// This means that this cookie was either present before logging in 
			// and did not get a new value written to it during login process.
			// So probably *NOT* a login cookie 
			login_state_cookies.cookies[cookie_key] = {};
			login_state_cookies.cookies[cookie_key].cookie_class = 'before';
			login_state_cookies.cookies[cookie_key].hashed_cookie_val = hashed_cookie_val;
		    }
		    else {
			// Cookie is newly created or got a new value written to it.
			// Hence likely a login cookie
			login_state_cookies.cookies[cookie_key] = {};
			login_state_cookies.cookies[cookie_key].cookie_class = 'during';
			login_state_cookies.cookies[cookie_key].hashed_cookie_value = hashed_cookie_val;
			login_state_cookies.cookies[cookie_key].current_state = 'present';
		    }
		}

		// Empty the temporary cookie store.
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
	// console.log("Here here: Domain: " + domain + ", Status: LOGGED-IN");
    }
    else {
	// console.log("Here here: Domain: " + domain + ", Status: LOGGED-OUT");
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
    var cookie_protocol = (change_info.cookie.secure) ? "https://" : "http://";
    var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;

    var pvadcs = pii_vault.aggregate_data.session_cookie_store;
    
    if (pvadcs[domain]) {
	if (change_info.removed) {
	    if ('cookies' in pvadcs[domain] && 
		cookie_key in pvadcs[domain].cookies) {
		var cookie_class = pvadcs[domain].cookies[cookie_key].cookie_class;
		// No need to do anything if its just a 'before' cookie
		if (cookie_class == 'during' || cookie_class == 'after') {
		    // This cookie was added as a result of login process or after login process
		    // No need to do anything if its cause if 'overwrite', it will be recreated shortly.
		    if (change_info.cause == 'expired' || 
			 change_info.cause == 'expired_overwrite' ||
			 change_info.cause == 'explicit' ||
			 change_info.cause == 'overwrite' ||
			 change_info.cause == 'evicted') {
			
			if (cookie_class == 'during') {
			    pvadcs[domain].cookies[cookie_key].current_state = 'absent';
			    // console.log("APPU DEBUG: Changed state of a 'during' cookie to 'absent': " + 
			    //		cookie_key + ", cause: " + change_info.cause);
			    // check_if_still_logged_in(domain);
			    // print_appu_session_store_cookies(domain, 'during');
			}
			else {
			    // No need to store other cookie classes. Save space.
			    delete pvadcs[domain].cookies[cookie_key];
			}
			flush_session_cookie_store();
		    }
		    else {
			console.log("APPU Error: Cookie removed with unknown cause: " + change_info.cause);
		    }
		}
	    }
	}
	else {
	    if ('cookies' in pvadcs[domain] && 
		(change_info.cause == 'expired_overwrite' ||
		 change_info.cause == 'explicit' ||
		 change_info.cause == 'overwrite')) {
		// This cookie was not present during login
		var hashed_cookie_val = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(change_info.cookie.value));

		if (cookie_key in pvadcs[domain].cookies &&
		    pvadcs[domain].cookies[cookie_key].cookie_class == 'during') {
			pvadcs[domain].cookies[cookie_key].current_state = 'changed';
			pvadcs[domain].cookies[cookie_key].hashed_cookie_value = hashed_cookie_val;
			// console.log("APPU DEBUG: Changed state of a 'during' cookie to 'changed': " + 
			//	    cookie_key + ", cause: " + change_info.cause);
			// print_appu_session_store_cookies(domain, 'during');
		}
		else {
		    // console.log("APPU DEBUG: (" + domain + 
		    // 	    ") Creating a new cookie with class 'after': " + cookie_key);
		    
		    pvadcs[domain].cookies[cookie_key] = {};
		    pvadcs[domain].cookies[cookie_key].cookie_class = 'after';
		    pvadcs[domain].cookies[cookie_key].hashed_cookie_value = hashed_cookie_val;
		}
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


function delete_all_cookies_from_HTTP_request(details) {
    for (var i = 0; i < details.requestHeaders.length; i++) {
	if (details.requestHeaders[i].name == "Cookie") {
	    http_request_cookies = details.requestHeaders.splice(i, 1);
	    break;
	}
    }
    return {requestHeaders: details.requestHeaders};
}


function terminate_cookie_investigating_tab(tab_id) {
    console.log("APPU DEBUG: Closing cookie-investigation tab: " + tab_id);
    delete cookie_investigating_tabs[tab_id];
    chrome.tabs.remove(tab_id);
}


// URL should be: "http://mail.google.com/mail/"
function test_site_with_no_cookies(url) {
    open_cookie_slave_tab(url, delete_all_cookies_from_HTTP_request);
}


function is_it_a_during_cookie(domain, cookie_name) {
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];

    for (c in cs.cookies) {
	var curr_cookie_name = c.split(":").pop();
	if (cookie_name == curr_cookie_name && 
	    cs.cookies[c].cookie_class == 'during') {
	    return true;
	}
    }
    return false;
}


// This function deletes the SET COOKIE directive from HTTP responses to 
// tab that investigates cookies. This is useful in cases where servers
// detect that one of the account cookies is present and other is not.
// Then the server tries to delete all the other account cookies. (seems like
// security measure). This happens in the case of Facebook.
// Since we do not want this to interfere between already established user sessions,
// just ignore those commands. 
function delete_set_cookie_from_HTTP_response(details) {
    var final_rh = [];
    if ("responseHeaders" in details) {
	var rh = details.responseHeaders;
	//console.log("Here here: (delete_set_cookie_from_HTTP_response) RequestId: " + details.requestId);
	for (var i = 0; i < rh.length; i++) {
	    if (rh[i].name != "set-cookie") {
		final_rh.push(rh[i]);
	    }
	    else {
		var cookie_name = rh[i].value.match(/(.+?)=(.*)/)[1].trim();
		var domain = get_domain(details.url.split("/")[2]);
		if (!is_it_a_during_cookie(domain, cookie_name)) {
		    console.log("Here here: Letting set-cookie work for: " + cookie_name);
		    final_rh.push(rh[i]);
		}
		else {
		    console.log("Here here: BLOCKING set-cookie for: " + cookie_name);
		    final_rh.push(rh[i]);
		}
	    }
	}
    }
    return {responseHeaders: final_rh};
}


// Each cookie URL is of the form : https://.mail.google.com/mail:ABCD
// Each current URL is of the form : https://mail.google.com/mail/ere?565
// This function basically make a check to see if a particular cookie
// would get sent for a particular URL request. Returns T/F
function is_subdomain(cookie_domain, current_domain) {
    var protocol_matched = "yes";
    cod_protocol = cookie_domain.split(":")[0];
    cud_protocol = current_domain.split(":")[0];
    
    if (cod_protocol == "https" &&
	cod_protocol != cud_protocol) {
	return false;
    }

    cod_hostname = cookie_domain.split("/")[2];
    cud_hostname = current_domain.split("/")[2];

    if (cod_hostname != cud_hostname &&
	cod_hostname[0] != ".") {
	return false;
    }

    if (cod_hostname != cud_hostname &&
	cod_hostname[0] == ".") {
	cod_hostname = cod_hostname.slice(1);
	rev_cod_hostname = cod_hostname.split("").reverse().join("");
	rev_cud_hostname = cud_hostname.split("").reverse().join("");
	if (rev_cud_hostname.indexOf(rev_cod_hostname) != 0) {
	    return false;
	}
    }
    
    cod_path = cookie_domain.split("/").slice(3).join("/").split(":")[0];
    cud_path = current_domain.split("/").slice(3).join("/");

    if (cud_path.indexOf(cod_path) != 0) {
	return false;
    }

    return true;
}


// Returns cookies set during 'login' process.
// If get_all_cookies is not defined or is 'true', it will return all 'DURING' cookies.
// If get_all_cookies is 'false', it will return only cookies that will get sent
// when 'current_url' is requested by the browser.
function get_account_cookies(current_url, get_all_during_cookies) {
    var domain = get_domain(current_url.split("/")[2]);
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];
    var account_cookies = {};

    if (get_all_during_cookies == undefined) {
	get_all_during_cookies = true;
    }

    for (c in cs.cookies) {
	if (cs.cookies[c].cookie_class == 'during') {
	    if (!get_all_during_cookies) {
		if (is_subdomain(c, current_url)) {
		    account_cookies[c] = {};
		    account_cookies[c].hashed_value = cs.cookies[c].hashed_cookie_value; 
		}
	    }
	    else {
		account_cookies[c] = {};
		account_cookies[c].hashed_value = cs.cookies[c].hashed_cookie_value; 
	    }
	}
    }

    return account_cookies;
}


function get_selective_account_cookies(current_url, cookie_names) {
    var domain = get_domain(current_url.split("/")[2]);
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];
    var account_cookies = {};

    for (var i = 0; i < cookie_names.length; i++) {
	for (c in cs.cookies) {
	    if (cs.cookies[c].cookie_class == 'during' &&
		c.split(":")[2] == cookie_names[i]) {
		account_cookies[c] = {};
		account_cookies[c].hashed_value = cs.cookies[c].hashed_cookie_value; 
		break;
	    }
	}
    }
    
    return account_cookies;
}


function check_usernames_for_cookie_investigation(tab_id) {
    var pi_usernames = get_all_usernames();

    if (pi_usernames.length > 0) {
	var cit = cookie_investigating_tabs[tab_id];
	if (cit.page_load_success) {
	    console.log("APPU DEBUG: Page properly loaded. Sending command to detect usernames to cookie investigating tab");
	}
	else {
	    console.log("APPU Error: Page load timeout. Sending command to detect usernames to cookie investigating tab anyway");
	}

	chrome.tabs.sendMessage(tab_id, {
		type: "investigate_cookies",
		    command: "check_usernames",
		    usernames : pi_usernames
		    });
    }
    else {
	console.log("APPU DEBUG: Terminating cookie investigating tab " + 
		    "because no usernames to investigate from");
	report_fatal_error("No usernames present for cookie-investigation");
    }
}


// First processes results from current epoch.
// If the next state is not "st_terminate" then populates
// shadow_cookie_store correctly as per the requirements of current epoch
// then proceeds to test current epoch.
function process_last_epoch_and_start_new_epoch(tab_id, am_i_logged_in, num_pwd_boxes, page_load_success) {
    var cit = cookie_investigating_tabs[tab_id];

    if (cit.pageload_timeout != undefined) {
	console.log("APPU DEBUG: Clearing reload-interval for: " + tab_id +
		    ", Interval-ID: " + cit.pageload_timeout);
	window.clearInterval(cit.pageload_timeout);
	cit.pageload_timeout = undefined;
    }

    var next_state = cit.web_request_fully_fetched(am_i_logged_in, num_pwd_boxes, page_load_success);
    if (next_state != "st_terminate") {
	// Only send command to Cookie-Investigation-Tab after shadow_cookie_store for the
	// tab is properly populated. Hence, sending a callback function to 
	// shadow_cookie_store populating function.
	cit.restore_shadow_cookie_store((function(tab_id) {
		    return function() {
			var cit = cookie_investigating_tabs[tab_id];
			if (cit == undefined) {
			    // Probably some error occurred and tab is terminated
			    return;
			}

			console.log("APPU DEBUG: COOKIE INVESTIGATOR STATE(" + cit.get_state() + ")");

// 			if (cit.content_script_started) {
// 			    console.log("APPU DEBUG: Sending PAGE-RELOAD command: " + cit.url);
// 			    chrome.tabs.sendMessage(tab_id, {
// 				    type: "investigate_cookies",
// 					command: "load_page",
// 					url: cit.url
// 					});
// 			}
// 			else {
// 			    console.log("APPU DEBUG: Forcing PAGE-LOAD: " + cit.url);
// 			    chrome.tabs.update(tab_id, {
// 				    url: cit.url,
// 					active: false,
// 					highlighted: false,
// 					pinned: true
// 					});
// 			}

			chrome.tabs.update(tab_id, {
				url: cit.url,
				    active: false,
				    highlighted: false,
				    //pinned: true
				    });

			cit.bool_state_in_progress = true;
			cit.num_pageload_timeouts = 0;
			cit.page_load_success = false;
			cit.content_script_started = false;

			cit.pageload_timeout = window.setInterval((function(tab_id) {
				    return function() {
					var cit = cookie_investigating_tabs[tab_id];
					if (cit == undefined) {
					    // Probably some error occurred and tab is terminated
					    console.log("APPU Error: Cookie investigating tab not defined " + 
							"but interval function not cleared");
					    return;
					}

					if (cit.num_pageload_timeouts > 2) {
					    if (cit.content_script_started) {
						console.log("APPU DEBUG: Page load timeout(>2), " + 
							    "content script started, username detection test never worked");
						if (cit.pageload_timeout != undefined) {
						    console.log("APPU DEBUG: Clearing reload-interval for: " + tab_id
								+ ", Interval-ID: " + cit.pageload_timeout);
						    window.clearInterval(cit.pageload_timeout);
						    cit.pageload_timeout = undefined;
						}
						process_last_epoch_and_start_new_epoch(tab_id, undefined, undefined, false);
					    }
					    else {
						console.log("APPU Error: Page load timeout(>2) and no content script, " + 
							    "may be network error");
						cit.report_fatal_error("Page-load-timeout-max-no-content-script");
					    }
					}
					else {
					    // Just check if there is any username present.
					    // If so, no need to wait for page to fully reload.
					    if (cit.get_state() != "st_cookie_test_start" &&
						cit.get_state() != "st_testing" &&
						cit.content_script_started) {
						console.log("APPU DEBUG: Page load timeout, " + 
							    "content script started, firing username detection test");
						check_usernames_for_cookie_investigation(tab_id);
					    }
					}
					
					cit.num_pageload_timeouts += 1;
				    }
				})(tab_id), 10 * 1000);

			console.log("APPU DEBUG: Setting reload-interval for: " + tab_id 
				    + ", Interval-ID: " + cit.pageload_timeout);
		    }
		})(tab_id));
    }
}


// Open a tab to check if a cookie is an account cookie
function open_cookie_slave_tab(url, 
			       http_request_cb,
			       http_response_cb,
			       update_tab_id, 
			       init_cookie_investigation) {
    //Just some link so that appu content script runs on it.
    var default_url = 'http://live.com';
   
    create_properties = { 
	url: url, 
	active: false 
    };

    //Create a new tab.
    chrome.tabs.create(create_properties, 
		       (function(url, 
				 http_request_cb,
				 http_response_cb,
				 update_tab_id, 
				 init_cookie_investigation) {
			   return function slave_tab_callback(tab) {
			       var filter = {};

			       if (http_request_cb) {
				   chrome.webRequest.onBeforeSendHeaders.addListener(http_request_cb, 
										     {
											 "tabId": tab.id,
											     "urls": ["<all_urls>"]
											     },
										     ["blocking", "requestHeaders"]);
			       }

			       if (http_response_cb) {
				   chrome.webRequest.onHeadersReceived.addListener(http_response_cb, {
					   "tabId": tab.id,
					       "urls": ["<all_urls>"]
					       },
				       ["blocking", "responseHeaders"]);
			       }

			       chrome.webRequest.onBeforeRedirect.addListener(print_redirect_information, {
				       "tabId": tab.id,
					   "urls": ["<all_urls>"]
					   },
				   ["responseHeaders"]);
			       
			       cookie_investigating_tabs[tab.id] = {};
		    
			       update_tab_id(tab.id);

			       console.log("----------------------------------------");
			       console.log("APPU DEBUG: Starting cookie investigation for: " + url);
			       console.log("APPU DEBUG: Created a new tab to investigate cookies: " + tab.id);

			       init_cookie_investigation();

			       console.log("APPU DEBUG: COOKIE INVESTIGATOR STATE(" + 
					   cookie_investigating_tabs[tab.id].get_state() + ")");

			       cookie_investigating_tabs[tab.id].print_cookie_array();
			   }
		       })(url, 
			  http_request_cb,
			  http_response_cb,
			  update_tab_id, 
			  init_cookie_investigation));
}


// Returns a cookie-investigator that maintains all the state and drives the
// cookie investigation.
// Perhaps this is better done as a class, but for now, its a closure.
function cookie_investigator(account_cookies, 
			     url, 
			     config_cookiesets, 
			     config_forceshut,
			     config_skip_initial_states) {
    var my_url = url;

    var is_allcookies_test_done = false;
    var is_during_cookies_pass_test_done = false;
    var is_during_cookies_block_test_done = false;

    var limit_forceful_shutdown = 5;

    if (config_forceshut != undefined) {
	limit_forceful_shutdown = config_forceshut;
    }

    var tot_cookies_tried = 0;
    var tot_cookiesets_tried = 0;

    var current_cookie_test_index = 0;
    var suspected_account_cookies_array = Object.keys(account_cookies);
    //suspected_account_cookies_array.sort();

    var bool_skip_initial_verification_steps = false;
    
    console.log("APPU DEBUG: Suspected account cookies:");
    for (var i = 0; i < suspected_account_cookies_array.length; i++) {
	console.log(suspected_account_cookies_array[i]);
    }
    
    var tot_cookies = Object.keys(account_cookies).length;
    var tot_execution = 0;
    var my_tab_id = undefined;

    var bool_all_account_cookies_in_default_store = undefined;
    var bool_account_cookies_in_during_cookies = undefined;
    var bool_account_cookies_not_in_nonduring_cookies = undefined;

    var my_domain = get_domain(url.split("/")[2]);
    var orig_cookie_store = {};
    
    // Various states possible:
    // "st_testing"                                : Just simple testing
    // "st_cookie_test_start"                      : Loading some default webpage so that Appu content-script runs and
    //                                               accepts commands.
    // "st_verification_epoch"                     : Reload site page. Start with shadow_cookie_store that is
    //                                               exact copy of default_cookie_store.
    //                                               Test the page for usernames after page load.
    //                                               If usernames found, user is logged-in (EXPECTED)
    //                                               Otherwise:
    //                                                   1. We do not have this user's username in PI database.
    //                                                   2. User initiated logout in the middle of our testing.
    //                                                      (Confirm this using other methods like user-click
    //                                                       monitoring OR if URL had "logout" somewhere)
    //                                                   3. Finally, our testing messed up with user-session. 
    //                                               At runtime, we can't distinguish between 1, 2 and 3.
    //                                               So assume the worse(#3) and STOP TESTING this site further.
    // "st_start_with_no_cookies"                  : Reload the site page. Start with empty shadow-cookie-store.
    //                                               After reloading site page, test if usernames are found. 
    //                                               If no usernames are found, that is the expected behavior.
    //                                               Otherwise, critical error in Appu code since it is letting
    //                                               default_cookie_store cookies to pass. STOP TESTING.
    // "st_during_cookies_pass_test"               : Reload site page. Start with shadow_cookie_store that is 
    //                                               populated with only 'DURING' cookies as detected by Appu.
    //                                               Test the page for usernames after page load.
    //                                               If usernames found, user is logged-in (EXPECTED)
    //                                               Otherwise it means we have not detected 'DURING' 
    //                                               cookies properly. STOP TESTING
    // "st_during_cookies_block_test"              : Reload site page. Start with shadow_cookie_store that is 
    //                                               populated without any 'DURING' cookies as detected by Appu.
    //                                               Test the page for usernames after page load.
    //                                               If no usernames found, user is logged-out (EXPECTED)
    //                                               Otherwise, it means we have not detected 'DURING' 
    //                                               cookies properly. STOP TESTING.
    //
    //  Both 'st_during_cookies_pass_test' & 'st_during_cookies_block_test' will confirm that actual "ACCOUNT-COOKIES"
    //  are subset of 'DURING' cookies *ONLY*. This is expected, otherwise we are detecting 'DURING' cookies incorrectly.
    //
    // "st_single_cookie_test"                     : Reload site page. Start with shadow_cookie_store that is 
    //                                               populated with default_cookie_store except one cookie getting tested.
    //                                               Test the page for usernames after page load.
    //                                               If no usernames found, user is logged-out and mark that cookie as
    //                                               'ACCOUNT-COOKIE'.
    //                                               Otherwise, it means that that cookie is not 'ACCOUNT-COOKIE' OR
    //                                               other cookies are sufficient to regenerate this cookie
    //                                               (looking at you Google)
    // "st_non_accountcookies_block_test"          : If there are account-cookies discovered in the states so far, then
    //                                               test login by omitting all the cookies that are account-cookies and
    //                                               only letting rest of the 'DURING' cookies pass. 
    //                                               If it is seen that the account is not logged in, then one can
    //                                               easily avoid the entire "st_cookiesets_test".
    //                                               If there are no account-cookies discovered, then skip this test.
    // "st_cookiesets_test"                        : Cookiesets are created by systematically omitting some of the
    //                                               'DURING' cookies. So, if we have detected 'N' 'DURING' cookies,
    //                                               then there are '2^N - (N+1)' cookie sets. Here '(n+1)' is subtracted for
    //                                               'N' cookiesets each with one cookie (already tested in 
    //                                               "st_single_cookie_test") and '1' cookie set for all
    //                                               cookies (already tested in "st_during_cookies_block_test").
    //                                               Reload site page. Start with shadow_cookie_store that is 
    //                                               populated with default_cookie_store except cookies from cookieset 
    //                                               currently getting tested. To avoid explosion in cookiesets to be
    //                                               tested, do max-random-attempts.
    //                                               Test the page for usernames after page load.
    //                                               If no usernames found, user is logged-out and mark that cookieset as
    //                                               'ACCOUNT-COOKIE'.
    //                                               Otherwise, it means that that cookieset is not 'ACCOUNT-COOKIE' OR
    //                                               other cookies are sufficient to regenerate this cookie.
    //                                               This test is done only for sites like 'Google' and might not be 
    //                                               performed always.
    // "st_terminate"                              : Everything is done or error occurred. So just terminate.


    // At the start, to activate Appu content script, we need to load some webpage successfully
    // This state does that. At the moment just loading 'live.com'.
    // But in future, it could be anything like the testing URL itself.
    var my_state = "st_cookie_test_start";

    
    // This stores all the cookies for a domain at the start.
    // After that, any HTTP GET done in that tab sends cookies.
    // as per this cookie store.
    // All HTTP Responses with 'set-cookie' will operate on this
    // store as well.
    // At the start of each new WebRequest (Not HTTP Get request), it
    // will be repopulated from the basic cookie-store.
    var shadow_cookie_store = {};
    var original_shadow_cookie_store = {};

    var bool_non_accountcookies_test_done = false;

    // Sets of cookies for which user's session is logged-out if
    // they are absent. This is a strict set. That is each set
    // is not reducible further to a subset.
    var verified_strict_account_cookiesets = [];
    var verified_strict_decimal_account_cookiesets = [];

    // Super-Sets of cookies for which user's session is logged-out if
    // they are absent
    var verified_account_super_cookiesets = [];
    var verified_decimal_account_super_cookiesets = [];

    // Super-Sets of cookies for which user's session is logged-in if
    // they are absent
    var verified_non_account_super_cookiesets = [];
    var verified_decimal_non_account_super_cookiesets = [];

    var verified_restricted_cookiesets = [];

    var current_cookiesets_test_attempts = 0;
    var cookiesets = [];
    var current_cookiesets_test_index = -1;
    var disabled_cookies = [];

    var has_error_occurred = false;
    var shut_tab_forcefully = undefined;

    var rc = generate_cookiesets(my_url, tot_cookies);
    if (rc == -1) {
	return -1;
    }

    console.log("APPU DEBUG: Number of generated cookie-sets: " + cookiesets.length);

    if (config_skip_initial_states) {
	is_allcookies_test_done = true;
	is_during_cookies_pass_test_done = true;
	is_during_cookies_block_test_done = true;
	bool_non_accountcookies_test_done = true;
    }

    
    function generate_random_cookieset_index(tot_cookiesets) {
	return (Math.ceil((Math.random() * tot_cookiesets * 100)) % tot_cookiesets);
    }


    function print_cookie_investigation_state() {
	console.log("APPU DEBUG: COOKIE INVESTIGATION STATUS: " + my_state);
    }
    

    function init_cookie_investigation() {
	var cit = cookie_investigating_tabs[my_tab_id];
	cit.url = my_url;
	cit.num_pageload_timeouts = 0;
	cit.page_load_success = false;
	cit.content_script_started = false;

	cit.bool_state_in_progress = false;

	cit.reload_interval = undefined;
	cit.web_request_fully_fetched = web_request_fully_fetched;
	cit.print_cookie_investigation_state = print_cookie_investigation_state;
	cit.get_state = get_state; 
	cit.restore_shadow_cookie_store = restore_shadow_cookie_store; 
	cit.report_fatal_error = report_fatal_error; 
	cit.get_shadow_cookie_store = get_shadow_cookie_store;
	cit.print_cookie_array = print_cookie_array;
    }

    
    function print_cookie_array() {
	console.log("APPU DEBUG: Following cookies and their combinations would be tested");
	for (var i = 0; i < suspected_account_cookies_array.length; i++) {
	    console.log(suspected_account_cookies_array[i]);
	}
    }


    function get_shadow_cookie_store() {
	return shadow_cookie_store;
    }


    // set1 is a decimal number like 44 (101100)
    // set2 is a decimal number like 60 (111100)
    // Here 44 is subset of 60
    // if set1 is subset of set2 then return 1
    // if set2 is subset of set1 then return 2
    // if none is subset of other then return 0
    function find_subset_relationship(set1, set2) {
	if ((set1 & set2) != set1) {
	    return 1;
	}

	if ((set1 & set2) != set2) {
	    return 2;
	}

	return 0;
    }

    
    // True if set1 is subset of set2
    function is_a_subset(set1, set2) {
	var rc = find_subset_relationship(set1, set2);
	if (rc == 1) {
	    return true;
	}
	return false;
    }


    // True if set1 is superset of set2
    function is_a_superset(set1, set2) {
	var rc = find_subset_relationship(set1, set2);
	if (rc == 2) {
	    return true;
	}
	return false;
    }


    function is_a_setmember_subset(element, set) {
	for (var k = 0; k < set.length; k++) {
	    var rc = find_subset_relationship(element, set[k]);
	    if (rc == 2) {
		// set[k] is a subset of element
		return true;
	    }
	}
	return false;
    }


    function is_a_setmember_superset(element, set) {
	for (var k = 0; k < set.length; k++) {
	    var rc = find_subset_relationship(element, set[k]);
	    if (rc == 1) {
		// element is a subset of set[k]
		return true;
	    }
	}
	return false;
    }


    // We can do ".indexOf()" instead of JSON.stringify because
    // element is a decimal number and set is an array of decimal numbers
    function is_a_member_of_set(element, set) {
	if(set.indexOf(element) != -1) {
	    return true;
	}
	return false;
    }


    // Adds the element "cs" to the set "cookiesets" iff
    // "cs" is already not present in "cookiesets".
    // "cs" : ["http://abc.com/:cookie1", "https://abc.com/:cookie2"]
    // "cookiesets" : array of cookieset like "cs"
    // "decimal_cookiesets" : representation of "cookiesets" as per "suspected_account_cookies_array"
    function add_to_set(cs, cookiesets, decimal_cookiesets, suspected_account_cookies_array) {
	var rc = convert_cookie_array_to_cookieset(cs, suspected_account_cookies_array);
	var dec_num = rc.dec_num;
	if (decimal_cookiesets.indexOf(dec_num) == -1) {
	    cookiesets.push(cs);
	    decimal_cookiesets.push(dec_num);
	    return 1;
	}
	return 0;
    }


    // Adds the element "cs" to the set "cookiesets" iff
    //  "cs" is already not present in "cookiesets" AND
    //  no member of "cookiesets" is subset of "cs"
    // If there "cs" is added to "cookiesets" and if there are
    //  some supersets present then they are deleted.
    //
    // "cs" : ["http://abc.com/:cookie1", "https://abc.com/:cookie2"]
    // "cookiesets" : array of cookieset like "cs"
    // "decimal_cookiesets" : representation of "cookiesets" as per "suspected_account_cookies_array"
    function add_to_set_if_no_subset_member(cs, 
					    cookiesets, 
					    decimal_cookiesets, 
					    suspected_account_cookies_array,
					    decimal_cs) {
	var conv_cs = undefined; 
	var dec_cs = undefined;
	
	if (decimal_cs == undefined) {
	    conv_cs = convert_cookie_array_to_cookieset(cs, suspected_account_cookies_array);
	    dec_cs = conv_cs.dec_num;
	}
	else {
	    dec_cs = decimal_cs;
	}

	var subset_found = false;
	var superset_indexes = [];

	for (var k = 0; k < decimal_cookiesets.length; k++) {
	    var curr_dec_num = decimal_cookiesets[k];
	    var rc = find_subset_relationship(dec_cs, curr_dec_num);
	    if (rc == 2) {
		// curr_dec_num is subset of dec_cs
		subset_found = true;
	    }
	    else if (rc == 1) {
		superset_indexes.push(k);
	    }
	}

	if (!subset_found) {
	    // First delete all supersets
	    for (var i = 0; i < superset_indexes.length; i++) {
		var index_to_delete = superset_indexes[i];
		decimal_cookiesets.splice(index_to_delete, 1);		
		cookiesets.splice(index_to_delete, 1);		
	    }

	    cookiesets.push(cs);
	    decimal_cookiesets.push(dec_num);
	    return 1;
	}
	return 0;
    }


    // Adds the element "cs" to the set "cookiesets" iff
    //  "cs" is already not present in "cookiesets" AND
    //  no member of "cookiesets" is superset of "cs"
    // If there are subsets present, then delete them.
    //
    // "cs" : ["http://abc.com/:cookie1", "https://abc.com/:cookie2"]
    // "cookiesets" : array of cookieset like "cs"
    // "decimal_cookiesets" : representation of "cookiesets" as per "suspected_account_cookies_array"
    function add_to_set_if_no_superset_member(cs, 
					      cookiesets, 
					      decimal_cookiesets, 
					      suspected_account_cookies_array,
					      decimal_cs) {
	var conv_cs = undefined;
	var dec_cs = undefined;

	if (decimal_cs == undefined) {
	    conv_cs = convert_cookie_array_to_cookieset(cs, suspected_account_cookies_array);
	    dec_cs = conv_cs.dec_num;
	}
	else {
	    dec_cs = decimal_cs;
	}

	var superset_found = false;
	var subset_indexes = [];

	for (var k = 0; k < decimal_cookiesets.length; k++) {
	    var curr_dec_num = decimal_cookiesets[k];
	    var rc = find_subset_relationship(dec_cs, curr_dec_num);
	    if (rc == 1) {
		// curr_dec_num is superset of dec_cs
		superset_found = true;
	    }
	    else if (rc == 2) {
		subset_indexes.push(k);
	    }
	}

	if (!superset_found) {
	    // First delete all subsets
	    for (var i = 0; i < subset_indexes.length; i++) {
		var index_to_delete = subset_indexes[i];
		decimal_cookiesets.splice(index_to_delete, 1);		
		cookiesets.splice(index_to_delete, 1);		
	    }

	    cookiesets.push(cs);
	    decimal_cookiesets.push(dec_num);
	    return 1;
	}
	return 0;
    }


    // Returns super cookiesets which are:
    //     1. Have maximum '1's but are not tested so far.
    //     2. Are not supersets of verified account-cookiesets.
    //     3. Already not-verified to be account-super-cookiesets.
    // Returned super-cookiesets are tested by dropping cookies marked by '1'.
    // If the user is LOGGED-OUT, then we need to investigate permutations and combinations of subsets
    //   to find the exact account-cookiesets.
    // If the user is still LOGGED-IN then we do not need to test any subset of this superset.
    //   because for any subset, the user would still be LOGGED-IN 
    //
    // MATHEMATICALLY:
    // If cookiesets are thought to be partially ordered, then this function returns
    //  greatest-upper-bounds of all *UN-tested* cookiesets currently.
    // Please notice that these are greatest-upper-bounds and not least-upper-bounds(or supremum).
    // Once we test all greatest-upper-bounds and if we find that one of them does not cause
    //  user to be logged-out, then we need not test any subsets of this greatest-upper-bound.
    // Obviously, in the very first run, the greatest-upper-bound would be jst one cookieset
    //  with all values set to '1'.
    // In the subsequent executions of this function:
    //  1. Due to omitting already found and tested greatest-upper-bounds AND
    //  2. Due to finding 'strict' account-cookiesets and omitting their supersets
    //  we will find a different and probably multiple greatest-upper-bounds.
    function generate_super_cookiesets(url,
				       tot_cookies, 
				       verified_strict_decimal_account_cookiesets,
				       verified_decimal_account_super_cookiesets,
				       verified_decimal_non_account_super_cookiesets) {
	var my_decimal_super_cookiesets = [];
	var my_super_cookiesets = [];
	var rc = true;
	var num_sets = Math.pow(2, tot_cookies);

	for (var i = 0; i < num_sets; i++) {
	    var curr_cookieset_decimal = i;
	    var str_bin_i = curr_cookieset_decimal.toString(2);
	    var bin_i = str_bin_i.split('');

	    if (bin_i.length < tot_cookies) {
		var insert_zeroes = (tot_cookies - bin_i.length);
		for (var k = 0; k < insert_zeroes; k++) {
		    bin_i.unshift("0");
		}
	    }
	    
	    rc = is_a_setmember_subset(curr_cookieset_decimal, 
				       verified_strict_decimal_account_cookiesets);
	    if (rc) {
		// Suppressing these cookies will cause session to be logged-out anyway.
		// No point in testing.
		continue;
	    }

	    rc = is_a_setmember_superset(curr_cookieset_decimal, 
					 verified_decimal_non_account_super_cookiesets);
	    if (rc) {
		// Suppressing these cookies will cause session to be logged-in.
		// No point in testing.
		continue;
	    }

	    rc = is_a_member_of_set(curr_cookieset_decimal, 
				    verified_decimal_account_super_cookiesets);
	    if (rc) {
		// This has been already tested and known to be accountcookie-superset.
		// No point in testing again.
		continue;
	    }

	    rc = is_a_setmember_subset(curr_cookieset_decimal, 
				       verified_decimal_account_super_cookiesets);
	    if (rc) {
		// Suppressing these cookies will cause session to be logged-out because
		// there is already a set in verified_decimal_account_super_cookiesets
		// that is subset of curr_cookieset_decimal.
		// No point in testing.
		continue;
	    }

	    // First check which members discovered in previous iterations are
	    //  either: subsets of this member in which case delete them
	    //  or: supersets of this member in which case do not add it.
	    add_to_set_if_no_superset_member(undefined, 
					     [], 
					     my_decimal_super_cookiesets, 
					     undefined,
					     curr_cookieset_decimal);
	    
	}
	
	for (var k = 0; k < my_decimal_super_cookiesets.length; k++) {
	    var curr_dec_cs = my_decimal_super_cookiesets[k];
	    var str_bin_cs = curr_dec_cs.toString(2);
	    var bin_cs = str_bin_cs.split('');
	    
	    if (bin_cs.length < tot_cookies) {
		var insert_zeroes = (tot_cookies - bin_cs.length);
		for (var k = 0; k < insert_zeroes; k++) {
		    bin_cs.unshift("0");
		}
	    }
	    
	    my_super_cookiesets.push(bin_cs);
	}

	return {
	    decimal_cookiesets: my_decimal_super_cookiesets,
		cookiesets: my_super_cookiesets
	};
    }


    // Accepts a cookieset, something like: ["http://abc.com:cookie5", "http://abc.com:cookie2", 
    //                                       "http://abc.com:cookie3"]
    // Refers to suspected_account_cookies_array like: ["http://abc.com:cookie1", 
    //                                        "http://abc.com:cookie2", 
    //                                        "http://abc.com:cookie3", 
    //                                        "http://abc.com:cookie4", 
    //                                        "http://abc.com:cookie5"]
    // Returns:
    //  binary_cookieset_string: "01101"
    //  binary-cookieset: ["0", "1", "1", "0", "1"]
    //  decimal number: 13
    function convert_cookie_array_to_cookieset(cookie_array, suspected_account_cookies_array) {
	var bin_cookieset_str = "";
	var cookieset = [];

	for (var i = 0; i <= suspected_account_cookies_array.length; i++) {
	    var index = cookie_array.indexOf(suspected_account_cookies_array[i]);
	    if (index == -1) {
		bin_cookieset_str = "0" + bin_cookieset_str; 
		cookieset.unshift("0");
	    }
	    else {
		bin_cookieset_str = "1" + bin_cookieset_str;
		cookieset.unshift("1");
	    }
	}

	return {
	    bin_str: bin_cookieset_str,
		cookieset: cookieset,
		dec_num: parseInt(bin_cookieset_str, 2)
	}
    }


    // Accepts a cookieset like: ["0", "1", "1", "0", "1"]
    //    AND
    // suspected_account_cookies_array like: ["http://abc.com:cookie1", 
    //                              "http://abc.com:cookie2", 
    //                              "http://abc.com:cookie3", 
    //                              "http://abc.com:cookie4", 
    //                              "http://abc.com:cookie5"]
    // Returns a cookie_array like: ["http://abc.com:cookie5", "http://abc.com:cookie2", 
    //                               "http://abc.com:cookie3"]
    function convert_cookieset_to_cookie_array(cookieset, suspected_account_cookies_array) {
	// Need to reverse it due to little endianness.
	cookieset.reverse();
	var disabled_cookies = [];
	
	for (var i = 0; i <= cookieset.length; i++) {
	    if (cookieset[i] == '1') {
		disabled_cookies.push(suspected_account_cookies_array[i]);
	    }
	}
	return disabled_cookies;
    }


    // Returns cookiesets which have only specific number of cookies marked.
    // For example is 'x' = 2, and tot_cookies = 3, then
    // [['0', '1', '1'], ['1', '0', '1'], ['1', '1', '0']] will get returned.
    // Marked cookies will be omitted while populating shadow_cookie_store.
    // If any of the cookies in the above set is a superset of already verified account cookieset
    // then they will not be included in the array.
    function generate_cookiesets_with_X_number_of_cookies_to_be_dropped(url, 
									x, 
									tot_cookies, 
									verified_strict_decimal_account_cookiesets) {
	var my_cookiesets = [];

	if (tot_cookies > MAX_COOKIE_TEST) {
	    var err_str = "APPU Error: Cookie number exceeds(" + tot_cookies + 
		") maximum cookies, cannot proceed for: " + url;
	    console.log(err_str);
	    print_appu_error(err_str);
	    return -1;
	}

	var num_sets = Math.pow(2, tot_cookies);
	
	for (var i = 0; i < num_sets; i++) {
	    var str_bin_i = i.toString(2);
	    var bin_i = str_bin_i.split('');
	    
	    if (bin_i.length < tot_cookies) {
		var insert_zeroes = (tot_cookies - bin_i.length);
		for (var k = 0; k < insert_zeroes; k++) {
		    bin_i.unshift("0");
		}
	    }
	    
	    var total = 0;
	    for (var j = 0; j < bin_i.length; j++) {
		bin_i[j] = parseInt(bin_i[j]);
		total += (bin_i[j]);
	    }
	    
	    if (total == x) {
		// Only push this set if it is not a superset of already
		// verified cookieset.
		var bool_is_a_superset = false;
		for (var k = 0; k < verified_strict_decimal_account_cookiesets.length; k++) {
		    var tmp = find_subset_relationship(verified_strict_decimal_account_cookiesets[k], i);
		    if (tmp == 1) {
			bool_is_a_superset = true;
			break;
		    }
		}

		if (!bool_is_a_superset) {
		    my_cookiesets.push(bin_i);
		}
	    }
	}
	
	return my_cookiesets;
    }


    // Generates cookiesets. If there is a '1' at a specific position in 
    // a cookieset, that cookie will be dropped while populating shadow_cookie_store.
    // This function just generates all cookiesets exhasutively from (1:2^N).
    // Where N: Total number of 'DURING' cookies.
    // However, it will sort cookiesets such that all cookiesets with one cookie
    // to be dropped are at the start. Then, all cookies with two cookies to be
    // dropped and so on.
    // This way, if we detect that a particular cookieset is indeed an account 
    // cookieset then we need not test all of its supersets and just prune them.
    function generate_cookiesets(url, tot_cookies) {
	var num_sets = Math.pow(2, tot_cookies);
	
	if (tot_cookies > MAX_COOKIE_TEST) {
	    var err_str = "APPU Error: Cookie number exceeds(" + tot_cookies + 
		") maximum cookies, cannot proceed for: " + url;
	    console.log(err_str);
	    print_appu_error(err_str);
	    return -1;
	}

	for (var i = 0; i < num_sets; i++) {
	    var str_bin_i = i.toString(2);
	    var bin_i = str_bin_i.split('');
	    
	    if (bin_i.length < tot_cookies) {
		var insert_zeroes = (tot_cookies - bin_i.length);
		for (var k = 0; k < insert_zeroes; k++) {
		    bin_i.unshift("0");
		}
	    }
	    
	    var total = 0;
	    for (var j = 0; j < bin_i.length; j++) {
		bin_i[j] = parseInt(bin_i[j]);
		total += (bin_i[j]);
	    }
	    
	    if (total != 0 && 
		total != 1 &&
		total != tot_cookies) {
		cookiesets.push(bin_i);
	    }
	}
	
	cookiesets.sort(function(set1, set2) {
		var tot1 = 0, tot2 = 0;
		for (var i = 0; i < tot_cookies; i++) {
		    tot1 += set1[i];
		    tot2 += set2[i];
		}
		if (tot1 < tot2) {
		    return -1;
		}
		else if (tot1 > tot2) {
		    return 1;
		}
		else {
		    return 0;
		}
	    });
    }
    

    // Variable verified_cookie_array[] is an array of cookies that is verified to be an account-cookieset.
    // Each cookie in the array is of the form: https://abcde.com/my_path:cookie_name
    // This will remove all supersets of verified_cookie_array from cookieset
    function prune_cookiesets(verified_cookie_array, suspected_account_cookies_array, cookiesets) {
	var rc = convert_cookie_array_to_cookieset(verified_cookie_array, suspected_account_cookies_array);
	var verified_cookieset = rc.cookieset;
	var verified_decimal_cookieset = rc.dec_num;

	var new_cookiesets = [];
	for (var i = 0; i < cookiesets.length; i++) {
	    var curr_decimal_cookieset = parseInt(cookiesets[i].join(""), 2);
	    rc = is_a_superset(curr_decimal_cookieset, verified_decimal_cookieset);
	    if (!rc) {
		// Only add curr_decimal_cookieset if it is not a superset of 
		// verified_decimal_cookieset. If it is a superset then no point in testing.
		new_cookiesets.push(cookiesets[i]);			
	    }
	}
	return new_cookiesets;
	cookiesets = new_cookiesets;
    }
    

    function get_cookie_store_snapshot(cookie_store, cb_shadow_restored) {
	var cb_cookies = (function(cookie_store, cb_shadow_restored) {
		return function(all_cookies) {
		    var cs = pii_vault.aggregate_data.session_cookie_store[my_domain];
		    
		    if (my_state == "st_single_cookie_test" ||
			my_state == "st_start_with_no_cookies" ||
			my_state == "st_during_cookies_pass_test" ||
			my_state == "st_during_cookies_block_test" ||
			my_state == "st_non_accountcookies_block_test") {
			disabled_cookies = [];
		    }

		    for (var i = 0; i < all_cookies.length; i++) {
			var cookie_name = all_cookies[i].name;
			var cookie_domain = all_cookies[i].domain;
			var cookie_path = all_cookies[i].path;
			var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
			var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;

			if (my_state == "st_during_cookies_pass_test") {
			    if (suspected_account_cookies_array.indexOf(cookie_key) == -1) {
				// We only want 'DURING' cookies in this epoch
				// (suspected_account_cookies_array is populated with 'DURING' cookies in usual epoch)
				disabled_cookies.push(cookie_key);
				continue;
			    }
			}
			else if (my_state == "st_during_cookies_block_test") {
			    if (suspected_account_cookies_array.indexOf(cookie_key) != -1) {
				// We only want non-'DURING' cookies in this epoch
				// (suspected_account_cookies_array is populated with 'DURING' cookies in usual epoch)
				disabled_cookies.push(cookie_key);
				continue;
			    }
			}
			else if (my_state == 'st_single_cookie_test') {
			    var curr_test_cookie_name = suspected_account_cookies_array[current_cookie_test_index];
			    if (curr_test_cookie_name == cookie_key) {
				// Usually, for other states, disabled_cookies is not populated
				// here but it is rather used here (see "st_cookiesets_test")
				// But this is a hack for now.
				disabled_cookies.push(cookie_key);
				continue;
			    }
			}
			else if (my_state == 'st_non_accountcookies_block_test') {
			    var bool_match = false;
			    
			    for (var k = 0; k < verified_strict_account_cookiesets.length; k++) {
				if (JSON.stringify(verified_strict_account_cookiesets[k]) == 
				    JSON.stringify([cookie_key])) {
				    bool_match = true;
				    break;
				}
			    }
			    
			    if (bool_match == false) {
				// Only populate account-cookies discovered so far.
				// So that if any combination of other 'DURING' cookies
				// is required for logged-in status, that will be discovered.
				// Usually, for other states, disabled_cookies is not populated
				// here but it is rather used here (see "st_cookiesets_test")
				// But this is a hack for now.
				disabled_cookies.push(cookie_key);
				continue;
			    }
			}
			else if (my_state == 'st_cookiesets_test') {
			    // If the cookie is in the set of disabled-cookie-sets in this 
			    // iteration, then ignore it.
			    if (disabled_cookies.indexOf(cookie_key) != -1) {
				continue;
			    }
			}
			
			cookie_store[cookie_key] = all_cookies[i];
		    }
		    console.log("APPU DEBUG: Restored shadow_cookie_store length: " + 
				Object.keys(cookie_store).length + 
				", On-disk cookie-store length: " + all_cookies.length);

		    if (my_state != "st_verification_epoch") {
			console.log("APPU DEBUG: Disabled cookies in this epoch: " + 
				    JSON.stringify(disabled_cookies));
		    }

		    original_shadow_cookie_store = $.extend(true, {}, shadow_cookie_store);

		    cb_shadow_restored();
		}
	    })(cookie_store, cb_shadow_restored);
	
	get_all_cookies(my_domain, cb_cookies);
    }
    

    function are_disabled_cookies_regenerated() {
	var num_regen_cookies = 0;
	for (var i = 0; i < disabled_cookies.length; i++) {
	    if (shadow_cookie_store[disabled_cookies[i]] != undefined) {
		console.log("APPU DEBUG: Disabled cookie(" + 
			    disabled_cookies[i] + ") was regenerated in shadow-cookie-store: ");
		num_regen_cookies += 1;
	    }
	}
	console.log("APPU DEBUG: Total number of disabled cookies: " + disabled_cookies.length + 
		    ", Total number of regenerated cookies: " + num_regen_cookies);
	console.log("APPU DEBUG: Shadow-Cookie-Store length: " + Object.keys(shadow_cookie_store).length);

	var curr_shadow_cookies = Object.keys(shadow_cookie_store);
	var new_cookies = [];
	for (var i = 0; i < curr_shadow_cookies.length; i++) {
	    if (original_shadow_cookie_store[curr_shadow_cookies[i]] == undefined) {
		new_cookies.push(curr_shadow_cookies[i]);
	    }
	}
	console.log("APPU DEBUG: New cookies added to shadow-cookie-store: " + JSON.stringify(new_cookies));
    }


    function restore_shadow_cookie_store(cb_shadow_restored) {
	//shadow_cookie_store = $.extend(true, {}, orig_cookie_store);
	shadow_cookie_store = {};
	if (my_state != "st_start_with_no_cookies") {
	    get_cookie_store_snapshot(shadow_cookie_store, cb_shadow_restored);
	}
	else {
	    cb_shadow_restored();
	}
    }
    
    
    function update_tab_id(tab_id) {
	my_tab_id = tab_id;

	cookie_investigating_tabs[my_tab_id].shadow_cookie_store = shadow_cookie_store;

	shut_tab_forcefully = window.setTimeout(function() {
		console.log("APPU DEBUG: In forceful shutdown for COOKIE-INVESTIGATOR-TAB: " + my_url);
		report_fatal_error("hard-timeout");
	    }, limit_forceful_shutdown * 60 * 1000);
    }
    
    
    function verification_epoch_results(am_i_logged_in) {
	console.log("APPU DEBUG: Verification Epoch, Is user still logged in? " + 
		    (am_i_logged_in ? "YES" : "NO"));
	// If not, then login and terminate.
    }
    
    
    function update_cookie_status(am_i_logged_in, bool_pwd_box_present) {
	bool_pwd_box_present = (bool_pwd_box_present == undefined) ? false : bool_pwd_box_present; 

	if (my_state == "st_start_with_no_cookies") {
	    if (!am_i_logged_in) {
		console.log("APPU DEBUG: VERIFIED, ACCOUNT-COOKIES are present in default-cookie-store");
		bool_all_account_cookies_in_default_store = true;
	    }
	    else {
		console.log("APPU DEBUG: VERIFIED, ACCOUNT-COOKIES are *NOT* present in default-cookie-store");
		bool_all_account_cookies_in_default_store = false;
		report_fatal_error("account-cookies are not in default-cookie-store OR usernames are not present");
	    }
	}
	else if (my_state == "st_during_cookies_pass_test") {
	    if (am_i_logged_in) {
		console.log("APPU DEBUG: ACCOUNT-COOKIES are present in 'DURING' cookies");
		bool_account_cookies_in_during_cookies = true;
	    }
	    else {
		console.log("APPU DEBUG: Not all ACCOUNT-COOKIES are present in 'DURING' cookies");
		bool_account_cookies_in_during_cookies = false;
		report_fatal_error("not all account-cookies in 'during' cookies");
	    }
	}
	else if (my_state == "st_during_cookies_block_test") {
	    if (!am_i_logged_in) {
		console.log("APPU DEBUG: ACCOUNT-COOKIES are *NOT* present in non-'DURING' cookies");
		bool_account_cookies_not_in_nonduring_cookies = true;
	    }
	    else {
		console.log("APPU DEBUG: ACCOUNT-COOKIES are present in non-'DURING' cookies");
		bool_account_cookies_not_in_nonduring_cookies = false;
		report_fatal_error("account cookies in non-'during' cookies");
	    }
	}
	else {
	    if (my_state == "st_single_cookie_test") {
		console.log("APPU DEBUG: IS ACCOUNT COOKIE?(" + 
			    suspected_account_cookies_array[current_cookie_test_index] + "): " + !am_i_logged_in);
		account_cookies[suspected_account_cookies_array[current_cookie_test_index]].account_cookie = !am_i_logged_in;
		var verified_cookieset = [suspected_account_cookies_array[current_cookie_test_index]];
		if (!am_i_logged_in) {
		    // Since this is a single cookie, we are sure that this is a strict set.
		    verified_strict_account_cookiesets.push(verified_cookieset);
		    cookiesets = prune_cookiesets(verified_cookieset, suspected_account_cookies_array, cookiesets);
		    console.log("APPU DEBUG: Number of cookie-sets after pruning: " + cookiesets.length);
		}
		else {
		    if (bool_pwd_box_present) {
			verified_restricted_cookiesets.push(verified_cookieset);
			console.log("APPU DEBUG: Found restrictive cookie: " + 
				    JSON.stringify(verified_cookieset));
		    }
		}
		current_cookie_test_index += 1;
		tot_cookies_tried += 1;
	    }
	    else if (my_state == "st_non_accountcookies_block_test") {
		console.log("APPU DEBUG: ARE THERE ACCOUNT-COOKIESETS BESIDES ACCOUNT-COOKIES?: " + 
			    !am_i_logged_in);

		if (am_i_logged_in) {
		    // User is still logged in. That means the other 'DURING' cookies or
		    // their combination does not matter. We can skip cookieset testing.
		    cookiesets = [];
		}
	    }
	    else if (my_state == "st_cookiesets_test") {
		console.log("APPU DEBUG: IS ACCOUNT COOKIE-SET?(" + 
			    JSON.stringify(disabled_cookies) + 
			    "): " + !am_i_logged_in);

		var res_arr = cookiesets.splice(current_cookiesets_test_index, 1);

		if (!am_i_logged_in) {
		    verified_strict_account_cookiesets.push(disabled_cookies);
		    cookiesets = prune_cookiesets(disabled_cookies, suspected_account_cookies_array, cookiesets);
		    console.log("APPU DEBUG: Number of cookie-sets after pruning: " + cookiesets.length);
		}
		else {
		    if (bool_pwd_box_present) {
			verified_restricted_cookiesets.push(disabled_cookies);
			console.log("APPU DEBUG: Found restrictive cookieset: " + 
				    JSON.stringify(disabled_cookies));
		    }
		}

		if (cookiesets.length > 0) {
		    if (config_cookiesets == "random") {
			current_cookiesets_test_index = generate_random_cookieset_index(cookiesets.length);
		    }
		    else if (config_cookiesets == "all") {
			// If we are testing "all" cookies, always start from the beginning,
			// Will avoid unnecessary testing due to pruning SUPERSETS.
			current_cookiesets_test_index = 0;
		    }
		    disabled_cookies = convert_cookieset_to_cookie_array(cookiesets[current_cookiesets_test_index],
									 suspected_account_cookies_array);
		}

		current_cookiesets_test_attempts += 1;
		tot_cookiesets_tried += 1;
	    }
	}
    }


    function set_state(curr_state) {
	my_state = curr_state;
    }
    
    
    function get_state() {
	return my_state;
    }
    

    // Will only tell what would be next state after current state.
    function get_next_state() {
	return next_state(false);
    }


    // Will tell what would be next state after current state AND
    // also goto that state.
    function goto_next_state() {
	if (!has_error_occurred) {
	    var cit = cookie_investigating_tabs[my_tab_id];
	    cit.bool_state_in_progress = false;
	    return next_state(true);
	}

	return "st_terminate";
    }


    // If bool_side_effect is false or undefined, then it will just return what
    // would be the next state. 
    // If bool_side_effect is true then it will set and return the next state
    function next_state(bool_side_effect) {
	var rs = "";

	if (bool_side_effect == undefined) {
	    bool_side_effect = true;
	}

	if (is_cookie_testing_done()) {
	    rs = "st_terminate";
	}
	else if (my_state == "st_testing") {
	    rs = "st_terminate";
	}
	else if (my_state == "st_verification_epoch") {
	    if (!is_allcookies_test_done) {
		rs = "st_start_with_no_cookies";
	    }
	    else if (!is_during_cookies_pass_test_done) {
		rs = "st_during_cookies_pass_test";
	    }
	    else if (!is_during_cookies_block_test_done) {
		rs = "st_during_cookies_block_test";
	    }
	    else if (current_cookie_test_index < tot_cookies) {
		rs = "st_single_cookie_test";
	    }
	    else if (current_cookie_test_index >= tot_cookies) {
		if (!bool_non_accountcookies_test_done && 
		    verified_strict_account_cookiesets.length > 0) {
		    bool_non_accountcookies_test_done = true;
		    rs = "st_non_accountcookies_block_test";
		}
		else {
		    bool_non_accountcookies_test_done = true;
		    rs = "st_cookiesets_test";
		}
	    }
	}
	else if (my_state == "st_cookie_test_start"         ||
		 my_state == "st_start_with_no_cookies"     ||
		 my_state == "st_during_cookies_pass_test"  ||
		 my_state == "st_during_cookies_block_test" ||
		 my_state == "st_single_cookie_test"        ||
		 my_state == "st_cookiesets_test"           ||
		 my_state == "st_non_accountcookies_block_test") {
	    rs = "st_verification_epoch";
	}

	if (bool_side_effect) {
	    my_state = rs;

	    console.log("APPU DEBUG: " + 
			"Cookies remaining to be tested: " + 
			(suspected_account_cookies_array.length - current_cookie_test_index) +
			", Total cookies tested: " + tot_cookies_tried);

	    console.log("APPU DEBUG: " +
			"Cookiesets remaining to be tested: " + cookiesets.length +
			", Total cookiesets tested: " + tot_cookiesets_tried);

	    if (my_state == "st_cookiesets_test" && current_cookiesets_test_index == -1) {
		// This is just to initialize for the very first time. 
		// After this time, properly calculating this value will be done 
		// in web_request_fully_fetched()
		if (config_cookiesets == "random") {
		    current_cookiesets_test_index = generate_random_cookieset_index(cookiesets.length);
		}
		else if (config_cookiesets == "all") {
		    current_cookiesets_test_index = 0;
		}

		disabled_cookies = convert_cookieset_to_cookie_array(cookiesets[current_cookiesets_test_index],
								     suspected_account_cookies_array);
	    }
	}

	if (my_state == "st_terminate") {
	    final_result();
	}

	return rs;
    }
    
    
    function is_cookie_testing_done() {
	if (current_cookie_test_index >= tot_cookies) {
	    if (config_cookiesets == 'none') {
		console.log("APPU DEBUG: All single-cookies have been tested AND no cookie-sets " +
			    "testing required. COOKIE-INVESTIGATION: DONE");
		return true;
	    }
	    else {
		// If no cookiesets to test then obviously we are done.
		if (cookiesets.length == 0) {
		    console.log("APPU DEBUG: All single-cookies have been tested AND all cookie-sets " +
				"are tested. COOKIE-INVESTIGATION: DONE");
		    return true;
		}

		// If max-test-attempts done for 'random' then we are done.
		if (config_cookiesets == 'random' &&
		    current_cookiesets_test_attempts >= MAX_RANDOM_COOKIESETS_TEST_ATTEMPTS) {
		    console.log("APPU DEBUG: All single-cookies have been tested AND maximum random cookiesets(" + 
				MAX_RANDOM_COOKIESETS_TEST_ATTEMPTS + ") " +
				"are tested. COOKIE-INVESTIGATION: DONE");
		    return true;
		}
		return false;
	    }
	}
	return false;
    }
    
    
    function final_result() {
	if (!has_error_occurred) {
	    console.log("------ FINAL RESULT ------");
	    console.log("APPU DEBUG: Cookies investigated for URL: " + my_url);

       	    if (bool_all_account_cookies_in_default_store) {
		print_appu_error("APPU DEBUG: All account-cookies present in the default-cookie-store: " + 
				 my_domain);
	    }
	    else {
		print_appu_error("APPU Error: All account-cookies are *NOT* present in the default-cookie-store: " + 
				 my_domain);
	    }

       	    if (bool_account_cookies_in_during_cookies &&
		bool_account_cookies_not_in_nonduring_cookies) {
		print_appu_error("APPU DEBUG: All account-cookies present *ONLY* in the 'DURING' cookies" + 
				 my_domain);
	    }
	    else {
		print_appu_error("APPU DEBUG: Not all account-cookies present in the 'DURING' cookies" + 
				 my_domain);
	    }
	
	    console.log("APPU DEBUG: Finished testing account cookies for: " + url);
	    for (c in account_cookies) {
		console.log(c + ": " + (account_cookies[c].account_cookie ? "YES" : "NO"));
	    }

	    console.log("APPU DEBUG: Number of account-cookiesets: " + 
			verified_strict_account_cookiesets.length);
	    for (var j = 0; j < verified_strict_account_cookiesets.length; j++) {
		var cs_names = verified_strict_account_cookiesets[j];
		console.log(j + ". Number of cookies: " + cs_names.length +
			    ", CookieSet: " +
			    JSON.stringify(cs_names));
	    }
	
	    console.log("APPU DEBUG: Number of restrictive account-cookiesets: " + 
			verified_restricted_cookiesets.length);
	    for (var j = 0; j < verified_restricted_cookiesets.length; j++) {
		var cs_names = verified_restricted_cookiesets[j];
		console.log(j + ". Number of cookies: " + cs_names.length +
			    ", CookieSet: " +
			    JSON.stringify(cs_names));
	    }

	    console.log("APPU DEBUG: Pending cookiesets: " + cookiesets.length);
	}

	terminate_cookie_investigating_tab(my_tab_id);
	window.clearTimeout(shut_tab_forcefully);
    }
    
    
    function report_fatal_error(reason) {
	// This function will take care of all the major errors that would hamper 
	// cookie testing. 
	// Error conditions to be taken care of:
	// 1. No usernames to check for (i.e. FPI store is not populated)
	// 2. User logs out of the website in the middle of the session.
	// 3. Verification epoch says that user is no longer logged-in.
	// 4. Hard timeout occurs for cookie investigation.
	// 5. User closes the tab.
	// 6. If current_cookie_test_index == -1
	// 7. Max webpage reload attempts has reached (site or net is slow).

	var cit = cookie_investigating_tabs[my_tab_id];
	if (cit.pageload_timeout != undefined) {
	    console.log("APPU DEBUG: Clearing reload-interval for: " + my_tab_id
			+ ", Interval-ID: " + cit.pageload_timeout);
	    window.clearInterval(cit.pageload_timeout);
	    cit.pageload_timeout = undefined;
	}

	var err_str = "APPU Error: ERROR during cookie investigation, reason: " + reason +
	    ", for URL: " + my_url;

	console.log(err_str);
	print_appu_error(err_str);

	has_error_occurred = true;
	final_result();
    }


    // I need this function because each web page fetch consists of multiple
    // HTTP GET requests for various resources on the web page.
    // For all those GET requests, same cookie must be blocked.
    // Thus, someone else from outside will have to know that the webpage fetch
    // is complete and we should move to suppress next cookie.
    function web_request_fully_fetched(am_i_logged_in, num_pwd_boxes, page_load_success) {
	tot_execution += 1;
	num_pwd_boxes = (num_pwd_boxes == undefined) ? 0 : num_pwd_boxes;

	// Code to for setting initial values for next epoch.
	if (my_state == 'st_verification_epoch') {
	    if (am_i_logged_in != undefined) {
		if (am_i_logged_in) {
		    if (num_pwd_boxes == 0) {
			// EXPECTED branch
			// Either page loaded successfully and usernames found OR
			// page not loaded successfully (but content script ran) and usernames are found
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: User is logged-in for test 'st_verification_epoch'");
			verification_epoch_results(am_i_logged_in);
		    }
		    else {
			// LESS SERIOUS error branch, why are there password boxes?
			console.log("APPU Error: NOT EXPECTED: User is logged-in, page_load_success(" + page_load_success
				    + "), BUT number of password boxes present: " + num_pwd_boxes +
				    " for test 'st_verification_epoch'");
			report_fatal_error("Verification-epoch-pwd-boxes-present");
		    }
		}
		else {
		    if (page_load_success) {
			// SERIOUS error branch (User probably initiated log out or our testing messed up user-session)
			console.log("APPU Error: NOT EXPECTED: User is NOT logged-in, num-pwd-boxes("+ num_pwd_boxes 
				    +"), for test 'st_verification_epoch'");
			report_fatal_error("Verification-epoch-page-load-no-usernames");
		    }
		    else {
			// LESS SERIOUS error branch (Network lag?)
			// page not loaded properly.
			console.log("APPU Error: NOT EXPECTED: User is NOT logged-in, num-pwd-boxes(" + num_pwd_boxes
				    + "), page not loaded for test 'st_verification_epoch'");
			report_fatal_error("Verification-epoch-no-page-load-no-usernames");
		    }
		}
	    }
	    else {
		// SERIOUS error branch (User name detection test never carried out)
		console.log("APPU Error: NOT EXPECTED: Username detection test never " + 
			    "carried out for 'st_verification_epoch'");
		report_fatal_error("Verification-epoch-no-username-detection-test: Page load: " + page_load_success);
	    }
	    console.log("*******");
	}
	else if (my_state == 'st_start_with_no_cookies') {
	    if (am_i_logged_in != undefined) {
		if (am_i_logged_in) {
		    // SERIOUS error branch: When starting with no cookies, user should not be logged-in
		    //                       Critical error in Appu code.
		    console.log("APPU Error: NOT EXPECTED: Usernames detected for 'st_start_with_no_cookies', " +
				"num-pwd-boxes: " + num_pwd_boxes);
		    report_fatal_error("Start-with-no-cookies-usernames-found");
		}
		else {
		    if (page_load_success) {
			// EXPECTED branch: User should not be logged-in after page is loaded
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames NOT detected for " + 
				    "'st_start_with_no_cookies', num-pwd-boxes: " + num_pwd_boxes);
			update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
			is_allcookies_test_done = true;
		    }
		    else {
			// LESS SERIOUS error branch: No point in proceeding if page does 
			// not get loaded while starting with empty shadow_cookie_store
			console.log("APPU Error: NOT EXPECTED: Usernames NOT detected, page NOT loaded " +
				    "num-pwd-boxes: " + num_pwd_boxes +
				    ", for 'st_start_with_no_cookies'");
			report_fatal_error("Start-with-no-cookies-no-usernames-no-page-load");
		    }
		}
	    }
	    else {
		// SERIOUS error branch (User name detection test never carried out)
		console.log("APPU Error: NOT EXPECTED: Username detection test never " + 
			    "carried out for 'st_start_with_no_cookies'");
		report_fatal_error("Start-with-no-cookies-no-username-detection-test: Page load: " + page_load_success);
	    }
	    console.log("----------------------------------------");
	}
	else if (my_state == 'st_during_cookies_pass_test') {
	    if (am_i_logged_in != undefined) {
		if (am_i_logged_in) {
		    if (num_pwd_boxes == 0) {
			// EXPECTED branch
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames detected for 'st_during_cookies_pass_test'");
			update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
			is_during_cookies_pass_test_done = true;
		    }
		    else {
			// LESS SERIOUS error branch, why are there password boxes?
			console.log("APPU Error: NOT EXPECTED: User is logged-in, page_load_success(" + page_load_success
				    + "), BUT number of password boxes present: " + num_pwd_boxes +
				    " for test 'st_during_cookies_pass_test'");
			report_fatal_error("During-cookies-pass-epoch-pwd-boxes-present");
		    }
		}
		else {
		    if (page_load_success) {
			// SERIOUS error branch (Usernames not detected even if page loaded, we could
			// be detecting 'DURING' cookies incorrectly)
			console.log("APPU Error: NOT EXPECTED: Usernames NOT detected, " + 
				    "num-pwd-boxes: " + num_pwd_boxes +
				    ", for 'st_during_cookies_pass_test'");
			report_fatal_error("During-cookies-pass-no-usernames-page-loaded");
		    }
		    else {
			// SERIOUS error branch (Usernames not detected, page NOT loaded, test
			// unconclusive. Could be a network issue)
			console.log("APPU Error: NOT EXPECTED: Usernames NOT detected, page NOT loaded, " + 
				    "num-pwd-boxes: " + num_pwd_boxes + 
				    ", for 'st_during_cookies_pass_test'");
			report_fatal_error("During-cookies-pass-no-usernames-no-page-load");
		    }
		}
	    }
	    else {
		// SERIOUS error branch (user name detection test never carried out)
		console.log("APPU Error: NOT EXPECTED: Username detection test never " + 
			    "carried out for 'st_during_cookies_pass_test'");
		report_fatal_error("During-cookies-pass-no-username-detection-test: Page load: " + page_load_success);
	    }
	    console.log("----------------------------------------");
	}
	else if (my_state == 'st_during_cookies_block_test') {
	    if (am_i_logged_in != undefined) {
		if (am_i_logged_in) {
		    // SERIOUS error branch (Usernames found even when all 'DURING' cookies blocked.
		    // This means we are not detecting them correctly)
		    console.log("APPU Error: NOT EXPECTED: Usernames found " + 
				"for 'st_during_cookies_block_test', Page load: " + page_load_success +
				", num-pwd-boxes: " + num_pwd_boxes);
		    report_fatal_error("During-cookies-block-usernames-found: Page load: " + page_load_success);
		}
		else {
		    if (page_load_success) {
			// EXPECTED branch
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames NOT detected for " + 
				    "'st_during_cookies_block_test', num-pwd-boxes: " + num_pwd_boxes);
			update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
			is_during_cookies_block_test_done = true;
		    }
		    else {
			// LESS SERIOUS error branch (Usernames NOT found when all 'DURING' cookies blocked.
			// But page is not fully loaded (network lag?). Test is inconclusive and we better stop further
			// testing.)
			console.log("APPU Error: NOT EXPECTED: Usernames NOT detected, Page NOT loaded, " + 
				    "num-pwd-boxes: " + num_pwd_boxes +
				    ", for 'st_during_cookies_block_test'");
			report_fatal_error("During-cookies-block-no-usernames-no-page-load");
		    }
		}
	    }
	    else {
		// SERIOUS error branch (user name detection test never carried out)
		console.log("APPU Error: NOT EXPECTED: Username detection test never " + 
			    "carried out for 'st_during_cookies_block_test'");
		report_fatal_error("During-cookies-block-no-username-detection-test: Page load: " + page_load_success);
	    }

	    console.log("----------------------------------------");
	}
	else if (my_state == 'st_single_cookie_test') {
	    if (am_i_logged_in != undefined) {
		if (page_load_success) {
		    // EXPECTED branch
		    console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames detection test done, " + 
				"page loaded, num-pwd-boxes: " + num_pwd_boxes +
				", for 'st_single_cookie_test'");
		    are_disabled_cookies_regenerated();
		    update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
		}
		else {
		    if (am_i_logged_in) {
			// EXPECTED branch
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames are detected, page is not loaded, " + 
				    "num-pwd-boxes: " + num_pwd_boxes + 
				    ", for 'st_single_cookie_test'");
			are_disabled_cookies_regenerated();
			update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
		    }
		    else {
			// INCONCLUSIVE branch BUT nothing serious. Don't call update_cookie_status()
			console.log("APPU DEBUG: NOT EXPECTED: Usernames NOT detected BUT page is not loaded" + 
				    ", num-pwd-boxes: " + num_pwd_boxes + 
				    ", for 'st_single_cookie_test'");
		    }
		}
	    }
	    else {
		// NON-SERIOUS error branch (user name detection test never carried out)
		// But no need to stop testing 
		console.log("APPU DEBUG: NON-SERIOUS: Username detection test never " + 
			    "carried out for 'st_single_cookie_test', Page load: " + page_load_success);
	    }

	    console.log("----------------------------------------");
	    if (current_cookie_test_index < suspected_account_cookies_array.length) {
		console.log("APPU DEBUG: New suppress cookie is: " + 
			    suspected_account_cookies_array[current_cookie_test_index]);
	    }
	}
	else if (my_state == "st_non_accountcookies_block_test") {
	    if (am_i_logged_in != undefined) {
		if (page_load_success) {
		    // EXPECTED branch
		    console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames detection test " + 
				"done, page loaded, num-pwd-boxes: " + num_pwd_boxes + 
				", for 'st_non_accountcookies_block_test'");
		    are_disabled_cookies_regenerated();
		    update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
		}
		else {
		    if (am_i_logged_in) {
			// EXPECTED branch
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames are detected, page is not loaded, " + 
				    "num-pwd-boxes: " + num_pwd_boxes + 
				    ", for 'st_non_accountcookies_block_test'");
			are_disabled_cookies_regenerated();
			update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
		    }
		    else {
			// INCONCLUSIVE branch BUT nothing serious. Don't call update_cookie_status()
			console.log("APPU DEBUG: NOT EXPECTED: Usernames NOT detected BUT page is not loaded" + 
				    ", num-pwd-boxes: " + num_pwd_boxes + 
				    ", for 'st_non_accountcookies_block_test'");
		    }
		}
	    }
	    else {
		// SERIOUS error branch (user name detection test never carried out)
		console.log("APPU Error: NOT EXPECTED: Username detection test never " + 
			    "carried out for 'st_non_accountcookies_block_test'");
		report_fatal_error("Non-accountcookies-block-no-username-detection-test: Page load: " + page_load_success);
	    }

	    console.log("----------------------------------------");
	}
	else if (my_state == "st_cookiesets_test") {
	    if (am_i_logged_in != undefined) {
		if (page_load_success) {
		    // EXPECTED branch
		    console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames detection test " + 
				"done, page loaded, num-pwd-boxes: " + num_pwd_boxes + 
				", for 'st_cookiesets_test'");
		    are_disabled_cookies_regenerated();
		    update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
		}
		else {
		    if (am_i_logged_in) {
			// EXPECTED branch
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames are detected, page is not loaded, " + 
				    "num-pwd-boxes: " + num_pwd_boxes + 
				    ", for 'st_cookiesets_test'");
			are_disabled_cookies_regenerated();
			update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
		    }
		    else {
			// INCONCLUSIVE branch BUT nothing serious. Don't call update_cookie_status()
			console.log("APPU DEBUG: NOT EXPECTED: Usernames NOT detected BUT page is not loaded" + 
				    ", num-pwd-boxes: " + num_pwd_boxes + 
				    ", for 'st_cookiesets_test'");
		    }
		}
	    }
	    else {
		// NON-SERIOUS error branch (user name detection test never carried out)
		// But no need to stop testing 
		console.log("APPU DEBUG: NON-SERIOUS: Username detection test never " + 
			    "carried out for 'st_cookiesets_test', Page load: " + page_load_success);
	    }

	    console.log("----------------------------------------");
	    console.log("APPU DEBUG: New suppress cookieset is: " + JSON.stringify(disabled_cookies));
	}

	// Goto next state, and return the next state.
	return goto_next_state();
    }
    
    
    function handle_set_cookie_responses(details) {
	var final_rh = [];
	var rh = details.responseHeaders;
	for (var i = 0; i < rh.length; i++) {
	    if (rh[i].name.toLowerCase() != "set-cookie") {
		final_rh.push(rh[i]);
	    }
	    else {
		var cookie_struct = {};
		var cookie_properties = rh[i].value.split(";");
		var cookie_name_value = cookie_properties.shift();
		
		var matched_entries = cookie_name_value.match(/(.+?)=(.*)/);
		cookie_struct.name = matched_entries[1].trim();
		cookie_struct.value = matched_entries[2].trim();
		
		var my_url = details.url;
		
		// Default values for Domain and Path.
		// If set-cookie does not contain those values then
		// these default values will be used.
		cookie_struct.domain = my_url.split("/")[2];
		cookie_struct.path = "/" + my_url.split("/").slice(3).join("/");
		
		cookie_struct.expirationDate = undefined;
		cookie_struct.hostOnly = true;
		cookie_struct.httpOnly = false;
		cookie_struct.secure = false;
		var cookie_protocol = "http://";
		cookie_struct.session = false;
		
		for (var j = 0; j < cookie_properties.length; j++) {
		    var curr_property = cookie_properties[j].trim();
		    if (curr_property.indexOf("Path") != -1 ||
			curr_property.indexOf("path") != -1) {
			var matched_entries = curr_property.match(/(.+?)=(.*)/);
			cookie_struct.path = matched_entries[2].trim();
		    }
		    else if (curr_property.indexOf("Expires") != -1 ||
			     curr_property.indexOf("expires") != -1) {
			var matched_entries = curr_property.match(/(.+?)=(.*)/);
			cookie_struct.expirationDate = (new Date(matched_entries[2].trim())).getTime()/1000;
		    }
		    else if (curr_property.indexOf("Max-Age") != -1 ||
			     curr_property.indexOf("max-age") != -1) {
			var matched_entries = curr_property.match(/(.+?)=(.*)/);
			var max_age = matched_entries[2].trim();
			if (max_age[0] == '-') {
			    max_age = max_age.substr(1);
			}
			if (!(/^\d+$/.test(max_age))) {
			    continue;
			}
			cookie_struct.expirationDate = (new Date()).getTime()/1000 + parseInt(max_age, 10);
		    }
		    else if (curr_property.indexOf("Domain") != -1 ||
			     curr_property.indexOf("domain") != -1) {
			var matched_entries = curr_property.match(/(.+?)=(.*)/);
			cookie_struct.domain = matched_entries[2].trim();
		    }
		    else if (curr_property.indexOf("Secure") != -1 ||
			     curr_property.indexOf("secure") != -1) {
			cookie_struct.secure = true;
			cookie_protocol = "https://";
		    }
		    else if (curr_property.indexOf("HttpOnly") != -1 ||
			     curr_property.indexOf("httponly") != -1) {
			cookie_struct.httpOnly = true;
		    }
		    else if (curr_property.indexOf("Priority") != -1 ||
			     curr_property.indexOf("priority") != -1) {
			// Do nothing
			continue;
		    }
		    else {
			console.log("APPU DEBUG: Error: Got a wrong cookie property: " + curr_property);
		    }
		}
		
		if (cookie_struct.domain[0] == '.') {
		    cookie_struct.hostOnly = false;
		}
		if (!cookie_struct.expirationDate) {
		    cookie_struct.session = true;
		}
		
		var cookie_key = (cookie_protocol + 
				  cookie_struct.domain + 
				  cookie_struct.path + 
				  ":" + 
				  cookie_struct.name); 
		
		//console.log("APPU DEBUG: Setting cookie in SHADOW_COOKIE_STORE: " + cookie_key);
		shadow_cookie_store[cookie_key] = cookie_struct;
	    }
	}
	return {responseHeaders: final_rh};
    }
    
    
    // This function is different from replace_cookies_from_shadow_cookie_store().
    // This only deletes SELECTIVE cookies from HTTP request whereas the other function completely
    // deletes cookies and creates new set from its own shadow_cookie_store.
    // Thus, whatever cookies are returned as a result of executing this function are from
    // the actual cookie_store and reflects all the changes that are happening because of
    // user browsing the site simultaneously.
    function delete_cookies_from_HTTP_requests(details) {
	var http_request_cookies = "";
	var final_cookies = {};
	var final_cookie_str = "";
	
	//console.log("Here here: (cookie_delete_function) RequestId: " + details.requestId);
	
	for (var i = 0; i < details.requestHeaders.length; i++) {
	    if (details.requestHeaders[i].name == "Referer") {
		if (get_domain(details.requestHeaders[i].value.split("/")[2]) == 'live.com') {
		    details.requestHeaders.splice(i, 1);
		    break;
		}
	    }
	}
	
	if (my_state == 'st_cookie_test_start') {
	    return {requestHeaders: details.requestHeaders};
	}
	
	if (current_cookie_test_index >= tot_cookies) {
	    console.log("APPU DEBUG: All cookies for URL(" + url + ") have been tested. " + 
			"Terminating cookie_investigating_tab");
	    terminate_cookie_investigating_tab(my_tab_id);
	    final_result();
	    return;
	}
	
	if (my_state == "st_start_with_no_cookies") {
	    // This is to verify that cookies set during login were indeed account cookies.
	    return delete_all_cookies_from_HTTP_request(details);
	}
	
	if (tot_execution > tot_cookies) {
	    // Intentionally checking for '>' than '>=' because the first time this function is
	    // called, we load 'live.com' and not the intended URL.
	    console.log("APPU DEBUG: Maximum number of times  URL(" + url + ") have been tested. " + 
			"However, not all cookies are examined. Current test index: " + 
			current_cookie_test_index);
	    terminate_cookie_investigating_tab(my_tab_id);
	    return;
	}
	
	for (var i = 0; i < details.requestHeaders.length; i++) {
	    if (details.requestHeaders[i].name == "Cookie") {
		http_request_cookies = details.requestHeaders.splice(i, 1);
		break;
	    }
	}
	
	if (http_request_cookies.length != 0) {
	    console.log("Here here: Going to suppress(if present): " +
			suspected_account_cookies_array[current_cookie_test_index]);
	    //console.log("Here here: Cookies found in HTTP request");
	    var cookie_name_value = http_request_cookies[0].value.split(";");
	    var delete_index = -1;
	    
	    //console.log("Here here: Current URL: " + details.url);
	    
	    for (var j = 0; j < cookie_name_value.length; j++) {
		// Lets do non-greedy matching here because cookie values
		// themselves can contain '='
		var matched_entries = cookie_name_value[j].match(/(.+?)=(.*)/);
		var c_name = matched_entries[1].trim();
		var hashed_c_value = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(matched_entries[2].trim()));
		var curr_test_cookie_name = suspected_account_cookies_array[current_cookie_test_index];
		//console.log("Here here: Testing for cookie: "+ curr_test_cookie_name +", Current cookie: " + 
		//	    c_name);
		// To get only the cookie names. Ignore domain and path.
		// Using pop() because what if the domain is like www.google.com:8080
		if (c_name == curr_test_cookie_name.split(":").pop() &&
		    hashed_c_value == account_cookies[curr_test_cookie_name].hashed_value) {
		    // We found the cookie that we want to suppress this time.
		    delete_index = j;
		    break;
		}
	    }
	    
	    if (delete_index != -1) {
		var temp_array = cookie_name_value.splice(delete_index, 1);
		final_cookie_str = cookie_name_value.join("; "); 
		console.log("Here here: Match is found");
	    }
	    else {
		console.log("Here here: Match is *NOT* found");
		//console.log("APPU DEBUG: No cookie found to suppress in this request");
		final_cookie_str = cookie_name_value.join("; "); 
	    }
	    cookie_element = {
		name: "Cookie",
		value: final_cookie_str
	    };
	    details.requestHeaders.push(cookie_element);
	}
	
	
	console.log("Here here: Going to return requestHeaders: " + JSON.stringify(details.requestHeaders));
	return {requestHeaders: details.requestHeaders};
    }
    
    
    // This function simply deletes the entire 'Cookie' property from the HTTP request which is 
    // created by the browser from "default cookie store". Instead, it uses shadow_cookie_store
    // for our "cookie-investigator-tab". Depending on the cookie investigation state, the shadow-cookie-store
    // is populated by omitting certain cookie(s). This has added advantage that if a certain cookie is not
    // present but others are, then the server might set is in the first HTTP response. 
    // We will in turn set it in the shadow_cookie_store. 
    // Hence, the deleted cookie will be available for next HTTP request even if
    // we deleted it at the start in the shadow_cookie_store. If this is not done, then the webpage fetch
    // hangs for sites (because a single web page fech request consists of a lot of HTTP requests).
    // Sometimes, sites (for e.g. Google)
    // will check if other 'account cookies' are present and if so, will recreate the deleted cookie.
    // Once again, this recreation will happen in our shadow_cookie_store. But, we have to be careful 
    // and see if the value has been modified and if so, then carefully merge down the changes 
    // (In some cases like 'facebook', when it detects that one of the 'account' cookies is missing,
    //  it will simply reset other account cookies. Hence, in that case, merge to original cookie store
    //  does not make sense)
    // (I am not going to implement this merge unless it seems like sending old values screws up sessions).
    // In this case where server restores the deleted cookie, ultimately the Web page fetch would succeed
    // since the server resets the cookie. This is exactly what we want to test. What is the behavior of
    // the server when a particular cookie is missing.
    function replace_cookies_from_shadow_cookie_store(details) {
	var original_http_request_cookies = undefined;
	var final_cookies = {};
	var final_cookie_str = "";
	var curr_domain = get_domain(details.url.split("/")[2]);
	
	if (my_state == 'st_cookie_test_start' ||
	    my_state == 'st_testing') {
	    return {requestHeaders: details.requestHeaders};
	}
	
	for (var i = 0; i < details.requestHeaders.length; i++) {
	    if (details.requestHeaders[i].name == "Referer") {
		if (get_domain(details.requestHeaders[i].value.split("/")[2]) == 'live.com') {
		    details.requestHeaders.splice(i, 1);
		    break;
		}
	    }
	}
			
	for (var i = 0; i < details.requestHeaders.length; i++) {
	    if (details.requestHeaders[i].name == "Cookie") {
		original_http_request_cookies = details.requestHeaders.splice(i, 1);
		break;
	    }
	}
	
	var original_cookie_array = [];
	if (original_http_request_cookies) {
	    original_cookie_array = original_http_request_cookies[0].value.split(";");
	    //console.log("Here here: Number of cookies in original HTTP request: " + original_cookie_array.length);
	}
	
	var curr_time = (new Date()).getTime()/1000;
	var is_secure = (details.url.split('/')[0] == 'https:') ? true : false;
	var my_cookies = [];
	
	for (c in shadow_cookie_store) {
	    var cookie_protocol = shadow_cookie_store[c].secure ? "https://" : "http://";
	    var cookie_url = cookie_protocol + shadow_cookie_store[c].domain + shadow_cookie_store[c].path;
	    var cookie_name_value = shadow_cookie_store[c].name + '=' + shadow_cookie_store[c].value;
	    var curr_test_cookie_name = suspected_account_cookies_array[current_cookie_test_index];
	    var shadow_cookie_name = cookie_url + ':' + shadow_cookie_store[c].name;

	    if (is_subdomain(cookie_url, details.url)) {
		if (shadow_cookie_store[c].session) {
		    my_cookies.push(cookie_name_value);
		    if (shadow_cookie_name == "https://accounts.google.com/:LSID") {
			console.log("Here here: DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD, Sending LSID for URL: " + details.url);
		    }
		}
		else if (shadow_cookie_store[c].expirationDate > curr_time) {
		    my_cookies.push(cookie_name_value);
		    if (shadow_cookie_name == "https://accounts.google.com/:LSID") {
			console.log("Here here: DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD, Sending LSID for URL: " + details.url);
		    }
		}
	    }
	}
	
	// console.log("Here here: Original Cookies: " + 
	//	    original_cookie_array.length +
	//	    ", Length of shadow_cookie_store: " +
	//	    Object.keys(shadow_cookie_store).length +
	//	    ", Number of cookies constructed from my shadow_cookie_store: " + 
	//	    my_cookies.length + 
	//	    ", URL: " + details.url);
	
	if (my_cookies.length == 0 &&
	    my_domain == curr_domain) {
	    if (my_state != "st_start_with_no_cookies") {
		var cit = cookie_investigating_tabs[my_tab_id];
		if (cit.bool_state_in_progress) {
		    console.log("APPU DEBUG: URL: " + details.url);
		    console.log("APPU DEBUG: (RequestID: " + details.requestId + ")Shadow Cookie Store: " 
				+ JSON.stringify(shadow_cookie_store));
		}
		//console.log("Here here: URL: " + details.url);
	    }
	}
	var final_cookie_str = my_cookies.join("; "); 
	
	cookie_element = {
	    name: "Cookie",
	    value: final_cookie_str
	};
	
	details.requestHeaders.push(cookie_element);
	//console.log("Here here: Going to return requestHeaders: " + JSON.stringify(details.requestHeaders));
	return {requestHeaders: details.requestHeaders};
    }
    
    return [
	    replace_cookies_from_shadow_cookie_store,
	    handle_set_cookie_responses,
	    update_tab_id, 
	    init_cookie_investigation
	    ];
}


// Current URL of the form : http://ab.cderf.com/sdsdwer/rtr/sds?ere
// First gets a list of all the cookies that will get sent for this url.
// Then it will suppress each cookie one after the other and see which
// cookies correspond to account cookies.
function detect_account_cookies(current_url, 
				cookie_names, 
				opt_config_cookiesets,
				opt_config_forceshut,
				opt_config_skip_initial_states) {
    // This returns an object with keys: domain + path + ":" + cookie_name and
    // value as hashed cookie value. Because the HTTP requests only have cookie names
    // and cookie names can be repeated often (as seen in google's case), there is no
    // way to distinguish between cookies. That will have to be done using hashed values.
    var account_cookies = {};

    var config_cookiesets = "random";
    var config_forceshut = 5;
    var config_skip_initial_states = false;

    if (opt_config_forceshut != undefined) {
	// opt_config_forceshut will be time in minutes after which the cookie-investigation tab
	// would get closed. If not specified, default values is '5' minutes.
	config_forceshut = opt_config_forceshut;
    }

    if (opt_config_skip_initial_states != undefined) {
	// opt_config_skip_initial_states will make it jump directly to "st_single_cookie_test"
	config_skip_initial_states = opt_config_skip_initial_states;
    }

    if (opt_config_cookiesets != undefined) {
	// Possible values are: "none", "random", "all"
	config_cookiesets = opt_config_cookiesets;
    }

    if (cookie_names == undefined) {
	// Gets all 'DURING' cookies
	account_cookies = get_account_cookies(current_url, true);
    }
    else {
	account_cookies = get_selective_account_cookies(current_url, cookie_names);
    }

    var ret_functions = cookie_investigator(account_cookies, 
					    current_url, 
					    config_cookiesets, 
					    config_forceshut, 
					    config_skip_initial_states);

    if (ret_functions != -1) {
	open_cookie_slave_tab(current_url, 
			      ret_functions[0], 
			      ret_functions[1], 
			      ret_functions[2], 
			      ret_functions[3], 
			      ret_functions[4], 
			      ret_functions[5], 
			      ret_functions[6]);
    }
    else {
	console.log("APPU Error: Could not do cookie-investigation for: " + current_url);
    }
}


// ALL TEST FUNCTIONS & HELPING CODE
// Basic commands:
// Test specific cookies:
// detect_account_cookies("https://mail.google.com/mail/u/0/?shva=1#inbox", ["GX", "GXSP", "NID", "HSID"])
// 
// Test all cookies:
// detect_account_cookies("https://mail.google.com/mail/u/0/?shva=1#inbox")
// Test function that accepts an array of cookie names and 
// only returns those cookies and their values.
// Useful when one wants to test only one or two cookies.

// Testing shadow-cookie-store.
// test_get_cookie_store_snapshot('facebook.com', test_shadow_cookie_store); test_specific_tab(1305); test_record_specific_tab_cookies(1305)

var test_shadow_cookie_store = {};

function test_handle_set_cookie_responses(details) {
    var final_rh = [];
    var rh = details.responseHeaders;
    for (var i = 0; i < rh.length; i++) {
	if (rh[i].name.toLowerCase() != "set-cookie") {
	    final_rh.push(rh[i]);
	}
	else {
	    console.log("APPU DEBUG: HTTP Request Header, Set-Cookie: " + JSON.stringify(rh[i]));
	    var cookie_struct = {};
	    var cookie_properties = rh[i].value.split(";");
	    var cookie_name_value = cookie_properties.shift();

	    var matched_entries = cookie_name_value.match(/(.+?)=(.*)/);
	    cookie_struct.name = matched_entries[1].trim();
	    cookie_struct.value = matched_entries[2].trim();
			
	    var my_url = details.url;

	    // Default values for Domain and Path.
	    // If set-cookie does not contain those values then
	    // these default values will be used.
	    cookie_struct.domain = my_url.split("/")[2];
	    cookie_struct.path = "/" + my_url.split("/").slice(3).join("/");

	    cookie_struct.expirationDate = undefined;
	    cookie_struct.hostOnly = true;
	    cookie_struct.httpOnly = false;
	    cookie_struct.secure = false;
	    var cookie_protocol = "http://";
	    cookie_struct.session = false;

	    for (var j = 0; j < cookie_properties.length; j++) {
		var curr_property = cookie_properties[j].trim();
		if (curr_property.indexOf("Path") != -1 ||
		    curr_property.indexOf("path") != -1) {
		    var matched_entries = curr_property.match(/(.+?)=(.*)/);
		    cookie_struct.path = matched_entries[2].trim();
		}
		else if (curr_property.indexOf("Expires") != -1 ||
			 curr_property.indexOf("expires") != -1) {
		    var matched_entries = curr_property.match(/(.+?)=(.*)/);
		    cookie_struct.expirationDate = (new Date(matched_entries[2].trim())).getTime()/1000;
		}
		else if (curr_property.indexOf("Max-Age") != -1 ||
			 curr_property.indexOf("max-age") != -1) {
		    var matched_entries = curr_property.match(/(.+?)=(.*)/);
		    var max_age = matched_entries[2].trim();
		    if (max_age[0] == '-') {
			max_age = max_age.substr(1);
		    }
		    if (!(/^\d+$/.test(max_age))) {
			continue;
		    }
		    cookie_struct.expirationDate = (new Date()).getTime()/1000 + parseInt(max_age, 10);
		}
		else if (curr_property.indexOf("Domain") != -1 ||
			 curr_property.indexOf("domain") != -1) {
		    var matched_entries = curr_property.match(/(.+?)=(.*)/);
		    cookie_struct.domain = matched_entries[2].trim();
		}
		else if (curr_property.indexOf("Secure") != -1 ||
			 curr_property.indexOf("secure") != -1) {
		    cookie_struct.secure = true;
		    cookie_protocol = "https://";
		}
		else if (curr_property.indexOf("HttpOnly") != -1 ||
			 curr_property.indexOf("httponly") != -1) {
		    cookie_struct.httpOnly = true;
		}
		else if (curr_property.indexOf("Priority") != -1 ||
			 curr_property.indexOf("priority") != -1) {
		    // Do nothing
		    continue;
		}
		else {
		    console.log("APPU DEBUG: Error: Got a wrong cookie property: " + curr_property);
		}
	    }

	    if (cookie_struct.domain[0] == '.') {
		cookie_struct.hostOnly = false;
	    }
	    if (!cookie_struct.expirationDate) {
		cookie_struct.session = true;
	    }

	    var cookie_key = cookie_protocol + cookie_struct.domain + cookie_struct.path + ":" + cookie_struct.name; 
	    test_shadow_cookie_store[cookie_key] = cookie_struct;
	}
    }
    return {responseHeaders: final_rh};
}

function test_get_cookie_store_snapshot(my_domain, cookie_store) {
    var cb_cookies = (function(my_domain, cookie_store) {
	    return function(all_cookies) {
		console.log("APPU DEBUG: Taking snapshot: " + my_domain + ", Length: " + all_cookies.length);
		for (var i = 0; i < all_cookies.length; i++) {
		    var cookie_name = all_cookies[i].name;
		    var cookie_domain = all_cookies[i].domain;
		    var cookie_path = all_cookies[i].path;
		    var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
		    var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;
		    cookie_store[cookie_key] = all_cookies[i];
		}
	    }
	})(my_domain, cookie_store);
    
    get_all_cookies(my_domain, cb_cookies);
}


function test_replace_cookies_from_shadow_cookie_store(details) {
    var domain = get_domain(details.url.split("/")[2]);
    var original_http_request_cookies = undefined;
    var final_cookies = {};
    var final_cookie_str = "";
    var original_cookie_array = [];

    for (var i = 0; i < details.requestHeaders.length; i++) {
	if (details.requestHeaders[i].name == "Cookie") {
	    original_http_request_cookies = details.requestHeaders.splice(i, 1);
	    break;
	}
    }
    
    if (original_http_request_cookies) {
	var temp_cookie_array = original_http_request_cookies[0].value.split(";");

	temp_cookie_array.forEach(function(value, index, array) {
		original_cookie_array.push(value.trim());
	    });

	console.log("APPU DEBUG: Number of cookies in original HTTP request: " + original_cookie_array.length);
    }
    
    var curr_time = (new Date()).getTime()/1000;
    var is_secure = (details.url.split('/')[0] == 'https:') ? true : false;
    var my_cookies = [];
    
    console.log("APPU DEBUG: Length of shadow cookie store: " + Object.keys(test_shadow_cookie_store).length);
    for (c in test_shadow_cookie_store) {
	var cookie_protocol = test_shadow_cookie_store[c].secure ? "https://" : "http://";
	var cookie_url = cookie_protocol + test_shadow_cookie_store[c].domain + test_shadow_cookie_store[c].path;
	var cookie_name_value = test_shadow_cookie_store[c].name + '=' + test_shadow_cookie_store[c].value;
	
	if (is_subdomain(cookie_url, details.url)) {
	    if (test_shadow_cookie_store[c].session) {
		my_cookies.push(cookie_name_value);
	    }
	    else if (test_shadow_cookie_store[c].expirationDate > curr_time) {
		my_cookies.push(cookie_name_value);
	    }
	}
    }
    
    console.log("APPU DEBUG: Number of cookies constructed from my test_shadow_cookie_store: " + 
		my_cookies.length + ", URL: " + details.url);

    if (JSON.stringify(my_cookies.sort()) == JSON.stringify(original_cookie_array.sort())) {
	console.log("APPU DEBUG: Cookies match, Everything works - 1");
    }
    else {
	if (my_cookies.length != original_cookie_array.length) {
	    console.log("APPU DEBUG: OOOOPPPPSSSS, Cookie length mismatch");
	}
	else {
	    var everything_works = true;
	    for (var j = 0; j < my_cookies.length; j++) {
		try {

		var matched_entries = my_cookies[j].match(/(.+?)=(.*)/);
		var my_c_name = matched_entries[1].trim();
		var matched_entries = original_cookie_array[j].match(/(.+?)=(.*)/);
		var o_c_name = matched_entries[1].trim();
		if (my_c_name != o_c_name) {
		    console.log("APPU DEBUG: OOOOPPPPSSSS, Cookie names mismatch, " + my_c_name + ", " + o_c_name);
		    everything_works = false;
		}

		}
		catch(e) {
		    console.log("Here here: " + JSON.stringify(e));
		}
	    }
	    if (everything_works) {
		console.log("APPU DEBUG: Cookies match, Everything works - 2");
	    }
	}
    }

    final_cookie_str = my_cookies.join("; "); 
    
    cookie_element = {
	name: "Cookie",
	value: final_cookie_str
    };
    
    details.requestHeaders.push(cookie_element);
    //    console.log("Here here: Going to return requestHeaders: " + JSON.stringify(details.requestHeaders));
    return {requestHeaders: details.requestHeaders};
}


function test_specific_tab(tab_id) {
    chrome.webRequest.onBeforeSendHeaders.addListener(test_replace_cookies_from_shadow_cookie_store,
						      {
							  "tabId": tab_id,
							      "urls": ["<all_urls>"]
							      },
						      ["blocking", "requestHeaders"]);
    
    chrome.webRequest.onHeadersReceived.addListener(test_handle_set_cookie_responses, {
	    "tabId": tab_id,
		"urls": ["<all_urls>"]
		},
	["blocking", "responseHeaders"]);
}


function record_request_header(details) {
    console.log("APPU DEBUG: Recording request header: " + JSON.stringify(details));
}


function record_response_header(details) {
    console.log("APPU DEBUG: Recording response header: " + JSON.stringify(details));
}

function test_record_specific_tab_cookies(tab_id) {
    chrome.webRequest.onSendHeaders.addListener(record_request_header,
						{
						    "tabId": tab_id,
							"urls": ["<all_urls>"]
							},
						["requestHeaders"]);
    
    chrome.webRequest.onHeadersReceived.addListener(record_response_header, {
	    "tabId": tab_id,
		"urls": ["<all_urls>"]
		},
	["responseHeaders"]);
}
