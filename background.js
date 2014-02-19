
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var ext_id = chrome.i18n.getMessage('@@extension_id');

var pii_vault = { "options" : {}, "config": {}};

var pending_warnings = {}; 
var pending_pi_fetch = {};

//If user says remind me later
var report_reminder_interval = 30;

//Report check interval in minutes
var report_check_interval = 5;

//Do background tasks like send undelivered reports,
//feedbacks etc
var bg_tasks_interval = 10;

//Is user processing report?
var is_report_tab_open = 0;

//All open report pages. These are useful to send updates to stats
var report_tab_ids = [];

// Which text report to be shown in which tab-id
var text_report_tab_ids = {};

// All open "My footprint" pages. These are useful to send updates to stats
var myfootprint_tab_ids = [];

var template_processing_tabs = {};
var cookie_investigating_tabs = {};

// Was an undelivered report attempted to be sent in last-24 hours?
var delivery_attempts = {};

// Keep server updated about my alive status
var last_server_contact = undefined;

var tld = undefined;
var focused_tabs = 0;

var current_user = "default";
var default_user_guid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

var sign_in_status = "not-signed-in";

var fpi_metadata = {};

//hashing workers
//To keep track of background "Web workers" that are
//asynchronously hashing passwords for you .. a million times.
var hashing_workers = {};

//Record cookie_names temporarily when user attempts to login
//to a site. After the login is successful, check which new
//cookies are added or which cookies have been modified.
//Then calculate the cookies that indicate logged-in state
//and empty this buffer.
var pre_login_cookies = {};

var server_url = "http://appu.gtnoise.net:5005/";
// var server_url = "http://192.168.56.101:59000/";

// BIG EXECUTION START

vault_read();
fpi_metadata_read();

//Detect if the version was updated.
//If updated, then do update specific code execution
var ret_vals = make_version_check();
var am_i_updated = ret_vals[0];
var last_version = ret_vals[1];

if (am_i_updated && last_version != '0.0.0') {
    //Make one time changes for upgrading from older releases.
    update_specific_changes(last_version);
}

// Call init. This will set properties that are newly added from release to release.
// Eventually, after the vault properties stabilise, call it only if vault property
// "initialized" is not set to true.
vault_init();

tld = tld_module.init();

if (!(tld.rules.length > 0)) {
    print_appu_error("Appu Error: tld rules were not loaded correctly");
}
else {
    console.log("APPU DEBUG: tld rules successfully loaded");
}

setInterval(check_report_time, 1000 * report_check_interval * 60);
setInterval(background_tasks, 1000 * bg_tasks_interval * 60);

// Check if appu was disabled in the last run. If yes, then check if disable period is over yet.
if (pii_vault.config.status == "disabled") {
    if (((new Date()) - (new Date(pii_vault.config.disable_start))) > 
	(60 * 1000 * pii_vault.config.disable_period)) {
	pii_vault.config.status = "active";
	pii_vault.config.disable_period = -1;
	flush_selective_entries("config", ["status", "disable_period"]);

	chrome.browserAction.setIcon({path:'images/appu_new19.png'});
	console.log((new Date()) + ": Enabling Appu");
    }
    else {
	console.log("Appu disabled at '" + pii_vault.config.disable_start + "' for " 
		    + pii_vault.config.disable_period + " minutes");
	
	pii_vault.config.enable_timer = setInterval(start_time_loop, 1000);
	vault_write("config:enable_timer", pii_vault.config.enable_timer);

	chrome.browserAction.setIcon({path:'images/appu_new19_offline.png'});
    }
}

pii_check_if_stats_server_up();

chrome.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
    if (change_info.status == "complete" && tab.active) {
	chrome.tabs.sendMessage(tab_id, {type: "you_are_active"});
    }
});

function tab_closed_cb(tabid, removeinfo) {
    if (tabid in cookie_investigating_tabs) {
	cookie_investigating_tabs[tabid].tab_closed_cb();
    }
}

// Executes some testing functionality for a SPECIFIC tab.
// Can be triggered by sending "hello_appu" in that tab.
function execute_testing(message, sender) {
}

chrome.tabs.onRemoved.addListener(tab_closed_cb);

// Start listening to cookie changes
chrome.cookies.onChanged.addListener(cookie_change_detected);

// All messages handled by the background server
// Total messages: 54
// Messages that can't be ignored (even if disabled): 38
// Message name, To be ignored when disabled
// Messages sent by content-script:
// 1. "user_input", yes
// 2. "i_have_focus", yes
// 3. "time_spent", yes
// 4. "check_pending_warning", yes
// 5. "check_passwd_reuse", yes
// 6. "signed_in", yes
// 7. "explicit_sign_out", yes
// 8. "simulate_click_done", yes
// 9. "check_blacklist", yes
// 10. "log_error", yes
// 11. "record_prelogin_cookies", yes
// 12. "hello_appu", yes
// 13. "content_script_started", yes
// 14. "usernames_detected", yes
// 15. "page_is_loaded", yes
// 16. "remind_report_later", NO
// 17. "close_report_reminder", NO
// 18. "review_and_send_report", NO
// 19. "am_i_active", NO
// 20. "query_status", NO
// 21. "clear_pending_warnings", NO

// Messages sent by popup:
// 1. "get-signin-status", NO
// 2. "status_change", NO
// 3. "sign-out", NO

//Messages sent by options:
// 1. "add_to_blacklist", NO
// 2. "get_blacklist", NO
// 3. "get_dontbugme_list", NO
// 4. "add_to_dontbug_list", NO (also from content-script)
// 5. "delete_dnt_site_entry", NO
// 6. "delete_dontbugme_site_entry", NO
// 7. "get_report_setting", NO
// 8. "set_report_setting", NO
// 9. "get_monitor_icon_setting", NO
// 10. "set_monitor_icon_setting", NO
// 11. "get_lottery_setting", NO
// 12. "set_lottery_setting", NO
// 13. "get_appu_initialized", NO
// 14. "set_appu_initialized", NO

//Messages sent by report or text_report
// 1. "get_report_by_number", NO
// 2. "get_differential_report", NO
// 3. "delete_entry", NO
// 4. "report_tab_closed", NO
// 5. "report_tab_opened", NO
// 6. "report_time_spent", NO
// 7. "report_user_approved", NO (also from content-script)
// 8. "show-text-report", NO
// 9. "get-text-report-number", NO

//Messages sent by My Footprint
// 1. "myfootprint_tab_opened", NO
// 2. "myfootprint_tab_closed", NO
// 3. "myfootprint_time_spent", NO
// 4. "get_per_site_pi", NO

//Messages sent by Sign-in
// 1. "sign-in", NO
// 2. "create-account", NO
// 3. "get-version", NO

//Generic channel listener. Catch messages from contents-scripts in various tabs.
//Also catch messages from popup.html, report.html and options.html
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    if (sign_in_status == 'not-signed-in' || pii_vault.config.status == "disabled") {
	// We are currently not enabled. Check if message falls in category to be ignored.
	// if so, just return.
	var ignore_messages = [
	    "user_input",
	    "i_have_focus",
	    "time_spent",
	    "check_pending_warning",
	    "check_passwd_reuse",
	    "signed_in",
	    "explicit_sign_out",
	    "simulate_click_done",
	    "check_blacklist",
	    "log_error",
	    "record_prelogin_cookies",
	    "usernames_detected",
	    "hello_appu",
	    "content_script_started",
	    "page_is_loaded"
	];

	if (ignore_messages.indexOf(message.type) != -1 ) {
	    return;
	}
    }

    if (message.type == "user_input") {
	r = pii_log_user_input_type(message);
    }
    else if (message.type == "content_script_started") {
	if (sender.tab) {
	    var epoch_id = 0;
	    var is_cookie_investigator_tab = false;
	    var is_template_processing_tab = false;

	    // console.log("APPU DEBUG: Content script is started on: " + sender.tab.id);
	    if (sender.tab.id in cookie_investigating_tabs) {
		var cit = cookie_investigating_tabs[sender.tab.id];
		if (!cit.content_script_started) {
		    cit.content_script_started = true;
		}
		epoch_id = cit.get_epoch_id();
		is_cookie_investigator_tab = true;
	    }
	    if (sender.tab.id in template_processing_tabs) {
		is_template_processing_tab = true;
	    }

	    sendResponse({
		    'epoch_id' : epoch_id,
			'is_cookie_investigator_tab' : is_cookie_investigator_tab,
			'is_template_processing_tab' : is_template_processing_tab,
			});
	}
    }
    else if (message.type == "log_error") {
	var err_msg = message.error;
	print_appu_error(err_msg);
    }
    else if (message.type == "hello_appu") {
	console.log("APPU DEBUG: Received 'Hello Appu', Sender Tab ID: " + sender.tab.id);
	execute_testing(message, sender);
    }
    else if (message.type == "clear_pending_warnings") {
	if (sender.tab.id in cookie_investigating_tabs) {
	    return;
	}
	//This message indicates that user has interacted with earlier warning in some way.
	//Hence, its not the case that user did not get to read it due to page redirects
	if(pending_warnings[sender.tab.id] != undefined) {
	    var p = pending_warnings[sender.tab.id];
	    if (p.event_type == 'login_attempt') {
		p.user_is_warned = true;
		//I should not update the password here because user might have entered
		//an incorrect password. Must wait for a successful login event detection.
		//vault_update_domain_passwd(p.domain, p.username, p.passwd, p.pwd_strength, p.is_stored);
		//pending_warnings[sender.tab.id] = undefined;
	    }
	}
    }
    else if (message.type == "get-signin-status") {
	var resp = {};
	sendResponse({
	    'login_name' : current_user,
	    'status' : sign_in_status,
	    'user' : current_user,
	    'appu_status' : pii_vault.config.status,
	});
    }
    else if (message.type == "i_have_focus") {
	focused_tabs += 1;
	return true;
    }
    else if (message.type == "time_spent") {
	focused_tabs -= 1;
	var domain = get_domain(message.domain);
	
	pii_vault.current_report.total_time_spent += message.time_spent;
	if (message.am_i_logged_in) {
	    pii_vault.current_report.total_time_spent_logged_in += message.time_spent;
	}
	else {
	    pii_vault.current_report.total_time_spent_wo_logged_in += message.time_spent;
	}

	flush_selective_entries("current_report", ["total_time_spent", 
						   "total_time_spent_logged_in", 
						   "total_time_spent_wo_logged_in"]);

	pii_vault.aggregate_data.all_sites_total_time_spent += message.time_spent;
	flush_selective_entries("aggregate_data", ["all_sites_total_time_spent"]);

	if (domain in pii_vault.current_report.user_account_sites) {
	    pii_vault.current_report.user_account_sites[domain].tts += message.time_spent;
	    if (message.am_i_logged_in) {
		pii_vault.current_report.user_account_sites[domain].tts_login += message.time_spent;
	    }
	    else {
		pii_vault.current_report.user_account_sites[domain].tts_logout += message.time_spent;
	    }
	    flush_selective_entries("current_report", ["user_account_sites"]);
	    send_user_account_site_row_to_reports(domain);
	    // console.log("APPU DEBUG: Time spent: " + pii_vault.current_report.user_account_sites[domain].tts + 
	    // 		", at: " + domain);
	}
    }
    else if (message.type == "am_i_active") {
	if (sender.tab) {
	    chrome.tabs.query( { active: true }, (function(sender_tab_id, sendResponse) {
			return function(active_tabs) {
			    var response_sent = false; 
			    var r = {};
			    for(var i = 0; i < active_tabs.length; i++) {
				if (sender_tab_id == active_tabs[i].id) {
				    r = { am_i_active: true};
				    response_sent = true;
				}
			    }
			    if (!response_sent) {
				r = { am_i_active: false};
			    }
			    sendResponse(r);
			}
		    })(sender.tab.id, sendResponse));
	    
	    if(pending_warnings[sender.tab.id] != undefined) {
		var p = pending_warnings[sender.tab.id];
		if (p.event_type == 'logout_attempt') {
		    //At this point in code, we have a SUCCESSFUL LOGOUT
		    pending_warnings[sender.tab.id] = undefined;
		    console.log("APPU DEBUG: LOGOUT_COMPLETE for: " + p.domain);
		    //print_all_cookies(p.domain, "LOGOUT_COMPLETE");
		    //cleanup_session_cookie_store(p.domain);
		}
	    }
	    
	    return true;
	}
    }
    else if (message.type == "check_pending_warning") {
	if (sender.tab) {
	    if (!(sender.tab.id in cookie_investigating_tabs)) {
		r = pii_check_pending_warning(message, sender);
		r.id = sender.tab.id;
		domain = r.domain;
		sendResponse(r);
		if (domain && r.event_type == "login_attempt") {
		    //At this point in code, we have a SUCCESSFUL LOGIN event
		    console.log("APPU DEBUG: LOGIN_COMPLETE for: " + get_domain(domain));
		    //print_all_cookies(get_domain(domain), "LOGIN_COMPLETE");
		    detect_login_cookies(get_domain(domain));
		}
		
		var pi_usernames = get_all_usernames();
		if (pi_usernames.length > 0) {
		    console.log("Here here: Sending command to detect usernames");
		    chrome.tabs.sendMessage(sender.tab.id, {
			    'type' : "check-if-username-present",
				'usernames' : pi_usernames,
				});
		}
	    }
	}
    }
    else if (message.type == "usernames_detected") {
	message.domain = get_domain(message.domain);
	var tot_detected_unames = 0;
	for (var n in message.present_usernames.frequency) {
	    tot_detected_unames += message.present_usernames.frequency[n];
	}

	if (sender.tab.id in cookie_investigating_tabs) {
	    var cit = cookie_investigating_tabs[sender.tab.id];

	    if (message.curr_epoch_id == cit.get_epoch_id()) {
		console.log("APPU DEBUG: Username detection response for 'COOKIE-INVESTIGATION', (page_load_success: " + 
			    cit.get_page_load_success() + ", domain: " + message.domain + 
			    "), Num usernames detected(invisible? " + message.invisible_check_invoked + "): " + 
			    tot_detected_unames + 
			    " (total time: " + message.total_time + "ms)");

		var num_pwd_boxes = message.num_password_boxes;
		// cit.compare_screen_layout(message.visible_elements);

		if (cit.pageload_timeout != undefined) {
		    console.log("APPU DEBUG: Clearing reload-interval for: " + sender.tab.id
				+ ", Interval-ID: " + cit.pageload_timeout);
		    window.clearInterval(cit.pageload_timeout);
		    cit.pageload_timeout = undefined;
		}

		var is_user_logged_in = cit.is_user_logged_in(message.present_usernames);
		if (is_user_logged_in == false &&
		    message.total_time < (cit.get_page_load_time() * 3)) {
		    console.log("APPU DEBUG: User does not seem to be logged-in." + 
				" Waiting for 3 times the normal page load time: " + 
				(cit.get_page_load_time() * 1.5) + " ms");
		    window.setTimeout(function(){
			    check_usernames_for_cookie_investigation(sender.tab.id);
		        }, (cit.get_page_load_time() * 1.5));
		}
		else {
		    if (is_user_logged_in && 
			cit.get_state() == 'st_verification_epoch') {
			cit.set_page_load_time(message.total_time - message.user_detection_time);
		    }
		    process_last_epoch(sender.tab.id, message.present_usernames, num_pwd_boxes);
		}
	    }
	}
	else {
	    console.log("APPU DEBUG: On domain(" + message.domain + ") Num usernames detected(invisible? " +
			message.invisible_check_invoked + "): " + 
			tot_detected_unames);
	    for (var uname in message.present_usernames.frequency) {
		console.log("APPU DEBUG: Username: " + uname + ", Frequency: " + message.present_usernames.frequency[uname]);
	    }
	    for (var i = 0; i < message.present_usernames.elem_list.length; i++) {
		var pos = message.present_usernames.elem_list[i];
		console.log("APPU DEBUG: Element(top: "+ pos.top +", left: "+ pos.left +")");
	    }
	}
    }
    else if (message.type == "record_prelogin_cookies") {
	if (sender.tab && (sender.tab.id in cookie_investigating_tabs)) {
	    return;
	}

	message.domain = get_domain(message.domain);
	console.log("APPU DEBUG: Recording prelogin cookies for: " + message.domain);
	record_prelogin_cookies('', message.domain);
    }
    else if (message.type == "check_passwd_reuse") {
	if (sender.tab && (sender.tab.id in cookie_investigating_tabs)) {
	    return;
	}

	message.domain = get_domain(message.domain);
	console.log("APPU DEBUG: User is attempting to LOGIN in: " + message.domain);
	console.log("APPU DEBUG: LOGIN_ATTEMPT for: " + message.domain);
	console.log("APPU DEBUG: Username info: " + JSON.stringify(message.uname_results));
	//print_all_cookies(message.domain, "LOGIN_ATTEMPT");

	// 	console.log("Here here here: Registering for responses");
	// 	chrome.webRequest.onHeadersReceived.addListener(cb_headers_received, {
	// 		"urls": ["<all_urls>"],
	// 		    "tabId": sender.tab.id
	// 		    },
	// 	    ["responseHeaders"]);

	console.log("APPU DEBUG: (" + message.caller + ", " + message.pwd_sentmsg + 
		    "), Value of is_password_stored: " + message.is_stored);

	var username = '';
	var username_length = 0;
	var reason = message.uname_results.reason;
	if (message.uname_results.rc) {
	    username = get_username_identifier(message.uname_results.username, true);
	    username_length = message.uname_results.username.length;
	    console.log("APPU DEBUG: Domain: " + message.domain + ", Username: " 
			+ message.uname_results.username + ", username_identifier: " + username);
	}
	else {
	    username = get_username_identifier('', true);
	    username_length = 0;
	    console.log("APPU DEBUG: Domain: " + message.domain + ", NO USERNAME FOUND, reason: " + reason 
			+ ", username_identifier: " + username);
	}

	message.username = username;
	r = pii_check_passwd_reuse(message, sender);

	//Add the current pwd info to pending warnings
	var pend_warn = {};
	pend_warn = $.extend(true, {}, r);
	pending_warnings[sender.tab.id] = {
	    'pending_warnings' : pend_warn,
	    'event_type' : 'login_attempt',
	    'user_is_warned' : false, 
	    'passwd' : message.passwd,
	    'pwd_strength' : r.pwd_strength,
	    'domain' : message.domain,
	    'username' : username,
	    'username_length' : username_length,
	    'username_reason' : reason,
	    'is_stored' : message.is_stored,
	};

	sendResponse(r);
    }
    else if (message.type == "status_change") {
	pii_modify_status(message);
    }
    else if (message.type == "page_is_loaded") {
	if (sender.tab && sender.tab.id in cookie_investigating_tabs) {
	    var cit = cookie_investigating_tabs[sender.tab.id];

	    if (message.curr_epoch_id == cit.get_epoch_id()) {
		console.log("APPU DEBUG: Setting page load success for EPOCH-ID: " + 
			    message.curr_epoch_id +
			    " (page_load_time: " + message.page_load_time + " ms)");

		if (cit.get_epoch_id() == 1) {
		    cit.set_page_load_time(message.page_load_time);
		}

		cit.set_page_load_success(true);
		if (cit.pageload_timeout != undefined) {
		    window.clearInterval(cit.pageload_timeout);
		    cit.pageload_timeout = undefined;
		}
		
		if (cit.get_state() == 'st_cookie_test_start') {
		    console.log("----------------------------------------");
		    process_last_epoch(sender.tab.id, undefined, undefined)
			}
		else if (cit.get_state() == 'st_testing'                                  ||
			 cit.get_state() == 'st_start_with_no_cookies'                    ||
			 cit.get_state() == 'st_suspected_cookies_pass_test'              ||
			 cit.get_state() == 'st_suspected_cookies_block_test'             ||
			 cit.get_state() == 'st_verification_epoch'                       ||
			 cit.get_state() == 'st_cookiesets_block_nonduring_and_disabled'  ||
			 cit.get_state() == 'st_cookiesets_block_disabled'                ||
			 cit.get_state() == 'st_gub_cookiesets_block_test'                ||
			 cit.get_state() == 'st_expand_suspected_account_cookies') {
		    // We test here that user is still logged into the web application.
		console.log("Here here: Calling check_usernames_for_cookie_investigation(), EPOCH-ID: " + 
			    message.curr_epoch_id);
		check_usernames_for_cookie_investigation(sender.tab.id);
		}
	    }
	}
    }
    else if (message.type == "query_status") {
	if (sender.tab && (sender.tab.id in cookie_investigating_tabs)) {
	    return;
	}

// 	console.log("APPU DEBUG: tabid: "+sender.tab.id+", In query status: " + 
// 	template_processing_tabs[sender.tab.id]);

	r = {};
	r.status = pii_vault.config.status;
	r.show_monitor_icon = pii_vault.options.monitor_icon_setting;
	r.lottery_setting = pii_vault.options.lottery_setting;

	if (sender.tab && sender.tab.id in template_processing_tabs) {
	    if (template_processing_tabs[sender.tab.id] != "") { 
		//console.log(sprintf("APPU DEBUG: Tab %s was sent a go-to url earlier", sender.tab.id));
		var dummy_tab_id = sprintf('tab-%s', sender.tab.id);
		template_processing_tabs[sender.tab.id] = "";
		//console.log("APPU DEBUG: YYY tabid: " + sender.tab.id + ", value: " + template_processing_tabs[sender.tab.id]);
		r.status = "process_template";
		sendResponse(r);

		$('#' + dummy_tab_id).trigger("page-is-loaded");
	    }
	    else {
		r.status = "process_template";
		sendResponse(r);
	    }
	}
	else {
	    sendResponse(r);
	}
    }
    else if (message.type == "signed_in") {
	if (sender.tab && !(sender.tab.id in cookie_investigating_tabs)) {
	    var domain = get_domain(message.domain);
	    
	    if (message.value == 'yes') {
		console.log("APPU DEBUG: Signed in for site: " + get_domain(message.domain));
		
		// First check with which username the user has logged into the site
		var username_list = get_logged_in_username(domain);
		add_domain_to_uas(domain, username_list[0], username_list[1], undefined);
		
		var hk = username_list[0] + ":" + domain;
		if (hk in pii_vault.current_report.user_account_sites) {
		    pii_vault.current_report.user_account_sites[hk].pwd_unchanged_duration = 
			get_pwd_unchanged_duration(domain, username_list[0]);
		}
		else {
		    console.log("APPU DEBUG: " + hk + " not present in cr.user_account_sites");
		}
		
		flush_selective_entries("current_report", ["user_account_sites"]);
		
		if (sender.tab && sender.tab.id in pending_pi_fetch) { 
		    if (pending_pi_fetch[sender.tab.id] == domain) {
			console.log("APPU DEBUG: domain: " + domain + ", tab-id: " + sender.tab.id);
			check_if_pi_fetch_required(domain, sender.tab.id, sender.tab);		
			pending_pi_fetch[sender.tab.id] = "";
		    }
		    else {
			pending_pi_fetch[sender.tab.id] = "";
		    }
		}
	    }
	    else if (message.value == 'no') {
		//add_domain_to_nuas(domain);
		if (sender.tab) {
		    pending_pi_fetch[sender.tab.id] = "";
		}
		console.log("APPU DEBUG: NOT Signed in for site: " + get_domain(message.domain));
	    }
	    else if (message.value == 'unsure') {
		//add_domain_to_nuas(domain);
		if (sender.tab) {
		    pending_pi_fetch[sender.tab.id] = "";
		}
		console.log("APPU DEBUG: Signed in status UNSURE: " + get_domain(message.domain));
	    }
	    else {
		console.log("APPU DEBUG: Undefined signed in value " + 
			    message.value + ", for domain: " + get_domain(message.domain));
	    }
	}
    }
    else if (message.type == "explicit_sign_out") {
	var domain = get_domain(message.domain);
	console.log("APPU DEBUG: User is attempting to *explicitly* LOGOUT from: " + domain);

	console.log("APPU DEBUG: LOGOUT_ATTEMPT for: " + domain);
	//print_all_cookies(domain, "LOGOUT_ATTEMPT");
	//add_domain_to_uas(domain);

	cleanup_session_cookie_store(domain);
	update_logged_in_state("logged-out", domain, undefined);
	var username_list = get_logged_in_username(domain);

	var hk = username_list[0] + ":" + domain;
	if (hk in pii_vault.current_report.user_account_sites) {
	    pii_vault.current_report.user_account_sites[hk].pwd_unchanged_duration = 
		get_pwd_unchanged_duration(domain, username_list[0]);
	    pii_vault.current_report.user_account_sites[hk].num_logouts += 1;
	}
	else {
	    console.log("APPU DEBUG: " + hk + " not present in cr.user_account_sites");
	}
	flush_selective_entries("current_report", ["user_account_sites"]);
	send_user_account_site_row_to_reports(domain);

	pending_warnings[sender.tab.id] = {
	    'event_type' : 'logout_attempt', 
	    'domain' : domain,
	};
    }
    else if (message.type == "simulate_click_done") {
	console.log("APPU DEBUG: tabid: " + sender.tab.id + ", In simulate click: " 
		    + template_processing_tabs[sender.tab.id]);
	if (sender.tab.id in template_processing_tabs) {
	    if (template_processing_tabs[sender.tab.id] != "") { 
		console.log(sprintf("APPU DEBUG: Tab %s was sent a go-to url earlier", sender.tab.id));
		var dummy_tab_id = sprintf('tab-%s', sender.tab.id);
		template_processing_tabs[sender.tab.id] = "";
		console.log("APPU DEBUG: YYY tabid: " + sender.tab.id + ", value: " 
			    + template_processing_tabs[sender.tab.id]);
		$('#' + dummy_tab_id).trigger("page-is-loaded");
	    }
	}
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
	if (r.blacklisted == "no") {
	    var etld = get_domain(message.domain);
	    
	    add_ad_non_uas(etld);
	    if(pii_vault.total_site_list.indexOf(etld) == -1) {

		pii_vault.total_site_list.push(etld);
		vault_write("total_site_list", pii_vault.total_site_list);
		pii_vault.current_report.num_total_sites += 1;
		flush_selective_entries("current_report", ["num_total_sites"]);
		pii_vault.aggregate_data.num_total_sites += 1;
		flush_selective_entries("aggregate_data", ["num_total_sites"]);

		pii_vault.current_report.num_non_user_account_sites = 
		    pii_vault.current_report.num_total_sites - pii_vault.current_report.num_user_account_sites;
		flush_selective_entries("current_report", ["num_non_user_account_sites"]);

	    }
	}
	sendResponse(r);
    }
    else if (message.type == "get_report_by_number") {
	var resp = pii_get_report_by_number(message.report_number);
	response_report = resp[0];
	original_report = resp[1];
	response_report.report_number = message.report_number;
	response_report.num_total_report = pii_vault.past_reports.length + 1;
	response_report.pi_field_value_identifiers = pii_vault.aggregate_data.pi_field_value_identifiers;
	
	response_report.num_user_account_sites_overall = Object.keys(pii_vault.password_hashes).length;
	response_report.num_non_user_account_sites_overall = pii_vault.aggregate_data.num_non_user_account_sites;
	response_report.num_total_sites_overall = response_report.num_user_account_sites_overall + 
	    response_report.num_non_user_account_sites_overall;

	sendResponse(response_report);

	original_report.report_updated = false;
    }
    else if (message.type == "get_differential_report") {
	//r = pii_get_differential_report(message);
	//sendResponse(r);
    }
    else if (message.type == "delete_entry") {
	purge_report_entry(message.report_number, message.table_name, message.entry_key);
    }
    else if (message.type == "add_to_dontbug_list") {
	r = pii_add_dontbug_list(message);
	sendResponse(r);
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
	report_tab_ids.splice(report_tab_ids.indexOf(sender.tab.id), 1);
	is_report_tab_open -= 1;
    }
    else if (message.type == "report_tab_opened") {
	report_tab_ids.push(sender.tab.id);
	is_report_tab_open += 1;
	pii_vault.current_report.num_report_visits += 1;
	flush_selective_entries("current_report", ["num_report_visits"]);
    }
    else if (message.type == "report_time_spent") {
	pii_vault.current_report.report_time_spent += message.time_spent;
	// console.log("APPU DEBUG: Time spent in reports tab: " + message.time_spent 
	// 	    + ", total time: " + pii_vault.current_report.report_time_spent);
	flush_selective_entries("current_report", ["report_time_spent"]);
	if (((pii_vault.current_report.report_time_spent / (60*1000)) > 1) &&
	    (!pii_vault.current_report.report_reviewed)) {
	    //If user has spent more than a minute on reports page then set 
	    //report reviewed to true
	    pii_vault.current_report.report_reviewed = true;
	    flush_selective_entries("current_report", ["report_reviewed"]);
	}
    }
    else if (message.type == "myfootprint_tab_opened") {
	myfootprint_tab_ids.push(sender.tab.id);
	pii_vault.current_report.num_myfootprint_visits += 1;
	flush_selective_entries("current_report", ["num_myfootprint_visits"]);
	pii_vault.aggregate_data.num_viewed += 1;
	flush_selective_entries("aggregate_data", ["num_viewed"]);
    }
    else if (message.type == "myfootprint_tab_closed") {
	myfootprint_tab_ids.splice(myfootprint_tab_ids.indexOf(sender.tab.id), 1);
    }
    else if (message.type == "myfootprint_time_spent") {
	pii_vault.current_report.myfootprint_time_spent += message.time_spent;
	flush_selective_entries("current_report", ["myfootprint_time_spent"]);

	console.log("APPU DEBUG: Time spent in myfootprint tab: " + message.time_spent 
		    + ", total time: " + pii_vault.current_report.myfootprint_time_spent);

	pii_vault.aggregate_data.total_time_spent += message.time_spent;
	flush_selective_entries("aggregate_data", ["total_time_spent"]);
    }
    else if (message.type == "get_report_setting") {
	r = {};
	r.report_setting = pii_vault.options.report_setting;
	sendResponse(r);
    }
    else if (message.type == "set_report_setting") {
	pii_vault.options.report_setting = message.report_setting;
	flush_selective_entries("options", ["report_setting"]);
	pii_vault.current_report.report_setting = message.report_setting;
	flush_selective_entries("current_report", ["report_setting"]);
    }
    else if (message.type == "get_monitor_icon_setting") {
	r = {};
	r.monitor_icon_setting = pii_vault.options.monitor_icon_setting;
	sendResponse(r);
    }
    else if (message.type == "set_monitor_icon_setting") {
	if (message.monitor_icon_setting == "monitor-icon-on") {
	    pii_vault.options.monitor_icon_setting = "yes";
	}
	else {
	    pii_vault.options.monitor_icon_setting = "no";
	}
	flush_selective_entries("options", ["monitor_icon_setting"]);
    }
    else if (message.type == "get_lottery_setting") {
	r = {};
	r.lottery_setting = pii_vault.options.lottery_setting;
	sendResponse(r);
    }
    else if (message.type == "set_lottery_setting") {
	console.log("Here here: Lottery setting: " + message.lottery_setting);
	if (message.lottery_setting == "lottery-on") {
	    pii_vault.options.lottery_setting = "participating";
	    pii_vault.current_report.lottery_setting = "participating";
	}
	else {
	    pii_vault.options.lottery_setting = "not-participating";
	    pii_vault.current_report.lottery_setting = "not-participating";
	}
	flush_selective_entries("options", ["lottery_setting"]);
	flush_current_report();
    }
    else if (message.type == "get_appu_initialized") {
	r = {};
	r.initialized = "no";
	if (pii_vault.initialized) {
	    r.initialized = "yes";
	}
	sendResponse(r);
    }
    else if (message.type == "set_appu_initialized") {
	pii_vault.initialized = true;
	vault_write("initialized", pii_vault.initialized);
    }
    else if (message.type == "get_per_site_pi") {
	var r = get_all_pi_data();
	sendResponse(r);
    }
    else if (message.type == "report_user_approved") {
	schedule_report_for_sending(message.report_number);
    }
    else if (message.type == "sign-in") {
	sign_in(sender.tab.id, message.username, message.password);
    }
    else if (message.type == "create-account") {
	create_account(sender.tab.id, message.username, message.password);
    }
    else if (message.type == "sign-out") {
	if ( sign_in_status == "signed-in" ) {
	    sign_out();
	}
    }
    else if (message.type == "get-version") {
	sendResponse({'version' : pii_vault.config.current_version});
    }
    else if (message.type == "show-text-report") {
	text_report_tab_ids[message.tabid] = message.reportnumber;
    }
    else if (message.type == "get-text-report-number") {
	sendResponse({ 
	    'reportnumber' : text_report_tab_ids[sender.tab.id]
	});
    }
});

if (!pii_vault.initialized) {
    chrome.tabs.create({ url: 'sign_in.html' });
}

//// GENERAL TESTING code

// var reader = new FileReader();
// reader.onload = function(event) {
//     var contents = event.target.result;
//     console.log("File contents: " + contents);
// };

// reader.onerror = function(event) {
//     console.error("File could not be read! Code " + event.target.error.code);
// };

// reader.onabort = reader.onerror;

// reader.onloadstart = function(event) {
//     console.error("In loadstart");
// } 

// reader.onloadend = function(event) {
//     console.error("In loadend");
// } 

// reader.readAsText(chrome.extension.getURL("background.html"));

//test_read();

var read_tar = undefined;
var unzipped_file1 = undefined;
var unzipped_file2 = undefined;

function test_read() {
    var url = chrome.extension.getURL("test.tar");
    var request = new XMLHttpRequest();
    // false so that request is processed sync and we dont have to do callback BS
    request.open("GET", url, true);
    request.responseType = 'arraybuffer';

    request.onload = function(req) {
	var r1 = req;
	return function(oEvent) {
	    console.log("APPU DEBUG, loaded the file successfully: " + r1);
	    read_tar = r1.response;
	    var files = untar(read_tar);
	    var k = unzip(files[0].fileData);
	    unzipped_file1 = String.fromCharCode.apply(null, k)

	    var k = unzip(files[1].fileData);
	    unzipped_file2 = String.fromCharCode.apply(null, k);
	    
	    //write_file("fpi/uz1", unzipped_file1);
	    //write_file("fpi/uz2", unzipped_file2);
	};
    }(request);

    request.onerror = function(oEvent) {
	console.log("APPU DEBUG: Error to get the file");
    }

    request.send();
    return;
}

function make_user_approved_always(site) {
    pii_vault.aggregate_data.per_site_pi[site] = {};
    pii_vault.aggregate_data.per_site_pi[site].user_approved = "always";
    get_permission_and_fetch_pi(site, undefined);
}

//Test code.
// window.setTimeout(function(){
// 	console.log("Here here: printing cookie name for google.com");
// 	print_all_cookies('facebook.com', "APPU_START_CHECK");
//     }, 2 * 1000);


//make_user_approved_always("dominos.com");
 
// function print_open_windows(windows) {
//     for (var i = 0; i < windows.length; i++) {
// 	console.log("APPU DEBUG: ----------- --------- -------- ---------- ");
// 	console.log("APPU DEBUG: Window ID: " + windows[i].id);
// 	console.log("APPU DEBUG: Window INCOGNITO: " + windows[i].incognito);
// 	console.log("APPU DEBUG: Window TYPE: " + windows[i].type);
// 	console.log("APPU DEBUG: Window STATE: " + windows[i].state);
// 	console.log("APPU DEBUG: Window TOTAL TABS: " + windows[i].tabs.length);
//     }
// }

// chrome.windows.getAll({
// 	populate: true,
// 	    }, print_open_windows);


// function print_last_focused(window) {
//     console.log("APPU DEBUG: Last focused Window ID: " + window.id);
// }

// chrome.windows.getLastFocused({}, print_last_focused);


//chrome.webRequest.onAuthRequired.addListener(onauthrequired_cb, {urls: ["<all_urls>"]});

// function print_all_response_headers(details) {
//     console.log("Here here: " + JSON.stringify(details.responseHeaders));
// }

// chrome.webRequest.onHeadersReceived.addListener(print_all_response_headers, {
// 	"urls": ["<all_urls>"]
// 	    },
//     ["blocking", "responseHeaders"]);

// function print_result(msg) {
//     return function (rc) {
//         if (rc != undefined) {
//             msg += JSON.stringify(rc)
// 		}
//         console.log(msg);
//     }
// }

// chrome.storage.local.getBytesInUse(null, print_result("Local storage size: "));

// chrome.storage.local.set({"object1": {
//             "key1" : 23,
//                 "key2" : "my_string1",
//                 "key3" : {
//                 "n1" : 1,
//                     "n2" : 2,
// 		    }
//         }}, print_result("Storing object 1"));

// chrome.storage.local.getBytesInUse(null, print_result("Local storage size: "));
// chrome.storage.local.get("object1", print_result("Getting object 1: "));
// chrome.storage.local.set({"object2": {
//             "key2" : 23,
//                 "key3" : "my_string1",
//                 "key4" : {
//                 "n1" : 1,
//                     "n2" : 2,
// 		    }
//         }}, print_result("Storing object 2"));

// chrome.storage.local.getBytesInUse(null, print_result("Local storage size: "));
// chrome.storage.local.get("object2", print_result("Getting object 2: "));

// chrome.storage.local.get(null, print_result("Getting all objects: "));


// chrome.storage.local.clear(print_result("Cleaning up local storage"));
// chrome.storage.local.getBytesInUse(null, print_result("Local storage size: "));
