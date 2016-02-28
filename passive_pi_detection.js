

function cookie_domain_to_domain(cookiedomain) {
    if (cookiedomain[0] == ".") {
	cookiedomain = cookiedomain.substr(1);
    }
    return get_domain(cookiedomain);
}



function passively_detect_pi_in_cookies(all_cookies) {
    passively_detect_pi_in_cookies_async("name", all_cookies);
    passively_detect_pi_in_cookies_async("email", all_cookies);
    passively_detect_pi_in_cookies_async("username", all_cookies);
    passively_detect_pi_in_cookies_async("zipcode", all_cookies);
    passively_detect_pi_in_cookies_async("phone", all_cookies);
    passively_detect_pi_in_cookies_async("address", all_cookies);
    console.log("DELETE ME: Done searching through cookies");
}

function check_pi_in_deleted_cookies(bkup_cookiestore) {
    read_from_local_storage(bkup_cookiestore, function(cs) {
	    var all_cookies = cs[bkup_cookiestore]["cookies"];
	    passively_detect_pi_in_cookies(all_cookies);
	});
}

function passively_detect_pi_in_cookies_async(cmd, all_cookies) {
    var cookie_worker = new Worker('cookies_pi_detect_workers.js');

    cookie_worker.onmessage = function(cmd) {
	return function(event) {
	    var rc = event.data;

	    if (typeof rc == "string") {
		console.log("cookie worker: " + rc);
	    }
	    else if (rc.status == "success") {
		console.log("cookie worker: " + JSON.stringify(rc));
		if (cmd == "name" ||
		    cmd == "email" ||
		    cmd == "username") {
		    var v = rc.detected_val
		    for (var i = 0; i < v.length; i++) {
			var domain = cookie_domain_to_domain(v[i][0]);
			add_single_value_to_pi_field_value_identifiers(domain,
								       v[i][1],
								       v[i][2],
								       v[i][3]);
		    }
		} else {
		    // zipcode, phone, address
		    var v = rc.detected_val
		    for (var i = 0; i < v.length; i++) {
			add_single_value_to_pi_passively_identified(domain,
								    v[i][1],
								    v[i][2],
								    v[i][3],
								    v[i][4]);
		    }
		}
	    }
	    else {
		console.log("cookie worker: " + rc.reason);
	    }
	}
    } (cmd);

    cookie_worker.postMessage({
	    'cmd' : cmd,
		'pi_values' : get_pi(cmd),
		'all_cookies' : all_cookies,
		});
}