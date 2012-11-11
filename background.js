
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

//If user says remind me later
var report_reminder_interval = 30;

//Report check interval in minutes
var report_check_interval = 2;

//Is user processing report?
var is_report_tab_open = 0;

function verify_unique_guid(guid) {
    //Contact the server and ask if anyone else has same GUID.
    //Worth the effort?
}

function pii_test_yesterdays_report_time() {
    var curr_time = new Date();
    curr_time.setMinutes( curr_time.getMinutes() - 1440);
    curr_time.setSeconds(0);
    curr_time.setMinutes(0);
    curr_time.setHours(0);
    return curr_time.toString();
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

//Initializing each property. 
//TODO: Perhaps a better way is to write a generic function
//that accepts property_name and property initializer for that property.
//It will test if property exists. If not, then call the initializer function on that property.
//It will shorten the code and make it decent.
function vault_init() {
    var vault_modified = false;

    console.log("vault_init(): Initializing missing properties from last release");
    if(!pii_vault.guid) {
	pii_vault.guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	    return v.toString(16);
	});

	setTimeout(verify_unique_guid, 1);
	
	console.log("vault_init(): Updated GUID in vault: " + pii_vault.guid);
	vault_modified = true;
    }

    if(!pii_vault.salt_table) {
	var salt_table = {};
	var current_ip = pii_vault.guid;
	for(var i = 0; i < 1000; i++) {
	    salt_table[i] = CryptoJS.SHA1(current_ip).toString();
	    current_ip = salt_table[i];
	    //console.log("i: " + i);
	    //console.log("salt: " + current_ip);
	}
	pii_vault.salt_table = salt_table;
	
	console.log("vault_init(): Updated SALT TABLE in vault");
	vault_modified = true;
    }

    if(!pii_vault.initialized) {
	pii_vault['initialized'] = true;
	console.log("vault_init(): Updated INITIALIZED in vault");
	vault_modified = true;
    }

    if(!pii_vault.status) {
	pii_vault['status'] = "active";
	console.log("vault_init(): Updated STATUS in vault");
	vault_modified = true;
    }

    if(!pii_vault.disable_period) {
	pii_vault['disable_period'] = -1;
	console.log("vault_init(): Updated DISABLE_PERIOD in vault");
	vault_modified = true;
    }

    if(!pii_vault.report) {
	pii_vault['report'] = [];
	console.log("vault_init(): Updated REPORT in vault");
	vault_modified = true;
    }

    if(!pii_vault.past_reports) {
	pii_vault['past_reports'] = [];
	console.log("vault_init(): Updated PAST_REPORTS in vault");
	vault_modified = true;
    }
    
    if(!pii_vault.blacklist) {
	pii_vault['blacklist'] = [];
	console.log("vault_init(): Updated BLACKLIST in vault");
	vault_modified = true;
    }

    if (!pii_vault.master_profile_list) {
    //List of all sites where user has created a profile.
	pii_vault['master_profile_list'] = [];
	console.log("vault_init(): Updated MASTER_PROFILE_LIST in vault");
	vault_modified = true;
    }

    if(!pii_vault.dontbuglist) {
	pii_vault['dontbuglist'] = [];
	console.log("vault_init(): Updated DONTBUGLIST in vault");
	vault_modified = true;
    }

    if(!pii_vault.reporting_hour) {
	pii_vault['reporting_hour'] = 0;
    //Random time between 5 pm to 8 pm.
	var rand_minutes = 1020 + Math.floor(Math.random() * 1000)%180;
	pii_vault.reporting_hour = rand_minutes;
	console.log("vault_init(): Updated REPORTING_HOUR in vault");
	vault_modified = true;
    }    

    //Three different types of reporting.
    //Manual: If reporting time of the day and if report ready, interrupt user and ask 
    //        him to review, modify and then send report.
    //Auto: Send report automatically when ready.
    //Differential: Interrupt user to manually review report only if current report
    //                   entries are different from what he reviewed in the past.
    //                   (How many past reports should be stored? lets settle on 10 for now?).
    //                   Highlight the different entries with different color background.
    if(!pii_vault.reporting_type) {
	pii_vault['reporting_type'] = "manual";
	console.log("vault_init(): Updated REPORTING_TYPE in vault");
	vault_modified = true;
    }    

    if(!pii_vault.next_reporting_time) {
	var curr_time = new Date();
	//Advance by 24 hours. For the first time, don't want to start bugging immediately.
	curr_time.setMinutes( curr_time.getMinutes() + 1440);
	//Next day's 0:0:0 am
	curr_time.setSeconds(0);
	curr_time.setMinutes(0);
	curr_time.setHours(0);
	curr_time.setMinutes( curr_time.getMinutes() + pii_vault.reporting_hour);
	//Start reporting next day
	pii_vault.next_reporting_time = curr_time.toString();
	
	console.log("Report will be sent everyday at "+ Math.floor(rand_minutes/60) + ":" + (rand_minutes%60));
	console.log("Next scheduled reporting is: " + curr_time);
	console.log("vault_init(): Updated NEXT_REPORTING_TIME in vault");
	vault_modified = true;
    }

    if(!pii_vault.domains) {
	pii_vault.domains = {};
	console.log("vault_init(): Updated DOMAINS in vault");
	vault_modified = true;
    }

    if(!pii_vault.input_fields) {
	pii_vault.input_fields = [];
	console.log("vault_init(): Updated INPUT_FIELDS in vault");
	vault_modified = true;
    }

    if(!("report_reminder_time" in pii_vault)) {
	pii_vault.report_reminder_time = null;
	console.log("vault_init(): Updated REPORT_REMINDER_TIME in vault");
	vault_modified = true;
    }

    if(vault_modified) {
	console.log("vault_init(): vault modified, writing to disk");
	vault_write();
    }
}

function vault_read() {
    try {
	pii_vault = JSON.parse(localStorage[ext_id]);
	if (pii_vault) {
	    //console.log("pii_vault: " + pii_vault);
	    for (var g in pii_vault) {
		//console.log("Properties of pii_vault: " + g);
	    }
	    if(pii_vault.guid) {
		console.log("Globally Unique User Id: " + pii_vault.guid);
	    }
	    if("salt_table" in pii_vault) {
		//console.log("salt_table length: " + Object.size(pii_vault.salt_table));
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

//Since this function is getting called async from many different points,
//ideally it should have a lock to avoid race conditions (and possibly corruption).
//However, apparently JS is threadless and JS engine takes care of this issue
//under the hood. So we are safe.
//Currently just writing everything .. in future, only write values that
//are modified.
function vault_write() {
    localStorage[ext_id] = JSON.stringify(pii_vault);
}

function vault_update_domain_passwd(message) {
    try {
	var r = Math.floor((Math.random() * 1000)) % 1000;
	var rand_salt = pii_vault.salt_table[r];
	// Honestly ":" is not required to separate salt and password.
	// Just adding it so that it will be easier in case of debugging
	// and want to print salted_pwd on console for debugging.
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
	chrome.browserAction.setIcon({path:'images/appu_new19.png'});
	console.log((new Date()) + ": Enabling Appu");
	vault_write();
    } 
}

function open_reports_tab() {
    var report_url = chrome.extension.getURL('report.html');
    chrome.tabs.create({ url: report_url });
    close_report_reminder_message();
}

function close_report_reminder_message() {
    chrome.tabs.query({}, function(all_tabs) {
	for(var i = 0; i < all_tabs.length; i++) {
	    chrome.tabs.sendMessage(all_tabs[i].id, {type: "close-report-reminder"});
	}
    });
}

function report_reminder_later(message) {
    var curr_time = new Date();
    curr_time.setMinutes(curr_time.getMinutes() + report_reminder_interval);
    pii_vault.report_reminder_time = curr_time.toString();

    console.log(sprintf("[%s]: Report Reminder time postponed for: %dm", new Date(), report_reminder_interval));

    chrome.tabs.query({}, function(all_tabs) {
	for(var i = 0; i < all_tabs.length; i++) {
	    chrome.tabs.sendMessage(all_tabs[i].id, {type: "close-report-reminder"});
	}
    });
    vault_write();
}

function check_report_time() {
    var curr_time = new Date();
    var is_report_different = false;

    //Find out if any entries from current report differ from past reports
    if (pii_vault.reporting_type == "differential") {
	for (var i = 0; i < pii_vault.report.length; i++) {
	    var rc = pii_check_if_entry_exists_in_past_reports(pii_vault.report[i]);
	    if (rc == false) {
		is_report_different = true;
		break;
	    }
	}
    }

    //Make all the following checks only if reporting type is "manual"
    if (pii_vault.reporting_type == "manual") {
	if (pii_vault.report_reminder_time == null) {
	    //Don't want to annoy user with reporting dialog if we are disabled OR
	    //if user already has a review report window open (presumably working on it).
	    if (pii_vault.status == "active" && is_report_tab_open == 0) {
		if((pii_vault.report.length > 0) && 
		   (curr_time.getTime() > (new Date(pii_vault.next_reporting_time)).getTime())) {
		    //Send message to all the tabs that report is ready for review and sending
		    chrome.tabs.query({}, function(all_tabs) {
			for(var i = 0; i < all_tabs.length; i++) {
			    chrome.tabs.sendMessage(all_tabs[i].id, {type: "report-reminder"});
			}
		    });
		}
		else if ((pii_vault.report.length == 0) && 
			 (curr_time.getTime() > (new Date(pii_vault.next_reporting_time)).getTime())) {
		    pii_vault.next_reporting_time = pii_next_report_time();
		    console.log("Report is empty. No report sent. Next scheduled report check time: " + pii_vault.next_reporting_time);
		    vault_write();
		}
	    }
	}
	else if (curr_time.getTime() > (new Date(pii_vault.report_reminder_time)).getTime()) {
	    console.log(sprintf("[%s]: Enabling Report Reminder", new Date()));
	    pii_vault.report_reminder_time = null;
	    vault_write();
	}
    }
    else if (pii_vault.reporting_type == "auto") {
	pii_send_report();
    }
}

function pii_log_user_input_type(message) {
    var triple = [];
    var domain = message.domain;
    var attr_list = message.attr_list;

    triple.push(new Date());
    triple.push(domain);
    triple.push(attr_list);

    console.log("Appending to input_fileds list: " + JSON.stringify(triple));

    pii_vault.input_fields.push(triple);
    vault_write();
}

function pii_add_dontbug_list(message) {
    var domain = message.domain;
    var r = {};
    if(pii_vault.dontbuglist.indexOf(domain) == -1) {
	pii_vault.dontbuglist.push(domain);
	r.new_entry = domain;
    }
    else {
	r.new_entry = null;
    }

    console.log("New dontbugme list: " + pii_vault.dontbuglist);
    vault_write();
    return r;
}

function pii_add_blacklisted_sites(message) {
    var dnt_site = message.dnt_site;
    var r = {};
    if (pii_vault.blacklist.indexOf(dnt_site) == -1) {
	pii_vault.blacklist.push(dnt_site);
	r.new_entry = dnt_site;
    }
    else {
	r.new_entry = null;
    }
    console.log("New blacklist: " + pii_vault.blacklist);
    vault_write();
    return r;
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

function pii_send_input_fields() {
    var wr = {};
    wr.type = "input_fields";
    wr.guid = pii_vault.guid;
    wr.input_fields = pii_vault.input_fields;
    try {
	$.post("http://woodland.gtnoise.net:5005/methods", JSON.stringify(wr));
    }
    catch (e) {
	console.log("Error while posting 'input_fields' to server");
    }

    pii_vault.input_fields = [];
    console.log("Input fields send");
    vault_write();
}

function pii_send_report() {
    var wr = {};
    wr.type = "reuse_warnings";
    wr.guid = pii_vault.guid;
    wr.report = pii_vault.report;
    try {
	$.post("http://woodland.gtnoise.net:5005/methods", JSON.stringify(wr));
    }
    catch (e) {
	console.log("Error while posting 'reuse_warnings' to server");
    }

    pii_vault.past_reports.unshift(pii_vault.report);
    if (pii_vault.past_reports.length > 10) {
	pii_vault.past_reports.pop();
    }

    pii_vault.report = [];
    pii_vault.next_reporting_time = pii_next_report_time();
    console.log("Report sent. Next scheduled time: " + pii_vault.next_reporting_time);
    vault_write();
}

function pii_delete_report_entry(message) {
    pii_vault.report.splice(message.report_entry, 1);
    vault_write();
}

function pii_delete_dnt_list_entry(message) {
    pii_vault.blacklist.splice(message.dnt_entry, 1);
    vault_write();
}

function pii_delete_dontbugme_list_entry(message) {
    pii_vault.dontbuglist.splice(message.dnt_entry, 1);
    vault_write();
}

function pii_delete_master_profile_list_entry(message) {
    pii_vault.master_profile_list.splice(message.report_entry, 1);
    vault_write();
}

function pii_get_report(message) {
    var r = {};
    var search_phrase = message.search_phrase;
    r.pwd_reuse_report = [];
    r.master_profile_list = [];
    r.scheduled_report_time = pii_vault.next_reporting_time;

    for (var i = 0; i < pii_vault.report.length; i++) {
	// Call to jQuery extend makes a deep copy. So even if reporting page f'ks up with
	// the objects, original is safe.
	var copied_entry = $.extend(true, {}, pii_vault.report[i]);

	if (typeof search_phrase === 'undefined' || search_phrase == null) {
	    copied_entry.index = i;
	    r.pwd_reuse_report.push(copied_entry);
	}
	else {
	    var record = JSON.stringify(copied_entry);
	    if (record.indexOf(search_phrase) != -1) {
		copied_entry.index = i;
		r.pwd_reuse_report.push(copied_entry);
	    }
	}
    }

    for (var i = 0; i < pii_vault.master_profile_list.length; i++) {
	var copied_entry = {};
	copied_entry.site_name = pii_vault.master_profile_list[i];

	if (typeof search_phrase === 'undefined' || search_phrase == null) {
	    copied_entry.index = i;
	    r.master_profile_list.push(copied_entry);
	}
	else {
	    var record = JSON.stringify(copied_entry);
	    if (record.indexOf(search_phrase) != -1) {
		copied_entry.index = i;
		r.master_profile_list.push(copied_entry);
	    }
	}
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

function pii_get_dontbugme_list(message) {
    var r = [];
    for (var i = 0; i < pii_vault.dontbuglist.length; i++) {
	r.push(pii_vault.dontbuglist[i]);
    }
    return r;
}

function pii_modify_status(message) {
    if (message.status == "enable") {
	pii_vault['status'] = "active";
	pii_vault['disable_period'] = -1;
	chrome.browserAction.setIcon({path:'images/appu_new19.png'});
    }
    else if (message.status == "disable") {
	pii_vault['status'] = "disabled";
	pii_vault['disable_period'] = message.minutes;
	pii_vault['disable_start'] = (new Date()).toString();
	pii_vault['enable_timer'] = setInterval(start_time_loop, 1000);
	chrome.browserAction.setIcon({path:'images/appu_new19_offline.png'});
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

function pii_check_if_entry_exists_in_past_reports(curr_entry) {
    var ce = {};
    var ce_str = "";
    ce.site = curr_entry.site;
    ce.other_sites = curr_entry.other_sites;

    ce.other_sites.sort();
    ce_str = JSON.stringify(ce);

    for(var i=0; i < pii_vault.past_reports.length; i++) {
	var past_report = pii_vault.past_reports[i];
	for(var j = 0; j < past_report.length; j++) {
	    var past_report_entry = {};
	    var pre_str = "";
	    past_report_entry.site = past_report[j].site;
	    past_report_entry.other_sites = past_report.other_sites;
	    past_report_entry.other_sites.sort();
	    pre_str = JSON.stringify(past_report_entry);
	    if (pre_str == ce_str) {
		return true;
	    }
	}
    }
    return false;
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
	    if (pii_vault.dontbuglist[dbl] == message.domain || message.warn_later) {
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

    if ($.inArray(message.domain, pii_vault.master_profile_list) == -1) {
	pii_vault.master_profile_list.push(message.domain);
	vault_dirty = true;
    }

    // Flush
    if (vault_dirty) {
	vault_write();
    }

    return r;
}

vault_read();

//Testing code.
//pii_vault.next_reporting_time = pii_test_yesterdays_report_time();
//console.log("Here here: next reporting time: " + pii_vault.next_reporting_time);

setInterval(check_report_time, 1000 * report_check_interval * 60);

//Call init. This will set properties that are newly added from release to release.
//Eventually, after the vault properties stabilise, call it only if vault property
//"initialized" is not set to true.
vault_init();

//Check if appu was disabled in the last run. If yes, then check if disable period is over yet.
if (pii_vault.status == "disabled") {
    if (((new Date()) - (new Date(pii_vault.disable_start))) > (60 * 1000 * pii_vault['disable_period'])) {
	pii_vault['status'] = "active";
	pii_vault['disable_period'] = -1;
	chrome.browserAction.setIcon({path:'images/appu_new19.png'});
	console.log((new Date()) + ": Enabling Appu");
	vault_write();
    }
    else {
	console.log("Appu disabled at '" + pii_vault.disable_start + "' for " 
		    + pii_vault['disable_period'] + " minutes");
	
	pii_vault['enable_timer'] = setInterval(start_time_loop, 1000);
	chrome.browserAction.setIcon({path:'images/appu_new19_offline.png'});
	vault_write();
    }
}

//Generic channel listener. Catch messages from contents-scripts in various tabs.
//Also catch messages from popup.html, report.html and options.html
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type == "user_input" && pii_vault.status == "active") {
	r = pii_log_user_input_type(message);
    }
    else if (message.type == "check_pending_warning"  && pii_vault.status == "active") {
	r = pii_check_pending_warning(message, sender);
	r.id = sender.tab.id;
	sendResponse(r);
    }
    else if (message.type == "check_passwd_reuse"  && pii_vault.status == "active") {
	r = pii_check_passwd_reuse(message, sender);
	sendResponse(r);
	vault_update_domain_passwd(message);
    }
    else if (message.type == "status_change") {
	pii_modify_status(message);
    }
    else if (message.type == "query_status") {
	r = {};
	r.status = pii_vault.status;
	sendResponse(r);
    }
    else if (message.type == "add_to_blacklist") {
	r = pii_add_blacklisted_sites(message);
	sendResponse(r);
    }
    else if (message.type == "get_blacklist") {
	var r = {};
	r.blacklist = pii_get_blacklisted_sites(message);
	sendResponse(r);
    }
    else if (message.type == "get_dontbugme_list") {
	var r = {};
	r.dontbugmelist = pii_get_dontbugme_list(message);
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
	r = pii_send_report();
	//r = pii_send_input_fields();
    }
    else if (message.type == "add_to_dontbug_list") {
	r = pii_add_dontbug_list(message);
	sendResponse(r);
    }
    else if (message.type == "delete_password_reuse_report_entry") {
	r = pii_delete_report_entry(message);
    }
    else if (message.type == "delete_master_profile_list_entry") {
	r = pii_delete_master_profile_list_entry(message);
    }
    else if (message.type == "delete_dnt_site_entry") {
	r = pii_delete_dnt_list_entry(message);
    }
    else if (message.type == "delete_dontbugme_site_entry") {
	r = pii_delete_dontbugme_list_entry(message);
    }
    else if (message.type == "remind_report_later") {
	report_reminder_later(report_reminder_interval);
    }
    else if (message.type == "close_report_reminder") {
	close_report_reminder_message();
    }
    else if (message.type == "review_and_send_report") {
	open_reports_tab();
    }
    else if (message.type == "report_tab_closed") {
	is_report_tab_open -= 1;
    }
    else if (message.type == "report_tab_opened") {
	is_report_tab_open += 1;
    }
    else if (message.type == "get_report_setting") {
	r = {};
	r.report_setting = pii_vault.reporting_type;
	sendResponse(r);
    }
    else if (message.type == "set_report_setting") {
	pii_vault.reporting_type = message.report_setting;
    }
});

