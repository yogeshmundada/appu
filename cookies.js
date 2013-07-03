

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
    var msg = "";

    for (c in cs.cookies) {
	if (cookie_class && (cs.cookies[c].cookie_class == cookie_class)) {
	    msg += sprintf(" %s,", c);
	    tot_cookies += 1;
	}
	else if (cookie_class == undefined) {
	    msg += sprintf(" %s(%s),", c, cs.cookies[c].cookie_class);
	    tot_cookies += 1;
	}
    }

    msg = "APPU DEBUG: Domain: " + domain + ", Total-cookies: " + tot_cookies + ", Cookie-names: " + msg;
    console.log(msg);
}


//Purely for debugging purpose.
//We don't need to actually access the cookie values
//in the field
function print_single_cookie_value(domain, cookie_name) {
    chrome.cookies.getAll({
	    'domain' : domain,
		'name' : cookie_name
		}, 
	function (all_cookies) {
	    for (var i = 0; i < all_cookies.length; i++) {
		var msg = sprintf("Here here: Domain: %s, Cookie-name: %s, Value: %s",
				  all_cookies[i].domain,
				  all_cookies[i].name,
				  all_cookies[i].value);
		console.log(msg);
	    }
	});
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
		if (!cookie_attributes) {
		    cookie_str += "Cookie Name: " + all_cookies[i].name;
		    cookie_str += ", Domain: '" + all_cookies[i].domain + "'";
		    cookie_str += ", Path: '" + all_cookies[i].path + "'";
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
		    //var hashed_cookie_val = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(all_cookies[i].value));
		    pre_login_cookies[domain].username = username;
		    //pre_login_cookies[domain].cookies[all_cookies[i].name] = hashed_cookie_val;
		    pre_login_cookies[domain].cookies[all_cookies[i].name] = true;
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
		    //var hashed_cookie_val = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(all_cookies[i].value));
		    var curr_cookie_name = all_cookies[i].name;
		    if (curr_cookie_name in pre_login_cookies[domain].cookies) {
			//&& hashed_cookie_val == pre_login_cookies[domain].cookies[curr_cookie_name]) {
			//This means that this cookie was present before logging in 
			//So probably not a login cookie (overlooking a case where same cookie is
			//overwritten with new values)
			login_state_cookies.cookies[curr_cookie_name] = {};
			login_state_cookies.cookies[curr_cookie_name].cookie_class = 'before';
		    }
		    else {
			//Cookie is newly created.
			login_state_cookies.cookies[curr_cookie_name] = {};
			login_state_cookies.cookies[curr_cookie_name].cookie_class = 'during';
			//login_state_cookies.cookies[curr_cookie_name].hashed_cookie_value = 'None';
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
    var d = tld.getDomain(domain);
    pre_login_cookies[d] = {};
}


function cleanup_session_cookie_store(domain) {
    var d = tld.getDomain(domain);
    delete pii_vault.aggregate_data.session_cookie_store[d];
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
    if (change_info.cookie.domain == ".facebook.com") {
	var domain = change_info.cookie.domain;
	if (domain[0] == '.') {
	    domain = domain.slice(1, domain.length);
	}
	domain = tld.getDomain(domain);

	var curr_cookie = change_info.cookie.name;
	var pvadcs = pii_vault.aggregate_data.session_cookie_store;

	if (pvadcs[domain]) {
	    if (curr_cookie in pvadcs[domain].cookies) {
		var cookie_class = pvadcs[domain].cookies[curr_cookie].cookie_class;
		//No need to do anything if its just a 'before' cookie
		if (cookie_class == 'during' ||	cookie_class == 'after') {
		    //This cookie was added as a result of login process or after login process

		    //No need to do anything if its cause if 'overwrite', it will be recreated shortly.
		    if (change_info.removed && 
			     (change_info.cause == 'expired' || 
			      change_info.cause == 'expired_overwrite' ||
			      change_info.cause == 'evicted')) {
			delete pvadcs[domain].cookies[curr_cookie];
			flush_session_cookie_store();

			if (cookie_class == 'during') {
			    check_if_still_logged_in(domain);
			}
		    }
		    else if (change_info.removed && change_info.cause != 'overwrite') {
			console.log("APPU Error: Cookie removed with unknown cause: " + change_info.cause);
		    }
		}
	    }
	    else {
		//This cookie was not present during login
		console.log("Here here: (" + domain + 
			    ") Creating a new cookie: " + curr_cookie);
		pvadcs[domain].cookies[curr_cookie] = {};
		pvadcs[domain].cookies[curr_cookie].cookie_class = 'after';
		flush_session_cookie_store();
	    }
	}
    }
}

