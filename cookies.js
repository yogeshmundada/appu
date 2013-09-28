
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
	    account_cookies.push(c.split(":")[1]);
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
		    var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
		    var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;
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
		console.log("APPU DEBUG: Detecting login cookies for: " + domain);
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
		    var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
		    var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;

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
			login_state_cookies.cookies[cookie_key].current_state = 'present';
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
	//console.log("Here here: Domain: " + domain + ", Status: LOGGED-IN");
    }
    else {
	//console.log("Here here: Domain: " + domain + ", Status: LOGGED-OUT");
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
		//No need to do anything if its just a 'before' cookie
		if (cookie_class == 'during' || cookie_class == 'after') {
		    //This cookie was added as a result of login process or after login process
		    //No need to do anything if its cause if 'overwrite', it will be recreated shortly.
		    if (change_info.cause == 'expired' || 
			 change_info.cause == 'expired_overwrite' ||
			 change_info.cause == 'explicit' ||
			 change_info.cause == 'overwrite' ||
			 change_info.cause == 'evicted') {
			
			if (cookie_class == 'during') {
			    pvadcs[domain].cookies[cookie_key].current_state = 'absent';
			    console.log("APPU DEBUG: Changed state of a 'during' cookie to 'absent': " + 
			    		cookie_key + ", cause: " + change_info.cause);
			    //check_if_still_logged_in(domain);
			    //print_appu_session_store_cookies(domain, 'during');
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
		//This cookie was not present during login
		var hashed_cookie_val = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(change_info.cookie.value));

		if (cookie_key in pvadcs[domain].cookies &&
		    pvadcs[domain].cookies[cookie_key].cookie_class == 'during') {
			pvadcs[domain].cookies[cookie_key].current_state = 'changed';
			pvadcs[domain].cookies[cookie_key].hashed_cookie_value = hashed_cookie_val;
			console.log("APPU DEBUG: Changed state of a 'during' cookie to 'changed': " + 
				    cookie_key + ", cause: " + change_info.cause);
			//print_appu_session_store_cookies(domain, 'during');
		}
		else {
		    console.log("APPU DEBUG: (" + domain + 
		    	    ") Creating a new cookie with class 'after': " + cookie_key);
		    
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
    delete cookie_investigating_tabs[tab_id];
    chrome.tabs.remove(tab_id);
}


// URL should be: "http://mail.google.com/mail/"
function test_site_with_no_cookies(url) {
    open_cookie_slave_tab(url, delete_all_cookies_from_HTTP_request, undefined, undefined, undefined, "testing");
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


function print_redirect_information(details) {
    //console.log("Here here: (print_redirect_information) RequestId: " + details.requestId);
    if (get_domain(details.redirectUrl.split("/")[2]) != 'live.com') { 
	console.log("Here here: ZZZZZZZZZZZ Redirection URL: " + details.redirectUrl);
    }
}


function print_sent_headers(details) {
    if (get_domain(details.url.split("/")[2]) != 'live.com') {
	console.log("Here here: Sent headers: " + JSON.stringify(details));
    }
}


// Open a tab to check if a cookie is an account cookie
function open_cookie_slave_tab(url, cookie_delete_function, update_cookie_status, update_tab_id, 
			       web_request_fully_fetched, tab_state) {
    //Just some link so that appu content script runs on it.
    var default_url = 'http://live.com';
   
    create_properties = { 
	url: default_url, 
	active: false 
    };

    //Create a new tab.
    chrome.tabs.create(create_properties, 
		       (function(url, cookie_delete_function, update_cookie_status, update_tab_id, tab_state) {
			   return function slave_tab_callback(tab) {
			       var filter = {};
			       
			       console.log("APPU DEBUG: Created a new tab to investigate cookies: " + tab.id);
			       chrome.webRequest.onBeforeSendHeaders.addListener(cookie_delete_function, 
										 {
										     "tabId": tab.id,
											 "urls": ["<all_urls>"]
											 },
										 ["blocking", "requestHeaders"]);


// 			       chrome.webRequest.onSendHeaders.addListener(print_sent_headers, 
// 										 {
// 										     "tabId": tab.id,
// 											 "urls": ["<all_urls>"]
// 											 },
// 										 ["requestHeaders"]);


			       chrome.webRequest.onHeadersReceived.addListener(delete_set_cookie_from_HTTP_response, {
				       "tabId": tab.id,
					   "urls": ["<all_urls>"]
					   },
				   ["blocking", "responseHeaders"]);


			       chrome.webRequest.onBeforeRedirect.addListener(print_redirect_information, {
				       "tabId": tab.id,
					   "urls": ["<all_urls>"]
					   },
				   ["responseHeaders"]);

			       cookie_investigating_tabs[tab.id] = {};
			       cookie_investigating_tabs[tab.id].cookie_backup = {};
			       cookie_investigating_tabs[tab.id].url = url;
			       cookie_investigating_tabs[tab.id].state = tab_state;
			       cookie_investigating_tabs[tab.id].update_cookie_status = update_cookie_status;
			       cookie_investigating_tabs[tab.id].web_request_fully_fetched = web_request_fully_fetched;
			       // This is so that the tab can be terminated from this selecting cookie suppressing
			       // once all cookies have been examined.
			       update_tab_id(tab.id);
			   }
		       })(url, cookie_delete_function, update_cookie_status, update_tab_id, tab_state));
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
// If get_all is not defined or is 'true', it will return all cookies.
// If get_all is 'false', it will return only cookies that will get sent
// when 'current_url' is requested by the browser.
function get_account_cookies(current_url, get_all) {
    var domain = get_domain(current_url.split("/")[2]);
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];
    var account_cookies = {};

    if (get_all == undefined) {
	get_all = true;
    }

    for (c in cs.cookies) {
	if (cs.cookies[c].cookie_class == 'during') {
	    if (!get_all) {
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


// Test function that accepts an array of cookie names and 
// only returns those cookies and their values.
// Useful when one wants to test only one or two cookies.
function test_get_account_cookies(current_url, cookie_names) {
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


// Current URL of the form : http://ab.cderf.com/sdsdwer/rtr/sds?ere
// First gets a list of all the cookies that will get sent for this url.
// Then it will suppress each cookie one after the other and see which
// cookies correspond to account cookies.
function detect_account_cookies(current_url, cookie_names) {
    // This returns an object with keys: domain + path + ":" + cookie_name and
    // value as hashed cookie value. Because the HTTP requests only have cookie names
    // and cookie names can be repeated often (as seen in google's case), there is no
    // way to distinguish between cookies. That will have to be done using hashed values.
    var account_cookies = {};
    var verify_all_cookies = true;
    if (cookie_names == undefined) {
	account_cookies = get_account_cookies(current_url, false);
    }
    else {
	verify_all_cookies = false;
	account_cookies = test_get_account_cookies(current_url, cookie_names);
    }

    var ret_functions = (function (account_cookies, url, verify_all_cookies) {
	    var current_cookie_test_index = 0;
	    var account_cookies_array = Object.keys(account_cookies);
	    var tot_cookies = Object.keys(account_cookies).length;
	    var tot_execution = 0;
	    var tab_id = 0;
	    var am_i_done = false;
	    var test_all_cookies = verify_all_cookies;
	    var account_cookies_set_correct = false;
	    var my_domain = get_domain(url.split("/")[2]);
	    var orig_cookie_store = {};
	    // This stores all the cookies for a domain at the start.
	    // After that, any HTTP GET done in that tab sends cookies.
	    // as per this cookie store.
	    // All HTTP Responses with 'set-cookie' will operate on this
	    // store as well.
	    // At the start of each new WebRequest (Not HTTP Get request), it
	    // will be repopulated from the basic cookie-store.
	    var shadow_cookie_store = undefined;
	    get_cookie_store_snapshot(orig_cookie_store);

	    function get_cookie_store_snapshot(cookie_store) {
		var cb_cookies = (function(domain, cookie_store) {
			return function(all_cookies) {
			    for (var i = 0; i < all_cookies.length; i++) {
				var cookie_name = all_cookies[i].name;
				var cookie_domain = all_cookies[i].domain;
				var cookie_path = all_cookies[i].path;
				var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
				var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;
				cookie_store[cookie_key] = all_cookies[i];
			    }
			}
		    })(domain, cookie_store);
		
		get_all_cookies(my_domain, cb_cookies);
	    }

	    function restore_shadow_cookie_store() {
		shadow_cookie_store = $.extend(true, {}, orig_cookie_store);
	    }

	    function handle_set_cookie_responses(details) {
		var final_rh = [];
		var rh = details.responseHeaders;
		for (var i = 0; i < rh.length; i++) {
		    if (rh[i].name != "set-cookie") {
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
			    if (curr_property.indexOf("Path")) {
				var matched_entries = curr_property.match(/(.+?)=(.*)/);
				cookie_struct.path = matched_entries[2].trim();
			    }
			    else if (curr_property.indexOf("Expires")) {
				var matched_entries = curr_property.match(/(.+?)=(.*)/);
				cookie_struct.expirationDate = (new Date(matched_entries[2].trim())).getTime()/1000;
			    }
			    else if (curr_property.indexOf("Max-Age")) {
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
			    else if (curr_property.indexOf("Domain")) {
				var matched_entries = curr_property.match(/(.+?)=(.*)/);
				cookie_struct.domain = matched_entries[2].trim();
			    }
			    else if (curr_property.indexOf("Secure")) {
				cookie_struct.secure = true;
				cookie_protocol = "https://";
			    }
			    else if (curr_property.indexOf("HttpOnly")) {
				cookie_struct.httpOnly = true;
			    }
			    else if (curr_property.indexOf("Priority")) {
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

			var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name; 
			shadow_cookie_store[cookie_key] = cookie_struct;
		    }
		}
		return {responseHeaders: final_rh};
	    }
	    
	    function update_tab_id(my_tab_id) {
		tab_id = my_tab_id;
	    }

	    function update_cookie_status(is_an_account_cookie) {
		if (!test_all_cookies) {
		    console.log("Here here: IS ACCOUNT COOKIE?(" + 
				account_cookies_array[current_cookie_test_index] + "): " + is_an_account_cookie);
		    account_cookies[account_cookies_array[current_cookie_test_index]].account_cookie = is_an_account_cookie;
		}
		else {
		    if (is_an_account_cookie) {
			console.log("Here here: YES. Cookies set during account login process indeed contain account cookies");
			account_cookies_set_correct = true;
		    }
		}
	    }

	    function final_result() {
		am_i_done = true;
		console.log("APPU DEBUG: Finished testing account cookies for: " + url);
		if (account_cookies_set_correct) {
		    print_appu_error("APPU DEBUG: Cookies with class 'during' indeed contain account cookies for: " + 
				     my_domain);
		}
		else {
		    print_appu_error("APPU Error: Cookies with class 'during' *DO NOT* contain account cookies for: " + 
				     my_domain);
		    terminate_cookie_investigating_tab(tab_id);
		}
		for (c in account_cookies) {
		    console.log(c + ": " + (account_cookies[c].account_cookie ? "YES" : "NO"));
		}
	    }

	    // I need this function because each web page fetch consists of multiple
	    // HTTP GET requests for various resources on the web page.
	    // For all those GET requests, same cookie must be blocked.
	    // Thus, someone else from outside will have to know that the webpage fetch
	    // is complete and we should move to suppress next cookie.
	    function web_request_fully_fetched() {
		if (test_all_cookies) {
		    test_all_cookies = false;
		    console.log("APPU DEBUG: Webpage fetch complete for TESTING ALL COOKIES");
		}
		else {
		    console.log("APPU DEBUG: Webpage fetch complete for: " + account_cookies_array[current_cookie_test_index]);
		    current_cookie_test_index += 1;
		    tot_execution += 1;
		    console.log("APPU DEBUG: New suppress cookie is: " + account_cookies_array[current_cookie_test_index]);
		}
	    }

	    function http_request_callback(details) {
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

		if (am_i_done) {
		    return {requestHeaders: details.requestHeaders};
		}

		if (cookie_investigating_tabs[tab_id].state == 'initial_load') {
		    return {requestHeaders: details.requestHeaders};
		}

		//console.log("Here here: In HTTP request callback.");
		if (current_cookie_test_index == tot_cookies) {
		    console.log("APPU DEBUG: All cookies for URL(" + url + ") have been tested. " + 
				"Terminating cookie_investigating_tab");
		    terminate_cookie_investigating_tab(tab_id);
		    final_result();
		    return;
		}

		if (test_all_cookies) {
		    // This is to verify that cookies set during login were indeed account cookies.
		    return delete_all_cookies_from_HTTP_request(details);
		}

		if (tot_execution > tot_cookies) {
		    // Intentionally checking for '>' than '>=' because the first time this function is
		    // called, we load 'live.com' and not the intended URL.
		    console.log("APPU DEBUG: Maximum number of times  URL(" + url + ") have been tested. " + 
				"However, not all cookies are examined. Current test index: " + 
				current_cookie_test_index);
		    terminate_cookie_investigating_tab(tab_id);
		    return;
		}

		for (var i = 0; i < details.requestHeaders.length; i++) {
		    if (details.requestHeaders[i].name == "Cookie") {
			http_request_cookies = details.requestHeaders.splice(i, 1);
			break;
		    }
		}

		if (http_request_cookies.length != 0) {
		    console.log("Here here: Going to suppress(if present): " + account_cookies_array[current_cookie_test_index]);
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
			var curr_test_cookie_name = account_cookies_array[current_cookie_test_index];
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

	    return [http_request_callback, update_cookie_status, update_tab_id, web_request_fully_fetched];
	})(account_cookies, current_url, verify_all_cookies);

    open_cookie_slave_tab(current_url, 
			  ret_functions[0], 
			  ret_functions[1], 
			  ret_functions[2], 
			  ret_functions[3], 
			  "initial_load");
}


// Basic commands:
// Test specific cookies:
// detect_account_cookies("https://mail.google.com/mail/u/0/?shva=1#inbox", ["GX", "GXSP", "NID", "HSID"])
// 
// Test all cookies:
// detect_account_cookies("https://mail.google.com/mail/u/0/?shva=1#inbox")


