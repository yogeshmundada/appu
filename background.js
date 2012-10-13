
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var ext_id = chrome.i18n.getMessage('@@extension_id');

var pii_vault = {};
var pending_warnings = {}; 

function verify_unique_guid(guid) {
    //Contact the server and ask if anyone else has same GUID.
    //Worth the effort?
}

function pii_next_report_time() {
    var curr_time = new Date();
    if (curr_time.getHours() > 16) {
	//Next day advance
	curr_time.setMinutes( curr_time.getMinutes() + 1440);
    }
    curr_time.setSeconds(0);
    curr_time.setMinutes(0);
    curr_time.setHours(0);
    curr_time.setMinutes( curr_time.getMinutes() + pii_vault.reporting_hour);
    return curr_time.toString();
}

function vault_init() {
    pii_vault.guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	return v.toString(16);
    });

    setTimeout(verify_unique_guid, 1);

    console.log("GUID: " + pii_vault.guid);
    var salt_table = {};
    var current_ip = pii_vault.guid;
    for(var i = 0; i < 1000; i++) {
	salt_table[i] = CryptoJS.SHA1(current_ip).toString();
	current_ip = salt_table[i];
	//console.log("i: " + i);
	//console.log("salt: " + current_ip);
    }
    pii_vault.salt_table = salt_table;
    pii_vault['initialized'] = true;
    pii_vault['status'] = "active";
    pii_vault['disable_period'] = -1;
    pii_vault['report'] = [];
    pii_vault['blacklist'] = [];
    //List of all sites where user has created a profile.
    pii_vault['master_profile_list'] = {};
    pii_vault['dontbuglist'] = [];
    pii_vault['reporting_hour'] = 0;

    //Random time between 5 pm to 8 pm.
    var rand_minutes = 1020 + Math.floor(Math.random() * 1000)%180;
    pii_vault.reporting_hour = rand_minutes;
    
    var curr_time = new Date();
    //Advance by 24 hours. For the first time, don't want to start bugging immediately.
    curr_time.setMinutes( curr_time.getMinutes() + 1440);
    //Next day's 0:0:0 am
    curr_time.setSeconds(0);
    curr_time.setMinutes(0);
    curr_time.setHours(0);
    curr_time.setMinutes( curr_time.getMinutes() + rand_minutes);
    //Start reporting next day
    pii_vault.next_reporting_time = curr_time.toString();

    console.log("Report will be sent everyday at "+ Math.floor(rand_minutes/60) + ":" + (rand_minutes%60));
    console.log("Next scheduled reporting is: " + curr_time);

    pii_vault.domains = {};
    vault_write();
}

function vault_read() {
    try {
	pii_vault = JSON.parse(localStorage[ext_id]);
	if (pii_vault) {
	    //console.log("pii_vault: " + pii_vault);
	    for (var g in pii_vault) {
		//console.log("Properties of pii_vault: " + g);
	    }
	    if("guid" in pii_vault) {
		console.log("guid: " + pii_vault.guid);
	    }
	    if("salt_table" in pii_vault) {
		console.log("salt_table length: " + Object.size(pii_vault.salt_table));
	    }
	}
	else {
	    pii_vault = {};
	}
    }
    catch (e) {
	console.log("Loading extension for the first time. Initializing extension data");
	pii_vault = {};
    }
}

function vault_write() {
    localStorage[ext_id] = JSON.stringify(pii_vault);
}

function vault_update_domain_passwd(message) {
    try {
	var r = Math.floor((Math.random() * 1000)) % 1000;
	var rand_salt = pii_vault.salt_table[r];
	// Honestly ":" is not required to separate salt and password.
	// Just adding it so that it will be easier in case of debugging
	// and want to print salted_pwd on console.
	var salted_pwd = rand_salt + ":" + message.passwd;
	var pwd_sha1sum = CryptoJS.SHA1(salted_pwd).toString();

	pii_vault.domains[message.domain] = pwd_sha1sum;
	vault_write();
    }
    catch (e) {
	console.log("Got an exception: " + e.message);
    }
}

function start_time_loop() {
    var curr_time = new Date();
    if ((curr_time - (new Date(pii_vault.disable_start))) > (60 * 1000 * pii_vault['disable_period'])) {
	clearInterval(pii_vault['enable_timer']);
	pii_vault['status'] = "active";
	pii_vault['disable_period'] = -1;
	chrome.browserAction.setIcon({path:'images/appu19.png'});
	console.log((new Date()) + ": Enabling Appu");
	vault_write();
    } 
}

function check_report_time() {
    var curr_time = new Date();
    if((pii_vault.report.length > 0) && (curr_time.getTime() > (new Date(pii_vault.next_reporting_time)).getTime())) {
	var url = chrome.extension.getURL('report.html');
	chrome.tabs.create({ url: url });
    }
}

function pii_add_dontbug_list(message) {
    var domain = message.domain;
    if(pii_vault.dontbuglist.indexOf(domain) == -1) {
	pii_vault.dontbuglist.push(domain);
	console.log("New addition to dontbuglist: " + domain);
    }
    vault_write();
}

function pii_add_blacklisted_sites(message) {
    var sites = message.sites;
    pii_vault.blacklist = [];
    for(var i = 0; i < sites.length; i++) {
	var curr_url = sites[i]; 
	if (/\S/.test(curr_url)) {
	    curr_url = $.trim(curr_url);
	    console.log("Pushing to blacklist:" + curr_url);
	    pii_vault.blacklist.push(curr_url);
	}
    }
    console.log("New blacklist: " + pii_vault.blacklist);
    vault_write();
}

function pii_check_blacklisted_sites(message) {
    var r = {};
    r.blacklisted = "no";
    //console.log("Checking blacklist for site: " + message.domain);
    for (var i = 0; i < pii_vault.blacklist.length; i++) {
	var protocol_matched = "yes";
	var port_matched = "yes";
	var bl_url = pii_vault.blacklist[i];
	//Split URLs, simplifying assumption that protocol is only HTTP.
	var url_parts = bl_url.split('/');
	var bl_hostname = "";
	var bl_protocol = "";
	var bl_port = "";

	bl_hostname = ((url_parts[0].toLowerCase() == 'http:' || 
			url_parts[0].toLowerCase() == 'https:')) ? url_parts[2] : url_parts[0];
	bl_protocol = ((url_parts[0].toLowerCase() == 'http:' || 
			url_parts[0].toLowerCase() == 'https:')) ? url_parts[0].toLowerCase() : '';
	bl_port = (bl_hostname.split(':')[1] == undefined) ? '' : bl_hostname.split(':')[1];

	var curr_url_parts = message.domain.split('/');
	var curr_hostname = "";
	var curr_protocol = "";
	var curr_port = "";

	curr_hostname = ((curr_url_parts[0].toLowerCase() == 'http:' || 
			  curr_url_parts[0].toLowerCase() == 'https:')) ? curr_url_parts[2] : curr_url_parts[0];
	curr_protocol = ((curr_url_parts[0].toLowerCase() == 'http:' || 
			  curr_url_parts[0].toLowerCase() == 'https:')) ? curr_url_parts[0].toLowerCase() : '';

	curr_port = (curr_hostname.split(':')[1] == undefined) ? '' : curr_hostname.split(':')[1];

	rev_bl_hostname = bl_hostname.split("").reverse().join("");
	rev_curr_hostname = curr_hostname.split("").reverse().join("");

	if (bl_protocol && (curr_protocol != bl_protocol)) {
	    protocol_matched = "no";
	} 

	if (bl_port && (curr_port != bl_port)) {
	    port_matched = "no";
	} 

	//First part of IF checks if the current URL under check is a 
	//subdomain of blacklist domain.
	if ((rev_curr_hostname.indexOf(rev_bl_hostname) == 0) && 
	    protocol_matched == "yes" && port_matched == "yes") {
	    r.blacklisted = "yes";
	    console.log("Site is blacklisted: " + message.domain);
	    break;
	}
    }
    return r;
}

function pii_send_report(message) {
    var wr = {};
    wr.guid = pii_vault.guid;
    wr.report = message.report;
    try {
	$.post("http://143.215.129.52:5005/methods", JSON.stringify(wr));
    }
    catch (e) {
	console.log("Error while posting log to server");
    }

    pii_vault.report = [];
    pii_vault.next_reporting_time = pii_next_report_time();
    console.log("Report sent. Next scheduled time: " + pii_vault.next_reporting_time);
    vault_write();
}

function pii_delete_report_entry(message) {
    pii_vault.report.splice(message.report_entry, 1);
}

function pii_get_report(message) {
    var r = [];
    for (var i = 0; i < pii_vault.report.length; i++) {
	// Call to jQuery extend makes a deep copy. So even if reporting page f'ks up with
	// the objects, original is safe.
	r.push($.extend(true, {}, pii_vault.report[i]));
    }
    return r;
}

function pii_get_blacklisted_sites(message) {
    var r = [];
    for (var i = 0; i < pii_vault.blacklist.length; i++) {
	r.push(pii_vault.blacklist[i]);
    }
    return r;
}

function pii_modify_status(message) {
    if (message.status == "enable") {
	pii_vault['status'] = "active";
	pii_vault['disable_period'] = -1;
	chrome.browserAction.setIcon({path:'images/appu19.png'});
    }
    else if (message.status == "disable") {
	pii_vault['status'] = "disabled";
	pii_vault['disable_period'] = message.minutes;
	pii_vault['disable_start'] = (new Date()).toString();
	pii_vault['enable_timer'] = setInterval(start_time_loop, 1000);
	chrome.browserAction.setIcon({path:'images/appu19_offline.png'});
	console.log((new Date()) + ": Disabling Appu for " + message.minutes + " minutes");
    }
    vault_write();
}

function pii_check_pending_warning(message, sender) {
    var r = {};
    r.pending = "no";
    if( pending_warnings[sender.tab.id] != undefined) {
	r.warnings = pending_warnings[sender.tab.id];
	pending_warnings[sender.tab.id] = undefined;
	r.pending = "yes";
    }
    return r;
}

function pii_check_passwd_reuse(message, sender) {
    var r = {};
    var os = [];
    var vault_dirty = false;
    r.is_password_reused = "no";
    r.sites = [];

    // Doing active check for the case that content script has already
    // hooked up with password input and then user disables Appu.
    if(pii_vault.status == "active") {
	for(var i = 0; i < 1000; i++) {
	    var salted_pwd = pii_vault.salt_table[i] + ":" + message.passwd;
	    //console.log("Checking for salted pwd: " + salted_pwd);
	    var pwd_sha1sum = CryptoJS.SHA1(salted_pwd).toString();
	    //console.log("salted pwd checksum: " + pwd_sha1sum);
	    for(var d in pii_vault.domains) {
		if (d != message.domain && pii_vault.domains[d] == pwd_sha1sum) {
		    r.is_password_reused = "yes";
		    r.dontbugme = "no";
		    r.sites.push(d);
		    os.push(d);
		    break;
		}
	    }
	}

	for(var dbl in pii_vault.dontbuglist) {
	    //console.log("DONTBUGME: Checking: "+ pii_vault.dontbuglist[dbl] +" against: " + message.domain);
	    if (pii_vault.dontbuglist[dbl] == message.domain) {
		var pw = {};
		pw = $.extend(true, {}, r);
		pending_warnings[sender.tab.id] = pw;
		console.log("Site in dontbuglist: " + message.domain);
		r.dontbugme = "yes";
		break;
	    }
	}
    }

    if(r.is_password_reused == "no") {
	var user_log = sprintf("[%s]: Checked password for '%s', NO match was found", new Date(), message.domain);
	console.log(user_log);
    }
    else {
	var user_log = sprintf("[%s]: Checked password for '%s', MATCH was found: ", new Date(), message.domain);
	user_log += "{ " + os + " }";
	console.log(user_log);
    }

    if(r.is_password_reused == "yes") {
	var wr = {};
	wr.now = new Date();
	wr.site = message.domain;
	wr.other_sites = os;
	pii_vault.report.push(wr);
	vault_dirty = true;
    }

    if (!(message.domain in pii_vault.master_profile_list)) {
	pii_vault.master_profile_list[message.domain] = true;
	vault_dirty = true;
    }

    // Flush
    if (vault_dirty) {
	vault_write();
    }

    return r;
}

vault_read();

setInterval(check_report_time, 1000 * 5 * 60);

//Start DELETE this
pii_vault['master_profile_list'] = {};
console.log("Initialized master_profile_list");
//End DELETE this

if(!('initialized' in pii_vault)) {
    vault_init();
}
else {
    if (pii_vault.status == "disabled") {
	if (((new Date()) - (new Date(pii_vault.disable_start))) > (60 * 1000 * pii_vault['disable_period'])) {
	    pii_vault['status'] = "active";
	    pii_vault['disable_period'] = -1;
	    chrome.browserAction.setIcon({path:'images/appu19.png'});
	    console.log((new Date()) + ": Enabling Appu");
	}
	else {
	    console.log("Appu disabled at '" + pii_vault.disable_start + "' for " 
			+ pii_vault['disable_period'] + " minutes");

	    pii_vault['enable_timer'] = setInterval(start_time_loop, 1000);
	    chrome.browserAction.setIcon({path:'images/appu19_offline.png'});
	}
    }
    vault_write();
}

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type == "check_pending_warning") {
	r = pii_check_pending_warning(message, sender);
	r.id = sender.tab.id;
	sendResponse(r);
    }
    else if (message.type == "check_passwd_reuse") {
	r = pii_check_passwd_reuse(message, sender);
	sendResponse(r);
	vault_update_domain_passwd(message);
    }
    else if (message.type == "statuschange") {
	pii_modify_status(message);
    }
    else if (message.type == "querystatus") {
	r = {};
	r.status = pii_vault.status;
	sendResponse(r);
    }
    else if (message.type == "modify_blacklist") {
	pii_add_blacklisted_sites(message);
    }
    else if (message.type == "get_blacklist") {
	r = pii_get_blacklisted_sites(message);
	sendResponse(r);
    }
    else if (message.type == "check_blacklist") {
	r = pii_check_blacklisted_sites(message);
	sendResponse(r);
    }
    else if (message.type == "get_report") {
	r = pii_get_report(message);
	sendResponse(r);
    }
    else if (message.type == "send_report") {
	r = pii_send_report(message);
    }
    else if (message.type == "dont_bug") {
	r = pii_add_dontbug_list(message);
    }
    else if (message.type == "delete_report_entry") {
	r = pii_delete_report_entry(message);
    }
});