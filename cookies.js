
// 2^25 = 32MB.
// Do not want to test more cookies than that.
var MAX_COOKIE_TEST = 25;
var MAX_RANDOM_COOKIESETS_TEST_ATTEMPTS = 3;

// **** BEGIN - Dump internal status functions
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


function print_confirmed_account_cookies(domain, only_present) {
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];
    var account_cookies = [];

    only_present = (only_present == undefined) ? true : only_present;

    for (c in cs.cookies) {
	if (cs.cookies[c].is_part_of_account_cookieset == true) {
	    if (only_present && cs.cookies[c].current_state == "absent") {
		continue;
	    }
	    account_cookies.push(c);
	}
    }

    print_cookie_values(domain, account_cookies);
}

// Print the cookies discovered in "expand-state" phase
function print_expand_state_cookies(domain, only_present) {
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];
    var account_cookies = [];

    only_present = (only_present == undefined) ? true : only_present;

    for (c in cs.cookies) {
	if (cs.cookies[c].cookie_class == 'during') {
	    continue;
	}
	if (cs.cookies[c].is_part_of_account_cookieset == true) {
	    if (only_present && cs.cookies[c].current_state == "absent") {
		continue;
	    }
	    account_cookies.push(c);
	}
    }
    print_cookie_values(domain, account_cookies);
}


function print_account_cookies(domain, only_present) {
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];
    var account_cookies = [];

    only_present = (only_present == undefined) ? true : only_present;

    for (c in cs.cookies) {
	if (cs.cookies[c].cookie_class == 'during' ||
	     cs.cookies[c].is_part_of_account_cookieset == true) {
	    if (only_present && cs.cookies[c].current_state == "absent") {
		continue;
	    }
	    account_cookies.push(c);
	}
    }

    print_cookie_values(domain, account_cookies);
}


// Purely for debugging purpose.
// We don't need to actually access the cookie values
// in actual deployments
function print_cookie_values(domain, cookie_names) {
    var all_done = [];
    var cookie_info = {};
    for (var j = 0; j < cookie_names.length; j++) {
	all_done[j] = false;
	cookie_info[cookie_names[j]] = undefined;
    }
    
    chrome.cookies.getAll({
	    'domain' : domain,
		}, 
	(function(cookie_names) {
	    return function (all_cookies) {
		var cs = pii_vault.aggregate_data.session_cookie_store[domain];
		for (var i = 0; i < all_cookies.length; i++) {
		    var cookie_name = all_cookies[i].name;
		    var cookie_domain = all_cookies[i].domain;
		    var cookie_path = all_cookies[i].path;
		    var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
		    var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;
		    var search_index = cookie_names.indexOf(cookie_key);

		    if (search_index == -1) {
			continue;
		    }
		    else {
			all_done[search_index] = true;
		    }
		    
		    var expiry_time = 'no-expiry-time';
		    if ('expirationDate' in all_cookies[i]) {
			var exp_seconds = all_cookies[i].expirationDate;
			var d = new Date(0); 
			d.setUTCSeconds(exp_seconds);
			expiry_time = d.toLocaleString();
		    }
		    else {
			expiry_time = 'browser-close';
		    }

		    var cookie_val = undefined;
		    try {
			cookie_val = decodeURIComponent(all_cookies[i].value);
		    }
		    catch(e) {
			cookie_val = all_cookies[i].value;
		    }
		    //cookie_val = all_cookies[i].value;

		    var msg = sprintf("Cookie-key: '%s', " + 
				      "\n\tValue-Length: %3d, " +
				      "HostOnly: '%s', " +
				      "Secure: '%s', " + 
				      "HttpOnly: '%s', " +
				      "Session: '%s', " + 
				      "Expiration: '%s', " + 
				      "\n\tValue: '%s', " +
				      "Appu Class: '%s'",
				      cookie_key,
				      all_cookies[i].value.length,
				      all_cookies[i].hostOnly,
				      all_cookies[i].secure,
				      all_cookies[i].httpOnly,
				      all_cookies[i].session,
				      expiry_time,
				      cookie_val,
				      cs.cookies[cookie_key].cookie_class);

		    cookie_info[cookie_key] = msg;
		    if (all_done.indexOf(false) == -1) {
			break;
		    }
		}

		var found_cookies = Object.keys(cookie_info);
		console.log("*****************************");
		console.log("APPU DEBUG: Printing all SUSPECTED-ACCOUNT-COOKIES for: " + domain);
		var index = 1;
		for (var j = 0; j < found_cookies.length; j++) {
		    if (cookie_info[found_cookies[j]] == undefined) {
			continue;
		    }
		    console.log((index++) + ". " + cookie_info[found_cookies[j]]);
		}
		console.log("*****************************");
	    }
	}(cookie_names)));
}


// All cookies related to a particular domain
function print_all_cookies(domain) {
    var cb_cookies = (function(domain) {
	    return function(all_cookies) {
		var tot_hostonly = 0;
		var tot_httponly = 0;
		var tot_secure = 0;
		var tot_session = 0;
		
		console.log("*****************************");
		console.log("APPU DEBUG: Printing ALL cookies for: " + domain);
		for (var i = 0; i < all_cookies.length; i++) {
		    var cookie_str = "";
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
			expiry_time = d.toLocaleString();
		    }
		    else {
			expiry_time = 'browser-close';
		    }
		    
		    var cookie_val = undefined;
		    try {
			cookie_val = decodeURIComponent(all_cookies[i].value);
		    }
		    catch(e) {
			cookie_val = all_cookies[i].value;
		    }

		    var msg = sprintf("Cookie-key: '%s', " + 
				      "\n\tValue-Length: %3d, " + 
				      "HostOnly: '%s', " +
				      "Secure: '%s', " + 
				      "HttpOnly: '%s', " +
				      "Session: '%s', " + 
				      "Expiration: '%s', " + 
				      "\n\tValue: '%s'",
				      cookie_key,
				      all_cookies[i].value.length,
				      all_cookies[i].hostOnly,
				      all_cookies[i].secure,
				      all_cookies[i].httpOnly,
				      all_cookies[i].session,
				      expiry_time,
				      cookie_val);
		    
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
		    
		    console.log(i + ". " + msg);
		}
		console.log("-----------------------------");
		console.log("APPU DEBUG: Total HostOnly Cookies: " + tot_hostonly);
		console.log("APPU DEBUG: Total HTTPOnly Cookies: " + tot_httponly);
		console.log("APPU DEBUG: Total Secure Cookies: " + tot_secure);
		console.log("APPU DEBUG: Total Session Cookies: " + tot_session);
		console.log("APPU DEBUG: Total number of cookies: " + all_cookies.length);
		console.log("*****************************");
	    }
	})(domain);

    get_all_cookies(domain, cb_cookies);
}


// Print all the cookies whose value contain one of the names in PI store.
// Only fields with tags "usernameXXX" and "emailXXX" are checked.
// For emails, check full email and then only anything that comes before "@".
// Any component that is found out should be > 4 characters.
function print_cookies_with_values_containing_usernames(domain) {
    var cb_cookies = (function(domain, event_name) {
	    return function(all_cookies) {
		var tot_hostonly = 0;
		var tot_httponly = 0;
		var tot_secure = 0;
		var tot_session = 0;
		var detected_usernames = {};
		
		var pi_usernames = get_all_usernames(true);
		
		console.log("APPU DEBUG: Printing all cookies containing usernames for: " + domain);
		for (var i = 0; i < all_cookies.length; i++) {
		    for (var j = 0; j < all_cookies.length; j++) {
			if (all_cookies[i].value.indexOf(pi_usernames[j]) != -1) {
			    detected_usernames[pi_usernames[j]] = true;
			    var cookie_str = "";
			    var cookie_name = all_cookies[i].name;
			    var cookie_domain = all_cookies[i].domain;
			    var cookie_path = all_cookies[i].path;
			    var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
			    var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;
			    
			    cookie_str += "Cookie Key: " + cookie_key;
			    cookie_str += ", HostOnly: '" + all_cookies[i].hostOnly + "'";
			    cookie_str += ", Secure: '" + all_cookies[i].secure + "'";
			    cookie_str += ", HttpOnly: '" + all_cookies[i].httpOnly + "'";
			    cookie_str += ", Session: '" + all_cookies[i].session + "'";
			    cookie_str += ", Value: '" + all_cookies[i].value + "'";
			    cookie_str += ", Expiration: '" + all_cookies[i].expirationDate + "'";
			    
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
			    
			    break;
			}
		    }
		}
		console.log("APPU DEBUG: Total HostOnly Cookies: " + tot_hostonly);
		console.log("APPU DEBUG: Total HTTPOnly Cookies: " + tot_httponly);
		console.log("APPU DEBUG: Total Secure Cookies: " + tot_secure);
		console.log("APPU DEBUG: Total Session Cookies: " + tot_session);
		console.log("APPU DEBUG: Total number of cookies: " + all_cookies.length);
		console.log("APPU DEBUG: Detected usernames: " + JSON.stringify(Object.keys(detected_usernames)));
	    }
	})(domain);

    get_all_cookies(domain, cb_cookies);
}


function print_redirect_information(details) {
    if (get_domain(details.redirectUrl.split("/")[2]) != 'live.com') { 
// 	console.log("APPU DEBUG: Current URL: " + details.url +
// 		    ", FrameID: " + details.frameId + 
// 		    ", type: " + details.type);
// 	console.log("APPU DEBUG: Redirection URL: " + details.redirectUrl +
// 		    ", FrameID: " + details.frameId + 
// 		    ", type: " + details.type);
    }
}


function print_sent_headers(details) {
    if (get_domain(details.url.split("/")[2]) != 'live.com') {
	console.log("Here here: Sent headers: " + JSON.stringify(details));
    }
}

// Returns all cookies present on disk at this moment across all
// sites.
function count_all_cookies() {
    chrome.cookies.getAll({}, function(all_cookies) {
	    var tot_sites = 0;
	    var tot_hostonly = 0;
	    var tot_httponly = 0;
	    var tot_secure = 0;
	    var tot_session = 0;
	    var per_site_cookie_count = {};
	    
	    for (var i = 0; i < all_cookies.length; i++) {
		var cookie_domain = all_cookies[i].domain;
		if (cookie_domain[0] == '.') {
		    cookie_domain = cookie_domain.slice(1, cookie_domain.length);
		}
		cookie_domain = get_domain(cookie_domain);

		if (per_site_cookie_count[cookie_domain] == undefined) {
		    per_site_cookie_count[cookie_domain] = 1;
		    tot_sites += 1;
		}
		else {
		    per_site_cookie_count[cookie_domain] += 1;
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
	    }

	    var order_by_num_cookies = [];
	    for (var site in per_site_cookie_count) {
		order_by_num_cookies.push([site, per_site_cookie_count[site]]);
	    }

	    order_by_num_cookies.sort(function(a, b) {return a[1] - b[1]});

	    for (var i in order_by_num_cookies) {
		console.log("APPU DEBUG: Site: " + order_by_num_cookies[i][0] + 
			    ", Cookies: " + order_by_num_cookies[i][1]);
	    }

	    console.log("APPU DEBUG: ----------------------------------- ");
	    console.log("APPU DEBUG: Total HostOnly Cookies: " + tot_hostonly);
	    console.log("APPU DEBUG: Total HTTPOnly Cookies: " + tot_httponly);
	    console.log("APPU DEBUG: Total Secure Cookies: " + tot_secure);
	    console.log("APPU DEBUG: Total Session Cookies: " + tot_session);
	    console.log("APPU DEBUG: Total Number of Sites: " + tot_sites);
	    console.log("APPU DEBUG: Total Number of Cookies: " + all_cookies.length);
	});
}

// **** END - Dump internal status functions



// **** BEGIN - Cookiesets generation, manipulations functions

// decimal_set1 is a decimal number like 44 (101100)
// decimal_set2 is a decimal number like 60 (111100)
// Here 44 is subset of 60
// if decimal_set1 is subset of decimal_set2 then return 1
// if decimal_set2 is subset of decimal_set1 then return 2
// if none is subset of other then return 0
function find_subset_relationship(decimal_set1, decimal_set2) {
    if ((decimal_set1 & decimal_set2) == decimal_set1) {
	return 1;
    }

    if ((decimal_set1 & decimal_set2) == decimal_set2) {
	return 2;
    }

    return 0;
}

    
// True if decimal_set1 is subset of decimal_set2
function is_a_subset(decimal_set1, decimal_set2) {
    var rc = find_subset_relationship(decimal_set1, decimal_set2);
    if (rc == 1) {
	return true;
    }
    return false;
}


// True if decimal_set1 is superset of decimal_set2
function is_a_superset(decimal_set1, decimal_set2) {
    var rc = find_subset_relationship(decimal_set1, decimal_set2);
    if (rc == 2) {
	return true;
    }
    return false;
}


function is_a_setmember_subset(decimal_element, decimal_set) {
    if(decimal_set.indexOf(decimal_element) != -1) {
	return true;
    }

    for (var k = 0; k < decimal_set.length; k++) {
	var rc = find_subset_relationship(decimal_element, decimal_set[k]);
	if (rc == 2) {
	    // decimal_set[k] is a subset of decimal_element
	    return true;
	}
    }
    return false;
}


function is_a_setmember_superset(decimal_element, decimal_set) {
    if(decimal_set.indexOf(decimal_element) != -1) {
	return true;
    }

    for (var k = 0; k < decimal_set.length; k++) {
	var rc = find_subset_relationship(decimal_element, decimal_set[k]);
	if (rc == 1) {
	    // decimal_element is a subset of decimal_set[k]
	    return true;
	}
    }
    return false;
}


// We can do ".indexOf()" instead of JSON.stringify because
// element is a decimal number and set is an array of decimal numbers
function is_a_member_of_set(decimal_element, decimal_set) {
    if(decimal_set.indexOf(decimal_element) != -1) {
	return true;
    }
    return false;
}


// Adds the element "cs" to the set "cookiesets" iff
// "cs" is already not present in "cookiesets".
// "cs" : ["http://abc.com/:cookie1", "https://abc.com/:cookie2"]
// "cookiesets" : array of cookieset like "cs"
// "decimal_cookiesets" : representation of "cookiesets" as per "suspected_account_cookies_array"
function add_to_set(cs, 
		    cookiesets, 
		    decimal_cookiesets, 
		    suspected_account_cookies_array,
		    decimal_cs) {
    var conv_cs = undefined;
    var dec_cs = undefined;

    if (decimal_cs == undefined) {
	conv_cs = convert_cookie_array_to_binary_cookieset(cs, suspected_account_cookies_array);
	dec_cs = conv_cs.decimal_cookieset;
    }
    else {
	dec_cs = decimal_cs;
    }

    if (decimal_cookiesets.indexOf(dec_cs) == -1) {
	if (cookiesets != undefined) {
	    cookiesets.push(cs);
	}
	decimal_cookiesets.push(dec_cs);
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
	conv_cs = convert_cookie_array_to_binary_cookieset(cs, suspected_account_cookies_array);
	dec_cs = conv_cs.decimal_cookieset;
    }
    else {
	dec_cs = decimal_cs;
    }

    if (is_a_member_of_set(dec_cs, decimal_cookiesets)) {
	return 0;
    }

    var subset_found = false;
    var superset_elements = [];

    for (var k = 0; k < decimal_cookiesets.length; k++) {
	var curr_dec_num = decimal_cookiesets[k];
	var rc = find_subset_relationship(dec_cs, curr_dec_num);
	if (rc == 2) {
	    // curr_dec_num is subset of dec_cs
	    subset_found = true;
	}
	else if (rc == 1) {
	    superset_elements.push(curr_dec_num);
	}
    }

    if (!subset_found) {
	// First delete all supersets
	for (var i = 0; i < superset_elements.length; i++) {
	    var index_to_delete = decimal_cookiesets.indexOf(superset_elements[i]);
	    decimal_cookiesets.splice(index_to_delete, 1);		
	    cookiesets.splice(index_to_delete, 1);		
	}

	cookiesets.push(cs);
	decimal_cookiesets.push(dec_cs);
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
	conv_cs = convert_cookie_array_to_binary_cookieset(cs, suspected_account_cookies_array);
	dec_cs = conv_cs.decimal_cookieset;
    }
    else {
	dec_cs = decimal_cs;
    }

    if (is_a_member_of_set(dec_cs, decimal_cookiesets)) {
	return 0;
    }

    var superset_found = false;
    var subset_elements = [];

    for (var k = 0; k < decimal_cookiesets.length; k++) {
	var curr_dec_num = decimal_cookiesets[k];
	var rc = find_subset_relationship(dec_cs, curr_dec_num);
	if (rc == 1) {
	    // curr_dec_num is superset of dec_cs
	    superset_found = true;
	}
	else if (rc == 2) {
	    subset_elements.push(curr_dec_num);
	}
    }

    if (!superset_found) {
	// First delete all subsets
	for (var i = 0; i < subset_elements.length; i++) {
	    var index_to_delete = decimal_cookiesets.indexOf(subset_elements[i]);
	    decimal_cookiesets.splice(index_to_delete, 1);
	    cookiesets.splice(index_to_delete, 1);
	}

	cookiesets.push(cs);
	decimal_cookiesets.push(dec_cs);
	return 1;
    }
    return 0;
}

// This function is just like: generate_super_cookiesets()
// Read the description there.
// Extra parameter: 
// 'x': Tells how many cookies to let pass through
function generate_super_cookiesets_efficient(url,
					     x,
					     tot_cookies, 
					     verified_strict_account_decimal_cookiesets,
					     verified_account_super_decimal_cookiesets,
					     verified_non_account_super_decimal_cookiesets) {
    var my_super_decimal_cookiesets = [];
    var my_super_binary_cookiesets = [];
    
    var tot_sets_equal_to_x = 0;
    var curr_bin_cs = decimal_to_binary_array(0, tot_cookies);
    var orig_x = x;
    
    var num_sets = Math.pow(2, tot_cookies);    
    
    console.log("APPU DEBUG: Going to generate GUB cookiesets(round=" + x + "), total cookiesets: " + num_sets);
    console.log("APPU DEBUG: Length of verified_strict_account_decimal_cookiesets: " + 
		verified_strict_account_decimal_cookiesets.length);
    console.log("APPU DEBUG: Length of verified_account_super_decimal_cookiesets: " + 
		verified_account_super_decimal_cookiesets.length);
    console.log("APPU DEBUG: Length of verified_non_account_super_decimal_cookiesets: " + 
		verified_non_account_super_decimal_cookiesets.length);
    
    var rc = set_last_X_bits_to_bit_val(x, 0, curr_bin_cs, 0);    
    if (rc == -1) {
	return -1;
    }
    
    do {
	var dec_cookieset = binary_array_to_decimal(curr_bin_cs);
	var bin_cookieset = curr_bin_cs;	

	rc = is_a_setmember_subset(dec_cookieset, 
				   verified_strict_account_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out anyway.
	    // No point in testing.
	    continue;
	}
	
	rc = is_a_setmember_superset(dec_cookieset, 
				     verified_non_account_super_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-in.
	    // No point in testing.
	    continue;
	}
	
	rc = is_a_member_of_set(dec_cookieset, 
				verified_account_super_decimal_cookiesets);
	if (rc) {
	    // This has been already tested and known to be accountcookie-superset.
	    // No point in testing again.
	    continue;
	}
	
	rc = is_a_setmember_subset(dec_cookieset, 
				   verified_account_super_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out because
	    // there is already a set in verified_account_super_decimal_cookiesets
	    // that is subset of curr_cookieset_decimal.
	    // No point in testing.
	    continue;
	}
	
	// First check which members discovered in previous iterations are
	//  either: subsets of this member in which case delete them
	//  or: supersets of this member in which case do not add it.
	var rc = add_to_set_if_no_superset_member(undefined, 
						  [], 
						  my_super_decimal_cookiesets, 
						  undefined,
						  dec_cookieset);
	
	if (rc) {
	    my_super_binary_cookiesets.push(bin_cookieset.slice(0));
	    tot_sets_equal_to_x = 1;
	}
    } while(generate_next_binary_cookieset_X(curr_bin_cs, 0) != null);
    
    var rc = check_if_binary_and_decimal_cookiesets_match(my_super_binary_cookiesets, 
							  my_super_decimal_cookiesets);
    
    if (rc == -1) {
	console.log("APPU Error: generate_super_cookiesets_efficient() binary, decimal cookiesets do not match");
	return -1;
    }
    
    console.log("APPU DEBUG: Total sets where X(=" + orig_x + ") cookies would be passed: " + 
		my_super_binary_cookiesets.length);
    
    
    return {
	decimal_super_cookiesets: my_super_decimal_cookiesets,
	    binary_super_cookiesets: my_super_binary_cookiesets
	    };
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
				   verified_strict_account_decimal_cookiesets,
				   verified_account_super_decimal_cookiesets,
				   verified_non_account_super_decimal_cookiesets,
				   x) {
    var my_super_decimal_cookiesets = [];
    var my_super_binary_cookiesets = [];
    var rc = true;
    var num_sets = Math.pow(2, tot_cookies);

    console.log("APPU DEBUG: Going to generate GUB cookiesets, total cookiesets: " + num_sets);
    console.log("APPU DEBUG: Length of verified_strict_account_decimal_cookiesets: " + 
		verified_strict_account_decimal_cookiesets.length);
    console.log("APPU DEBUG: Length of verified_account_super_decimal_cookiesets: " + 
		verified_account_super_decimal_cookiesets.length);
    console.log("APPU DEBUG: Length of verified_non_account_super_decimal_cookiesets: " + 
		verified_non_account_super_decimal_cookiesets.length);

    for (var i = 0; i < num_sets; i++) {
	var dec_cookieset = i;
	var bin_cookieset = decimal_to_binary_array(dec_cookieset, tot_cookies);

	if (x != undefined) {
	    var tot_zeros = 0;
	    for (var k = 0; k < bin_cookieset.length; k++) {
		if (bin_cookieset[k] == 0) {
		    tot_zeros += 1;
		}
	    }
	    if (tot_zeros != x) {
		continue;
	    }
	}
	    
	rc = is_a_setmember_subset(dec_cookieset, 
				   verified_strict_account_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out anyway.
	    // No point in testing.
	    continue;
	}

	rc = is_a_setmember_superset(dec_cookieset, 
				     verified_non_account_super_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-in.
	    // No point in testing.
	    continue;
	}

	rc = is_a_member_of_set(dec_cookieset, 
				verified_account_super_decimal_cookiesets);
	if (rc) {
	    // This has been already tested and known to be accountcookie-superset.
	    // No point in testing again.
	    continue;
	}

	rc = is_a_setmember_subset(dec_cookieset, 
				   verified_account_super_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out because
	    // there is already a set in verified_account_super_decimal_cookiesets
	    // that is subset of curr_cookieset_decimal.
	    // No point in testing.
	    continue;
	}

	// First check which members discovered in previous iterations are
	//  either: subsets of this member in which case delete them
	//  or: supersets of this member in which case do not add it.
	add_to_set_if_no_superset_member(undefined, 
					 [], 
					 my_super_decimal_cookiesets, 
					 undefined,
					 dec_cookieset);
    }

    console.log("APPU DEBUG: Number of GUB cookiesets to be tested: " + 
		my_super_decimal_cookiesets.length);
	
    for (var k = 0; k < my_super_decimal_cookiesets.length; k++) {
	var binary_cookieset = decimal_to_binary_array(my_super_decimal_cookiesets[k], tot_cookies);
	my_super_binary_cookiesets.push(binary_cookieset);
    }

    return {
	decimal_super_cookiesets: my_super_decimal_cookiesets,
	binary_super_cookiesets: my_super_binary_cookiesets
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
// If invert is 'false' or undefined:
//  binary_cookieset: [1, 0, 1, 1, 0]
//  decimal_cookieset: 22
// If invert is 'true':
//  binary_cookieset: [0, 1, 0, 0, 1]
//  decimal_cookieset: 9
function convert_cookie_array_to_binary_cookieset(cookie_array, suspected_account_cookies_array, bool_invert) {
    var my_bin_cookieset = [];
    var my_dec_cookieset = 0;

    bool_invert = (bool_invert == undefined) ? false : bool_invert;

    for (var i = 0; i < suspected_account_cookies_array.length; i++) {
	var index = cookie_array.indexOf(suspected_account_cookies_array[i]);
	if (index == -1) {
	    if (!bool_invert) {
		my_bin_cookieset.unshift(0);
	    }
	    else {
		my_bin_cookieset.unshift(1);
	    }
	}
	else {
	    if (!bool_invert) {
		my_bin_cookieset.unshift(1);
	    }
	    else {
		my_bin_cookieset.unshift(0);
	    }
	}
    }

    my_dec_cookieset = binary_array_to_decimal(my_bin_cookieset);
    return {
	binary_cookieset: my_bin_cookieset,
	    decimal_cookieset: my_dec_cookieset
	    }
}


// Accepts a binary-cookieset: [0, 1, 1, 0, 1]
//    AND
// suspected_account_cookies_array like: ["http://abc.com:cookie1", 
//                              "http://abc.com:cookie2", 
//                              "http://abc.com:cookie3", 
//                              "http://abc.com:cookie4", 
//                              "http://abc.com:cookie5"]
// Returns a cookie_array like: ["http://abc.com:cookie5", "http://abc.com:cookie2", 
//                               "http://abc.com:cookie3"]
function convert_binary_cookieset_to_cookie_array(binary_cookieset, 
						  suspected_account_cookies_array, 
						  bool_invert) {
    // Need to reverse it due to little endianness.
    binary_cookieset.reverse();
    var cookie_array = [];

    bool_invert = (bool_invert == undefined) ? false : bool_invert;
	
    for (var i = 0; i < binary_cookieset.length; i++) {
	if ((!bool_invert) && (binary_cookieset[i] == 1)) {
	    cookie_array.push(suspected_account_cookies_array[i]);
	}
	else if ((bool_invert) && (binary_cookieset[i] == 0)) {
	    cookie_array.push(suspected_account_cookies_array[i]);
	}
    }
    binary_cookieset.reverse();
    return cookie_array;
}

// Accepts a binary_cookieset like: [1, 1, 0, 0, 1, 0, 1, 0, 1]
// x: number of last x bits to be set to "bit_val"
// bit_val: Either "0" or "1"
// num_dd: First 'y' bits that are not to be disturbed.
// In this case if x = 3 and num_dd = 2 and bit_val = "1", then return value would be:
// [1, 1, 0, 0, 0, 0, 1, 1, 1]
function set_last_X_bits_to_bit_val(x, num_dd, bin_cs, bit_val) {
    var negate_bit_val = (bit_val + 1) % 2;

    if ((x + num_dd) > bin_cs.length) {
	console.log("APPU Error: (x(" + x + ") + num_dd(" + num_dd + ")) exceeds bin_cs.length(" + bin_cs.length + ")");
	//report_fatal_error("");
	return -1;
    }

    for (var i = (bin_cs.length - 1); i >= 0; i--) {
	if (x > 0) {
	    bin_cs[i] = bit_val;
	    x -= 1;
	}
	else if (i >= num_dd) {
	    bin_cs[i] = negate_bit_val;
	}
    }
    return bin_cs
}


// Accpets a binary cookieset such as ['0', '1', '0', '0', '1']
// Accepts which is the bit_val that should be shifted: "1" or "0".
// Returns the next in the sequence   ['0', '1', '0', '1', '0']
function generate_next_binary_cookieset_X(curr_bin_cs, bit_val) {
    // This is Big endian.
    // Most significant digit is stored at array index '0'.
    var negate_bit_val = (bit_val + 1) % 2;
    var tot_bit_val_so_far = 0;

    if (curr_bin_cs.length == 1) {
	if (curr_bin_cs[0] != bit_val) {
	    curr_bin_cs[0] = bit_val;
	    return curr_bin_cs;
	}
    }

    for (var i = curr_bin_cs.length - 1; i >= 0; i--) {
	if (curr_bin_cs[i] == bit_val &&
	    (i-1) >= 0 &&
	    curr_bin_cs[i-1] == negate_bit_val) {

	    curr_bin_cs[i] = negate_bit_val;
	    curr_bin_cs[i-1] = bit_val;
	    var rc = set_last_X_bits_to_bit_val(tot_bit_val_so_far, i, curr_bin_cs, bit_val);
	    if (rc == -1) {
		return null;
	    }
	    return curr_bin_cs;
	}

	if (curr_bin_cs[i] == bit_val) {
	    tot_bit_val_so_far += 1;
	}
    }
    return null;
}

// Return values:
// 0: Means no more cookiesets can be generated for this round. Move to the next state.
// 1: One complete round we could not generate any cookieset.
// -1: Some error.
// ELSE: object with binary and decimal cookiesets
function get_next_binary_cookieset_X(curr_bin_cs, 
				     x, 
				     tot_cookies, 
				     verified_strict_account_decimal_cookiesets,
				     verified_strict_non_account_decimal_cookiesets,
				     verified_non_account_super_decimal_cookiesets,
				     state,
				     skipped_sets) {
    var complete_round = false;

    do {
	if (curr_bin_cs == undefined ||
	    curr_bin_cs == null) {
	    curr_bin_cs = decimal_to_binary_array(0, tot_cookies);
	    var rc = set_last_X_bits_to_bit_val(x, 0, curr_bin_cs, 1);    
	    if (rc == -1) {
		return 1;
	    }
	    complete_round = true;
	}
	else {
	    if (generate_next_binary_cookieset_X(curr_bin_cs, 1) == null) {
		if (complete_round == true) {
		    return 1;
		}
		else {
		    return 0;
		}
	    }
	}
	var dec_cookieset = binary_array_to_decimal(curr_bin_cs);
	var bin_cookieset = curr_bin_cs.slice(0);

	// Only push this set iff 
	//  it is not a superset of already verified account-cookieset OR
	//  it is not a subset of already verified non-account-cookieset 
	rc = is_a_setmember_subset(dec_cookieset, 
				   verified_strict_account_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out anyway.
	    // No point in testing.
	    // 	    console.log("APPU DEBUG: Skipping decimal cookieset(cookieset is subset of account-cookieset): " + 
	    // 			dec_cookieset);
	    if (state == "normal") {
		skipped_sets.num_subset_in_account_cookiesets += 1;
		skipped_sets.tot_page_reloads_naive += 3;
	    }
	    continue;
	}

	// Only push this set iff 
	//  a set-member of verified non-account-cookieset
	//  is not a superset (thus tested already and known to be non-account cookieset) 
	rc = is_a_setmember_superset(dec_cookieset, 
				     verified_strict_non_account_decimal_cookiesets);
	if (rc) {
	    // This has already been tested, no point in testing again.
	    //console.log("APPU DEBUG: Skipping decimal cookieset(superset in strict-non-account cookieset): " + 
	    //	dec_cookieset);
	    if (state == "normal") {
		skipped_sets.num_superset_in_non_account_cookiesets += 1;
		skipped_sets.tot_page_reloads_naive += 3;
	    }
	    // We are returning because of previous results.
	    // So set complete_round to false.
	    complete_round = false;
	    continue;
	}
	
	rc = is_a_setmember_superset(dec_cookieset, 
				     verified_non_account_super_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will not affect a session's logged-in status.
	    // No point in testing.
	    //console.log("APPU DEBUG: Skipping decimal cookieset(superset in non-account_cookiesets): " + 
	    //	dec_cookieset);
	    if (state == "normal") {
		skipped_sets.num_superset_in_non_account_super_cookiesets += 1;
		skipped_sets.tot_page_reloads_naive += 3;
	    }
	    continue;
	}

	return {
	    binary_cookieset: bin_cookieset,
		decimal_cookieset: dec_cookieset
		}
    } while(1);
    
    return -1;
}

// Return values:
// 0: Means no more cookiesets can be generated for this round. Move to the next state.
// 1: One complete round we could not generate any cookieset.
// -1: Some error.
// ELSE: object with binary and decimal cookiesets
function get_next_gub_binary_cookieset_X(curr_bin_cs, 
					 x, 
					 tot_cookies, 
					 verified_strict_account_decimal_cookiesets,
					 verified_account_super_decimal_cookiesets,
					 verified_non_account_super_decimal_cookiesets,
					 skipped_sets) {
    var complete_round = false;

    do {
	if (curr_bin_cs == undefined ||
	    curr_bin_cs == null) {
	    curr_bin_cs = decimal_to_binary_array(0, tot_cookies);
	    var rc = set_last_X_bits_to_bit_val(x, 0, curr_bin_cs, 0);    
	    if (rc == -1) {
		return 1;
	    }
	    complete_round = true;
	}
	else {
	    if (generate_next_binary_cookieset_X(curr_bin_cs, 0) == null) {
		if (complete_round == true) {
		    return 1;
		}
		else {
		    return 0;
		}
	    }
	}

	var dec_cookieset = binary_array_to_decimal(curr_bin_cs);
	var bin_cookieset = curr_bin_cs.slice(0);

	rc = is_a_setmember_subset(dec_cookieset, 
				   verified_strict_account_decimal_cookiesets);
	if (rc) {
	    //console.log("APPU DEBUG: GUB Skipping decimal cookieset(subset in strict-account-cookiesets): " + 
	    //	dec_cookieset);

	    skipped_sets.num_gub_subset_in_account_cookiesets += 1;
	    skipped_sets.tot_page_reloads_naive += 2;
	    // Suppressing these cookies will cause session to be logged-out anyway.
	    // No point in testing.
	    continue;
	}
	
	rc = is_a_setmember_superset(dec_cookieset, 
				     verified_non_account_super_decimal_cookiesets);
	if (rc) {
	    //console.log("APPU DEBUG: GUB Skipping decimal cookieset(superset in non-account-super-cookiesets): " + 
	    //	dec_cookieset);

	    skipped_sets.num_gub_superset_in_non_account_cookiesets += 1;
	    skipped_sets.tot_page_reloads_naive += 2;
	    // Suppressing these cookies will cause session to be logged-in.
	    // No point in testing.
	    continue;
	}
	
	rc = is_a_member_of_set(dec_cookieset, 
				verified_account_super_decimal_cookiesets);
	if (rc) {
	    //console.log("APPU DEBUG: GUB Skipping decimal cookieset(already tested in account-super-cookiesets): " + 
	    //	dec_cookieset);

	    skipped_sets.num_gub_already_tested_in_account_super_cookiesets += 1;
	    skipped_sets.tot_page_reloads_naive += 2;
	    // This has been already tested and known to be accountcookie-superset.
	    // No point in testing again.
	    continue;
	}
	
	rc = is_a_setmember_subset(dec_cookieset, 
				   verified_account_super_decimal_cookiesets);
	if (rc) {
	    //console.log("APPU DEBUG: GUB Skipping decimal cookieset(subset in account-super-cookiesets): " + 
	    //	dec_cookieset);

	    skipped_sets.num_gub_subset_in_account_super_cookiesets += 1;
	    skipped_sets.tot_page_reloads_naive += 2;
	    // Suppressing these cookies will cause session to be logged-out because
	    // there is already a set in verified_account_super_decimal_cookiesets
	    // that is subset of curr_cookieset_decimal.
	    // No point in testing.
	    continue;
	}
	
	return {
	    binary_cookieset: bin_cookieset,
		decimal_cookieset: dec_cookieset
		}
    } while(1);
    
    return -1;
}

// Returns binary_cookiesets & decimal_cookiesets which only have specific number of cookies marked.
// For example is 'x' = 2, and tot_cookies = 3, then
// [['0', '1', '1'], ['1', '0', '1'], ['1', '1', '0']] will get returned.
// Marked cookies will be omitted while populating shadow_cookie_store.
// If any of the cookies in the above set is a superset of already verified-account-cookieset OR
//  if they are subset of already verified-non-account-cookiesets 
//  then they will not be included in the array.
//  Real name of the function:
//  generate_binary_cookiesets_X() = generate_binary_cookiesets_with_X_number_of_cookies_to_be_dropped()
function generate_binary_cookiesets_X_efficient(url, 
				      x, 
				      tot_cookies, 
				      verified_strict_account_decimal_cookiesets,
				      verified_non_account_super_decimal_cookiesets) {
    var my_binary_cookiesets = [];
    var my_decimal_cookiesets = [];
    var tot_sets_equal_to_x = 0;
    var curr_bin_cs = decimal_to_binary_array(0, tot_cookies);
    var orig_x = x;

    var num_sets = Math.pow(2, tot_cookies);    
    console.log("APPU DEBUG: Going to generate cookiesets(round=" + x + "), total cookiesets: " + num_sets);

    var rc = set_last_X_bits_to_bit_val(x, 0, curr_bin_cs, 1);    
    if (rc == -1) {
	return -1;
    }
    
    my_binary_cookiesets.push(curr_bin_cs.slice(0));
    my_decimal_cookiesets.push(binary_array_to_decimal(curr_bin_cs));
    
    tot_sets_equal_to_x = 1;
    
    while(generate_next_binary_cookieset_X(curr_bin_cs, 1) != null) {
	tot_sets_equal_to_x += 1;
	var dec_cookieset = binary_array_to_decimal(curr_bin_cs);
	var bin_cookieset = curr_bin_cs.slice(0);
	// Only push this set iff 
	//  it is not a superset of already verified account-cookieset OR
	//  it is not a subset of already verified non-account-cookieset 
	
	rc = is_a_setmember_subset(dec_cookieset, 
				   verified_strict_account_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out anyway.
	    // No point in testing.
	    continue;
	}
	
	rc = is_a_setmember_superset(dec_cookieset, 
				     verified_non_account_super_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will not affect a session's logged-in status.
	    // No point in testing.
	    continue;
	}
	
	my_binary_cookiesets.push(bin_cookieset);
	my_decimal_cookiesets.push(dec_cookieset);
    }
    
    var rc = check_if_binary_and_decimal_cookiesets_match(my_binary_cookiesets, 
							  my_decimal_cookiesets);
    
    if (rc == -1) {
	console.log("APPU Error: generate_binary_cookiesets_X() binary, decimal cookiesets do not match");
	return -1;
    }
    
    console.log("APPU DEBUG: Total sets where X(=" + orig_x + ") cookies can be dropped: " + tot_sets_equal_to_x);
    console.log("APPU DEBUG: Actual sets where X(=" + orig_x + ") cookies would be dropped: " + my_binary_cookiesets.length);
    
    return {
	binary_cookiesets: my_binary_cookiesets,
	    decimal_cookiesets: my_decimal_cookiesets
	    }
}

// Returns binary_cookiesets & decimal_cookiesets which only have specific number of cookies marked.
// For example is 'x' = 2, and tot_cookies = 3, then
// [['0', '1', '1'], ['1', '0', '1'], ['1', '1', '0']] will get returned.
// Marked cookies will be omitted while populating shadow_cookie_store.
// If any of the cookies in the above set is a superset of already verified-account-cookieset OR
//  if they are subset of already verified-non-account-cookiesets 
//  then they will not be included in the array.
//  Real name of the function:
//  generate_binary_cookiesets_X() = generate_binary_cookiesets_with_X_number_of_cookies_to_be_dropped()
function generate_binary_cookiesets_X(url, 
				      x, 
				      tot_cookies, 
				      verified_strict_account_decimal_cookiesets,
				      verified_non_account_super_decimal_cookiesets) {
    var my_binary_cookiesets = [];
    var my_decimal_cookiesets = [];
    var tot_sets_equal_to_x = 0;

    if (tot_cookies > MAX_COOKIE_TEST) {
	var err_str = "APPU Error: Cookie number exceeds(" + tot_cookies + 
	    ") maximum cookies, cannot proceed for: " + url;
	console.log(err_str);
	print_appu_error(err_str);
	return -1;
    }

    var num_sets = Math.pow(2, tot_cookies);

    console.log("APPU DEBUG: Going to generate cookiesets(round=" + x + "), total cookiesets: " + num_sets);
	
    for (var i = 0; i < num_sets; i++) {
	var dec_cookieset = i;
	var bin_cookieset = decimal_to_binary_array(dec_cookieset, tot_cookies);
	    
	var total = 0;
	for (var j = 0; j < bin_cookieset.length; j++) {
	    total += (bin_cookieset[j]);
	}
	    
	if (total == x) {
	    tot_sets_equal_to_x += 1;
	    // Only push this set iff 
	    //  it is not a superset of already verified account-cookieset OR
	    //  it is not a subset of already verified non-account-cookieset 

	    rc = is_a_setmember_subset(dec_cookieset, 
				       verified_strict_account_decimal_cookiesets);
	    if (rc) {
		// Suppressing these cookies will cause session to be logged-out anyway.
		// No point in testing.
		continue;
	    }

	    rc = is_a_setmember_superset(dec_cookieset, 
					 verified_non_account_super_decimal_cookiesets);
	    if (rc) {
		// Suppressing these cookies will not affect a session's logged-in status.
		// No point in testing.
		continue;
	    }
	    
	    my_binary_cookiesets.push(bin_cookieset);
	    my_decimal_cookiesets.push(dec_cookieset);
	}
    }

    var rc = check_if_binary_and_decimal_cookiesets_match(my_binary_cookiesets, 
							  my_decimal_cookiesets);
	
    if (rc == -1) {
	console.log("APPU Error: generate_binary_cookiesets_X() binary, decimal cookiesets do not match");
	return -1;
    }

    console.log("APPU DEBUG: Total sets where X(=" + x + ") cookies can be dropped: " + tot_sets_equal_to_x);
    console.log("APPU DEBUG: Actual sets where X(=" + x + ") cookies would be dropped: " + my_binary_cookiesets.length);

    return {
	binary_cookiesets: my_binary_cookiesets,
	    decimal_cookiesets: my_decimal_cookiesets
    }
}


// Accepts decimal number like '6' and
// returns an array [1,1,0]
// Each element of the array is a number and not a string.
function decimal_to_binary_array(dec_num, tot_len) {
	var bin_str = dec_num.toString(2);
	var bin_str_arr = bin_str.split('');
	var bin_arr = [];
	
	if (tot_len == undefined) {
	    tot_len = bin_str_arr.length;
	}

	if (bin_str_arr.length < tot_len) {
	    var insert_zeroes = (tot_len - bin_str_arr.length);
	    for (var k = 0; k < insert_zeroes; k++) {
		bin_str_arr.unshift("0");
	    }
	}
	    
	for (var j = 0; j < bin_str_arr.length; j++) {
	    bin_arr[j] = parseInt(bin_str_arr[j]);
	}
	return bin_arr;
}

// Accepts a binary array like [1, 1, 0]
// returns a decimal number 6
function binary_array_to_decimal(bin_arr) {
    return parseInt(bin_arr.join(''), 2);
}

function check_if_binary_and_decimal_cookiesets_match(binary_cookiesets, decimal_cookiesets) {
    var bool_ok = true;
    if (binary_cookiesets.length != decimal_cookiesets.length) {
// 	console.log("APPU DEBUG: Lengths mismatch, binary-cookieset("+ binary_cookiesets.length 
// 		    +"), decimal-cookieset(" + decimal_cookiesets.length + ")");
	bool_ok = false;
    }

    for(var i = 0; i < binary_cookiesets.length; i++) {
	var dec_num = binary_array_to_decimal(binary_cookiesets[i]);
	if (dec_num != decimal_cookiesets[i]) {
// 	    console.log("APPU DEBUG: Element mismatch at: " + i +
// 			", binary: " + binary_cookiesets[i] + 
// 			", decimal: " + decimal_cookiesets[i]);
	    bool_ok = false;
	}
    }

    if (bool_ok) {
// 	console.log("APPU DEBUG: Binary and Decimal cookiesets match");
	return 0;
    }

    return -1;
}

// Generates cookiesets. If there is a '1' at a specific position in 
// a cookieset, that cookie will be dropped while populating shadow_cookie_store.
// This function just generates all cookiesets exhasutively from (1:2^N).
// Where N: Total number of 'SUSPECTED_ACCOUNT_COOKIES' cookies.
// However, it will sort cookiesets such that all cookiesets with one cookie
// to be dropped are at the start. Then, all cookies with two cookies to be
// dropped and so on.
// This way, if we detect that a particular cookieset is indeed an account 
// cookieset then we need not test all of its supersets and just prune them.
// Returns:
// binary_cookiesets: [
//                      [0,1,1,0],
//                      [1,0,1,0]
//                    ]
// AND
// decimal_cookiesets: [6, 10]
function generate_binary_cookiesets(url, tot_cookies, dontsort) {
    var my_binary_cookiesets = [];
    var my_decimal_cookiesets = [];

    var num_sets = Math.pow(2, tot_cookies);
	
    dontsort = (dontsort == undefined) ? false : dontsort; 

    if (tot_cookies > MAX_COOKIE_TEST) {
	var err_str = "APPU Error: Cookie number exceeds(" + tot_cookies + 
	    ") maximum cookies, cannot proceed for: " + url;
	console.log(err_str);
	print_appu_error(err_str);
	return -1;
    }

    for (var i = 0; i < num_sets; i++) {
	var dec_cookieset = i;
	var bin_cookieset = decimal_to_binary_array(dec_cookieset, tot_cookies);
	    
	var total = 0;
	for (var j = 0; j < bin_cookieset.length; j++) {
	    total += (bin_cookieset[j]);
	}
	    
	if (total != 0 && 
	    total != 1 &&
	    total != tot_cookies) {
	    my_binary_cookiesets.push(bin_cookieset);
	    my_decimal_cookiesets.push(dec_cookieset);
	}
    }
	
    if (!dontsort) {
	my_binary_cookiesets.sort(function(bin_set1, bin_set2) {
		var tot1 = 0, tot2 = 0;
		for (var i = 0; i < tot_cookies; i++) {
		    tot1 += bin_set1[i];
		    tot2 += bin_set2[i];
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
	
	my_decimal_cookiesets.sort(function(dec_set1, dec_set2) {
		var tot1 = 0, tot2 = 0;
		var bin_set1 = decimal_to_binary_array(dec_set1, tot_cookies);
		var bin_set2 = decimal_to_binary_array(dec_set2, tot_cookies);
		
		for (var i = 0; i < tot_cookies; i++) {
		    tot1 += bin_set1[i];
		    tot2 += bin_set2[i];
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

    return {
	binary_cookiesets: my_binary_cookiesets,
	    decimal_cookiesets: my_decimal_cookiesets
	    }
}
    

// Variable verified_cookie_array[] is an array of cookies that is verified to be an account-cookieset.
// Each cookie in the array is of the form: https://abcde.com/my_path:cookie_name
// This will remove all supersets of verified_cookie_array from cookieset
function prune_binary_cookiesets(verified_cookie_array, 
				 suspected_account_cookies_array, 
				 binary_cookiesets) {
    var rc = convert_cookie_array_to_binary_cookieset(verified_cookie_array, suspected_account_cookies_array);
    var verified_binary_cookieset = rc.binary_cookieset;
    var verified_decimal_cookieset = rc.decimal_cookieset;

    var new_binary_cookiesets = [];
    var new_decimal_cookiesets = [];

    for (var i = 0; i < binary_cookiesets.length; i++) {
	var decimal_cookieset = binary_array_to_decimal(binary_cookiesets[i]);
	rc = is_a_superset(decimal_cookieset, verified_decimal_cookieset);

	if (!rc) {
	    // Only add curr_decimal_cookieset if it is not a superset of 
	    // verified_decimal_cookieset. If it is a superset then no point in testing.
	    new_binary_cookiesets.push(binary_cookiesets[i]);			
	    new_decimal_cookiesets.push(decimal_cookieset);			
	}
    }

    return {
	binary_cookiesets: new_binary_cookiesets,
	    decimal_cookiesets: new_decimal_cookiesets,
	    }   
}

// **** END - Cookiesets generation, manipulations functions



// **** BEGIN - Investigation state load/offload functions
// This is to unlimitedStorage.
// None of the sensitive data is stored here.

function offload_ci_state(url, ci_state) {
    var url_wo_paramters = url.replace(/\?.*/,'');
    var data = {};
    console.log("APPU DEBUG: Offloading CI state for: " + url_wo_paramters);
    data["Cookie Investigation State:" + url_wo_paramters] = ci_state;
    write_to_local_storage(data);
}

function load_ci_state(url, cb) {
    var url_wo_paramters = url.replace(/\?.*/,'');
    console.log("APPU DEBUG: Loading CI state for: " + url_wo_paramters);
    if (cb == undefined) {
	cb = cb_print("APPU DEBUG: CI state for: " + url + "\n")
    }
    read_from_local_storage("Cookie Investigation State:" + url_wo_paramters, cb);
}

function remove_ci_state(url) {
    var url_wo_paramters = url.replace(/\?.*/,'');
    console.log("APPU DEBUG: Cleaning CI state for: " + url_wo_paramters);
    delete_from_local_storage("Cookie Investigation State:" + url_wo_paramters);
}

// Print all cookiesets that have been tested so far for a URL
function print_cookie_investigation_state(url) {
    function process_state(state) {
	var url_wo_paramters = url.replace(/\?.*/,'');
	url = "Cookie Investigation State:" + url_wo_paramters; 

	if (state == undefined ||
	    JSON.stringify(state) == JSON.stringify({})) {
	    console.log("APPU DEBUG: State is not detected for URL: " + url);
	    return;
	}

	var vsaca = state[url]["vsaca"];
	var vsnaca = state[url]["vsnaca"];
	var vasca = state[url]["vasca"];
	var vnasca = state[url]["vnasca"];
	var vsndnadca = state[url]["vsndnadca"];
	var tot_time_taken = state[url]["tot_time_taken"];
	var tot_bytes_sent = state[url]["tot_bytes_sent"];
	var tot_bytes_recvd = state[url]["tot_bytes_recvd"];
	var tot_cookiesets_generation_time = state[url]["tot_cookiesets_generation_time"];
	var tot_attempts = state[url]["tot_attempts"];
	var tot_page_reloads_overall = state[url]["tot_page_reloads_overall"];
	var tot_page_reloads_naive = state[url]["tot_page_reloads_naive"];
	var tot_page_reloads_since_last_lo_change = state[url]["tot_page_reloads_since_last_lo_change"];
	var tot_cookiesets_tested_overall = state[url]["tot_cookiesets_tested_overall"];
	var tot_gub_cookiesets_tested_overall = state[url]["tot_gub_cookiesets_tested_overall"];
	var skipped_sets = state[url]["skipped_sets"];
	var tot_expand_state_cookiesets_tested_overall = state[url]["tot_expand_state_cookiesets_tested_overall"];
	var tot_expand_state_entered = state[url]["tot_expand_state_entered"];

	console.log("APPU DEBUG: Length of 'verified strict account cookiesets' array" + 
		    " (LLBs in suspected that cause logouts): " + vsaca.length);
	console.log("APPU DEBUG: Length of 'verified strict non-account cookiesets' array" + 
		    " (LLBs in suspected that *DO NOT* cause logouts): " + vsnaca.length);
	console.log("APPU DEBUG: Length of 'verified account super cookiesets' array" + 
		    " (GUBs in suspected that cause logouts): " + vasca.length);
	console.log("APPU DEBUG: Length of 'verified non-account super cookiesets' array" + 
		    " (GUBs in suspected that *DO NOT* cause logouts): " + vnasca.length);
	console.log("APPU DEBUG: Length of 'verified strict non-during non-account cookiesets' array" + 
		    " (LLBs in non-suspected that *DO NOT* cause logouts): " + vsndnadca.length);

	console.log("APPU DEBUG: Total bytes sent during investigation: " + tot_bytes_sent);
	console.log("APPU DEBUG: Total bytes recieved during investigation: " + tot_bytes_recvd);

	console.log("APPU DEBUG: Total time taken for investigation so far: " + Math.floor((tot_time_taken/60)) + "m " +
		    Math.floor((tot_time_taken % 60)) + "s");
	console.log("APPU DEBUG: Total attempts so far: " + tot_attempts);
	console.log("APPU DEBUG: Total page reloads so far: " + tot_page_reloads_overall);
	console.log("APPU DEBUG: Total page reloads naive method so far: " + tot_page_reloads_naive);

	console.log("APPU DEBUG: Total times expand-state entered: " + tot_expand_state_entered);
	console.log("APPU DEBUG: Total expand cookiesets tested so far: " + tot_expand_state_cookiesets_tested_overall);
	console.log("APPU DEBUG: Total GUB cookiesets tested so far: " + tot_gub_cookiesets_tested_overall);
	console.log("APPU DEBUG: Total cookiesets tested so far: " + tot_cookiesets_tested_overall);
	console.log("APPU DEBUG: Total time in generating cookiesets since last change to equation: " + 
		    tot_cookiesets_generation_time);

	console.log("-------------------");
	console.log("APPU DEBUG: *** Printing 'verified strict account cookiesets' array" + 
		    " (LLBs in suspected that cause logouts) ***");
	for (var i = 0; i < vsaca.length; i++) {
	    console.log((i+1) + ". " + JSON.stringify(vsaca[i]));
	}
	console.log("-------------------");

	console.log("APPU DEBUG: *** Printing 'verified strict non-account cookiesets' array" + 
		    " (LLBs in suspected that *DO NOT* cause logouts) ***");
	for (var i = 0; i < vsnaca.length; i++) {
	    if (vsnaca[i] == null) {
		console.log("Here here: Delete me");
	    }
	    else {
		console.log((i+1) + ". Length: " + vsnaca[i].length + ", Array: " + JSON.stringify(vsnaca[i]));
	    }
	}
	console.log("-------------------");

	console.log("APPU DEBUG: *** Printing 'verified account super cookiesets' array" + 
		    " (GUBs in suspected that cause logouts) ***");
	for (var i = 0; i < vasca.length; i++) {
	    console.log((i+1) + ". Length: " + vasca[i].length + ", Array: " + JSON.stringify(vasca[i]));
	}
	console.log("-------------------");

	console.log("APPU DEBUG: *** Printing 'verified non-account super cookiesets' array" + 
		    " (GUBs in suspected that *DO NOT* cause logouts) ***");
	for (var i = 0; i < vnasca.length; i++) {
	    console.log((i+1) + ". Length: " + vnasca[i].length + ", Array: " + JSON.stringify(vnasca[i]));
	}
	console.log("-------------------");

	console.log("APPU DEBUG: *** Printing 'verified strict non-during non-account cookiesets' array" + 
		    " (LLBs in non-suspected that *DO NOT* cause logouts) ***");
	for (var i = 0; i < vsndnadca.length; i++) {
	    console.log((i+1) + ". Length: " + vsndnadca[i].length + ", Array: " +  JSON.stringify(vsndnadca[i]));
	}

	console.log("-------------------");
	console.log("APPU DEBUG: LLB & GUB OPTIMIZATION INFORMATION");
	console.log("APPU DEBUG: Skipped cookiesets going UP in POSET (subset in account-cookiesets): " + 
		    skipped_sets.num_subset_in_account_cookiesets);
	console.log("APPU DEBUG: Skipped cookiesets going UP in POSET (superset in non-account-cookiesets): " + 
		    skipped_sets.num_superset_in_non_account_cookiesets);
	console.log("APPU DEBUG: Skipped cookiesets going UP in POSET (superset in non-account-super-cookiesets): " + 
		    skipped_sets.num_superset_in_non_account_super_cookiesets);
	
	console.log("APPU DEBUG: Skipped cookiesets coming DOWN in POSET (subset in account-cookiesets): " + 
		    skipped_sets.num_gub_subset_in_account_cookiesets);
	console.log("APPU DEBUG: Skipped cookiesets coming DOWN in POSET (superset in non-account-cookiesets): " + 
		    skipped_sets.num_gub_superset_in_non_account_cookiesets);
	console.log("APPU DEBUG: Skipped cookiesets coming DOWN in POSET (already tested account-super-cookiesets): " + 
		    skipped_sets.num_gub_already_tested_in_account_super_cookiesets);
	console.log("APPU DEBUG: Skipped cookiesets coming DOWN in POSET (subset in account-super-cookiesets): " + 
		    skipped_sets.num_gub_subset_in_account_super_cookiesets);
	console.log("-------------------");
    }

    load_ci_state(url, process_state);
}

// Following is to be invoked as:
// load_ci_state("https://google.com/", search_for_cookieset("https://google.com/", ["https://.google.com/:TEST_COOKIE1"]));
// Used to test if the cookieset has already been tested or not.
function search_for_cookieset(url, cookieset) {
    return function(state) {
	var url_wo_paramters = url.replace(/\?.*/,'');
	url = "Cookie Investigation State:" + url_wo_paramters; 

	if (state == undefined ||
	    JSON.stringify(state) == JSON.stringify({})) {
	    console.log("APPU DEBUG: State is not detected for URL: " + url);
	    return;
	}

	var vsaca = state[url]["vsaca"];
	var vsnaca = state[url]["vsnaca"];
	var vasca = state[url]["vasca"];
	var vnasca = state[url]["vnasca"];
	var vsndnadca = state[url]["vsndnadca"];
	var tot_time_taken = state[url]["tot_time_taken"];
	var tot_bytes_sent = state[url]["tot_bytes_sent"];
	var tot_bytes_recvd = state[url]["tot_bytes_recvd"];

	var tot_cookiesets_generation_time = state[url]["tot_cookiesets_generation_time"];
	var tot_attempts = state[url]["tot_attempts"];
	var tot_page_reloads_overall = state[url]["tot_page_reloads_overall"];
	var tot_page_reloads_naive = state[url]["tot_page_reloads_naive"];
	var tot_page_reloads_since_last_lo_change = state[url]["tot_page_reloads_since_last_lo_change"];
	var tot_cookiesets_tested_overall = state[url]["tot_cookiesets_tested_overall"];
	var tot_gub_cookiesets_tested_overall = state[url]["tot_gub_cookiesets_tested_overall"];
	var tot_expand_state_cookiesets_tested_overall = state[url]["tot_expand_state_cookiesets_tested_overall"];
	var tot_expand_state_entered = state[url]["tot_expand_state_entered"];

	var skipped_sets = state[url]["skipped_sets"];

	console.log("APPU DEBUG: Length vsaca: "     + vsaca.length);
	console.log("APPU DEBUG: Length vsnaca: "    + vsnaca.length);
	console.log("APPU DEBUG: Length vasca: "     + vasca.length);
	console.log("APPU DEBUG: Length vnasca: "    + vnasca.length);
	console.log("APPU DEBUG: Length vsndnadca: " + vsndnadca.length);
	console.log("APPU DEBUG: Length vsndnadca: " + vsndnadca.length);

	console.log("APPU DEBUG: Total bytes sent during investigation: " + tot_bytes_sent);
	console.log("APPU DEBUG: Total bytes recieved during investigation: " + tot_bytes_recvd);

	console.log("APPU DEBUG: Total time taken for investigation: " + Math.floor((tot_time_taken/60)) + "m " +
		    Math.floor((tot_time_taken % 60)) + "s");
	console.log("APPU DEBUG: Total attempts: " + tot_attempts);
	console.log("APPU DEBUG: Total page reloads overall so far: " + tot_page_reloads_overall);
	console.log("APPU DEBUG: Total page reloads naive method so far: " + tot_page_reloads_naive);
	console.log("APPU DEBUG: Total times expand-state entered: " + tot_expand_state_entered);
	console.log("APPU DEBUG: Total expand cookiesets tested: " + tot_expand_state_cookiesets_tested_overall);
	console.log("APPU DEBUG: Total GUB cookiesets tested: " + tot_gub_cookiesets_tested_overall);
	console.log("APPU DEBUG: Total cookiesets tested: " + tot_cookiesets_tested_overall);
	console.log("APPU DEBUG: Total time in generating cookiesets since last change to equation: " + 
		    tot_cookiesets_generation_time);

	for (var i = 0; i < vsaca.length; i++) {
	    if (JSON.stringify(vsaca[i].sort()) == JSON.stringify(cookieset.sort())) {
		console.log("APPU DEBUG: Cookieset present in vsaca at index: " + i);
	    }
	}

	for (var i = 0; i < vsnaca.length; i++) {
	    if (JSON.stringify(vsnaca[i].sort()) == JSON.stringify(cookieset.sort())) {
		console.log("APPU DEBUG: Cookieset present in vsnaca at index: " + i);
	    }
	}

	for (var i = 0; i < vasca.length; i++) {
	    if (JSON.stringify(vasca[i].sort()) == JSON.stringify(cookieset.sort())) {
		console.log("APPU DEBUG: Cookieset present in vasca at index: " + i);
	    }
	}

	for (var i = 0; i < vnasca.length; i++) {
	    if (JSON.stringify(vnasca[i].sort()) == JSON.stringify(cookieset.sort())) {
		console.log("APPU DEBUG: Cookieset present in vnasca at index: " + i);
	    }
	}

	for (var i = 0; i < vsndnadca.length; i++) {
	    if (JSON.stringify(vsndnadca[i].sort()) == JSON.stringify(cookieset.sort())) {
		console.log("APPU DEBUG: Cookieset present in vsndnadca at index: " + i);
	    }
	}
    }
}

// **** END - Investigation state load/offload functions

// **** BEGIN ---- Rest of the logic ----

function get_human_readable_size(bytes) {
    var kb = 1024;
    var mb = kb * kb;
    var gb = mb * kb;
    
    var tot_kb = Math.floor(bytes / kb);
    var tot_mb = Math.floor(bytes / mb);
    var tot_gb = Math.floor(bytes / gb);

    var append_text = "(" + bytes + " bytes)";

    if (tot_kb == 0) {
	return bytes + " bytes";
    }
    else if (tot_mb == 0) {
	return tot_kb + " KB" + append_text;
    }
    else if (tot_gb == 0) {
	return tot_mb + " MB" + append_text;
    }
    return tot_gb + " GB" + append_text;
}

function reset_nonduring_account_cookies(url) {
    var my_domain = get_domain(url.split("/")[2]);
    
    var all_cookies = pii_vault.aggregate_data.session_cookie_store[my_domain].cookies;
    for (var c in all_cookies) {
	if (all_cookies[c].cookie_class != 'during') {
	    all_cookies[c].is_part_of_account_cookieset = false;
	}
    }
    flush_session_cookie_store();
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
function delete_all_except_suspected_account_cookies(domain) {
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
			(cs.cookies[cookie_key].cookie_class == 'during' ||
			 cs.cookies[cookie_key].is_part_of_account_cookieset == true)) {
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

		    var cookie_http_only = all_cookies[i].httpOnly;
		    var cookie_secure = all_cookies[i].secure;
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
			login_state_cookies.cookies[cookie_key].is_part_of_account_cookieset = false;
			login_state_cookies.cookies[cookie_key].current_state = 'present';
			login_state_cookies.cookies[cookie_key].httpOnly = cookie_http_only;
			login_state_cookies.cookies[cookie_key].secure = cookie_secure;
		    }
		    else {
			// Cookie is newly created or got a new value written to it.
			// Hence likely a login cookie
			login_state_cookies.cookies[cookie_key] = {};
			login_state_cookies.cookies[cookie_key].cookie_class = 'during';
			login_state_cookies.cookies[cookie_key].is_part_of_account_cookieset = false;
			login_state_cookies.cookies[cookie_key].hashed_cookie_val = hashed_cookie_val;
			login_state_cookies.cookies[cookie_key].current_state = 'present';
			login_state_cookies.cookies[cookie_key].httpOnly = cookie_http_only;
			login_state_cookies.cookies[cookie_key].secure = cookie_secure;
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

    var cookie_http_only = change_info.cookie.httpOnly;
    var cookie_secure = change_info.cookie.secure;
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
		var is_part_of_account_cookieset = pvadcs[domain].cookies[cookie_key].is_part_of_account_cookieset;
		// No need to do anything if its just a 'before' cookie
		if (cookie_class == 'during' || 
		    cookie_class == 'after'  ||
		    is_part_of_account_cookieset == true) {
		    // This cookie was added as a result of login process or after login process
		    // No need to do anything if its cause if 'overwrite', it will be recreated shortly.
		    if (change_info.cause == 'expired' || 
			 change_info.cause == 'expired_overwrite' ||
			 change_info.cause == 'explicit' ||
			 change_info.cause == 'overwrite' ||
			 change_info.cause == 'evicted') {
			
			if (cookie_class == 'during' ||
			    is_part_of_account_cookieset == true) {
			    pvadcs[domain].cookies[cookie_key].current_state = 'absent';
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
		    pvadcs[domain].cookies[cookie_key].cookie_class == 'during' ||
		    is_part_of_account_cookieset == true) {
			pvadcs[domain].cookies[cookie_key].current_state = 'changed';
			pvadcs[domain].cookies[cookie_key].hashed_cookie_val = hashed_cookie_val;
		}
		else {
		    if (pvadcs[domain].cookies[cookie_key] == undefined) {
			pvadcs[domain].cookies[cookie_key] = {};
			pvadcs[domain].cookies[cookie_key].cookie_class = 'after';
			pvadcs[domain].cookies[cookie_key].is_part_of_account_cookieset = false;
			pvadcs[domain].cookies[cookie_key].secure = cookie_secure;
			pvadcs[domain].cookies[cookie_key].httpOnly = cookie_http_only;
		    }
		    else {
			pvadcs[domain].cookies[cookie_key].current_state = 'changed';
		    }

		    pvadcs[domain].cookies[cookie_key].hashed_cookie_val = hashed_cookie_val;
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
    var username_identifier = get_username_identifier("", true);
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

    var http_request_cb = cookie_investigating_tabs[tab_id].http_request_cb;
    var http_response_cb = cookie_investigating_tabs[tab_id].http_response_cb;

    chrome.webRequest.onBeforeSendHeaders.removeListener(http_request_cb);
    chrome.webRequest.onHeadersReceived.removeListener(http_response_cb);

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
// If bool_url_specific_cookies is not defined or is 'true', it will return all 'DURING' cookies.
// If bool_url_specific_cookies is 'false', it will return only cookies that will get sent
// when 'current_url' is requested by the browser.
function get_account_cookies(current_url, bool_url_specific_cookies) {
    var domain = get_domain(current_url.split("/")[2]);
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];
    var account_cookies = {};

    bool_url_specific_cookies = (bool_url_specific_cookies == undefined) ? false : bool_url_specific_cookies;

    for (c in cs.cookies) {
	if (cs.cookies[c].current_state == 'absent') {
	    // No point in testing for cookies that are not present in the 
	    // default cookie-store.
	    // (actually there is -- seems like if that cookie is generated later then
	    //  that creates problems in cookie investigation)
	    // continue;
	}
	if (cs.cookies[c].cookie_class == 'during' ||
	    cs.cookies[c].is_part_of_account_cookieset == true) {
	    if (bool_url_specific_cookies) {
		if (is_subdomain(c, current_url)) {
		    account_cookies[c] = {};
		    account_cookies[c].hashed_value = cs.cookies[c].hashed_cookie_val; 
		}
	    }
	    else {
		account_cookies[c] = {};
		account_cookies[c].hashed_value = cs.cookies[c].hashed_cookie_val; 
	    }
	}
    }

    return account_cookies;
}


// Returns cookies that are NOT suspected to be account cookies.
function get_non_account_cookies(domain) {
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];
    var non_account_cookies = {};

    for (c in cs.cookies) {
	if (cs.cookies[c].current_state == 'absent') {
	    // No point in testing for cookies that are not present in the 
	    // default cookie-store.
	    continue;
	}
	if (cs.cookies[c].cookie_class != 'during' &&
	    (cs.cookies[c].is_part_of_account_cookieset == false ||
	     cs.cookies[c].is_part_of_account_cookieset == undefined)) {
	    non_account_cookies[c] = {};
	    non_account_cookies[c].hashed_value = cs.cookies[c].hashed_cookie_val; 
	}
    }

    return non_account_cookies;
}


// Just like get_account_cookies() except you can also limit them to
// cookies present in cookie_names
function get_selective_account_cookies(current_url, cookie_names) {
    var domain = get_domain(current_url.split("/")[2]);
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];
    var account_cookies = {};

    for (var i = 0; i < cookie_names.length; i++) {
	for (c in cs.cookies) {
	    if (cs.cookies[c].cookie_class == 'during' &&
		c.split(":")[2] == cookie_names[i]) {
		account_cookies[c] = {};
		account_cookies[c].hashed_value = cs.cookies[c].hashed_cookie_val; 
		break;
	    }
	}
    }
    
    return account_cookies;
}


// Like get_account_cookies() but does not limit cookies to 'DURING' cookies.
function get_domain_cookies(current_url) {
    var domain = get_domain(current_url.split("/")[2]);
    var cs = pii_vault.aggregate_data.session_cookie_store[domain];
    var account_cookies = {};

    for (c in cs.cookies) {
	if (cs.cookies[c].current_state == 'absent') {
	    // No point in testing for cookies that are not present in the 
	    // default cookie-store.
	    continue;
	}

	account_cookies[c] = {};
	account_cookies[c].hashed_value = cs.cookies[c].hashed_cookie_val; 
    }

    return account_cookies;
}


function check_usernames_for_cookie_investigation(tab_id) {
    var pi_usernames = get_all_usernames();

    if (pi_usernames.length > 0) {
	var cit = cookie_investigating_tabs[tab_id];
	if (cit.get_page_load_success()) {
	    console.log("APPU DEBUG: Page properly loaded. Sending command to " + 
			"detect usernames to cookie investigating tab");
	}
	else {
	    console.log("APPU Error: Page load timeout. Sending command to detect " + 
			"usernames to cookie investigating tab anyway");
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
function process_last_epoch(tab_id, present_usernames, num_pwd_boxes) {
    var cit = cookie_investigating_tabs[tab_id];

    if (cit.pageload_timeout != undefined) {
	console.log("APPU DEBUG: Clearing reload-interval for: " + tab_id +
		    ", Interval-ID: " + cit.pageload_timeout);
	window.clearInterval(cit.pageload_timeout);
	cit.pageload_timeout = undefined;
    }

    cit.increment_page_reloads();

    var next_state = cit.web_request_fully_fetched(present_usernames, num_pwd_boxes);
    if (next_state != "st_terminate") {
	// Only send command to Cookie-Investigation-Tab after shadow_cookie_store for the
	// tab is properly populated. Hence, sending a callback function to 
	// shadow_cookie_store populating function.
	cit.populate_shadow_cookie_store((function(tab_id) {
		    return function() {
			var cit = cookie_investigating_tabs[tab_id];
			if (cit == undefined) {
			    // Probably some error occurred and tab is terminated
			    return;
			}

			console.log("APPU DEBUG: COOKIE INVESTIGATOR STATE(" + cit.get_state() + ")");

			// Increment the epoch-id, before refreshing the page.
			cit.increment_epoch_id();

			chrome.tabs.update(tab_id, {
				url: cit.url,
				    active: false,
				    highlighted: false,
				    });

			console.log("APPU DEBUG: Sent command to slave-tab for PAGE-REFRESH");

			cit.bool_state_in_progress = true;
			cit.num_pageload_timeouts = 0;
			cit.set_page_load_success(false);
			cit.content_script_started = false;

			var page_load_timeout_hndlrs = (function(tab_id) {
				var interval_hndlr_func = undefined;
				var tab_id = tab_id;
				
				function set_interval_hndlr_func(ihf) {
				    interval_hndlr_func = ihf;
				};
				
				function timeout_cb() {
				    var cit = cookie_investigating_tabs[tab_id];
				    if (cit == undefined) {
					// Probably some error occurred and tab is terminated
					console.log("APPU Error: Cookie investigating tab not defined " + 
						    "but interval function not cleared");
					window.clearInterval(interval_hndlr_func);
					return;
				    }
				    
				    if (cit.num_pageload_timeouts > 3) {
					if (cit.content_script_started ||
					    cit.get_state() == "st_start_with_no_cookies") {
					    console.log("APPU DEBUG: Page load timeout(>3), " + 
							"content script started, username detection test never worked");
					    if (cit.pageload_timeout != undefined) {
						console.log("APPU DEBUG: Clearing reload-interval for: " + tab_id
							    + ", Interval-ID: " + cit.pageload_timeout);
						window.clearInterval(cit.pageload_timeout);
						cit.pageload_timeout = undefined;
					    }
					    if (cit.get_state() == "st_start_with_no_cookies") {
						cit.set_page_load_success(true);
						process_last_epoch(tab_id, false, undefined);
					    }
					    else {
						process_last_epoch(tab_id, undefined, undefined);
					    }
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
					    cit.content_script_started) {
					    console.log("APPU DEBUG: Page load timeout, " + 
							"content script started, firing username detection test");
					    console.log("Here here: Calling check_usernames_for_cookie_investigation()");
					    check_usernames_for_cookie_investigation(tab_id);
					}
				    }
				    
				    cit.num_pageload_timeouts += 1;
				};
				
				return [set_interval_hndlr_func, 
					timeout_cb];
			    }(tab_id));

			var interval_func = window.setInterval(page_load_timeout_hndlrs[1], 20 * 1000);
			page_load_timeout_hndlrs[0](interval_func);

			cit.pageload_timeout = interval_func;

// 			console.log("APPU DEBUG: Setting reload-interval for: " + tab_id 
// 				    + ", Interval-ID: " + cit.pageload_timeout);
		    }
		})(tab_id));
    }
}


// Open a tab to check if a cookie is an account cookie
function open_cookie_slave_tab(url, 
			       http_request_cb,
			       http_response_cb,
			       update_tab_id, 
			       init_cookie_investigation,
			       open_new_window) {
    // Just some link so that appu content script runs on it.
    // I am purposely running some different site on this page 
    // because if I run the actual URL that I am investigating
    // cookie-store might get courrupted (epoch-ID is not set yet).
    var default_url = 'http://live.com';
    var my_domain = get_domain(url.split("/")[2]);
    if (my_domain == "live.com") {
	default_url = 'http://google.com';
    }
   
    create_properties = { 
	url: default_url, 
	active: false 
    };

    //Create a new tab.
    chrome.tabs.create(create_properties, 
		       (function(url, 
				 http_request_cb,
				 http_response_cb,
				 update_tab_id, 
				 init_cookie_investigation,
				 open_new_window) {
			   return function slave_tab_callback(tab) {
			       var filter = {};

			       cookie_investigating_tabs[tab.id] = {};

			       if (http_request_cb) {
				   chrome.webRequest.onBeforeSendHeaders.addListener(http_request_cb, 
										     {
											 "tabId": tab.id,
											     "urls": ["<all_urls>"]
											     },
										     ["blocking", "requestHeaders"]);
				   cookie_investigating_tabs[tab.id].http_request_cb = http_request_cb;

// 				   chrome.webRequest.onSendHeaders.addListener(test_content_length_reader, 
// 									       {
// 										   "tabId": tab.id,
// 										       "urls": ["<all_urls>"]
// 										       },
// 									       ["requestHeaders"]);
			       }

			       if (http_response_cb) {
				   chrome.webRequest.onHeadersReceived.addListener(http_response_cb, {
					   "tabId": tab.id,
					       "urls": ["<all_urls>"]
					       },
				       ["blocking", "responseHeaders"]);
				   cookie_investigating_tabs[tab.id].http_response_cb = http_response_cb;
			       }

// 			       chrome.webRequest.onBeforeRedirect.addListener(print_redirect_information, {
// 				       "tabId": tab.id,
// 					   "urls": ["<all_urls>"]
// 					   },
// 				   ["responseHeaders"]);


			       update_tab_id(tab.id);

			       console.log("------------");
			       console.log("APPU DEBUG: Starting cookie investigation for: " + url);
			       console.log("APPU DEBUG: Created a new tab to investigate cookies: " + tab.id);

			       init_cookie_investigation();

			       console.log("APPU DEBUG: COOKIE INVESTIGATOR STATE(" + 
					   cookie_investigating_tabs[tab.id].get_state() + ")");

			       // cookie_investigating_tabs[tab.id].print_cookie_array();
			       if (open_new_window && open_new_window == true) {
				   chrome.windows.create({
					   tabId: tab.id,
					       width: 400,
					       height: 600,
					       });
			       }
			   }
		       })(url, 
			  http_request_cb,
			  http_response_cb,
			  update_tab_id, 
			  init_cookie_investigation,
			  open_new_window));
}

// Returns a cookie-investigator that maintains all the state and drives the
// cookie investigation.
// Perhaps this is better done as a class, but for now, its a closure.
function cookie_investigator(account_cookies, 
			     url, 
			     config_cookiesets, 
			     config_forceshut,
			     config_skip_initial_states,
			     config_start_params) {
    var my_url = url;
    var my_domain = get_domain(my_url.split("/")[2]);

    // After blocking during-cookies in state "st_suspected_cookies_block_test", if there is pwd box
    // then set following bool_pwd_box_present_st_suspected_cookies_block_test to true.
    var bool_pwd_box_should_be_present = undefined;

    var bool_is_cookie_testing_done = false;

    var is_st_start_with_no_cookies_done = false;
    var is_suspected_account_cookies_pass_test_done = false;
    var is_suspected_account_cookies_block_test_done = false;

    var tot_page_reloads = 0;
    var tot_page_reloads_overall = 0;
    var tot_page_reloads_since_last_lo_change = 0;

    // Sets it when Epoch-ID 1 executes to give a rough idea of
    // page load time.
    var total_verification_page_loads = 0;
    var page_load_time = 0;

    var ci_start_time = new Date();
    var tot_time_taken = 0;
    var tot_attempts = 1;

    var tot_bytes_sent = 0;
    var tot_bytes_recvd = 0;

    var bytes_sent_this_attempt = 0;
    var bytes_recvd_this_attempt = 0;

    console.log("APPU DEBUG: Starting cookie investigation for(" + my_domain + "): " + ci_start_time);

    // This measures time spent in just generating cookiesets.
    // This is done by resetting everytime cookiesets are added to
    // the equation.
    // This time can be used to see if we can export cookiesets
    // calculation to cloud.
    var cookiesets_generation_start_time = new Date();
    var tot_cookiesets_generation_time = 0;

    // Forceful shutting of cookie testing tab after time (in minutes)
    var limit_forceful_shutdown = 5;

    if (config_forceshut != undefined) {
	limit_forceful_shutdown = config_forceshut;
    }

    var tot_cookiesets_tested_overall = 0;
    var tot_gub_cookiesets_tested_overall = 0;
    var tot_cookiesets_tested = 0;
    var tot_cookiesets_tested_this_round = 0;

    // We cannot confidently say anything about these perhaps because
    // page was not loaded properly as well as no usernames were detected.
    var tot_inconclusive_cookiesets_overall = 0;

    var suspected_account_cookies_array = Object.keys(account_cookies);
        
    var tot_cookies = suspected_account_cookies_array.length;
    var tot_execution = 0;
    var my_tab_id = undefined;

    var bool_are_all_account_cookies_in_default_store = undefined;
    var bool_are_account_cookies_in_during_cookies = undefined;
    var bool_are_account_cookies_not_in_nonduring_cookies = undefined;

    var my_domain = get_domain(url.split("/")[2]);
    var orig_cookie_store = {};

    // Number of cookies to be dropped in each cookiesets-test BIG epoch
    // This variable goes from 1 to 'N-1' where 'N' are suspected 
    // account cookies.
    var num_cookies_drop_for_round = 1;

    // Number of cookies to be passed in each GUB cookiesets-test
    // This variable goes from 1 to 'N-1' where 'N' are suspected 
    // account cookies.
    var num_cookies_pass_for_round = 1;
    
    // Various states possible:
    // "st_testing"                                : Just simple testing state. You can pass your own
    //                                               cookieset combinations to it and it will test them
    //                                               and print the results.
    //
    // "st_cookie_test_start"                      : Loading some default webpage so that Appu content-script runs and
    //                                               accepts commands.
    //
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
    //
    // "st_start_with_no_cookies"                  : Reload the site page. Start with empty shadow-cookie-store.
    //                                               After reloading site page, test if usernames are found. 
    //                                               If no usernames are found, that is the expected behavior.
    //                                               Otherwise, critical error in Appu code since it is letting
    //                                               default_cookie_store cookies to pass. STOP TESTING.
    //
    // "st_suspected_cookies_pass_test"               : Reload site page. Start with shadow_cookie_store that is 
    //                                               populated with only 'DURING' cookies as detected by Appu.
    //                                               Test the page for usernames after page load.
    //                                               If usernames found, user is logged-in (EXPECTED)
    //                                               Otherwise it means we have not detected 'DURING' 
    //                                               cookies properly. STOP TESTING
    //
    // "st_suspected_cookies_block_test"              : Reload site page. Start with shadow_cookie_store that is 
    //                                               populated without any 'DURING' cookies as detected by Appu.
    //                                               Test the page for usernames after page load.
    //                                               If no usernames found, user is logged-out (EXPECTED)
    //                                               Otherwise, it means we have not detected 'DURING' 
    //                                               cookies properly. STOP TESTING.
    //
    //  Both 'st_suspected_cookies_pass_test' & 'st_suspected_cookies_block_test' will confirm that actual "ACCOUNT-COOKIES"
    //  are subset of 'DURING' cookies *ONLY*. This is expected, otherwise we are detecting 'DURING' cookies 
    //  incorrectly.
    //
    // "st_gub_cookiesets_block_test"              : For all the untested cookiesets at the moment, calculate 
    //                                               the set of cookiesets that are greatest upper bounds(GUB). 
    //                                               That is, all the existing untested cookiesets are subsets of
    //                                               exactly one of the GUBs. Once all the GUBs are found, 
    //                                               systematically test each by blocking the cookies. 
    //                                               If user is found to be logged-in even after
    //                                               blocking a particular GUB, then we are saved from the 
    //                                               effort of testing all the subsets of that GUB since user 
    //                                               will still be logged-in for those subsets. If we find that 
    //                                               the user is logged-in even after blocking each
    //                                               GUB then we are done. No need to continue testing any more 
    //                                               and we have exhaustively verified all the cookiesets.
    //                                               However, if we find that the user is logged-out for at least 
    //                                               one GUB then we need to find subset of that GUB to find 
    //                                               a stricter cookiesets subset.
    //                                               Obviously, a very first GUB is all '1's that is block all 
    //                                               cookies and 
    //                                               it is tested in the "state st_suspected_cookies_block_test".
    //                                               Also, for most of the web applications which have 
    //                                               only single-cookies as account cookies, the number 
    //                                               of GUBs would be equal to one at the end of
    //                                               testing all single cookies and most likely we will find 
    //                                               that blocking that single GUB would not affect user 
    //                                               session and our testing will stop there.
    //                                               This test is conducted after each cookieset block test epoch.
    //
    // "st_cookiesets_block_nonduring_and_disabled": Cookiesets are created by systematically omitting some of the
    // "st_cookiesets_block_disabled"              : 'DURING' cookies. So, if we have detected 'N' 'DURING' cookies,
    //                                               then there are '2^N - 1' cookie sets. Here '1' is subtracted for
    //                                               for all cookies 
    //                                               (already tested in "st_suspected_cookies_block_test").
    //                                               Reload site page. Start with shadow_cookie_store that is 
    //                                               populated with default_cookie_store except cookies 
    //                                               from cookieset 
    //                                               currently getting tested. To avoid explosion in cookiesets to be
    //                                               tested, do max-random-attempts.
    //                                               Test the page for usernames after page load.
    //                                               If no usernames found, user is logged-out and mark that 
    //                                               cookieset as 'ACCOUNT-COOKIE'.
    //                                               Otherwise, it means that that cookieset is not 
    //                                               'ACCOUNT-COOKIE' OR
    //                                               other cookies are sufficient to regenerate this cookie.
    //                                               This test is done only for sites like 'Google' and might not be 
    //                                               performed always.
    //
    // "st_expand_suspected_account_cookies"       : Add more cookies to 'DURING' set and see if user is logged-in.
    //                                               Remember that their class is not actually changed to 'during'.
    //
    // "st_terminate"                              : Everything is done or error occurred. So just terminate.

    var last_non_verification_state = "";
    // At the start, to activate Appu content script, we need to load some webpage successfully
    // This state does that.
    var my_state = "st_cookie_test_start";
    var bool_switch_to_testing = false;

    // This stores all the cookies for a domain at the start.
    // After that, any HTTP GET done in that tab sends cookies.
    // as per this cookie store.
    // All HTTP Responses with 'set-cookie' will operate on this
    // store as well.
    // At the start of each new WebRequest (Not HTTP Get request), it
    // will be repopulated from the basic cookie-store.
    var shadow_cookie_store = {};
    var original_shadow_cookie_store = {};

    // Sets of cookies for which user's session is logged-out if
    // they are absent. This is a strict set. That is each set
    // is not reducible further to a subset.
    var verified_strict_account_cookiesets_array = [];
    var verified_strict_account_decimal_cookiesets = [];

    var verified_strict_login_cookiesets_array = [];
    var enabled_cookies_array = [];

    var verified_strict_non_account_cookiesets_array = [];
    var verified_strict_non_account_decimal_cookiesets = [];

    // Super-Sets of cookies for which user's session is logged-out if
    // they are absent
    var verified_account_super_decimal_cookiesets = [];
    var verified_account_super_cookiesets_array = [];
    var num_account_super_cookiesets_found = 0;

    // Super-Sets of cookies for which user's session is logged-in if
    // they are absent
    var verified_non_account_super_decimal_cookiesets = [];
    var verified_non_account_super_cookiesets_array = [];
    var num_non_account_super_cookiesets_found = 0;

    // Set of cookies that are necessary to access certain parts
    // of a website but not necessary to make the user-session invalid.
    // For e.g. cookies to access Facebook's credit card information.
    var verified_restricted_cookiesets_array = [];

    var current_cookiesets_test_attempts = 0;

    var binary_cookiesets = [];
    var decimal_cookiesets = [];
    
    var curr_binary_cs = undefined;
    var curr_decimal_cs = undefined;

    var curr_gub_binary_cs = undefined;
    var curr_gub_decimal_cs = undefined;

    var current_cookiesets_test_index = -1;
    var disabled_cookies = [];
    
    var has_error_occurred = false;
    var shut_tab_forcefully = undefined;

    // Following is to correlate epoch-IDs with request-IDs.
    // This way late responses would not overwrite current Epoch's
    // shadow cookie table.
    // (This was happening a lot in case of Google Calendar giving me wrong
    //  results)
    var epoch_id = 0;
    var req_epch_table = {};

    // To store results until verification_epoch gives good to go
    var pending_am_i_logged_in = undefined;
    var pending_disabled_cookies = undefined;
    var pending_enabled_cookies_array = undefined;
    var pending_curr_decimal_cs = undefined;
    var pending_bool_pwd_box_present = undefined;

    // To judge whether page load timeouts are due to network
    // problems or abset cookies
    var num_verification_page_load_attempts = 0;
    var num_verification_page_load_success = 0;
    var page_load_success = false;

    // For expand suspected account cookies state.
    var curr_expand_state_binary_cs = undefined;
    var curr_expand_state_decimal_cs = undefined;
    var expand_state_disabled_cookies = [];
    var expand_state_num_cookies_drop_for_round = 1;
    var verified_strict_non_during_account_decimal_cookiesets = [];
    var verified_strict_non_during_non_account_decimal_cookiesets = [];
    var verified_strict_non_during_non_account_cookiesets_array = [];
    var verified_non_during_non_account_super_decimal_cookiesets = [];
    var bool_expand_state_initialized = false;

    var non_during_cookies = get_non_account_cookies(my_domain);
    var non_during_suspected_account_cookies_array = Object.keys(non_during_cookies);
    var tot_non_during_cookies = non_during_suspected_account_cookies_array.length;

    // Total number of expand state cookiesets tested.
    var tot_expand_state_cookiesets_tested_overall = 0;
    // Total number of times expand-state entered.
    var tot_expand_state_entered = 0;

    var top_three_elements_with_usernames = undefined;

    // For counting efficiency
    var skipped_sets = {
	num_subset_in_account_cookiesets : 0,
	num_superset_in_non_account_cookiesets : 0,
	num_superset_in_non_account_super_cookiesets : 0,
	num_gub_subset_in_account_cookiesets : 0,
	num_gub_superset_in_non_account_cookiesets : 0,
	num_gub_already_tested_in_account_super_cookiesets : 0,
	num_gub_subset_in_account_super_cookiesets : 0,
	tot_page_reloads_naive : 0,
    };

    var verification_screen_layout = {};
    var no_cookies_screen_layout = {};
    var during_blocked_screen_layout = {};
    var during_passed_screen_layout = {};

    if (config_start_params != undefined) {
	if (config_start_params.starting_state == "st_testing") {
	    if (config_start_params.cookies_array != undefined &&
		config_start_params.account_cookies_array != undefined) {
		bool_switch_to_testing = true;
		var cookies_pass_array = config_start_params.cookies_array;
		
		suspected_account_cookies_array = config_start_params.account_cookies_array;
		tot_cookies = suspected_account_cookies_array.length;
		
		for (var i = 0; i < cookies_pass_array.length; i++) {
		    var rc = convert_cookie_array_to_binary_cookieset(cookies_pass_array[i], 
								      suspected_account_cookies_array, 
								      true);
		    binary_cookiesets.push(rc.binary_cookieset);
		    decimal_cookiesets.push(rc.decimal_cookieset);
		}
		
		console.log("APPU DEBUG: Number of generated cookie-sets: " + binary_cookiesets.length);
	    }
	    else {
		console.log("APPU Error: cookie_investigator(): In correct arguments for starting 'st_testing'");
		return -1;
	    }
	}
	else if (config_start_params.pending_ci_state != undefined) {
	    var url_wo_paramters = my_url.replace(/\?.*/,'');
	    var pcs = config_start_params.pending_ci_state["Cookie Investigation State:" + url_wo_paramters];
	    
	    if (pcs != undefined) {
		if (pcs.vsaca != undefined) {
		    verified_strict_account_cookiesets_array = pcs.vsaca;
		    generate_vsadc();
		}
		
		if (pcs.vsnaca != undefined) {
		    verified_strict_non_account_cookiesets_array = pcs.vsnaca;
		    generate_vsnadc();
		}
		
		if (pcs.vasca != undefined) {
		    verified_account_super_cookiesets_array = pcs.vasca;
		    generate_vasdc();
		}
		
		if (pcs.vnasca != undefined) {
		    verified_non_account_super_cookiesets_array = pcs.vnasca;
		    generate_vnasdc();
		}
		
		if (pcs.vsndnadca != undefined) {
		    verified_strict_non_during_non_account_cookiesets_array = pcs.vsndnadca;
		    generate_vsndnadc();
		}

		if (pcs.tot_time_taken != undefined) {
		    tot_time_taken = pcs.tot_time_taken;
		}

		if (pcs.tot_bytes_sent != undefined) {
		    tot_bytes_sent = pcs.tot_bytes_sent;
		}

		if (pcs.tot_bytes_recvd != undefined) {
		    tot_bytes_recvd = pcs.tot_bytes_recvd;
		}

		if (pcs.tot_cookiesets_generation_time != undefined) {
		    tot_cookiesets_generation_time = pcs.tot_cookiesets_generation_time;
		}

		if (pcs.tot_attempts != undefined) {
		    tot_attempts = pcs.tot_attempts;
		}

		if (pcs.tot_page_reloads_overall != undefined) {
		    tot_page_reloads_overall = pcs.tot_page_reloads_overall;
		}

		if (pcs.tot_page_reloads_naive != undefined) {
		    skipped_sets.tot_page_reloads_naive = pcs.tot_page_reloads_naive;
		}

		if (pcs.tot_page_reloads_since_last_lo_change != undefined) {
		    tot_page_reloads_since_last_lo_change = pcs.tot_page_reloads_since_last_lo_change;
		}

		if (pcs.tot_cookiesets_tested_overall != undefined) {
		    tot_cookiesets_tested_overall = pcs.tot_cookiesets_tested_overall;
		}

		if (pcs.tot_gub_cookiesets_tested_overall != undefined) {
		    tot_gub_cookiesets_tested_overall = pcs.tot_gub_cookiesets_tested_overall;
		}

		if (pcs.tot_expand_state_cookiesets_tested_overall != undefined) {
		    tot_expand_state_cookiesets_tested_overall = pcs.tot_expand_state_cookiesets_tested_overall;
		}

		if (pcs.tot_expand_state_entered != undefined) {
		    tot_expand_state_entered = pcs.tot_expand_state_entered;
		}

		if (pcs.tot_inconclusive_cookiesets_overall != undefined) {
		    tot_inconclusive_cookiesets_overall = pcs.tot_inconclusive_cookiesets_overall;
		}

		if (pcs.skipped_sets != undefined) {
		    skipped_sets = pcs.skipped_sets;
		}
	    }
	}
	else {
	    console.log("APPU DEBUG: No pending start state found");
	}
    }

    console.log("APPU DEBUG: Suspected account cookies: " + suspected_account_cookies_array.length);
    for (var i = 0; i < suspected_account_cookies_array.length; i++) {
	console.log(suspected_account_cookies_array[i]);
    }

    function cookie_investigator_closed() {
	report_fatal_error("tab-closed-externally");		
    }

    // Generate "verified_strict_account_decimal_cookiesets" from
    // "verified_strict_account_cookiesets_array"
    // need to give "suspected_account_cookies_array"
    function generate_vsadc() {
	verified_strict_account_decimal_cookiesets = [];

	for (var i = 0; i < verified_strict_account_cookiesets_array.length; i++) {
	    rc = add_to_set(verified_strict_account_cookiesets_array[i], 
			    undefined, 
			    verified_strict_account_decimal_cookiesets, 
			    suspected_account_cookies_array,
			    undefined);
	}
    }

    // Generate "verified_strict_non_account_decimal_cookiesets" from
    // "verified_strict_non_account_cookiesets_array"
    // need to give "suspected_account_cookies_array"
    function generate_vsnadc() {
	verified_strict_non_account_decimal_cookiesets = [];

	for (var i = 0; i < verified_strict_non_account_cookiesets_array.length; i++) {
	    rc = add_to_set(verified_strict_non_account_cookiesets_array[i], 
			    undefined, 
			    verified_strict_non_account_decimal_cookiesets, 
			    suspected_account_cookies_array,
			    undefined);
	}
    }

    // Generate "verified_account_super_decimal_cookiesets" from
    // "verified_account_super_cookiesets_array"
    // need to give "suspected_account_cookies_array"
    function generate_vasdc() {
	verified_account_super_decimal_cookiesets = [];

	for (var i = 0; i < verified_account_super_cookiesets_array.length; i++) {
	    rc = add_to_set(verified_account_super_cookiesets_array[i], 
			    undefined, 
			    verified_account_super_decimal_cookiesets, 
			    suspected_account_cookies_array,
			    undefined);
	}
    }

    // Generate "verified_non_account_super_decimal_cookiesets" from
    // "verified_non_account_super_cookiesets_array"
    // need to give "suspected_account_cookies_array"
    function generate_vnasdc() {
	verified_non_account_super_decimal_cookiesets = [];

	for (var i = 0; i < verified_non_account_super_cookiesets_array.length; i++) {
	    rc = add_to_set(verified_non_account_super_cookiesets_array[i], 
			    undefined, 
			    verified_non_account_super_decimal_cookiesets, 
			    suspected_account_cookies_array,
			    undefined);
	}
    }

    // Generate "verified_strict_non_during_non_account_decimal_cookiesets" 
    // from "verified_strict_non_during_non_account_cookiesets_array"
    // need to also give all "non_during_suspected_account_cookies_array"
    function generate_vsndnadc() {
	verified_strict_non_during_non_account_decimal_cookiesets = [];

	for (var i = 0; i < verified_strict_non_during_non_account_cookiesets_array.length; i++) {
	    rc = add_to_set(verified_strict_non_during_non_account_cookiesets_array[i], 
			    undefined, 
			    verified_strict_non_during_non_account_decimal_cookiesets, 
			    non_during_suspected_account_cookies_array,
			    undefined);
	}
    }

    function store_intermediate_state() { 
	var tt = tot_time_taken + ((new Date()).getTime() - ci_start_time.getTime())/1000;
	var tcgt = tot_cookiesets_generation_time + 
	    (((new Date()).getTime() - cookiesets_generation_start_time.getTime())/1000);
	var tbs = tot_bytes_sent + bytes_sent_this_attempt;
	var tbr = tot_bytes_recvd + bytes_recvd_this_attempt;

	offload_ci_state(my_url, {
		"skipped_sets" : skipped_sets,
		"tot_time_taken" : tt,
		    "tot_bytes_sent" : tbs,
		    "tot_bytes_recvd" : tbr,
		    "tot_cookiesets_generation_time" : tot_cookiesets_generation_time,
		    "tot_cookiesets_tested_overall" : tot_cookiesets_tested_overall,
		    "tot_gub_cookiesets_tested_overall" : tot_gub_cookiesets_tested_overall,
		    "tot_expand_state_cookiesets_tested_overall" : tot_expand_state_cookiesets_tested_overall,
		    "tot_expand_state_entered" : tot_expand_state_entered,
		    "tot_inconclusive_cookiesets_overall" : tot_inconclusive_cookiesets_overall,
		    "tot_page_reloads_overall" : tot_page_reloads_overall,
		    "tot_page_reloads_naive" : skipped_sets.tot_page_reloads_naive,
		    "tot_page_reloads_since_last_lo_change" : tot_page_reloads_since_last_lo_change,
		    "tot_attempts" : (tot_attempts+1),
		    "vsaca" : verified_strict_account_cookiesets_array,
		    "vsnaca" : verified_strict_non_account_cookiesets_array,
		    "vasca" : verified_account_super_cookiesets_array,
		    "vnasca" : verified_non_account_super_cookiesets_array,
		    "vsndnadca" : verified_strict_non_during_non_account_cookiesets_array
		    });
    }
	
    function reset_to_start_state(acct_cookies) {
	my_state = "st_verification_epoch";

	for (var i = 0; i < acct_cookies.length; i++) {
	    suspected_account_cookies_array.push(acct_cookies[i]);
	    tot_cookies += 1;
	}

	is_st_start_with_no_cookies_done = false;
	is_suspected_account_cookies_pass_test_done = false;
	is_suspected_account_cookies_block_test_done = false;
	
	num_cookies_drop_for_round = 1;
	
	bool_are_all_account_cookies_in_default_store = undefined;
	bool_are_account_cookies_in_during_cookies = undefined;
	bool_are_account_cookies_not_in_nonduring_cookies = undefined;

	last_non_verification_state = "st_cookie_test_start";

	// Modify "verified_strict_account_decimal_cookiesets" to accomodate new cookies 
	generate_vsadc();
	generate_vsnadc();
	// Modify "verified_account_super_decimal_cookiesets" to accomodate inclusion of
        // new cookies.
	generate_vasdc();
	// Modify "verified_non_account_super_decimal_cookiesets" to accomodate inclusion
        // of new cookies.
	generate_vnasdc();
	generate_vsndnadc();
	
	binary_cookiesets = [];
	decimal_cookiesets = [];
	
	// epoch_id = 0;
	// req_epch_table = {};

	// Reseting the pending variables for verification_epoch
	pending_am_i_logged_in = undefined;
	pending_disabled_cookies = undefined;
	pending_enabled_cookies_array = undefined;
	pending_curr_decimal_cs = undefined;
	pending_bool_pwd_box_present = undefined;

    // Resetting expand cookies state variables.
	curr_expand_state_binary_cs = undefined;
	curr_expand_state_decimal_cs = undefined;
	expand_state_disabled_cookies = [];
	expand_state_num_cookies_drop_for_round = 1;

	bool_expand_state_initialized = false;
	// tot_expand_state_cookiesets_tested_overall = 0;
	store_intermediate_state();
    }

    
    function generate_random_cookieset_index(tot_cookiesets) {
	return (Math.ceil((Math.random() * tot_cookiesets * 100)) % tot_cookiesets);
    }


    function print_cookie_investigation_state() {
	console.log("APPU DEBUG: COOKIE INVESTIGATION STATUS: " + my_state);
    }
    

    function increment_epoch_id() {
	epoch_id += 1;
	console.log("APPU DEBUG: Incremented EPOCH-ID: " + epoch_id);
    }

    function get_epoch_id() {
	return epoch_id;
    }

    function set_page_load_success(bool_page_load_success) {
	page_load_success = bool_page_load_success;
    }

    function get_page_load_success() {
	return page_load_success;
    }


    function get_jaccard_index(sl1, sl2) {
	var elem1 = Object.keys(sl1);
	var elem2 = Object.keys(sl2);
	var all_elements = elem1.concat(elem2);
	var m11 = 0, m01 = 0, m10 = 0;
	
	for (var i = 0; i < all_elements.length; i++) {
	    var e = all_elements[i]; 
	    if (e in sl1 &&
		e in sl2) {
		var min = (sl1[e] > sl2[e]) ? sl2[e]: sl1[e];
		m11 += min;
	    }
	    else if (e in sl1) {
		m10 += sl1[e];
	    }
	    else if (e in sl2) {
		m01 += sl2[e];
	    }
	}
	
	console.log("APPU DEBUG: m11: "+ m11 +",m01: "+ m01 +", m10: "+ m10);
	return (m11/(m11 + m01 + m10));
    }
    
    function compare_screen_layout(sl) {
	if (my_state == "st_verification_epoch" &&
	    Object.keys(verification_screen_layout).length == 0) {
	    console.log("APPU DEBUG: Setting verification screen layout, size: " + Object.keys(sl).length);
	    verification_screen_layout = sl;
	}
	else if (my_state == "st_start_with_no_cookies" &&
		 Object.keys(no_cookies_screen_layout).length == 0) {
	    console.log("APPU DEBUG: Setting no cookies screen layout, size: " + Object.keys(sl).length);
	    no_cookies_screen_layout = sl;
	}
	else if (my_state == "st_suspected_cookies_block_test" &&
		 Object.keys(during_blocked_screen_layout).length == 0) {
	    console.log("APPU DEBUG: Setting during blocked screen layout, size: " + Object.keys(sl).length);
	    during_blocked_screen_layout = sl;
	}
	else if (my_state == "st_suspected_cookies_pass_test" &&
		 Object.keys(during_passed_screen_layout).length == 0) {
	    console.log("APPU DEBUG: Setting during passed screen layout, size: " + Object.keys(sl).length);
	    during_passed_screen_layout = sl;
	}

	var ji = undefined;
	ji = get_jaccard_index(verification_screen_layout, sl);
	console.log("APPU DEBUG: Jaccard's index(verification_screen_layout): " + ji);
	
	ji = get_jaccard_index(no_cookies_screen_layout, sl);
	console.log("APPU DEBUG: Jaccard's index(no_cookies_screen_layout): " + ji);
	
	ji = get_jaccard_index(during_blocked_screen_layout, sl);
	console.log("APPU DEBUG: Jaccard's index(during_blocked_screen_layout): " + ji);
	
	ji = get_jaccard_index(during_passed_screen_layout, sl);
	console.log("APPU DEBUG: Jaccard's index(during_passed_screen_layout): " + ji);
    }

    // Keeping a moving average of page-load-times for successful verification
    // epochs.
    function set_page_load_time(plt) {
	var t = total_verification_page_loads * page_load_time;
	total_verification_page_loads += 1;
	page_load_time = (t + plt)/total_verification_page_loads;
	console.log("APPU DEBUG: Current average page-load-time: " + 
		    page_load_time + " ms (total verification page loads:" + 
		    total_verification_page_loads + ")");
    }
    
    function get_page_load_time() {
	return page_load_time;
    }


    function is_user_logged_in(present_usernames) {
	if (top_three_elements_with_usernames != undefined) {
	    var am_i_logged_in = detect_login_status(present_usernames);
	    return am_i_logged_in;
	}
	
	return true;
    }


    function init_cookie_investigation() {
	var cit = cookie_investigating_tabs[my_tab_id];
	cit.url = my_url;
	cit.domain = my_domain;
	cit.num_pageload_timeouts = 0;
	cit.content_script_started = false;

	cit.bool_state_in_progress = false;

	cit.reload_interval = undefined;

	cit.is_user_logged_in = is_user_logged_in;
	cit.get_page_load_time = get_page_load_time;
	cit.set_page_load_time = set_page_load_time;
	cit.tab_closed_cb = cookie_investigator_closed;
	cit.set_page_load_success = set_page_load_success;
	cit.get_page_load_success = get_page_load_success;
	cit.get_epoch_id = get_epoch_id;

	cit.increment_epoch_id = increment_epoch_id;
	cit.increment_page_reloads = increment_page_reloads;
	cit.increment_sent_bytes = increment_sent_bytes;
	cit.increment_recvd_bytes = increment_recvd_bytes;

	cit.compare_screen_layout = compare_screen_layout;	    
	cit.web_request_fully_fetched = web_request_fully_fetched;
	cit.print_cookie_investigation_state = print_cookie_investigation_state;
	cit.get_state = get_state; 
	cit.populate_shadow_cookie_store = populate_shadow_cookie_store; 
	cit.report_fatal_error = report_fatal_error; 
	cit.get_shadow_cookie_store = get_shadow_cookie_store;
	cit.print_cookie_array = print_cookie_array;
    }


    function increment_sent_bytes(bytes) {
	if (bytes) {
	    bytes_sent_this_attempt += bytes;
	}
    }


    function increment_recvd_bytes(bytes) {
	if (bytes) {
	    bytes_recvd_this_attempt += bytes;
	}
    }


    function increment_page_reloads() {
	tot_page_reloads += 1;
	tot_page_reloads_overall += 1;
	skipped_sets.tot_page_reloads_naive += 1;
	tot_page_reloads_since_last_lo_change += 1;
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
    

    function get_cookie_store_snapshot(cookie_store, cb_shadow_restored) {
	var cb_cookies = (function(cookie_store, cb_shadow_restored) {
		return function(all_cookies) {
		    var cs = pii_vault.aggregate_data.session_cookie_store[my_domain];
		    
		    if (my_state == "st_start_with_no_cookies" ||
			my_state == "st_suspected_cookies_pass_test" ||
			my_state == "st_suspected_cookies_block_test") {
			disabled_cookies = [];
		    }

		    enabled_cookies_array = [];
		    for (var i = 0; i < all_cookies.length; i++) {
			var cookie_name = all_cookies[i].name;
			var cookie_domain = all_cookies[i].domain;
			var cookie_path = all_cookies[i].path;
			var cookie_protocol = (all_cookies[i].secure) ? "https://" : "http://";
			var cookie_key = cookie_protocol + cookie_domain + cookie_path + ":" + cookie_name;

			if (!(cookie_key in cs.cookies)) {
			    // If the cookie was not known in session cookie store then ignore it.
			    continue;
			}

			if (my_state == "st_suspected_cookies_pass_test") {
			    if (suspected_account_cookies_array.indexOf(cookie_key) == -1) {
				// We only want 'DURING' cookies in this epoch
				// (suspected_account_cookies_array is populated with 'DURING' cookies in usual epoch)
				disabled_cookies.push(cookie_key);
				continue;
			    }
			    if (cs.cookies[cookie_key].cookie_class != "during" &&
				cs.cookies[cookie_key].is_part_of_account_cookieset != true) {
				disabled_cookies.push(cookie_key);
				continue;
			    }
			}
			else if (my_state == "st_suspected_cookies_block_test") {
			    if (suspected_account_cookies_array.indexOf(cookie_key) != -1) {
				// We only want non-'DURING' cookies in this epoch
				// (suspected_account_cookies_array is populated with 'DURING' cookies in usual epoch)
				disabled_cookies.push(cookie_key);
				continue;
			    }
			}
			else if (my_state == 'st_testing') {
			    // If the cookie is in the set of disabled-cookie-sets in this 
			    // iteration, then ignore it.
			    if (disabled_cookies.indexOf(cookie_key) != -1) {
				continue;
			    }
			}
			else if (my_state == 'st_cookiesets_block_nonduring_and_disabled') {
			    // If the cookie is in the set of disabled-cookie-sets in this 
			    // iteration, then ignore it.
			    if (disabled_cookies.indexOf(cookie_key) != -1) {
				continue;
			    }
			    // If cookie class is not 'during' and it is not part of 
			    // account_cookieset then ignore it.
			    if (cs.cookies[cookie_key].cookie_class != "during" &&
				cs.cookies[cookie_key].is_part_of_account_cookieset != true) {
				//disabled_cookies.push(cookie_key);
				continue;
			    }
			}
			else if (my_state == 'st_cookiesets_block_disabled') {
			    // If the cookie is in the set of disabled-cookie-sets in this 
			    // iteration, then ignore it.
			    if (disabled_cookies.indexOf(cookie_key) != -1) {
				continue;
			    }
			}
			else if (my_state == 'st_gub_cookiesets_block_test') {
			    // If the cookie is in the set of disabled-cookie-sets in this 
			    // iteration, then ignore it.
			    if (disabled_cookies.indexOf(cookie_key) != -1) {
				continue;
			    }
			    if (cs.cookies[cookie_key].cookie_class != "during" &&
				cs.cookies[cookie_key].is_part_of_account_cookieset != true) {
				continue;
			    }
			}
			else if (my_state == 'st_expand_suspected_account_cookies') {
			    // If the cookie is in the set of disabled-cookie-sets in this 
			    // iteration, then ignore it.
			    if (disabled_cookies.indexOf(cookie_key) != -1) {
				continue;
			    }
			    if (expand_state_disabled_cookies.indexOf(cookie_key) != -1) {
				continue;
			    }
			}
			
			enabled_cookies_array.push(cookie_key);
			cookie_store[cookie_key] = all_cookies[i];
		    }
		    console.log("APPU DEBUG: Populated shadow_cookie_store length: " + 
				Object.keys(cookie_store).length + 
				", On-disk cookie-store length: " + all_cookies.length);

		    //  console.log("Here here: shadow_cookie_store: " + 
		    // 		     JSON.stringify(Object.keys(cookie_store)));

		    if (my_state != "st_verification_epoch" &&
			my_state != "st_suspected_cookies_block_test" &&
			my_state != "st_expand_suspected_account_cookies" &&
			my_state != "st_gub_cookiesets_block_test") {
			console.log("APPU DEBUG: Disabled cookies in this epoch: " + 
				    JSON.stringify(disabled_cookies));
		    }
		    else if (my_state == "st_expand_suspected_account_cookies") {
			console.log("APPU DEBUG: Main disabled cookies that caused to enter 'expand' state: " + 
				    JSON.stringify(disabled_cookies));
			console.log("APPU DEBUG: Disabled cookies getting tested: " + 
				    JSON.stringify(expand_state_disabled_cookies));
		    }
		    else if (my_state == "st_gub_cookiesets_block_test") {
			console.log("APPU DEBUG: Enabled cookies in this epoch: " + 
				    JSON.stringify(enabled_cookies_array));
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

	console.log("APPU DEBUG: Number of new cookies added to shadow-cookie-store: " + new_cookies.length);
	for (var i = 0; i < new_cookies.length; i++) {
	    console.log(i + ". " + new_cookies[i]);
	}
    }


    function populate_shadow_cookie_store(cb_shadow_restored) {
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
    
    function commit_account_cookies() {
	verified_strict_account_cookiesets_array.push(pending_disabled_cookies[0]);
	verified_strict_account_decimal_cookiesets.push(pending_curr_decimal_cs[0]);
	
	verified_strict_login_cookiesets_array.push(pending_enabled_cookies_array[0]);
	
	var cs = pii_vault.aggregate_data.session_cookie_store[my_domain];
	var acct_cookies = pending_disabled_cookies[0];
	for (var i = 0; i < acct_cookies.length; i++) {
	    cs.cookies[acct_cookies[i]].is_part_of_account_cookieset = true;
	}
	flush_session_cookie_store();
	store_intermediate_state();

	console.log("APPU DEBUG: (" + my_state + ")ACCOUNT COOKIE-SET DETECTED: (" + 
		    JSON.stringify(disabled_cookies) + 
		    "): ");

	cookiesets_generation_start_time = new Date();
	tot_page_reloads_since_last_lo_change = 0;
    }


    function update_cookie_status(am_i_logged_in, bool_pwd_box_present) {
	bool_pwd_box_present = (bool_pwd_box_present == undefined) ? false : bool_pwd_box_present; 

	if (my_state == "st_start_with_no_cookies") {
	    if (!am_i_logged_in) {
		console.log("APPU DEBUG: VERIFIED, ACCOUNT-COOKIES are present in default-cookie-store");
		bool_are_all_account_cookies_in_default_store = true;
	    }
	    else {
		console.log("APPU DEBUG: VERIFIED, ACCOUNT-COOKIES are *NOT* present in default-cookie-store");
		bool_are_all_account_cookies_in_default_store = false;
		report_fatal_error("account-cookies are not in default-cookie-store OR usernames are not present");		
	    }
	}
	else if (my_state == "st_suspected_cookies_pass_test") {
	    pending_am_i_logged_in = am_i_logged_in;

	    if (am_i_logged_in) {
		console.log("APPU DEBUG: EXPECTED: ACCOUNT-COOKIES are present in 'DURING' cookies");
		bool_are_account_cookies_in_during_cookies = true;
	    }
	    else {
		console.log("APPU DEBUG: NOT-EXPECTED: Not all ACCOUNT-COOKIES are present in 'DURING' cookies");
		bool_are_account_cookies_in_during_cookies = false;
	    }
	}
	else if (my_state == "st_suspected_cookies_block_test") {
	    pending_am_i_logged_in = am_i_logged_in;
	    pending_bool_pwd_box_present = bool_pwd_box_present;

	    if (!am_i_logged_in) {
		console.log("APPU DEBUG: EXPECTED: ACCOUNT-COOKIES are *NOT* present in non-'DURING' cookies");
		bool_are_account_cookies_not_in_nonduring_cookies = true;
		
		verified_account_super_cookiesets_array.push(disabled_cookies);
		rc = add_to_set(disabled_cookies, undefined, verified_account_super_decimal_cookiesets, 
				suspected_account_cookies_array,
				undefined);
	    }
	    else {
		// This is unexpected branch. This means that even after blocking DURING cookies,
		// the user was found to be logged-in. That means we have not detected DURING cookies 
		// correctly. This will most likely cause the code to go into "expand-state" and
		// expand SUSPECTED account-cookies.
		console.log("APPU DEBUG: NOT-EXPECTED: ACCOUNT-COOKIES are present in non-'DURING' cookies");
		bool_are_account_cookies_not_in_nonduring_cookies = false;
		// report_fatal_error("account cookies in non-'during' cookies");
	    }
	}
	else if (my_state == "st_testing") {
	    console.log("APPU DEBUG: Disabled cookies (" + JSON.stringify(disabled_cookies) + "): ");
	    console.log("APPU DEBUG: Am I logged-in?: " + am_i_logged_in);
	    
	    var enabled_cookies = convert_binary_cookieset_to_cookie_array(curr_binary_cs, 
									   suspected_account_cookies_array, 
									   true);
	    
	    if (am_i_logged_in) {
		verified_strict_account_cookiesets_array.push(enabled_cookies);
	    }
	    
	    console.log("APPU DEBUG: Enabled cookies (" + JSON.stringify(enabled_cookies) + "): ");
	    
	    binary_cookiesets.splice(current_cookiesets_test_index, 1);
	    decimal_cookiesets.splice(current_cookiesets_test_index, 1);
	    
	    console.log("APPU DEBUG: Cookiesets remaining to be tested: " + binary_cookiesets.length);
	    
	    current_cookiesets_test_attempts += 1;
	    tot_cookiesets_tested += 1;
	    tot_cookiesets_tested_overall += 1;
	}
	else if (my_state == "st_cookiesets_block_nonduring_and_disabled" ||
		 my_state == "st_cookiesets_block_disabled") {

	    console.log("APPU DEBUG: (" + my_state + ")Is user logged-in for this cookieset?(" + 
			JSON.stringify(disabled_cookies) + 
			"): " + am_i_logged_in);
	    
	    if (!am_i_logged_in) {
		console.log("Here here: Delete me");
	    }

	    pending_am_i_logged_in.push(am_i_logged_in);
	    pending_disabled_cookies.push(disabled_cookies);
	    pending_enabled_cookies_array.push(enabled_cookies_array);
	    pending_curr_decimal_cs.push(curr_decimal_cs);
	    pending_bool_pwd_box_present.push(bool_pwd_box_present);
	    
	    //update the status first.
	    if (am_i_logged_in) {
		if (bool_pwd_box_present) {
		    console.log("APPU DEBUG: Found restrictive cookieset: " + 
				JSON.stringify(disabled_cookies));
		}
	    }

	    current_cookiesets_test_attempts += 1;
	}
	else if (my_state == "st_expand_suspected_account_cookies") {
	    console.log("APPU DEBUG: (" + my_state + ")Is user logged-in for this cookieset?" + 
			JSON.stringify(expand_state_disabled_cookies) + 
			"): " + am_i_logged_in);

	    if (!am_i_logged_in) {
		console.log("Here here: Delete me");
	    }

	    pending_am_i_logged_in = am_i_logged_in;
	    pending_disabled_cookies = disabled_cookies;
	    pending_enabled_cookies_array = enabled_cookies_array;
	    pending_curr_decimal_cs = curr_decimal_cs;
	    pending_bool_pwd_box_present = bool_pwd_box_present;
	    
	    //update the status first.
	    if (am_i_logged_in) {
		if (bool_pwd_box_present) {
		    console.log("APPU DEBUG: Found restrictive cookieset: " + 
				JSON.stringify(expand_state_disabled_cookies));
		}
	    }

	    current_cookiesets_test_attempts += 1;
	    tot_expand_state_cookiesets_tested_overall += 1;
	}
	else if (my_state == "st_gub_cookiesets_block_test") {
	    var enabled_cookies = convert_binary_cookieset_to_cookie_array(curr_gub_binary_cs, 
									   suspected_account_cookies_array, 
									   true);
	    
	    pending_am_i_logged_in = am_i_logged_in;
	    pending_disabled_cookies = disabled_cookies;
	    pending_enabled_cookies_array = enabled_cookies_array;
	    pending_curr_decimal_cs = curr_gub_decimal_cs;
	    pending_bool_pwd_box_present = bool_pwd_box_present;
	    
	    if (am_i_logged_in) {
		console.log("APPU DEBUG: User is still logged-in after blocking GUB-COOKIE-SET");
		console.log("APPU DEBUG: We do NOT NEED to test any subsets of this GUB-COOKIE-SET: " + 
			    JSON.stringify(disabled_cookies));
	    }
	    else {
		console.log("APPU DEBUG: User logged-out after blocking GUB-COOKIE-SET");
		console.log("APPU DEBUG: We NEED to test subsets for this GUB-COOKIE-SET: " + 
			    JSON.stringify(disabled_cookies));
	    }
	    
	    current_cookiesets_test_attempts += 1;
	}
    }
    

    function set_state(curr_state) {
	my_state = curr_state;
    }
    
    
    function get_state() {
	return my_state;
    }
    

    // Will tell what would be next state after current state AND
    // also goto that state.
    function goto_next_state(was_result_expected) {
	if (!has_error_occurred) {
	    var cit = cookie_investigating_tabs[my_tab_id];
	    cit.bool_state_in_progress = false;
	    return next_state(was_result_expected);
	}

	return "st_terminate";
    }

    // Following should initialize:
    // non_during_suspected_account_cookies_array: All the non-during class cookies except those non-during 
    //                                             cookies already suspected to be account cookies.
    // tot_non_during_cookies                    : Length of above array
    function initialize_expand_state_parameters() {
	var non_during_cookies = get_non_account_cookies(my_domain);
	non_during_suspected_account_cookies_array = Object.keys(non_during_cookies);
	tot_non_during_cookies = non_during_suspected_account_cookies_array.length;
    }
    

    function reset_for_cookieset_testing(reset_stats) {
	if (reset_stats) {
	    tot_cookiesets_tested_this_round = 0;
	}
		
	disabled_cookies = undefined;

	pending_am_i_logged_in = [];
	pending_disabled_cookies = [];
	pending_enabled_cookies_array = [];
	pending_curr_decimal_cs = [];
	pending_bool_pwd_box_present = [];
    }


    function reset_for_gub_testing(reset_stats) {
	if (reset_stats) {
	    tot_cookiesets_tested_this_round = 0;
	}

	disabled_cookies = undefined;
	
	pending_am_i_logged_in = undefined;
	pending_disabled_cookies = undefined;
	pending_enabled_cookies_array = undefined;
	pending_curr_decimal_cs = undefined;
	pending_bool_pwd_box_present = undefined;
    }

    function reset_for_expand_cookies_testing(reset_stats) {
	if (reset_stats) {
	    tot_cookiesets_tested_this_round = 0;
	}
		
	expand_state_disabled_cookies = undefined;
	
	pending_am_i_logged_in = [];
	pending_disabled_cookies = [];
	pending_enabled_cookies_array = [];
	pending_curr_decimal_cs = [];
	pending_bool_pwd_box_present = [];
    }

    function reset_for_during_pass() {
	pending_am_i_logged_in = undefined;
    }

    function reset_for_during_block() {
	pending_am_i_logged_in = undefined;
    }

    // Accepts next_state that would be set and checks if the test parameters
    // can be generated for that state.
    //
    // Returns:
    // "attempt_next_state" : With current parameters, switching to this state is not possible.
    //                        Try next state logical state according to state machine. 
    // "attempt_same_state" : Something has changed such as num_cookies_pass_for_round or
    //                        num_cookies_drop_for_round. But still attempt the same state.
    // "done"       : Cookiesets testing for this web application is over.
    //                Why it is over varies from state to state.
    // "error"      : Some error occurred. Stop testing.
    // "success"    : Attempt switching to this state is successful.
    //                Necessary variables such as curr_binary_cs, curr_decimal_cs, disabled_cookies, and all 
    //                other state specific variables are set properly.
    function attempt_switching_state_to(attempt_state) {
	if (attempt_state == "st_testing") {
	    if (binary_cookiesets.length == 0) {
		console.log("APPU DEBUG: Finished testing all cookiesets");
		return "done";
	    }

	    current_cookiesets_test_index = 0;

	    curr_binary_cs = binary_cookiesets[current_cookiesets_test_index];
	    curr_decimal_cs = decimal_cookiesets[current_cookiesets_test_index];
	    disabled_cookies = convert_binary_cookieset_to_cookie_array(binary_cookiesets[current_cookiesets_test_index],
									suspected_account_cookies_array);
	    return "success";
	}
	else if (attempt_state == "st_cookiesets_block_nonduring_and_disabled") {	    
	    if (last_non_verification_state != "st_cookiesets_block_disabled" &&
		last_non_verification_state != "st_cookiesets_block_nonduring_and_disabled") {
		reset_for_cookieset_testing(true);
	    }

	    var rc = get_next_binary_cookieset_X(curr_binary_cs, 
						 num_cookies_drop_for_round, 
						 tot_cookies, 
						 verified_strict_account_decimal_cookiesets,
						 verified_strict_non_account_decimal_cookiesets,
						 verified_non_account_super_decimal_cookiesets,
						 "normal",
						 skipped_sets);
	    
	    if (rc == 0) {
		console.log("APPU DEBUG: LLB Cookieset testing round finished for: " + num_cookies_drop_for_round);

		num_cookies_drop_for_round += 1;
		
		// Adding (num_cookies_pass_for_round - 1) instead of num_cookies_pass_for_round
		// because I do not finish GUB rounds. I stop them as soon as tested_cookiesets in
		// a round exceeds tot_cookies. Thus num_cookies_pass_for_round does not necessarily
		// say finished round. The round could very well be in progress.
		if ((num_cookies_drop_for_round + (num_cookies_pass_for_round - 1)) >= tot_cookies) {
		    console.log("APPU DEBUG: (cookieset testing) Number of cookies to drop exceed total cookies");
		    console.log("APPU DEBUG: Cookieset testing successfully finished. No more cookiesets generated");

		    bool_is_cookie_testing_done = true;

		    return "done";
		}

		curr_binary_cs = undefined;
		curr_decimal_cs = undefined;

		return "attempt_next_state";
	    }
	    else if (rc == 1) {
		console.log("APPU DEBUG: LLB No more cookiesets generated for: " + num_cookies_drop_for_round);

		num_cookies_drop_for_round += 1;
		if ((num_cookies_drop_for_round + (num_cookies_pass_for_round - 1)) >= tot_cookies) {
		    console.log("APPU DEBUG: LLB (cookieset testing) Number of cookies to drop exceed total cookies");
		    console.log("APPU DEBUG: Cookieset testing successfully finished. No more cookiesets generated");
		    bool_is_cookie_testing_done = true;
		    return "done";
		}
		curr_binary_cs = undefined;
		curr_decimal_cs = undefined;
		return "attempt_next_state";
	    }
	    else if (rc == -1) {
		console.log("APPU Error: (" + state + ")Could not generate cookiesets for round: " + num_cookies_drop_for_round
			    + "(round = number of cookies to be dropped)");
		report_fatal_error(state + "-cookiesets-generation-error-at-X=" + num_cookies_drop_for_round);
		has_error_occurred = true;
		return "error";
	    }
	    else {
		reset_for_cookieset_testing(false);

		curr_binary_cs = rc.binary_cookieset;
		curr_decimal_cs = rc.decimal_cookieset;
		disabled_cookies = convert_binary_cookieset_to_cookie_array(curr_binary_cs,
									    suspected_account_cookies_array);
		console.log("APPU DEBUG: Next decimal cookieset: " + curr_decimal_cs);
		return "success";
	    }
	}
	else if (attempt_state == "st_gub_cookiesets_block_test") {
	    if (last_non_verification_state != "st_gub_cookiesets_block_test") {
		reset_for_gub_testing(true);
	    }

	    if (tot_cookiesets_tested_this_round > tot_cookies) {
		console.log("APPU DEBUG: Tested " + tot_cookiesets_tested_this_round + 
			    " GUB cookiesets for this round, going to next state: ");
		return "attempt_next_state";
	    }

	    var rc = get_next_gub_binary_cookieset_X(curr_gub_binary_cs, 
						     num_cookies_pass_for_round, 
						     tot_cookies, 
						     verified_strict_account_decimal_cookiesets,
						     verified_account_super_decimal_cookiesets,
						     verified_non_account_super_decimal_cookiesets,
						     skipped_sets);
	    
	    if (rc == 0) {
		console.log("APPU DEBUG: GUB Cookieset testing round finished for: " + num_cookies_pass_for_round);

		num_cookies_pass_for_round += 1;

		curr_gub_binary_cs = undefined;
		curr_gub_decimal_cs = undefined;

		if ((num_cookies_drop_for_round + (num_cookies_pass_for_round - 1)) >= tot_cookies) {
		    console.log("APPU DEBUG: (cookieset testing) Number of cookies to pass exceed total cookies");
		    return "attempt_next_state";
		}
		return "attempt_same_state";
	    }
	    else if (rc == 1) {
		console.log("APPU DEBUG: GUB Cookieset testing round finished for: " + num_cookies_pass_for_round);

		num_cookies_pass_for_round += 1;

		curr_gub_binary_cs = undefined;
		curr_gub_decimal_cs = undefined;

		if ((num_cookies_drop_for_round + (num_cookies_pass_for_round - 1)) >= tot_cookies) {
		    console.log("APPU DEBUG: GUB (cookieset testing) Number of cookies to pass exceed total cookies");
		    return "attempt_next_state";
		}

		return "attempt_same_state";
	    }
	    else if (rc == -1) {
		console.log("APPU Error: (" + state + ")Could not generate cookiesets for round: " + num_cookies_pass_for_round
			    + "(round = number of cookies to be dropped)");
		report_fatal_error(state + "-cookiesets-generation-error-at-X=" + num_cookies_pass_for_round);
		has_error_occurred = true;
		return "error";
	    }
	    else {
		reset_for_gub_testing(false);

		curr_gub_binary_cs = rc.binary_cookieset;
		curr_gub_decimal_cs = rc.decimal_cookieset;
		disabled_cookies = convert_binary_cookieset_to_cookie_array(curr_gub_binary_cs,
									    suspected_account_cookies_array);
		console.log("APPU DEBUG: Next decimal cookieset: " + curr_gub_decimal_cs);
		return "success";
	    }
	}
	else if (attempt_state == "st_expand_suspected_account_cookies") {
	    if (!bool_expand_state_initialized) {
		initialize_expand_state_parameters();
		bool_expand_state_initialized = true;
	    }

	    if (last_non_verification_state != "st_expand_suspected_account_cookies") {
		reset_for_expand_cookies_testing(true);
	    }

	    var rc = get_next_binary_cookieset_X(curr_expand_state_binary_cs, 
						 expand_state_num_cookies_drop_for_round, 
						 tot_non_during_cookies, 
						 verified_strict_non_during_account_decimal_cookiesets,
						 verified_strict_non_during_non_account_decimal_cookiesets,
						 verified_non_during_non_account_super_decimal_cookiesets,
						 "expand",
						 skipped_sets);
	    
	    if (rc == 0) {
		console.log("APPU DEBUG: Cookieset testing round finished for: " + 
			    expand_state_num_cookies_drop_for_round);

		expand_state_num_cookies_drop_for_round += 1;
		if (expand_state_num_cookies_drop_for_round > tot_non_during_cookies) {
		    console.log("APPU DEBUG: (expand state) Number of cookies to drop exceed num-non-during cookies");
		    return "error";
		}

		curr_expand_state_binary_cs = undefined;
		curr_expand_state_decimal_cs = undefined;
		return "attempt_same_state";
	    }
	    else if (rc == 1) {
		// This could mean that in previous incomplete attempt, we have already tested
		// cookiesets for this round of expand_state_num_cookies_drop_for_round
		console.log("APPU DEBUG: No cookiesets generated for expand-state round(" + 
			    expand_state_num_cookies_drop_for_round + ")");

		expand_state_num_cookies_drop_for_round += 1;
		if (expand_state_num_cookies_drop_for_round > tot_non_during_cookies) {
		    console.log("APPU DEBUG: (expand state) Number of cookies to drop exceed num-non-during cookies");
		    return "error";
		}

		curr_expand_state_binary_cs = undefined;
		curr_expand_state_decimal_cs = undefined;
		return "attempt_same_state";
	    }
	    else if (rc == -1) {
		console.log("APPU Error: (" + state + ")Could not generate cookiesets for round: " + 
			    expand_state_num_cookies_drop_for_round
			    + "(round = number of cookies to be dropped)");
		report_fatal_error(state + "-cookiesets-generation-error-at-X=" + 
				   expand_state_num_cookies_drop_for_round);
		has_error_occurred = true;
		return "error";
	    }
	    else {		
		reset_for_expand_cookies_testing(false);
		
		curr_expand_state_binary_cs = rc.binary_cookieset;
		curr_expand_state_decimal_cs = rc.decimal_cookieset;
		expand_state_disabled_cookies = 
		    convert_binary_cookieset_to_cookie_array(curr_expand_state_binary_cs,
							     non_during_suspected_account_cookies_array);
		console.log("APPU DEBUG: Next decimal cookieset: " + curr_expand_state_decimal_cs);
		return "success";
	    }
	}
	return "error";
    }


    // Returns: 
    // "no"       : if the user was still logged-in after testing cookieset for cookieset testing states
    // "possibly" : if the user was not logged-in and need to execute further states to
    //              decide
    function decide_result_significance() {
	var ignore_states = [
			     "st_cookie_test_start", 
			     "st_start_with_no_cookies",
			     "st_suspected_cookies_pass_test",
			     "st_suspected_cookies_block_test",
			     "st_testing",
			     "st_terminate",
			     "st_verification_epoch",
			     ];

	if (ignore_states.indexOf(my_state) != -1) {
	    return "no";
	}

	if (pending_am_i_logged_in == undefined) {
	    console.log("APPU Error: State(" + my_state + "): pending_am_i_logged_in undefined");
	    report_fatal_error(my_state + "-pending_am_i_logged_in-undefined");
	    return "no";
	}

	if (my_state == "st_expand_suspected_account_cookies") {
	    if (pending_am_i_logged_in == false) {
		return "possibly";
	    }
	}
	else if (my_state == "st_cookiesets_block_nonduring_and_disabled") {
	    if (pending_am_i_logged_in[0] == false) {
		return "possibly";
	    }
	}
	else if (my_state == "st_gub_cookiesets_block_test") {
	    if (pending_am_i_logged_in == false) {
		return "possibly";
	    }
	}	

	return "no";
    }


    // Commit the results for last successfully tested cookieset before discarding them.
    // Parameters:
    // tested_state: The tested cookieset was tested for this state. Values could be:
    // 1. st_suspected_cookies_pass_test
    // 2. st_suspected_cookies_block_test
    // 3. st_cookiesets_block_nonduring_and_disabled
    // 4. st_cookiesets_block_disabled
    // 5. st_gub_cookiesets_block_test
    // 6. st_expand_suspected_account_cookies
    //
    // Returns one of the following:
    // "switch_to_expand" : Looks like suspected cookies do not contain all. Switch to expand state.
    // "continue_testing" : Just expected result, nothing new. Continue as normal.
    // "error"            : Unexpected result. Exit.
    function commit_result(tested_state) {
	var rs = "continue_testing";
	if (tested_state == "st_suspected_cookies_pass_test") {
	    if (pending_am_i_logged_in != undefined) {
		if(!pending_am_i_logged_in) {
		    console.log("APPU DEBUG: Switching to expand state from 'st_suspected_cookies_pass_test'");
		    rs = "switch_to_expand";
		    tot_expand_state_entered += 1;
		    disabled_cookies = [];
		}
	    }
	    else {
		console.log("APPU Error: Totally not expected, terminating");
		report_fatal_error("during-cookie-pass-login-undefined");
		rs = "error";
	    }
	}
	else if (tested_state == "st_suspected_cookies_block_test") {
	    if (pending_am_i_logged_in != undefined) {
		if(pending_am_i_logged_in == true) {
		    console.log("APPU DEBUG: Switching to expand state from 'st_suspected_cookies_block_test'");
		    rs = "switch_to_expand";
		    tot_expand_state_entered += 1;
		    // Don't zero out disabled cookies since we want to keep disabling them.
		    // disabled_cookies = [];
		}
		else {
		    if (pending_bool_pwd_box_present) {
			bool_pwd_box_should_be_present = true;
			console.log("APPU DEBUG: @@@@ A password box should be present when user is not logged-in @@@@");
		    }
		    else {
			bool_pwd_box_should_be_present = false;
			console.log("APPU DEBUG: @@@@ A password box should *NOT* be present when user is not logged-in @@@@");
		    }
		}
	    }
	    else {
		console.log("APPU Error: Totally not expected, terminating");
		report_fatal_error("during-cookie-block-login-undefined");
		rs = "error";
	    }
	}
	else if (tested_state == "st_cookiesets_block_nonduring_and_disabled") {
	    if (pending_am_i_logged_in[0] != undefined) {
		if (!pending_am_i_logged_in[0]) {
		    // FATAL ERROR: If user is not logged in, then control should not
		    // come here. It should execute "st_cookiesets_block_disabled"
		    console.log("APPU Error: Totally not expected, terminating");
		    report_fatal_error("commit-result-st_cookiesets_block_nonduring_and_disabled-user-not-logged-in");
		    rs = "error";
		}
		else {
		    if (pending_disabled_cookies[0] == null ||
			verified_strict_non_account_cookiesets_array.length == 19) {
			console.log("Here here: Delete me");
		    }
		    
		    console.log("Here here: Delete me: Adding to VSNACA: " + 
				JSON.stringify(pending_disabled_cookies[0]));
		    verified_strict_non_account_cookiesets_array.push(pending_disabled_cookies[0]);
		    verified_strict_non_account_decimal_cookiesets.push(pending_curr_decimal_cs[0]);
		    store_intermediate_state();
		    
		    if (pending_bool_pwd_box_present[0]) {
			verified_restricted_cookiesets_array.push(pending_disabled_cookies[0]);
			console.log("APPU DEBUG: Found restrictive cookieset: " + 
				    JSON.stringify(pending_disabled_cookies[0]));
		    }
		}
	    }
	}
	else if (tested_state == "st_cookiesets_block_disabled") {
	    if (pending_am_i_logged_in[0] != undefined &&
		pending_am_i_logged_in[1] != undefined) {
		if (pending_am_i_logged_in[0] == pending_am_i_logged_in[1]) {
		    if (pending_am_i_logged_in[0] != undefined &&
			!pending_am_i_logged_in[0]) {
			if (bool_pwd_box_should_be_present) {
			    if (pending_bool_pwd_box_present[0]) {
				commit_account_cookies();
			    }
			    else {
				commit_account_cookies();

				//	if (pending_disabled_cookies[0] == null ||
				//	    verified_strict_non_account_cookiesets_array.length == 19) {
				//	    console.log("Here here: Delete me");
				//	}

				//	console.log("Here here: Delete me: Adding to VSNACA: " + 
				//		    JSON.stringify(pending_disabled_cookies[0]));
				//	verified_strict_non_account_cookiesets_array.push(pending_disabled_cookies[0]);
				//	verified_strict_non_account_decimal_cookiesets.push(pending_curr_decimal_cs[0]);
				//	store_intermediate_state();
			    }
			}
			else {
				commit_account_cookies();
			}
		    }
		    else {
			if (pending_disabled_cookies[0] == null ||
			    verified_strict_non_account_cookiesets_array.length == 19) {
			    console.log("Here here: Delete me");
			}

			console.log("Here here: Delete me: Adding to VSNACA: " + 
				    JSON.stringify(pending_disabled_cookies[0]));
			verified_strict_non_account_cookiesets_array.push(pending_disabled_cookies[0]);
			verified_strict_non_account_decimal_cookiesets.push(pending_curr_decimal_cs[0]);
			store_intermediate_state();

			if (pending_bool_pwd_box_present[0]) {
			    verified_restricted_cookiesets_array.push(pending_disabled_cookies[0]);
			    console.log("APPU DEBUG: Found restrictive cookieset: " + 
					JSON.stringify(pending_disabled_cookies[0]));
			}
		    }
		}
		else {
		    if (!pending_am_i_logged_in[0] && pending_am_i_logged_in[1]) {
			// Disabling 'non-DURING' cookies caused session to be logged out.
			// Hence some account cookies must be present in 'non-During' cookies.
			console.log("APPU DEBUG: It seems that some cookies are in non-DURING class. " +
				    "Switching to 'st_expand_suspected_account_cookies'");
			rs = "switch_to_expand";
			tot_expand_state_entered += 1;
		    }
		    else {
			// Disabling 'non-DURING' cookies caused session to be logged-in
			// Enabling 'non-DURING' cookies caused session to be logged-out
			// TOTALLY UNEXPECTED.
			console.log("APPU Error: Totally not expected, terminating");
			report_fatal_error("enable-non-during-causes-session-logout");
			rs = "error";
		    }
		}
	    }
	}
	else if (tested_state == "st_gub_cookiesets_block_test") {
	    if (pending_am_i_logged_in != undefined &&
		pending_am_i_logged_in == true) {
		num_non_account_super_cookiesets_found += 1;
		verified_non_account_super_cookiesets_array.push(pending_disabled_cookies);
		rc = add_to_set(pending_disabled_cookies, undefined, verified_non_account_super_decimal_cookiesets, 
				undefined,
				pending_curr_decimal_cs);
		store_intermediate_state();
	    }
	    else if (pending_am_i_logged_in != undefined &&
		     pending_am_i_logged_in == false) {
		num_account_super_cookiesets_found += 1;
		verified_account_super_cookiesets_array.push(pending_disabled_cookies);
		rc = add_to_set(pending_disabled_cookies, undefined, verified_account_super_decimal_cookiesets, 
				undefined,
				pending_curr_decimal_cs);
		store_intermediate_state();
	    }
	}
	else if (tested_state == "st_expand_suspected_account_cookies") {
	    if (pending_am_i_logged_in != undefined) {
		if (!pending_am_i_logged_in) {
		    var cs = pii_vault.aggregate_data.session_cookie_store[my_domain];
		    var acct_cookies = expand_state_disabled_cookies;

		    for (var i = 0; i < acct_cookies.length; i++) {
			cs.cookies[acct_cookies[i]].is_part_of_account_cookieset = true;
		    }
		    flush_session_cookie_store();

		    for (var i = 0; i < verified_account_super_cookiesets_array.length; i++) {
			for (var j = 0; j < acct_cookies.length; j++) {
			    if (verified_account_super_cookiesets_array[i].indexOf(acct_cookies[j]) == -1) {
				verified_account_super_cookiesets_array[i].push(acct_cookies[j]);
			    }
			}
		    }

		    console.log("APPU DEBUG: Detected account cookies in non-DURING cookies. Resetting to start state");
		    reset_to_start_state(acct_cookies);
		    rs = "continue_testing";
		}
		else {
		    verified_strict_non_during_non_account_cookiesets_array.push(expand_state_disabled_cookies);
		    verified_strict_non_during_non_account_decimal_cookiesets.push(pending_curr_decimal_cs);
		    store_intermediate_state();
		}
	    }
	}

	return rs;
    }

    
    var commit_result_decision = {
	"st_verification_epoch:st_suspected_cookies_pass_test"       : "last_non_verification_state",
	"st_verification_epoch:st_suspected_cookies_pass_test"       : "last_non_verification_state",
	"st_verification_epoch:st_suspected_cookies_block_test"      : "last_non_verification_state",
	"st_verification_epoch:st_gub_cookiesets_block_test"         : "last_non_verification_state",
	"st_verification_epoch:st_cookiesets_block_disabled"         : "last_non_verification_state",
	"st_verification_epoch:st_expand_suspected_account_cookies"  : "last_non_verification_state",
	"st_expand_suspected_account_cookies:no"                     : "my_state",
	"st_cookiesets_block_nonduring_and_disabled:no"              : "my_state",
	"st_gub_cookiesets_block_test:no"                            : "my_state",
    };




    // Next state is decided by following variables (possibly in combination):
    // a. Current state: Possible values are following:
    //        1. st_verification_epoch
    //        2. st_cookie_test_start
    //        3. st_start_with_no_cookies
    //        4. st_suspected_cookies_pass_test
    //        5. st_suspected_cookies_block_test
    //        6. st_cookiesets_block_nonduring_and_disabled
    //        7. st_cookiesets_block_disabled
    //        8. st_gub_cookiesets_block_test
    //        9. st_expand_suspected_account_cookies
    //       10. st_testing
    //       11. st_terminate
    // 
    // b. Last non-verification state
    // c. Last cookieset test result
    var state_machine = {
	"st_cookie_test_start"            : "st_verification_epoch",                      
	
	"st_start_with_no_cookies"        : "st_verification_epoch",        
	"st_suspected_cookies_pass_test"  : "st_verification_epoch",        
	"st_suspected_cookies_block_test" : "st_verification_epoch",        
	"st_cookiesets_block_disabled"    : "st_verification_epoch",        
	
	// Combination: last_non_verification_state + ":st_verification_epoch"
	"st_cookie_test_start:st_verification_epoch"                : "st_start_with_no_cookies",
	"st_start_with_no_cookies:st_verification_epoch"            : "st_suspected_cookies_pass_test",
	"st_suspected_cookies_pass_test:st_verification_epoch"      : "st_suspected_cookies_block_test",
	
	"st_suspected_cookies_block_test:st_verification_epoch"     : "ATTEMPT:st_cookiesets_block_nonduring_and_disabled",
	"st_cookiesets_block_disabled:st_verification_epoch"        : "ATTEMPT:st_cookiesets_block_nonduring_and_disabled",
	"st_gub_cookiesets_block_test:st_verification_epoch"        : "ATTEMPT:st_gub_cookiesets_block_test",
	"st_expand_suspected_account_cookies:st_verification_epoch" : "ATTEMPT:st_expand_suspected_account_cookies",
	
	"st_gub_cookiesets_block_test"               : "last_test_result_dependent",
	"st_cookiesets_block_nonduring_and_disabled" : "last_test_result_dependent",
	"st_expand_suspected_account_cookies"        : "last_test_result_dependent",
	
	// Combination: my_state + ":" + cookieset_test_result_significance
	"st_gub_cookiesets_block_test:possibly"               : "st_verification_epoch",
	"st_cookiesets_block_nonduring_and_disabled:possibly" : "st_cookiesets_block_disabled",
	"st_expand_suspected_account_cookies:possibly"        : "st_verification_epoch",
	
	"st_gub_cookiesets_block_test:no"               : "ATTEMPT:st_gub_cookiesets_block_test",
	"st_cookiesets_block_nonduring_and_disabled:no" : "ATTEMPT:st_cookiesets_block_nonduring_and_disabled",
	"st_expand_suspected_account_cookies:no"        : "ATTEMPT:st_expand_suspected_account_cookies",
    };

    function next_state(was_last_result_expected) {
	var rc = -1;
	var temp_state = my_state;
	var crrc = '';
	var test_significance = '';

	// was_last_result_expected: Just decides if the result for the last state expected.
	//                           For e.g., clearly if user is not logged-in for verification state,
	//                           then that is unexpected result.
	was_last_result_expected = (was_last_result_expected == undefined) ? false : was_last_result_expected;

	if (was_last_result_expected) {
	    // test_significance: This sums up results from (possibly)last FEW states to decide
	    //                    the importance of cookieset under test.
	    //                    Sort of H0: cookieset is not important
	    //                    
	    test_significance = decide_result_significance();
	    
	    var state_combo = my_state + ":" + last_non_verification_state;
	    var res_state_combo = my_state + ":" + test_significance;
	    var commit_result_with_state = undefined;

	    if (state_combo in commit_result_decision) {
		commit_result_with_state = commit_result_decision[state_combo];
	    }
	    else if (res_state_combo in commit_result_decision) {
		commit_result_with_state = commit_result_decision[res_state_combo];
	    }
	    
	    if (commit_result_with_state != undefined) {
		if (commit_result_with_state == "last_non_verification_state") {
		    crrc = commit_result(last_non_verification_state);
		}
		else if (commit_result_with_state == "my_state") {
		    crrc = commit_result(my_state);
		}
	    }
	}

	var attempt_state = undefined; 

	if (!was_last_result_expected || crrc == "error") {
	    my_state = "st_terminate";
	}
	else if (is_cookie_testing_done()) {
	    my_state = "st_terminate";
	}
	else if (my_state == "st_testing" || bool_switch_to_testing) {
	    attempt_state = "st_testing";
	}   
	else if (my_state == "st_terminate") {
		my_state = "st_terminate";
	}
	else if (crrc == "switch_to_expand") {
	    attempt_state = "st_expand_suspected_account_cookies";
	}
	else if (my_state == "st_verification_epoch") {
	    // This test has to be here. Do not move it from here.
	    var s = last_non_verification_state + ":" + "st_verification_epoch";
	    if (s in state_machine) {
		if (state_machine[s].indexOf("ATTEMPT:") == 0) {
		    attempt_state = state_machine[s].split(":")[1];
		}
		else {
		    my_state = state_machine[s];
		}
	    }
	    else {
		console.log("APPU Error: No state machine entry for: " + s);
		report_fatal_error("no-state-machine-entry-for-" + s);
		my_state = "st_terminate";
	    }
	}
	else if (state_machine[my_state] == "st_verification_epoch") {
	    my_state = "st_verification_epoch";
	}
	else if (state_machine[my_state] == "last_test_result_dependent") {
	    var s = my_state + ":" + test_significance;
	    if (s in state_machine) {
		if (state_machine[s].indexOf("ATTEMPT:") == 0) {
		    attempt_state = state_machine[s].split(":")[1];
		}
		else {
		    my_state = state_machine[s];
		}
	    }
	    else {
		console.log("APPU Error: No state machine entry for: " + s);
		my_state = "st_terminate";
	    }
	}
	else {
	    console.log("APPU Error: All the state changing conditions mismatched");
	    my_state = "st_terminate";
	    report_fatal_error("next-state-cant-find-matching-condition");
	}

	if (attempt_state != undefined) {
	    do {
		rc = attempt_switching_state_to(attempt_state);
		
		if (rc == "success") {
		    my_state = attempt_state;
		    break;
		}
		else if (rc == "attempt_next_state") {
		    if (attempt_state == "st_cookiesets_block_nonduring_and_disabled") {
			attempt_state = "st_gub_cookiesets_block_test";
			reset_for_gub_testing(true);
		    }
		    else if (attempt_state == "st_gub_cookiesets_block_test") {
			attempt_state = "st_cookiesets_block_nonduring_and_disabled";
			reset_for_cookieset_testing(true);
		    }
		    else {
			console.log("APPU Error: Attempt state(" + attempt_state + ") should not return attempt_next_state");
			report_fatal_error(attempt_state + "-returned-attempt-next-state");
		    }
		    continue;
		}
		else if (rc == "attempt_same_state") {
		    continue;
		}
		else {
		    my_state = "st_terminate";
		    break;
		}
	    } while(1);
	}

	if (temp_state != "st_verification_epoch") {
	    last_non_verification_state = temp_state;
	}

	if (my_state == "st_verification_epoch" ||
	    my_state == "st_cookiesets_block_disabled") {
	    console.log("-----------------");
	}
	else {
	    console.log("*****************************************");
	}

	console.log("APPU DEBUG: Next state: " + my_state);	
	if (my_state == "st_cookiesets_block_nonduring_and_disabled" ||
	    my_state == "st_cookiesets_block_disabled") {
	    console.log("APPU DEBUG: Number of cookies to DROP in this state: " + num_cookies_drop_for_round);	
	}
	else if (my_state == "st_gub_cookiesets_block_test") {
	    console.log("APPU DEBUG: Number of cookies to PASS in this state: " + num_cookies_pass_for_round);	
	}

	console.log("APPU DEBUG: Total cookiesets tested in this round: " + tot_cookiesets_tested_this_round);	
	console.log("APPU DEBUG: Total cookiesets tested this attempt: " + tot_cookiesets_tested);		

	console.log("APPU DEBUG: Total number of actual page reloads this attempt: " + tot_page_reloads);
	console.log("APPU DEBUG: Total number of actual page reloads overall: " + tot_page_reloads_overall);

	var ci_end_time = new Date();
	var time_taken_this_attempt = (ci_end_time.getTime() - ci_start_time.getTime())/1000;
	console.log("APPU DEBUG: Time taken for investigation in this attempt: " + 
		    Math.floor((time_taken_this_attempt/60)) + "m " +
		    Math.floor((time_taken_this_attempt % 60)) + "s");

	var time_taken_overall = tot_time_taken + (ci_end_time.getTime() - ci_start_time.getTime())/1000;
	console.log("APPU DEBUG: Time taken for investigation overall: " + 
		    Math.floor((time_taken_overall/60)) + "m " +
		    Math.floor((time_taken_overall % 60)) + "s");


	if (my_state == "st_terminate" && !has_error_occurred) {
	    final_result();
	}
	
	return my_state;
    }
    

    function is_cookie_testing_done() {
	if (my_state == "st_terminate") {
	    return true;
	}

	if (has_error_occurred) {
	    console.log("APPU DEBUG: Error occurred. is_cookie_testing_done() returning TRUE");
	    return true;
	}

	if ((num_cookies_drop_for_round + (num_cookies_pass_for_round - 1)) >= tot_cookies) {
	    // Minus one because current GUB cookies_pass round is not always totally finished.
	    console.log("APPU DEBUG: num_cookies_drop_for_round(" + num_cookies_drop_for_round + 
			") PLUS num_cookies_pass_for_round(" + num_cookies_pass_for_round + ") MINUS one," +
			" exceeds suspected_account_cookies_array length(" + 
			tot_cookies + "). " + 
			"is_cookie_testing_done() returning TRUE");
	    return true;
	}

	if (config_cookiesets == 'none' && num_cookies_drop_for_round > 1) {
	    console.log("APPU DEBUG: All single-cookies have been tested AND no cookie-sets " +
			"testing required. COOKIE-INVESTIGATION: DONE");
	    return true;
	}

	if (config_cookiesets == 'random' &&
	    current_cookiesets_test_attempts >= MAX_RANDOM_COOKIESETS_TEST_ATTEMPTS) {
	    console.log("APPU DEBUG: All single-cookies have been tested AND maximum random cookiesets(" + 
			MAX_RANDOM_COOKIESETS_TEST_ATTEMPTS + ") " +
			"are tested. COOKIE-INVESTIGATION: DONE");
	    return true;
	}

	return false;
    }
    

    function final_result() {
	if (last_non_verification_state == "st_testing") {
	    console.log("APPU DEBUG: Ending cookie investigation for(" + my_domain + "): " + ci_end_time);
	    remove_ci_state(my_url);
	    terminate_cookie_investigating_tab(my_tab_id);
	    window.clearTimeout(shut_tab_forcefully);
	    return;
	}

	bool_is_cookie_testing_done = true;
	store_intermediate_state();

	console.log("------ FINAL RESULT ------");
	console.log("APPU DEBUG: Cookies investigated for Web-Application: " + my_url);
	// Testing with blocking and verification.
	
	if (bool_are_all_account_cookies_in_default_store) {
	    // 	    print_appu_error("APPU DEBUG: All account-cookies present in the default-cookie-store: " + 
	    // 			     my_domain);
	}
	else {
	    print_appu_error("APPU Error: Error: All account-cookies are *NOT* present in the default-cookie-store: " + 
			     my_domain);
	}

	if (bool_are_account_cookies_in_during_cookies &&
	    bool_are_account_cookies_not_in_nonduring_cookies) {
	    // 	    print_appu_error("APPU DEBUG: All account-cookies present *ONLY* in the 'DURING' cookies" + 
	    // 			     my_domain);
	}
	else {
	    print_appu_error("APPU DEBUG: Not all account-cookies present in the 'DURING' cookies" + 
			     my_domain);
	}
		
	console.log("");
	console.log("APPU DEBUG: LLB & GUB OPTIMIZATION INFORMATION");
	console.log("APPU DEBUG: Number of discovered LLBs: " + verified_strict_account_cookiesets_array.length);
	console.log("APPU DEBUG: Number of discovered GUBs: " + verified_non_account_super_cookiesets_array.length);
	console.log("");

	console.log("APPU DEBUG: Skipped cookiesets going UP in POSET (subset in account-cookiesets): " + 
		    skipped_sets.num_subset_in_account_cookiesets);
	console.log("APPU DEBUG: Skipped cookiesets going UP in POSET (superset in non-account-cookiesets): " + 
		    skipped_sets.num_superset_in_non_account_cookiesets);
	console.log("APPU DEBUG: Skipped cookiesets going UP in POSET (superset in non-account-super-cookiesets): " + 
		    skipped_sets.num_superset_in_non_account_super_cookiesets);
	console.log("");
	
	console.log("APPU DEBUG: Skipped cookiesets coming DOWN in POSET (subset in account-cookiesets): " + 
		    skipped_sets.num_gub_subset_in_account_cookiesets);
	console.log("APPU DEBUG: Skipped cookiesets coming DOWN in POSET (superset in non-account-cookiesets): " + 
		    skipped_sets.num_gub_superset_in_non_account_cookiesets);
	console.log("APPU DEBUG: Skipped cookiesets coming DOWN in POSET (already tested account-super-cookiesets): " + 
		    skipped_sets.num_gub_already_tested_in_account_super_cookiesets);
	console.log("APPU DEBUG: Skipped cookiesets coming DOWN in POSET (subset in account-super-cookiesets): " + 
		    skipped_sets.num_gub_subset_in_account_super_cookiesets);
	console.log("");

	console.log("APPU DEBUG: Total skipped cookiesets (due to subset in strict-account-cookiesets): " + 
		    (skipped_sets.num_subset_in_account_cookiesets +
		     skipped_sets.num_gub_subset_in_account_cookiesets));
	console.log("APPU DEBUG: Total skipped cookiesets (due to superset in non-account-cookiesets): " + 
		    (skipped_sets.num_superset_in_non_account_super_cookiesets +
		     skipped_sets.num_gub_superset_in_non_account_cookiesets))
	
	var total_skipped_cookiesets = skipped_sets.num_subset_in_account_cookiesets +
	    skipped_sets.num_superset_in_non_account_cookiesets +
	    skipped_sets.num_superset_in_non_account_super_cookiesets +
	    skipped_sets.num_gub_subset_in_account_cookiesets +
	    skipped_sets.num_gub_superset_in_non_account_cookiesets +
	    skipped_sets.num_gub_already_tested_in_account_super_cookiesets +
	    skipped_sets.num_gub_subset_in_account_super_cookiesets;
	console.log("APPU DEBUG: Total skipped cookiesets: " + 
		    total_skipped_cookiesets);

	console.log("");
	console.log("APPU DEBUG: Total cookiesets for naive method: " + 
		    Math.pow(2, tot_cookies));
	console.log("APPU DEBUG: Total cookiesets tested this attempt: " + tot_cookiesets_tested);	
	
	// Multiplied by 3 because:
	// 1. st_cookiesets_block_nonduring_and_disabled
	// 2. st_cookiesets_block_disabled
	// 3. st_verification_epoch
	console.log("");
	console.log("APPU DEBUG: PAGE RELOAD INFORMATION");
	console.log("APPU DEBUG: Total number of page reloads with naive method: " + 
		    skipped_sets.tot_page_reloads_naive);
	console.log("APPU DEBUG: Total number of page reloads this attempt: " + tot_page_reloads);
	console.log("APPU DEBUG: Total number of page reloads overall: " + tot_page_reloads_overall);
	console.log("APPU DEBUG: Total number of page reloads since last change in logout-equation: " + 
		    tot_page_reloads_since_last_lo_change);

	console.log("");
	console.log("APPU DEBUG: BANDWIDTH INFORMATION");
	var tbs = tot_bytes_sent + bytes_sent_this_attempt;
	var tbr = tot_bytes_recvd + bytes_recvd_this_attempt;
	console.log("APPU DEBUG: Total bytes sent during investigation: " + get_human_readable_size(tbs)); 
	console.log("APPU DEBUG: Total bytes received during investigation: " + get_human_readable_size(tbr)); 

	console.log("");
	console.log("APPU DEBUG: TIME INFORMATION");
	var ci_end_time = new Date();
	var cg_time_taken = tot_cookiesets_generation_time + (ci_end_time.getTime() - 
					    cookiesets_generation_start_time.getTime())/1000;
	console.log("APPU DEBUG: Total time in generating cookiesets since last change to equation: " + 
		    Math.floor((cg_time_taken/60)) + "m " +
		    Math.floor((cg_time_taken % 60)) + "s");

	var ci_time_taken = tot_time_taken + (ci_end_time.getTime() - ci_start_time.getTime())/1000;
	console.log("APPU DEBUG: Total time taken for investigation: " + Math.floor((ci_time_taken/60)) + "m " +
		    Math.floor((ci_time_taken % 60)) + "s");
	console.log("APPU DEBUG: Total attempts so far: " + tot_attempts);

	console.log("");
	console.log("APPU DEBUG: COOKIESETS INFORMATION");
	if (!has_error_occurred) {
	    for (var k = 0; k < verified_account_super_decimal_cookiesets.length; k++) {
		var rc = is_a_setmember_subset(verified_account_super_decimal_cookiesets[k], 
					       verified_strict_account_decimal_cookiesets);
		if (!rc) {
		    var t = convert_cookie_array_to_binary_cookieset(verified_account_super_cookiesets_array[k], 
								     suspected_account_cookies_array);
		    if (t.decimal_cookieset != verified_account_super_decimal_cookiesets[k]) {
			console.log("Here here: cookiesets mismatch, delete me");
		    }

		    // If I start seeing a lot of cookiesets getting printing in the following
		    // statement, then I will have to write code to shift them to
		    // verified_strict_account_cookiesets_array.
		    // That would mean that they somehow did not get tested while going UP in
		    // poset but actually are strict-account-cookiesets.
		    console.log("APPU DEBUG: No member in strict account cookiesets is a " + 
				"subset of non-account-super-cookieset: " + 
				JSON.stringify(verified_account_super_cookiesets_array[k]));
		}
	    }
	}

	console.log("APPU DEBUG: Total suspected cookies: " + tot_cookies);
	console.log("APPU DEBUG: Total times expand-state entered: " + tot_expand_state_entered);	
	console.log("APPU DEBUG: Total expand cookiesets tested overall: " + tot_expand_state_cookiesets_tested_overall);	
	console.log("APPU DEBUG: Total GUB cookiesets tested overall: " + tot_gub_cookiesets_tested_overall);	
	console.log("APPU DEBUG: Total cookiesets tested overall: " + tot_cookiesets_tested_overall);	
	console.log("APPU DEBUG: Total inconclusive cookiesets overall(page load failure and no usernames): " + 
		    tot_inconclusive_cookiesets_overall);	
	
	console.log("APPU DEBUG: Number of restrictive account-cookiesets: " + 
		    verified_restricted_cookiesets_array.length);
	for (var j = 0; j < verified_restricted_cookiesets_array.length; j++) {
	    var cs_names = verified_restricted_cookiesets_array[j];
	    console.log(j + ". Number of cookies: " + cs_names.length +
			", CookieSet: " +
			    JSON.stringify(cs_names));
	}

	var cookie_aliases = {};
	var logout_equation = "";
	
	console.log("APPU DEBUG: Number of account-cookiesets: " + 
		    verified_strict_account_cookiesets_array.length);
	if (verified_strict_account_cookiesets_array.length > 0) {
	    var first_time = true;
	    for (var j = 0; j < verified_strict_account_cookiesets_array.length; j++) {
		var cs_names = verified_strict_account_cookiesets_array[j];
		console.log(j + ". Number of cookies: " + cs_names.length +
			    ", CookieSet: " +
			    JSON.stringify(cs_names));
		if (!first_time) {
		    logout_equation += " || ";
		}
		else {
		    first_time = false;
		}

		logout_equation += "(";
		for (var u = 0; u < cs_names.length; u++) {
		    var fields = cs_names[u].split(":");
		    var cookie_alias = fields[fields.length - 1];
		    cookie_aliases[cs_names[u]] = cookie_alias;
		    if (u != 0) {
			logout_equation += " && ";
		    }
		    logout_equation += "~" + cookie_alias;
		}
		logout_equation += ")";
	    }
	}
	else {
	    logout_equation = "Not detected yet";
	}
	
	var cs = pii_vault.aggregate_data.session_cookie_store[my_domain];
	cs.logout_equation = logout_equation;
	cs.cookie_aliases = cookie_aliases;
	flush_session_cookie_store();
	
	console.log("");
	console.log("APPU DEBUG: LOGOUT-EQUATION INFORMATION");
	console.log("APPU DEBUG: Cookie-aliases: ");	    
	for (var ca in cookie_aliases) {
	    console.log("APPU DEBUG: " + cookie_aliases[ca] + ": " + ca);
	}

	console.log("");
	console.log("APPU DEBUG: COOKIE ATTRIBUTES: HTTPONLY, SECURE ");	    
	for (var ca in cookie_aliases) {
	    var is_secure = cs.cookies[ca].secure;
	    if (is_secure != undefined) {
		is_secure = (is_secure == true) ? "T" : "F";
	    }
	    var is_httponly = cs.cookies[ca].httpOnly;
	    if (is_httponly != undefined) {
		is_httponly = (is_httponly == true) ? "T" : "F";
	    }
	    console.log("APPU DEBUG: " + cookie_aliases[ca] + " (H: " 
			+ is_httponly +", S: " + is_secure + ")");
	}

	console.log("");
	if (!has_error_occurred) {
	    console.log("APPU DEBUG: Complete logout-equation: " + logout_equation);
	}
	else {
	    console.log("APPU DEBUG: Partial logout-equation: " + logout_equation);
	}

	if (!has_error_occurred) {
	    console.log("APPU DEBUG: Testing done?: YES");
	    remove_ci_state(my_url);
	}
	else {
	    console.log("APPU DEBUG: Testing done?: NO");
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
	// 6. Max webpage reload attempts has reached (site or net is slow).

	store_intermediate_state();
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


    function detect_login_status(present_usernames) {
	var bool_at_least_one_username_present = false;

	var tn = [];
	for (var i = 0; i < top_three_elements_with_usernames.length; i++) {
	    var t = top_three_elements_with_usernames[i];
	    tn.push($.extend(true, {}, t));
	    tn[i].counted_before = false;
	}
	
	for (var i = 0; i < tn.length; i++) {
	    var cn = present_usernames.elem_list;
	    for (var j = 0; j < cn.length; j++) {
		// Checking for 'X' co-ordinate match OR 'Y' co-ordinate match because
		// sometimes some element load takes time.
		// if ((cn[j].top == tn[i].top ||
		//      cn[j].left == tn[i].left) &&
		//     cn[j].username == tn[i].username) {
		//     bool_found = true;
		//     break;
		// }
		if (!tn[i].counted_before &&
		    cn[j].username == tn[i].username) {
		    bool_at_least_one_username_present = true;
		    tn[i].counted_before = true;
		    break;
		}
	    }
	}
	
	if (bool_at_least_one_username_present) {
	    return true;
	}
	else {
	    return false;
	}

	return false;
    }

    // I need this function because each web page fetch consists of multiple
    // HTTP GET requests for various resources on the web page.
    // For all those GET requests, same cookie must be blocked.
    // Thus, someone else from outside will have to know that the webpage fetch
    // is complete and we should move to suppress next cookie.
    function web_request_fully_fetched(present_usernames, num_pwd_boxes) {
	var am_i_logged_in = undefined;
	var was_result_expected = false;
	tot_execution += 1;

	if (my_state == "st_cookiesets_block_nonduring_and_disabled" ||
	    my_state == "st_gub_cookiesets_block_test") {
	    tot_cookiesets_tested_overall += 1;
	    tot_cookiesets_tested += 1;
	    tot_cookiesets_tested_this_round += 1;
	    if (my_state == "st_gub_cookiesets_block_test") {
		tot_gub_cookiesets_tested_overall += 1;
	    }
	}

	var bool_top_three_elems_present = true;
	if (top_three_elements_with_usernames != undefined) {
	    am_i_logged_in = detect_login_status(present_usernames);
	    if (!am_i_logged_in && my_state != "st_gub_cookiesets_block_test") {
		console.log("Here here: Delete me");
	    }
	}

	num_pwd_boxes = (num_pwd_boxes == undefined) ? 0 : num_pwd_boxes;

	// Code to for setting initial values for next epoch.

	if (my_state == 'st_cookie_test_start') {
	    console.log("APPU DEBUG: Cookie testing state: " + my_state);
	    console.log("APPU DEBUG: am_i_logged_in: " + am_i_logged_in + ", " + 
			"page_load_success: " + page_load_success + ", " +
			"num_pwd_boxes: " + num_pwd_boxes);
	    
	    if (page_load_success) {
		was_result_expected = true;
	    }
	    
	    if (config_skip_initial_states) {
		is_st_start_with_no_cookies_done = true;
		is_suspected_account_cookies_pass_test_done = true;
		is_suspected_account_cookies_block_test_done = true;
		
		// Since we are skipping tests, just assign the expected values for
		// following variables:
		bool_are_all_account_cookies_in_default_store = true;
		bool_are_account_cookies_in_during_cookies = true;
		bool_are_account_cookies_not_in_nonduring_cookies = true;
		
		for (var j = 0; j < suspected_account_cookies_array.length; j++) {
		    disabled_cookies.push(suspected_account_cookies_array[j]);
		}
		
		verified_account_super_cookiesets_array.push(disabled_cookies);
		rc = add_to_set(disabled_cookies, undefined, verified_account_super_decimal_cookiesets, 
				suspected_account_cookies_array,
				undefined);
		
		if (bool_switch_to_testing) {
		    last_non_verification_state = "st_testing";
		}
		else {
		    last_non_verification_state = "st_suspected_cookies_block_test";
		}
	    }
	}
	else if (my_state == 'st_verification_epoch') {
	    if (top_three_elements_with_usernames == undefined) {
		if (Object.keys(present_usernames.frequency).length > 0) {
		    am_i_logged_in = true;
		    
		    top_three_elements_with_usernames = [];
		    var tot_uname_elems = 3;
		    
		    if (present_usernames.elem_list.length < 3) {
			tot_uname_elems = present_usernames.elem_list.length;
		    }
		    
		    for (var i = 0; i < tot_uname_elems; i++) {
			top_three_elements_with_usernames.push(present_usernames.elem_list[i]);
		    }
		    console.log("APPU DEBUG: Total number usernames detected in the logged-in state: " + tot_uname_elems);
		}
		else {
		    am_i_logged_in = false;
		}
	    }

	    if (am_i_logged_in != undefined) {
		num_verification_page_load_attempts += 1;
		if (page_load_success || am_i_logged_in) {
		    num_verification_page_load_success += 1;
		}

		if (am_i_logged_in) {
		    if (num_pwd_boxes == 0) {
			// EXPECTED branch
			// Either page loaded successfully and usernames found OR
			// page not loaded successfully (but content script ran) and usernames are found
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: User is logged-in for test 'st_verification_epoch'");
			verification_epoch_results(am_i_logged_in);
			was_result_expected = true;
		    }
		    else {
			// LESS SERIOUS error branch, why are there password boxes?
			console.log("APPU Error: NOT EXPECTED: User is logged-in, page_load_success(" + page_load_success
				    + "), BUT number of password boxes present: " + num_pwd_boxes +
				    " for test 'st_verification_epoch'");
			report_fatal_error("Verification-epoch-pwd-boxes-present");
			was_result_expected = false;
		    }
		}
		else {
		    if (page_load_success) {
			// SERIOUS error branch (User probably initiated log out or our testing messed up user-session)
			console.log("APPU Error: NOT EXPECTED: User is NOT logged-in, num-pwd-boxes("+ num_pwd_boxes 
				    +"), for test 'st_verification_epoch'");
			report_fatal_error("Verification-epoch-page-load-no-usernames");
			was_result_expected = false;
		    }
		    else {
			// LESS SERIOUS error branch (Network lag?)
			// page not loaded properly.
			console.log("APPU Error: NOT EXPECTED: User is NOT logged-in, num-pwd-boxes(" + num_pwd_boxes
				    + "), page not loaded for test 'st_verification_epoch'");
			report_fatal_error("Verification-epoch-no-page-load-no-usernames");
			was_result_expected = false;
		    }
		}
	    }
	    else {
		// SERIOUS error branch (User name detection test never carried out)
		console.log("APPU Error: NOT EXPECTED: Username detection test never " + 
			    "carried out for 'st_verification_epoch'");
		report_fatal_error("Verification-epoch-no-username-detection-test: Page load: " + page_load_success);
		was_result_expected = false;
	    }
	}
	else if (my_state == 'st_start_with_no_cookies') {
	    if (am_i_logged_in != undefined) {
		if (am_i_logged_in) {
		    // SERIOUS error branch: When starting with no cookies, user should not be logged-in
		    //                       Critical error in Appu code.
		    console.log("APPU Error: NOT EXPECTED: Usernames detected for 'st_start_with_no_cookies', " +
				"num-pwd-boxes: " + num_pwd_boxes);
		    report_fatal_error("Start-with-no-cookies-usernames-found");
		    was_result_expected = false;
		}
		else {
		    if (page_load_success) {
			// EXPECTED branch: User should not be logged-in after page is loaded
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames NOT detected for " + 
				    "'st_start_with_no_cookies', num-pwd-boxes: " + num_pwd_boxes);
			update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
			is_st_start_with_no_cookies_done = true;
			was_result_expected = true;
		    }
		    else {
			// LESS SERIOUS error branch: No point in proceeding if page does 
			// not get loaded while starting with empty shadow_cookie_store
			console.log("APPU Error: NOT EXPECTED: Page is not loaded properly. No point in proceeding. " +
				    "num-pwd-boxes: " + num_pwd_boxes +
				    ", for 'st_start_with_no_cookies'");
			report_fatal_error("Start-with-no-cookies-no-usernames-no-page-load");
			was_result_expected = false;
		    }
		}
	    }
	    else {
		// SERIOUS error branch (User name detection test never carried out)
		console.log("APPU Error: NOT EXPECTED: Username detection test never " + 
			    "carried out for 'st_start_with_no_cookies'");
		report_fatal_error("Start-with-no-cookies-no-username-detection-test: Page load: " + page_load_success);
		was_result_expected = false;
	    }
	}
	else if (my_state == 'st_suspected_cookies_pass_test') {
	    if (am_i_logged_in != undefined) {
		if (am_i_logged_in) {
		    if (num_pwd_boxes == 0) {
			// EXPECTED branch
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames detected for 'st_suspected_cookies_pass_test'");
			update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
			is_suspected_account_cookies_pass_test_done = true;
			was_result_expected = true;
		    }
		    else {
			// LESS SERIOUS error branch, why are there password boxes?
			console.log("APPU Error: NOT EXPECTED: User is logged-in, page_load_success(" + page_load_success
				    + "), BUT number of password boxes present: " + num_pwd_boxes +
				    " for test 'st_suspected_cookies_pass_test'");
			report_fatal_error("During-cookies-pass-epoch-pwd-boxes-present");
			was_result_expected = false;
		    }
		}
		else {
		    if (page_load_success) {
			// (Usernames not detected even if page loaded, we could
			// be detecting 'DURING' cookies incorrectly)
			// Need to switch to expand state and find those cookies.
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames NOT detected, " + 
				    "num-pwd-boxes: " + num_pwd_boxes +
				    ", for 'st_suspected_cookies_pass_test'");
			console.log("APPU DEBUG: Seems like account-cookies in non-DURING set");
			update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
			is_suspected_account_cookies_pass_test_done = true;
			was_result_expected = true;
		    }
		    else {
			// SERIOUS error branch (Usernames not detected, page NOT loaded, test
			// unconclusive. Could be a network issue)
			console.log("APPU Error: NOT EXPECTED: Usernames NOT detected, page NOT loaded, " + 
				    "num-pwd-boxes: " + num_pwd_boxes + 
				    ", for 'st_suspected_cookies_pass_test'");
			report_fatal_error("During-cookies-pass-no-usernames-no-page-load");
			was_result_expected = false;
		    }
		}
	    }
	    else {
		// SERIOUS error branch (user name detection test never carried out)
		console.log("APPU Error: NOT EXPECTED: Username detection test never " + 
			    "carried out for 'st_suspected_cookies_pass_test'");
		report_fatal_error("During-cookies-pass-no-username-detection-test: Page load: " + page_load_success);
		was_result_expected = false;
	    }
	}
	else if (my_state == 'st_suspected_cookies_block_test') {
	    if (am_i_logged_in != undefined) {
		if (am_i_logged_in) {
		    // (Usernames found even when all 'DURING' cookies blocked.
		    // This means we are not detecting them correctly)
		    // Need to switch to expand cookie state.
		    console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames found, " + 
				"num-pwd-boxes: " + num_pwd_boxes +
				", for 'st_suspected_cookies_block_test'");
		    console.log("APPU DEBUG: Seems like account-cookies in non-DURING set");
		    update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
		    is_suspected_account_cookies_block_test_done = true;
		    was_result_expected = true;

// 		    console.log("APPU Error: NOT EXPECTED: Usernames found " + 
// 				"for 'st_suspected_cookies_block_test', Page load: " + page_load_success +
// 				", num-pwd-boxes: " + num_pwd_boxes);
// 		    report_fatal_error("During-cookies-block-usernames-found: Page load: " + page_load_success);
// 		    was_result_expected = false;
		}
		else {
		    if (page_load_success) {
			// EXPECTED branch
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames NOT detected for " + 
				    "'st_suspected_cookies_block_test', num-pwd-boxes: " + num_pwd_boxes);
			update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
			is_suspected_account_cookies_block_test_done = true;
			was_result_expected = true;
		    }
		    else {
			// LESS SERIOUS error branch (Usernames NOT found when all 'DURING' cookies blocked.
			// But page is not fully loaded (network lag?). Test is inconclusive and we better stop further
			// testing.)
			console.log("APPU Error: NOT EXPECTED: Usernames NOT detected, Page NOT loaded, " + 
				    "num-pwd-boxes: " + num_pwd_boxes +
				    ", for 'st_suspected_cookies_block_test'");
			report_fatal_error("During-cookies-block-no-usernames-no-page-load");
			was_result_expected = false;
		    }
		}
	    }
	    else {
		// SERIOUS error branch (user name detection test never carried out)
		console.log("APPU Error: NOT EXPECTED: Username detection test never " + 
			    "carried out for 'st_suspected_cookies_block_test'");
		report_fatal_error("During-cookies-block-no-username-detection-test: Page load: " + page_load_success);
		was_result_expected = false;
	    }
	}
	else if (my_state == "st_testing") {
	    console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames detection test " + 
			"done, page loaded, num-pwd-boxes: " + num_pwd_boxes + 
			", for 'st_testing'");
	    are_disabled_cookies_regenerated();
	    update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
	    was_result_expected = true;

	}
	else if (my_state == "st_cookiesets_block_nonduring_and_disabled" ||
		 my_state == "st_cookiesets_block_disabled" ||
		 my_state == "st_expand_suspected_account_cookies") {
	    if (am_i_logged_in != undefined) {
		if (page_load_success) {
		    // EXPECTED branch
		    console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames detection test " + 
				"done, page loaded, num-pwd-boxes: " + num_pwd_boxes + 
				", for '"+ my_state +"'");
		    are_disabled_cookies_regenerated();
		    update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
		    was_result_expected = true;
		}
		else {
		    if (am_i_logged_in) {
			// EXPECTED branch
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames are detected, page is not loaded, " + 
				    "num-pwd-boxes: " + num_pwd_boxes + 
				    ", for '" + my_state + "'");
			are_disabled_cookies_regenerated();
			update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
			was_result_expected = true;
		    }
		    else {
			if (num_pwd_boxes > 0) {
			    if (bool_pwd_box_should_be_present) {
				// Even if page was not loaded and even if usernames were not found,
				// password box is present and from previous testing, it is present
				// when user is not logged in.
				console.log("APPU DEBUG: EXPECTED: Usernames are NOT detected, page is not loaded, " +
					    "BUT password box is present, " + 
					    "num-pwd-boxes: " + num_pwd_boxes + 
					    ", for '" + my_state + "'");
				are_disabled_cookies_regenerated();
				update_cookie_status(false, (num_pwd_boxes > 0));
				was_result_expected = true;
			    }
			    else {
				// No page loaded, no usernames found, password box is not necessarily present
				console.log("APPU DEBUG: NOT EXPECTED: Usernames are NOT detected, page is not loaded, " +
					    "num-pwd-boxes: " + num_pwd_boxes + 
					    ", for '" + my_state + "'");
				tot_inconclusive_cookiesets_overall += 1;
				was_result_expected = true;
			    }
			}
			else {
			    // INCONCLUSIVE branch BUT nothing serious. Don't call update_cookie_status()
			    console.log("APPU DEBUG: NOT EXPECTED: Usernames NOT detected BUT page is not loaded" + 
					", num-pwd-boxes: " + num_pwd_boxes + 
					", for '" + my_state + "'");
			    tot_inconclusive_cookiesets_overall += 1;
			    was_result_expected = true;
			}
		    }
		}
	    }
	    else {
		// NON-SERIOUS error branch (user name detection test never carried out)
		// But no need to stop testing 
		console.log("APPU DEBUG: NON-SERIOUS: Username detection test never " + 
			    "carried out for '" + my_state + "', Page load: " + page_load_success);
		tot_inconclusive_cookiesets_overall += 1;
		was_result_expected = true;
	    }
	}
	else if (my_state == "st_gub_cookiesets_block_test") {
	    if (am_i_logged_in != undefined) {
		if (page_load_success) {
		    // EXPECTED branch
		    console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames detection test " + 
				"done, page loaded, num-pwd-boxes: " + num_pwd_boxes + 
				", for 'st_gub_cookiesets_block_test'");
		    are_disabled_cookies_regenerated();
		    update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
		    was_result_expected = true;
		}
		else {
		    if (am_i_logged_in) {
			// EXPECTED branch
			console.log("APPU DEBUG: WORKS-AS-EXPECTED: Usernames are detected, page is not loaded, " + 
				    "num-pwd-boxes: " + num_pwd_boxes + 
				    ", for 'st_gub_cookiesets_block_test'");
			are_disabled_cookies_regenerated();
			update_cookie_status(am_i_logged_in, (num_pwd_boxes > 0));
			was_result_expected = true;
		    }
		    else {
			if (num_pwd_boxes > 0) {
			    if (bool_pwd_box_should_be_present) {
				// Even if page was not loaded and even if usernames were not found,
				// password box is present and from previous testing, it is present
				// when user is not logged in.
				console.log("APPU DEBUG: EXPECTED: Usernames are NOT detected, page is not loaded, " + 
					    "BUT password box is present, " +
					    "num-pwd-boxes: " + num_pwd_boxes + 
					    ", for 'st_gub_cookiesets_block_test'");
				are_disabled_cookies_regenerated();
				update_cookie_status(false, (num_pwd_boxes > 0));
				was_result_expected = true;
			    }
			    else {
				// No page loaded, no usernames found, password box is not necessarily present
				console.log("APPU DEBUG: NOT EXPECTED: Usernames are NOT detected, page is not loaded, " +
					    "num-pwd-boxes: " + num_pwd_boxes + 
					    ", for '" + my_state + "'");
				tot_inconclusive_cookiesets_overall += 1;
				was_result_expected = true;
			    }
			}
			else {
			    // INCONCLUSIVE branch BUT nothing serious. Don't call update_cookie_status()
			    console.log("APPU DEBUG: NOT EXPECTED: Usernames NOT detected BUT page is not loaded" + 
					", num-pwd-boxes: " + num_pwd_boxes + 
					", for 'st_gub_cookiesets_block_test'");
			    tot_inconclusive_cookiesets_overall += 1;
			    was_result_expected = true;
			}
		    }
		}
	    }
	    else {
		// NON-SERIOUS error branch (user name detection test never carried out)
		// But no need to stop testing 
		console.log("APPU DEBUG: NON-SERIOUS: Username detection test never " + 
			    "carried out for 'st_gub_cookiesets_block_test', Page load: " + page_load_success);
		tot_inconclusive_cookiesets_overall += 1;
		was_result_expected = true;
	    }
	}

	// Goto next state, and return the next state.
	return goto_next_state(was_result_expected);
    }
    
    
    function handle_set_cookie_responses(details) {
	var final_rh = [];
	var rh = details.responseHeaders;

	if (bool_is_cookie_testing_done) {
	    return;
	}

	for (var i = 0; i < rh.length; i++) {
	    if (rh[i].name.toLowerCase() == "content-length") {
		increment_recvd_bytes(parseInt(rh[i].value));
	    }

	    if (rh[i].name.toLowerCase() != "set-cookie") {
		final_rh.push(rh[i]);
	    }
	    else {
		var cookie_struct = {};
		var cookie_properties = rh[i].value.split(";");
		var cookie_name_value = cookie_properties.shift();
		
		var matched_entries = cookie_name_value.match(/(.*?)=(.*)/);

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
		    var curr_property_small = curr_property.toLowerCase();

		    if (curr_property_small.indexOf("path") != -1) {
			var matched_entries = curr_property.match(/(.+?)=(.*)/);
			cookie_struct.path = matched_entries[2].trim();
		    }
		    else if (curr_property_small.indexOf("expires") != -1) {
			var matched_entries = curr_property.match(/(.+?)=(.*)/);
			cookie_struct.expirationDate = (new Date(matched_entries[2].trim())).getTime()/1000;
		    }
		    else if (curr_property_small.indexOf("max-age") != -1) {
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
		    else if (curr_property_small.indexOf("domain") != -1) {
			var matched_entries = curr_property.match(/(.+?)=(.*)/);
			cookie_struct.domain = matched_entries[2].trim();
		    }
		    else if (curr_property_small.indexOf("secure") != -1) {
			cookie_struct.secure = true;
			cookie_protocol = "https://";
		    }
		    else if (curr_property_small.indexOf("httponly") != -1) {
			cookie_struct.httpOnly = true;
		    }
		    else if (curr_property_small.indexOf("priority") != -1) {
			// Do nothing
			continue;
		    }
		    else {
			if (curr_property_small.indexOf("version") == -1) {
			    console.log("APPU DEBUG: Unexpected cookie property(" + curr_property +
					") for cookie: " + cookie_struct.name);
			}
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


		if (req_epch_table[details.requestid] == epoch_id) {
		    // Write to shadow cookie table only IF this response corresponds
		    // on HTTP request issued in this test epoch.
		    shadow_cookie_store[cookie_key] = cookie_struct;
		    //console.log("APPU DEBUG: Setting cookie in SHADOW_COOKIE_STORE: " + cookie_key);
		}
	    }
	}
	return {responseHeaders: final_rh};
    }
    
    
    // This function is different from replace_with_cookies_from_shadow_cookie_store().
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
	if (bool_is_cookie_testing_done) {
	    return;
	}
	
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
	
	if (current_single_cookie_test_index) {
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
			current_single_cookie_test_index);
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
			suspected_account_cookies_array[current_single_cookie_test_index]);
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
		var curr_test_cookie_name = suspected_account_cookies_array[current_single_cookie_test_index];
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
    function replace_with_cookies_from_shadow_cookie_store(details) {
	var original_http_request_cookies = undefined;
	var final_cookies = {};
	var final_cookie_str = "";
	var curr_domain = get_domain(details.url.split("/")[2]);

	if (bool_is_cookie_testing_done) {
	    return;
	}

	req_epch_table[details.requestid] = epoch_id;
	
	if (my_state == 'st_cookie_test_start') {
	    for (var i = 0; i < details.requestHeaders.length; i++) {
		if (details.requestHeaders[i].name == "Cookie") {
		    http_request_cookies = details.requestHeaders.splice(i, 1);
		    break;
		}
	    }

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
	    var shadow_cookie_name = cookie_url + ':' + shadow_cookie_store[c].name;	    

	    if (is_subdomain(cookie_url, details.url)) {
		if (shadow_cookie_store[c].session) {
		    my_cookies.push(cookie_name_value);
		}
		else if (shadow_cookie_store[c].expirationDate > curr_time) {
		    my_cookies.push(cookie_name_value);
		}
	    }
	}

	//	console.log("Here here: Here here here: URL: " + details.url);
	//      console.log("Here here: Cookiessssssssss:" + JSON.stringify(my_cookies));
	
	// console.log("APPU DEBUG: Original Cookies: " + 
	//	    original_cookie_array.length +
	//	    ", Length of shadow_cookie_store: " +
	//	    Object.keys(shadow_cookie_store).length +
	//	    ", Number of cookies constructed from my shadow_cookie_store: " + 
	//	    my_cookies.length + 
	//	    ", URL: " + details.url);
	
	if (my_cookies.length == 0 &&
	    my_domain == curr_domain) {
	    if (my_state != "st_start_with_no_cookies" &&
		my_state != "st_gub_cookiesets_block_test" &&
		my_state != "st_testing") {
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
	    replace_with_cookies_from_shadow_cookie_store,
	    handle_set_cookie_responses,
	    update_tab_id, 
	    init_cookie_investigation
	    ];
}


// Current URL of the form : http://ab.cderf.com/sdsdwer/rtr/sds?ere
// First gets a list of all the cookies that will get sent for this url.
// Then it will suppress each cookie one after the other and see which
// cookies correspond to account cookies.
// opt_start_params: An object containing which "state" the testing should start,
//                   as well as additional parameters such as cookiesets to test
//                   if the state is "st_testing"
function detect_account_cookies(current_url, 
				cookie_names, 
				opt_config_cookiesets,
				opt_config_forceshut,
				opt_config_skip_initial_states,
				opt_start_params,
				opt_open_new_window) {
    // This returns an object with keys: domain + path + ":" + cookie_name and
    // value as hashed cookie value. Because the HTTP requests only have cookie names
    // and cookie names can be repeated often (as seen in google's case), there is no
    // way to distinguish between cookies. That will have to be done using hashed values.
    var account_cookies = {};

    var config_cookiesets = "random";
    var config_forceshut = 5;
    var config_skip_initial_states = false;
    var config_open_new_window = false;

    // opt_config_forceshut will be time in minutes after which the cookie-investigation tab
    // would get closed. If not specified, default values is '5' minutes.
    config_forceshut = (opt_config_forceshut == undefined) ? 5 : opt_config_forceshut;

    if (opt_config_skip_initial_states != undefined) {
    // opt_config_skip_initial_states will make it jump directly to "st_cookiesets_block_nonduring_and_disabled"
	config_skip_initial_states = opt_config_skip_initial_states;
    }

    if (opt_config_cookiesets != undefined) {
	// Possible values are: "none", "random", "all"
	config_cookiesets = opt_config_cookiesets;
    }

    if (opt_open_new_window != undefined) {
	// Possible values are: "none", "random", "all"
	config_open_new_window = opt_open_new_window;
    }

    if (cookie_names == undefined) {
	// Gets all 'DURING' cookies and not just cookies matching this URL
	account_cookies = get_account_cookies(current_url, false);
    }
    else {
	account_cookies = get_selective_account_cookies(current_url, cookie_names);
    }

    function continue_from_last_ci_state(ci_state) {
	var config_start_params;
	if (opt_start_params != undefined) {
	    config_start_params = opt_start_params;
	}
	else {
	    config_start_params = {};
	    config_start_params.pending_ci_state = ci_state;
	}
	
	var ret_functions = cookie_investigator(account_cookies, 
						current_url, 
						config_cookiesets, 
						config_forceshut, 
						config_skip_initial_states,
						config_start_params);
	
	if (ret_functions != -1) {
	    open_cookie_slave_tab(current_url, 
				  ret_functions[0], 
				  ret_functions[1], 
				  ret_functions[2], 
				  ret_functions[3],
				  config_open_new_window);
	}
	else {
	    console.log("APPU Error: Could not do cookie-investigation for: " + current_url);
	}
    }

    load_ci_state(current_url, continue_from_last_ci_state);
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

function test_gx_pair_cookies() {
    var gx_cookie = "https://.mail.google.com/mail:GX";
    var test_cookies = [];

    var rc = get_domain_cookies("https://mail.google.com/");
    var aca = Object.keys(rc);

    detect_account_cookies("https://mail.google.com/mail/u/0/#inbox", 
			   undefined, 
			   "all", 
			   10, undefined, 
			   { starting_state : "st_testing", 
				   cookies_array : ["https://.mail.google.com/mail:GX"], 
				   account_cookies_array : aca });

    return;

    var cs = pii_vault.aggregate_data.session_cookie_store["google.com"];

    for (c in cs.cookies) {
	if (cs.cookies[c].current_state == 'absent') {
	    // No point in testing for cookies that are not present in the 
	    // default cookie-store.
	    continue;
	}

	if (cs.cookies[c].cookie_class == 'during') {
	    continue;
	}
	test_cookies.push([gx_cookie, c]);
    }

    return test_cookies;
}


function test_google_calendar_cookies() {
//     var omit_cookie = [
// 		       "https://mail.google.com/mail/u/0:GMAIL_AT",
// 		       "http://mail.google.com/mail/u/0:gmailchat",
// 		       "http://mail.google.com/mail/u/0:GMAIL_IMP",
// 		       "https://mail.google.com/mail:S",
// 		       "https://.mail.google.com/mail:GXSP",
// 		       "https://.mail.google.com/mail:GX",
// 		       "https://accounts.google.com/:GAPS",
// 		       "http://.google.com/:NID",
// 		       "https://accounts.google.com/:LSID",
// 		       "http://.google.com/:APISID",
// 		       "https://.google.com/:SAPISID",
// 		       "https://apis.google.com/:BEAT",
// 		       "https://plus.google.com/:OTZ"];

    var omit_cookie = [
		       "http://.google.com/:HSID",
		       "https://.google.com/:SSID",
		       "http://.google.com/:SID",
		       // 		       "https://accounts.google.com/:LSID"
		       ];

    var test_cookies = [];

    var rc = get_domain_cookies("https://mail.google.com/");
    var aca = Object.keys(rc);

    for (var i = 0; i < aca.length; i++) {
	if (omit_cookie.indexOf(aca[i]) != -1) {
	    test_cookies.push(aca[i]);
	}
    }


    detect_account_cookies("https://www.google.com/calendar/render", 
			   undefined, 
			   "all", 
			   10, undefined, 
			   { starting_state : "st_testing", 
				   cookies_array : [test_cookies], 
				   account_cookies_array : aca });


    return;
}



function test_netflix_cookies() {
//     var test_cookies = [
// 			[
// 			 'http://.netflix.com/:profilesNewUser',
// 			 ],
// 			];


//     var rc = get_domain_cookies("http://movies.netflix.com/WiHome");
//     var aca = Object.keys(rc);

//     detect_account_cookies("http://movies.netflix.com/WiHome", 
// 			   undefined, 
// 			   "all", 
// 			   10, undefined, 
// 			   { starting_state : "st_testing", 
// 				   cookies_array : test_cookies, 
// 				   account_cookies_array : aca });

//     return;

    var omit_cookies = [
			//			'http://.netflix.com/:NetflixId',
 			 "http://.netflix.com/:profilesNewUser",
 			 "https://.netflix.com/:SecureNetflixId",
 			 "http://.netflix.com/:profilesNewSession"
			];
    
    var test_cookies = [];

    var rc = get_domain_cookies("http://movies.netflix.com/WiHome");
    var aca = Object.keys(rc);

    for (var i = 0; i < aca.length; i++) {
	if (omit_cookies.indexOf(aca[i]) == -1) {
	    test_cookies.push(aca[i]);
	}
    }

    detect_account_cookies("http://movies.netflix.com/WiHome", 
			   undefined, 
			   "all", 
			   10, undefined, 
			   { starting_state : "st_testing", 
				   cookies_array : [test_cookies], 
				   account_cookies_array : aca });

    return;
}

function test_gdrive_cookies() {

    var omit_cookies = [
			// ["http://.google.com/:NID"],
			// ["http://.google.com/:HSID"],
			// ["https://mail.google.com/mail/u/0:GMAIL_AT"],
			["https://www.google.com/calendar:CAL"],
		       ];

    var pass_cookies = [];

    var rc = get_domain_cookies("https://drive.google.com/");
    var aca = Object.keys(rc);

    for (var j = 0; j < omit_cookies.length; j++) {
	var curr_pass_cookies = [];
	for (var i = 0; i < aca.length; i++) {
	    if (omit_cookies[j].indexOf(aca[i]) == -1) {
		curr_pass_cookies.push(aca[i]);
	    }
	}
	pass_cookies.push(curr_pass_cookies);
    }

    detect_account_cookies("https://drive.google.com/?tab=mo&authuser=0#my-drive", 
			   undefined, 
			   "all", 
			   10, undefined, 
			   { starting_state : "st_testing", 
				   cookies_array : pass_cookies, 
				   account_cookies_array : aca });


    return;
}

function test_netflix_cookies() {

    var omit_cookies = [
			[
			 "https://.netflix.com/:SecureNetflixId",
			 ],
		       ];

    var pass_cookies = [];

    var rc = get_domain_cookies("http://netflix.com/");
    var aca = Object.keys(rc);

    for (var j = 0; j < omit_cookies.length; j++) {
	var curr_pass_cookies = [];
	for (var i = 0; i < aca.length; i++) {
	    if (omit_cookies[j].indexOf(aca[i]) == -1) {
		curr_pass_cookies.push(aca[i]);
	    }
	}
	pass_cookies.push(curr_pass_cookies);
    }

    detect_account_cookies("http://movies.netflix.com/WiHome", 
			   undefined, 
			   "all", 
			   10, undefined, 
			   { starting_state : "st_testing", 
				   cookies_array : pass_cookies, 
				   account_cookies_array : aca });


    return;
}

function test_gmail_cookies() {
    var test_cookies = [
			[
			 "https://accounts.google.com/:LSID",
			 ],
			[
			 "http://.google.com/:SID",
			 ],
			[
			 "https://.google.com/:SSID",
			 ],
			[
			 "http://.google.com/:HSID"
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "http://.google.com/:HSID"
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "http://.google.com/:SID"
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "https://.google.com/:SSID"
			 ],
			[
			 "http://.google.com/:SID",
			 "https://.google.com/:SSID",
			 ],
			[
			 "http://.google.com/:SID",
			 "http://.google.com/:HSID"
			 ],
			[
			 "https://.google.com/:SSID",
			 "http://.google.com/:HSID"
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "http://.google.com/:SID",
			 "https://.google.com/:SSID",
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "http://.google.com/:SID",
			 "http://.google.com/:HSID"
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "https://.google.com/:SSID",
			 "http://.google.com/:HSID"
			 ],
			[
			 "http://.google.com/:SID",
			 "https://.google.com/:SSID",
			 "http://.google.com/:HSID"
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "http://.google.com/:SID",
			 "https://.google.com/:SSID",
			 "http://.google.com/:HSID"
			 ],
			];


    var rc = get_domain_cookies("https://mail.google.com/");
    var aca = Object.keys(rc);

    detect_account_cookies("https://mail.google.com/mail/u/0/#inbox", 
			   undefined, 
			   "all", 
			   10, undefined, 
			   { starting_state : "st_testing", 
				   cookies_array : test_cookies, 
				   account_cookies_array : aca });

    return;
}

function test_google_cookies() {
    var test_cookies = [
			[
			 "https://accounts.google.com/:LSID",
			 ],
			[
			 "http://.google.com/:SID",
			 ],
			[
			 "https://.google.com/:SSID",
			 ],
			[
			 "http://.google.com/:HSID"
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "http://.google.com/:HSID"
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "http://.google.com/:SID"
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "https://.google.com/:SSID"
			 ],
			[
			 "http://.google.com/:SID",
			 "https://.google.com/:SSID",
			 ],
			[
			 "http://.google.com/:SID",
			 "http://.google.com/:HSID"
			 ],
			[
			 "https://.google.com/:SSID",
			 "http://.google.com/:HSID"
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "http://.google.com/:SID",
			 "https://.google.com/:SSID",
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "http://.google.com/:SID",
			 "http://.google.com/:HSID"
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "https://.google.com/:SSID",
			 "http://.google.com/:HSID"
			 ],
			[
			 "http://.google.com/:SID",
			 "https://.google.com/:SSID",
			 "http://.google.com/:HSID"
			 ],
			[
			 "https://accounts.google.com/:LSID",
			 "http://.google.com/:SID",
			 "https://.google.com/:SSID",
			 "http://.google.com/:HSID"
			 ],
			];


    var rc = get_domain_cookies("https://mail.google.com/");
    var aca = Object.keys(rc);

    detect_account_cookies("https://www.google.com/", 
			   undefined, 
			   "all", 
			   10, undefined, 
			   { starting_state : "st_testing", 
				   cookies_array : test_cookies, 
				   account_cookies_array : aca });

    return;
}


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


function test_replace_with_cookies_from_shadow_cookie_store(details) {
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
    chrome.webRequest.onBeforeSendHeaders.addListener(test_replace_with_cookies_from_shadow_cookie_store,
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

function test_compare_cookieset_generation(x, tot_cookies) {
    var rc1 = generate_binary_cookiesets_X("zz", x, tot_cookies, [], []);
    var rc2 = generate_binary_cookiesets_X_efficient("zz", x, tot_cookies, [], []);
    if (JSON.stringify(rc1.binary_cookiesets) != JSON.stringify(rc2.binary_cookiesets)) {
	console.log("APPU Error: Cookiesets generated efficiently do not match with exponential cookieset generation");
    }
    else {
	console.log("APPU DEBUG: Success, cookiesets match");
    }
}

function test_compare_gub_cookieset_generation(x, tot_cookies) {
    var rc1 = generate_super_cookiesets("zz", tot_cookies, [], [], [], x);
    var rc2 = generate_super_cookiesets_efficient("zz", x, tot_cookies, [], [], []);

    if (JSON.stringify(rc1.binary_cookiesets) != JSON.stringify(rc2.binary_cookiesets)) {
	console.log("APPU Error: Cookiesets generated efficiently do not match with exponential cookieset generation");
    }
    else {
	console.log("APPU DEBUG: Success, cookiesets match");
    }
}

function test_twitter() {
    var a = new Date();
    var options = {
	url : "https://.twitter.com",
	name: "auth_token",
	value: "3",
	domain: "https://.twitter.com",
	path: "/",
	secure: true,
	httpOnly: true,
	expirationDate: a.getTime() + 3600000
    };

    chrome.cookies.set(options, function(rc) {
	    if (rc == null) {
		console.log("Here here: Failed to set the cookie because: " + JSON.stringify(chrome.runtime.lastError));
	    }
	    else {
		console.log("Here here: Success: " + JSON.stringify(rc));
	    }
	});
}

function test_cookieset_generation(tot_cookies,
				   verified_strict_account_decimal_cookiesets,
				   verified_strict_non_account_decimal_cookiesets,
				   verified_non_account_super_decimal_cookiesets,
				   skipped_sets) {
    var curr_binary_cs   = undefined;
    var bcs_get_next     = [];
    var dcs_get_next     = [];

    do {
	var rc = get_next_binary_cookieset_X(curr_binary_cs, 
					     3, 
					     tot_cookies, 
					     verified_strict_account_decimal_cookiesets,
					     verified_strict_non_account_decimal_cookiesets,
					     verified_non_account_super_decimal_cookiesets,
					     "normal",
					     skipped_sets);
	if (rc == 0) {
	    break;
	}
	else if (rc == 1) {
	    console.log("APPU DEBUG: BIG ERROR");
	    return;
	}
	else if (rc == -1) {
	    console.log("APPU DEBUG: BIG ERROR");
	    return;
	}
	else {
	    bcs_get_next.push(rc.binary_cookieset);
	    dcs_get_next.push(rc.decimal_cookieset);
	}
    } while(1);

    var rc = generate_binary_cookiesets_X_efficient("aa", 
						    3, 
						    tot_cookies, 
						    verified_strict_account_decimal_cookiesets,
						    verified_non_account_super_decimal_cookiesets);

    console.log("APPU DEBUG: Cookiesets generated by get_next(): " + bcs_get_next.length);
    console.log("APPU DEBUG: Cookiesets generated by get_next(): " + rc.binary_cookiesets.length);
}

function test_content_length_reader(details) {
    console.log("I AM HERE, I AM HERE, I AM HERE, I AM HERE, I AM HERE, I AM HERE, I AM HERE, ");
    for (var i = 0; i < details.requestHeaders.length; i++) {
	if (details.requestHeaders[i].name.toLowerCase() == "content-length") {
	    console.log("");
	    console.log("MUHAHAHAHAH HERE HERE HERE:" + details.requestHeaders[i].value);
	    console.log("");
	    increment_sent_bytes(parseInt(details.requestHeaders[i].value));
	}
    }
}