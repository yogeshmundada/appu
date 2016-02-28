
function passively_detect_names_in_cookies(pi_values, all_cookies) {
    var detected_val = [];
    try {
	var all_names = pi_values;
	for (var v in all_names) {
	    for (var k = 0; k < all_cookies.length; k++) {
		var domain = all_cookies[k].domain;
		if (all_cookies[k].value != undefined) {
		    if (all_cookies[k].value.indexOf(v) != -1 && v.length > 4) {
			console.log("DELETE ME: Adding value: " + v);
			detected_val.push([domain, "name", v, "cookie-inspection"]);
		    }
		}
	    }
	}
	return detected_val;
    } 
    catch (e) {
	console.log("ERROR: In exception: " + e);
    }
}


function passively_detect_emails_in_cookies(pi_values, all_cookies) {
    var detected_val = [];
    try {
	var all_emails = pi_values;
	for (var v in all_emails) {
	    for (var k = 0; k < all_cookies.length; k++) {
		var domain = all_cookies[k].domain;
		if (all_cookies[k].value != undefined) {
		    if (all_cookies[k].value.indexOf(v) != -1 && v.length > 4) {
			console.log("DELETE ME: Adding value: " + v);
			detected_val.push([domain, "email", v, "cookie-inspection"]);
		    }
		}
	    }
	}
	return detected_val;
    }
    catch (e) {
	console.log("ERROR: In exception: " + e);
    }
}


function passively_detect_usernames_in_cookies(pi_values, all_cookies) {
    var detected_val = [];
    try {
	var all_usernames = pi_values;
	for (var v in all_usernames) {
	    for (var k = 0; k < all_cookies.length; k++) {
		var domain = all_cookies[k].domain;
		if (all_cookies[k].value != undefined) {
		    if (all_cookies[k].value.indexOf(v) != -1 && v.length > 4) {
			console.log("DELETE ME: Adding value: " + v);
			detected_val.push([domain, "username", v, "cookie-inspection"]);
		    }
		}
	    }
	}
	return detected_val;
    }
    catch (e) {
	console.log("ERROR: In exception: " + e);
    }
}


function passively_detect_zipcodes_in_cookies(pi_values, all_cookies) {
    var detected_val = [];
    try {
	var all_zipcodes = pi_values;
	var regex_digits = /([0-9]+)/g;

	for (var v in all_zipcodes) {
	    for (var k = 0; k < all_cookies.length; k++) {
		var domain = all_cookies[k].domain;
		if (all_cookies[k].value != undefined) {
		    var match_array = all_cookies[k].value.match(regex_digits);
		    if (match_array != null) {
			for (var j = 0; j < match_array.length; j++) {
			    if (match_array[j] == v) {
				console.log("DELETE ME: Adding value: " + v);
				detected_val.push([domain, "zipcode", v, all_cookies[k].value, "cookie-inspection"]);
			    }
			}
		    }
		}
	    }
	}
	return detected_val;
    }
    catch (e) {
	console.log("ERROR: In exception: " + e);
    }
}


function is_phone_possibly_present_in_string(phone, data) {
    var p1 = phone.substring(0,3); 
    var p2 = phone.substring(3,6); 
    var p3 = phone.substring(6,10);
    var temp_data = data;

    for (;;) {
	data = temp_data;

	var p1_index = data.indexOf(p1);
	if (p1_index == -1) {
	    return false;
	}
	temp_data = temp_data.substr(p1_index + p1.length);
	
	var p2_index = temp_data.indexOf(p2);
	if (p2_index == -1) {
	    continue;
	}
	temp = temp_data.substr(p2_index + p2.length);
	
	var p3_index = temp.indexOf(p3);
	if (p3_index != -1) {
	    p3_index = data.indexOf(p3);
	    if (p3_index != -1 && (p3_index - p1_index) <= 10) {
		return true;
	    }
	}
    }
    return false;
}


function passively_detect_phones_in_cookies(pi_values, all_cookies) {
    var detected_val = [];
    try {
	var all_phones = pi_values;
	for (var v in all_phones) {
	    for (var k = 0; k < all_cookies.length; k++) {
		var domain = all_cookies[k].domain;
		if (all_cookies[k].value != undefined) {
		    var phone = v;
		    var cookie_value = all_cookies[k].value;
		    if (is_phone_possibly_present_in_string(phone, cookie_value)) {
			console.log("DELETE ME: Adding value: " + v);
			detected_val.push([domain, "phone", v, all_cookies[k].value, "cookie-inspection"]);
		    }
		}
	    }
	}
	return detected_val;
    }
    catch (e) {
	console.log("ERROR: In exception: " + e);
    }
}


function is_address_possibly_present_in_string(address, data) {
    if (data.indexOf(address["street_number"]["long_name"]) == -1) {
	return false;
    }

    if (data.indexOf(address["zipcode"]["short_name"]) == -1) {
	return false;
    }

    return true;
}


function passively_detect_addresses_in_cookies(pi_values, all_cookies) {
    var detected_val = [];
    try {
	var all_addresses = pi_values;
	for (var v in all_addresses) {
	    for (var k = 0; k < all_cookies.length; k++) {
		var domain = all_cookies[k].domain;
		if (all_cookies[k].value != undefined) {
		    var address = all_addresses[v]["full-address"];
		    var cookie_value = all_cookies[k].value;
		    if (is_address_possibly_present_in_string(address, cookie_value)) {
			console.log("DELETE ME: Adding value: " + v);
			detected_val.push([domain, "address", v, all_cookies[k].value, "cookie-inspection"]);
		    }
		}
	    }
	}
	return detected_val;
    }
    catch (e) {
	console.log("ERROR: In exception: " + e);
    }
}


self.postMessage("Invoked cookies pi search worker");
self.onmessage = function(event) {
    var rc = {};
    var msg = event.data;
    if (msg.cmd == "name") {
	detected_val = passively_detect_names_in_cookies(msg.pi_values, msg.all_cookies);
	rc['status'] = 'success';
	rc['detected_val'] = detected_val;
    }
    else if (msg.cmd == "email") {
	detected_val = passively_detect_emails_in_cookies(msg.pi_values, msg.all_cookies);
	rc['status'] = 'success';
	rc['detected_val'] = detected_val;
    }
    else if (msg.cmd == "username") {
	detected_val = passively_detect_usernames_in_cookies(msg.pi_values, msg.all_cookies);
	rc['status'] = 'success';
	rc['detected_val'] = detected_val;
    }
    else if (msg.cmd == "zipcode") {
	detected_val = passively_detect_zipcodes_in_cookies(msg.pi_values, msg.all_cookies);
	rc['status'] = 'success';
	rc['detected_val'] = detected_val;
    }
    else if (msg.cmd == "phone") {
	detected_val = passively_detect_phones_in_cookies(msg.pi_values, msg.all_cookies);
	rc['status'] = 'success';
	rc['detected_val'] = detected_val;
    }
    else if (msg.cmd == "address") {
	detected_val = passively_detect_addresses_in_cookies(msg.pi_values, msg.all_cookies);
	rc['status'] = 'success';
	rc['detected_val'] = detected_val;
    } 
    else {
	rc['status'] = 'failure';
	rc['reason'] = "Wrong cmd: " + msg.cmd;
    }
    self.postMessage(rc);
    console.log("DELETE ME: Closing the worker thread");
    self.close();
};