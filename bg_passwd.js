

function calculate_pwd_similarity(grp_name) {
    var pwd_similarity = pii_vault.current_report.pwd_similarity;
    var pwd_groups = pii_vault.current_report.pwd_groups;
    var total_grps = 0;
    for (g in pwd_similarity) {
	pwd_similarity[g].push(0);
	total_grps++;
    }
    pwd_similarity[grp_name] = [];
    for (var i = 0; i < (total_grps+1); i++) {
	pwd_similarity[grp_name].push(0);
    }
    flush_selective_entries("current_report", ["pwd_similarity"]);

    for (var i = 0; i < report_tab_ids.length; i++) {
	chrome.tabs.sendMessage(report_tab_ids[i], {
	    type: "report-table-change-table",
	    table_name: "pwd_similarity",
	    pwd_similarity: pii_vault.current_report.pwd_similarity,
	    pwd_groups: pii_vault.current_report.pwd_groups,
	});
    }
}


//This function is supposed to generate group names such as 'A', 'B', .., 'AA', 'AB', 'AC' ..
function new_group_name(pwd_groups) {
    //Start at 'A'
    var init_group = 65;
    var new_name_detected = false;
    var new_name_arr = [];
    new_name_arr.push(init_group);

    while (!new_name_detected) {
	var char_new_name_arr = [];
	for (var i = 0; i < new_name_arr.length; i++) {
	    char_new_name_arr.push(String.fromCharCode(new_name_arr[i]));
	}
	var new_name = char_new_name_arr.reverse().join("");
	new_name_detected = !(('Grp ' + new_name) in pwd_groups);

	if (!new_name_detected) {
	    var array_adjusted = false;
	    while (!array_adjusted) {
		for (var j = 0; j < new_name_arr.length; j++) {
		    new_name_arr[j] += 1;
		    if (new_name_arr[j] <= 90) {
			array_adjusted = true;
			break;
		    }
		    else {
			new_name_arr[j] = 65;
		    }
		}
		if (!array_adjusted) {
		    new_name_arr.push(init_group);
		    array_adjusted = true;
		}
	    }//Adjust array infinite while
	}
	else {
	    return new_name;
	}
    }//Find new group name infinite while
}


//Remember, this pwd is iterated over a million times. 
//Not easy to crack
function get_pwd_group(domain, full_hash, password_strength) {
    var pwd_groups = pii_vault.aggregate_data.pwd_groups;
    var previous_group = false;
    var current_group = false;

    for (g in pwd_groups) {
	if (pwd_groups[g].sites.indexOf(domain) != -1) {
	    previous_group = g;
	}
	if (pwd_groups[g].full_hash == full_hash) {
	    current_group = g;
	}
    }

    if (previous_group && 
	pwd_groups[previous_group].full_hash != full_hash) {
	//This means password changed .. means group change .. first delete the domain from previous group
	pwd_groups[previous_group].sites.splice(pwd_groups[previous_group].sites.indexOf(domain), 1);
    }

    if (current_group) {
	//This means that there exists a group with exact same full hash
	if (pwd_groups[current_group].sites.indexOf(domain) == -1) {
	    //This means that even though the group exists, this domain is not part of it. So we will add it.
	    pwd_groups[current_group].sites.push(domain);
	}
    }
    else {
	// This means that we will have to create a new group and increase number of different
	// passwords by one.
	var new_grp = new_group_name(pwd_groups);
	new_grp = 'Grp ' + new_grp;
	pwd_groups[new_grp] = {};
	pwd_groups[new_grp].sites = [domain];
	pwd_groups[new_grp].strength = password_strength;
	pwd_groups[new_grp].full_hash = full_hash;
	    
	pii_vault.aggregate_data.num_pwds += 1;

	flush_selective_entries("aggregate_data", ["num_pwds", "pwd_groups"]);
	current_group = new_grp;
    }

    // Now do similar things for current_report
    var cr_pwd_groups = pii_vault.current_report.pwd_groups;
    var cr_previous_group = false;
    // First find if domain is already present in any of the groups
    for (g in cr_pwd_groups) {
	if (cr_pwd_groups[g].sites.indexOf(domain) != -1) {
	    cr_previous_group = g;
	    break;
	}
    }

    if (cr_previous_group) {
	//This means that domain was seen earlier in this report period
	if (cr_previous_group != current_group) {
	    // This means that password has changed groups, so first delete it from previous group
	    cr_pwd_groups[cr_previous_group].sites.splice(cr_pwd_groups[cr_previous_group].sites.indexOf(domain), 1);
	    send_pwd_group_row_to_reports('replace', cr_previous_group, cr_pwd_groups[cr_previous_group].sites, 
					  cr_pwd_groups[cr_previous_group].strength);
	}
    }

    //Also add the domain to current_group
    if (current_group in cr_pwd_groups) {
	if (cr_pwd_groups[current_group].sites.indexOf(domain) == -1) {
	    cr_pwd_groups[current_group].sites.push(domain);
	}
    }
    else {
	//Create a new group and add this entry to the list
	cr_pwd_groups[current_group] = {};
	cr_pwd_groups[current_group].sites = $.extend(true, [], pwd_groups[current_group].sites);
	cr_pwd_groups[current_group].strength = password_strength;
	
	pii_vault.current_report.num_pwds += 1;
	flush_selective_entries("current_report", ["num_pwds"]);
	send_pwd_group_row_to_reports('add', current_group, cr_pwd_groups[current_group].sites, 
				      cr_pwd_groups[current_group].strength);
	calculate_pwd_similarity(current_group);
    }
    
    flush_selective_entries("current_report", ["pwd_groups"]);
    return current_group;
}


function get_pwd_unchanged_duration(domain) {
    try {
	var hk = '' + ':' + domain;
	if (hk in pii_vault.password_hashes) {
	    return (new Date() - new Date(pii_vault.password_hashes[hk].initialized));
	}
	return 0;
    }
    catch (e) {
	print_appu_error("Appu Error: Got an exception: " + e.message);
    }
    return 0;
}


//Calculates entire sha256 hash of the password.
//iterates over the hashing 1,000,000 times so that
//its really really hard for an attacker to crack it.
//Some back-of-the-envelope calculations for cracking a password 
//using the same cluster used in arstechnica article (goo.gl/BYi7M)
//shows that cracking time would be about ~200 days using brute force.
function calculate_full_hash(domain, username, pwd, pwd_strength) {
    var hw_key = domain + "_" + username;
    if (hw_key in hashing_workers) {
	console.log("APPU DEBUG: Cancelling previous active hash calculation worker for: " + hw_key);
	hashing_workers[hw_key].terminate();
	delete hashing_workers[hw_key];
    }

    var hw = new Worker('hash.js');
    hashing_workers[hw_key] = hw;

    hw.onmessage = function(worker_key, my_domain, my_username, my_pwd, my_pwd_strength) {
	return function(event) {
	    var rc = event.data;
	    var hk = my_username + ':' + my_domain;

	    if (typeof rc == "string") {
		console.log("(" + worker_key + ")Hashing worker: " + rc);
	    }
	    else if (rc.status == "success") {
		console.log("(" + worker_key + ")Hashing worker, count:" + rc.count + ", passwd: " 
			    + rc.hashed_pwd + ", time: " + rc.time + "s");
		if (pii_vault.password_hashes[hk].pwd_full_hash != rc.hashed_pwd) {
		    pii_vault.password_hashes[hk].pwd_full_hash = rc.hashed_pwd;

		    //Now calculate the pwd_group
		    var curr_pwd_group = get_pwd_group(my_domain, rc.hashed_pwd, [
										  my_pwd_strength.entropy, 
										  my_pwd_strength.crack_time,
										  my_pwd_strength.crack_time_display
										  ]);
		    
		    if (curr_pwd_group != pii_vault.current_report.user_account_sites[domain].my_pwd_group) {
			pii_vault.current_report.user_account_sites[domain].my_pwd_group = curr_pwd_group;
			flush_selective_entries("current_report", ["user_account_sites"]);
		    }
		    
		    //Now verify that short hash is not colliding with other existing short hashes.
		    //if so, then modify it by changing salt
		    for (var hash_key in pii_vault.password_hashes) {
			if (hash_key != hk && 
			    (pii_vault.password_hashes[hk].pwd_short_hash == 
			     pii_vault.password_hashes[hash_key].pwd_short_hash) &&
			    (pii_vault.password_hashes[hk].pwd_full_hash != 
			     pii_vault.password_hashes[hash_key].pwd_full_hash)) {
			    //This means that there is a short_hash collision. In this case, just change it,
			    //by changing salt
			    var err_msg = "Seems like short_hash collision for keys: " + hk + ", " + hash_key;
			    console.log("APPU DEBUG: " + err_msg);
			    print_appu_error("Appu Error: " + err_msg);
			    rc = calculate_new_short_hash(my_pwd, pii_vault.password_hashes[hk].salt);

			    pii_vault.password_hashes[hk].pwd_short_hash = rc.short_hash;
			    pii_vault.password_hashes[hk].salt = rc.salt;
			}
		    }
		    //Done with everything? Now flush those damn hashed passwords to the disk
		    vault_write("password_hashes", pii_vault.password_hashes);
		    send_user_account_site_row_to_reports(domain);
		}
		//Now delete the entry from web workers.
		delete hashing_workers[worker_key];
	    }
	    else {
		console.log("(" + worker_key + ")Hashing worker said : " + rc.reason);
	    }
	}
    } (hw_key, domain, username, pwd, pwd_strength);
 
    //First calculate the salt
    //This salt is only for the purpose of defeating rainbow attack
    //For each password, the salt value will always be the same as salt table is
    //precomputed and fixed
    var k = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(pwd));
    var r = k.substring(k.length - 10, k.length);
    var rsv = parseInt(r, 16) % 1000;
    var rand_salt = pii_vault.salt_table[rsv];
    var salted_pwd = rand_salt + ":" + pwd;

    console.log("APPU DEBUG: (calculate_full_hash) Added salt: " + rand_salt + " to domain: " + domain);

    hw.postMessage({
	        'limit' : 1000000,
		'cmd' : 'hash',
		'pwd' : salted_pwd,
		});
}


//First gets a different salt from the last value.
//Then, Calculates the super short hashsum
//Only count last 12-bits..so plenty of collisions for an attacker
function calculate_new_short_hash(pwd, prev_salt) {
    //First get a salt that is not equal to prev_salt
    var curr_salt = prev_salt;
    while (curr_salt == prev_salt) {
	var r = Math.floor((Math.random() * 1000)) % 1000;
	curr_salt = pii_vault.salt_table[r];
    }

    //Now get the short hash using salt calculated
    var salted_pwd = curr_salt + ":" + pwd;
    var k = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(salted_pwd));
    var hash_pwd = k.substring(k.length - 3, k.length);
    rc = {
	'salt' : curr_salt,
	'short_hash' : hash_pwd, 
    }
    return rc;
}


//Calculates the super short hashsum given a salt
//Only count last 12-bits..so plenty of collisions for an attacker
function calculate_short_hash(pwd, salt) {
    //Now get the short hash using salt calculated
    var salted_pwd = salt + ":" + pwd;
    var k = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(salted_pwd));
    var hash_pwd = k.substring(k.length - 3, k.length);
    rc = {
	'short_hash' : hash_pwd, 
    }
    return rc;
}


function vault_update_domain_passwd(domain, username, passwd, pwd_strength, is_stored) {
    var vpwh = pii_vault.password_hashes;
    var vcr = pii_vault.current_report;

    var hk = '' + ':' + domain;
    var salt; 
    var recalculate_hashes = false;
    update_user_account_sites_stats(domain, is_stored);       

    if (hk in vpwh) {
	salt = vpwh[hk].salt;
	var rc = calculate_short_hash(passwd, salt);
	if (rc.short_hash != vpwh[hk].pwd_short_hash) {
	    //This could mean that the passwords are changed
	    recalculate_hashes = true;
	}
	else {
	    if (vcr.user_account_sites[domain].my_pwd_group == "no group") {
		//This means that this is the first time we are logging in to this site
		//during this report's duration.
		//However, we have logged into this site in previous reports.
		var curr_pwd_group = get_pwd_group(domain, vpwh[hk].pwd_full_hash, [
										    pwd_strength.entropy, 
										    pwd_strength.crack_time,
										    pwd_strength.crack_time_display
										    ]);
		
		vcr.user_account_sites[domain].my_pwd_group = curr_pwd_group;
		flush_selective_entries("current_report", ["user_account_sites"]);
	    }
	}
    }
    else {
	recalculate_hashes = true;
    }
    
    if (recalculate_hashes == true) {
	rc = calculate_new_short_hash(passwd, '');
	
	console.log("APPU DEBUG: (calculate_new_short_hash) Added salt: " + rc.salt + " to domain: " + domain);
	
	vpwh[hk] = {};
	vpwh[hk].pwd_short_hash = rc.short_hash;
	vpwh[hk].pwd_full_hash = '';
	vpwh[hk].salt = rc.salt;
	vpwh[hk].initialized = new Date();
	//Now calculate sha256 by iterating a million times
	calculate_full_hash(domain, '', passwd, pwd_strength);
    }
    
    vault_write("password_hashes", vpwh);
    vcr.user_account_sites[domain].pwd_unchanged_duration =
	new Date() - new Date(vpwh[hk].initialized);
    flush_selective_entries("current_report", ["user_account_sites"]);
    
    send_user_account_site_row_to_reports(domain);
}


function pii_check_passwd_reuse(message, sender) {
    var r = {};
    // Why the f'k am I using os when there is r.sites?? Need to do cleanup.
    var os = [];
    r.is_password_reused = "no";
    r.already_exists = "no";
    r.initialized = 'Not sure';
    r.sites = [];
    var curr_username = '';
    var hk = curr_username + ':' + message.domain;

    var pwd_strength = zxcvbn(message.passwd);
    r.pwd_strength = pwd_strength;

    for(var hk in pii_vault.password_hashes) {
	var curr_entry = pii_vault.password_hashes[hk];
	var rc = calculate_short_hash(message.passwd, curr_entry.salt);
	if (curr_entry.pwd_short_hash == rc.short_hash) {
	    if (hk.split(":")[1] != message.domain || hk.split(":")[0] != curr_username) {
		r.is_password_reused = "yes";
		r.dontbugme = "no";
		r.sites.push(hk.split(":")[1]);
		os.push(hk.split(":")[1]);
		break;
	    }
	}
    }

    var curr_hk = curr_username + ':' + message.domain;
    if (curr_hk in pii_vault.password_hashes) {
	var curr_entry = pii_vault.password_hashes[curr_hk];
	var rc = calculate_short_hash(message.passwd, curr_entry.salt);
	if (rc.short_hash == pii_vault.password_hashes[curr_hk].pwd_short_hash) {
	    r.initialized = pii_vault.password_hashes[curr_hk].initialized;
	}
    }

    if (r.is_password_reused == "yes") {
	if (message.warn_later) {
	    console.log("APPU INFO: Warn Later: " + message.domain);
	    r.dontbugme = "yes";
	}
	else {
	    for(var dbl in pii_vault.options.dontbuglist) {
		// console.log("DONTBUGME: Checking: "+ pii_vault.options.dontbuglist[dbl] 
		//    +" against: " + message.domain);
		if (pii_vault.options.dontbuglist[dbl] == message.domain) {
		    console.log("APPU INFO: Site in dontbuglist: " + message.domain);
		    r.dontbugme = "yes";
		    break;
		}
	    }
	}
    }

    if(r.is_password_reused == "no") {
	var user_log = sprintf("APPU INFO: [%s]: Checked password for '%s', NO match was found", 
			       new Date(), message.domain);
	console.log(user_log);
    }
    else {
	var user_log = sprintf("APPU INFO: [%s]: Checked password for '%s', MATCH was found: ", 
			       new Date(), message.domain);
	user_log += "{ " + os.join(", ") + " }";
	console.log(user_log);
    }

    if(r.is_password_reused == "yes") {
	var total_entries = pii_vault.current_report.pwd_reuse_warnings.length;
	var last_index =  total_entries ? pii_vault.current_report.pwd_reuse_warnings[total_entries - 1][0] : 0; 
	var new_row = [
	    last_index + 1, 
	    (new Date()).getTime(), 
	    message.domain,
	    os.join(", ")
	];

	pii_vault.current_report.pwd_reuse_warnings.push(new_row);
	flush_selective_entries("current_report", ["pwd_reuse_warnings"]);

	for (var i = 0; i < report_tab_ids.length; i++) {
	    chrome.tabs.sendMessage(report_tab_ids[i], {
		type: "report-table-change-row",
		table_name: "pwd_reuse_warnings",
		mod_type: "add",
		changed_row: new_row,
	    });
	}
    }

    // This is so that if there is next successful sign-in message,
    // trigger a check_pi_fetched_required()
    // This is more fullproof than waiting X amount of time as login may
    // be unsuccessful in that case.
    // However, most fullproof method is per-site login check.
    pending_pi_fetch[sender.tab.id] = message.domain;
    return r;
}


function pii_check_pending_warning(message, sender) {
    var r = {};
    r.pending = "no";

    console.log("APPU DEBUG: (pii_check_pending_warning) Checking for pending warnings");
    if( pending_warnings[sender.tab.id] != undefined) {
	var p = pending_warnings[sender.tab.id];
	r.warnings = p.pending_warnings;
	vault_update_domain_passwd(p.domain, p.username, p.passwd, p.pwd_strength, p.is_stored);
	pending_warnings[sender.tab.id] = undefined;
	r.pending = "yes";
    }
    return r;
}


function does_user_have_account(domain) {
    for(var hk in pii_vault.password_hashes) {
	if (hk.split(":")[1] == domain) {
	    return true;
	}
    }
    return false;
}

