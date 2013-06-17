

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


//All cookies related to a particular domain
function print_all_cookies(domain, event_name) {

    var cb_cookies = (function(domain, event_name) {
	return function(all_cookies) {
	    var tot_hostonly = 0;
	    var tot_httponly = 0;
	    var tot_secure = 0;
	    var tot_session = 0;

	    console.log("APPU DEBUG: Printing all cookies for (EVENT:" + event_name + "): " + domain);
	    console.log("APPU DEBUG: Total number of cookies: " + all_cookies.length);
	    for (var i = 0; i < all_cookies.length; i++) {
		var cookie_str = "";
		cookie_str += "Cookie Name: " + all_cookies[i].name;
		cookie_str += ", Domain: '" + all_cookies[i].domain + "'";
		cookie_str += ", Path: '" + all_cookies[i].path + "'";
		cookie_str += ", HostOnly: '" + all_cookies[i].hostOnly + "'";
		cookie_str += ", Secure: '" + all_cookies[i].secure + "'";
		cookie_str += ", HttpOnly: '" + all_cookies[i].httpOnly + "'";
		cookie_str += ", Session: '" + all_cookies[i].session + "'";

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
// 3. Finally, if the account asks for other sensitive information
//    like CVV, CVV2, CVVC then that will be in a password box as well.
//    Appu should detect that case as well.
function record_prelogin_cookies() {

}


//After the successful login, detects which cookies have been set.
function detect_login_cookies() {

}

