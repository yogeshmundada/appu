
function pii_next_report_time() {
    var curr_time = new Date();

    curr_time.setSeconds(0);
    // Set next send time after 3 days
    curr_time.setMinutes( curr_time.getMinutes() + pii_vault.config.reporting_interval);
    curr_time.setMinutes(0);
    curr_time.setHours(0);
    curr_time.setMinutes( curr_time.getMinutes() + pii_vault.config.reporting_hour);
    return new Date(curr_time.toString());
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

    pii_vault.config.report_reminder_time = curr_time.toString();
    flush_selective_entries("config", ["report_reminder_time"]);
    pii_vault.current_report.send_report_postponed += 1;
    flush_selective_entries("current_report", ["send_report_postponed"]);

    console.log(sprintf("[%s]: Report Reminder time postponed for: %dm", new Date(), report_reminder_interval));

    chrome.tabs.query({}, function(all_tabs) {
	for(var i = 0; i < all_tabs.length; i++) {
	    chrome.tabs.sendMessage(all_tabs[i].id, {type: "close-report-reminder"});
	}
    });
}


function check_report_time() {
    var curr_time = new Date();
    var is_report_different = true;

    //Its not reporting time yet, so return
    if(curr_time.getTime() < (new Date(pii_vault.current_report.scheduled_report_time)).getTime()) {
	return;
    }

    //We are not signed-in, so no need to send report.
    if (sign_in_status == 'not-signed-in') {
	return;
    }

    //report_setting is "auto", just send it..
    if (pii_vault.options.report_setting == "auto") {
	schedule_report_for_sending(1);
	return;
    }

    //user has participated in the "lottery", just send it..
    if (pii_vault.options.lottery_setting == "participating") {
	schedule_report_for_sending(1);
	return;
    }

    if (pii_vault.options.report_setting == "manual" || 
	pii_vault.options.report_setting == "differential") {
	if (pii_vault.config.report_reminder_time == -1) {
	    //Don't want to annoy user with reporting dialog if we are disabled OR
	    //if user already has a review report window open (presumably working on it).
	    if (pii_vault.config.status == "active" && is_report_tab_open == 0) {
		//Send message to all the tabs that report is ready for review and sending
		chrome.tabs.query({}, function(all_tabs) {
			for(var i = 0; i < all_tabs.length; i++) {
			    chrome.tabs.sendMessage(all_tabs[i].id, {type: "report-reminder"});
			}
		    });
	    }
	}
	else if (curr_time.getTime() > (new Date(pii_vault.config.report_reminder_time)).getTime()) {
	    //For now, lets just enable report-reminder, the next time we are invoked, we will
	    //attempt to send the report.
	    console.log(sprintf("[%s]: Enabling Report Reminder", new Date()));
	    pii_vault.config.report_reminder_time = -1;
	    flush_selective_entries("config", ["report_reminder_time"]);
	}
    }
}


function schedule_report_for_sending(report_number) {
    //Store the approval timestamp in report.user_approved
    pii_vault.current_report.user_approved = new Date();
    flush_selective_entries("current_report", ["user_approved"]);
    pii_send_report(report_number);
}

//This report_number is *NOT* reportid
//It is actually the index of the report from current_report.
//Current_report is numbered at 1.
//Report before that as 2, and report before that as 3 ..
//So on until total 10 reports in the past_report's queue
function pii_send_report(report_number) {
    var report = undefined;
    if (report_number == 1) {
	report = pii_vault.current_report;
    }
    else {
	//Adjust by 2 as current_report's number is 1
	report = pii_vault.past_reports[report_number - 2];
    }

    report.on_disk_size = roughSizeOfObject(localStorage);
    report.num_user_account_sites_overall = Object.keys(pii_vault.password_hashes).length;
    report.num_non_user_account_sites_overall = pii_vault.aggregate_data.num_non_user_account_sites;
    report.num_total_sites_overall = report.num_user_account_sites_overall + 
	report.num_non_user_account_sites_overall;
    
    var wr = {};
    wr.type = "periodic_report";

    //This is a temporary bug fix
    report.scheduled_report_time = new Date(report.scheduled_report_time);

    wr.current_report = report;

    try {
	$.ajax({ 
		type: "POST",
		    contentType: 'application/json',
		    url: server_url + "post_report", 
		    data: JSON.stringify(wr), 
		    success: function(report, report_number) {
		    return function(data, status) {
			var is_processed = false;
			stats_message = /Report processed successfully/;
			is_processed = (stats_message.exec(data) != null);
			
			if (is_processed) {
			    // Report successfully sent. Update the actual send time.
			    report.actual_report_send_time = new Date();
			    console.log("APPU INFO: Report '" + report.reportid 
					+ "'  is successfully sent to the server at: " 
					+ report.actual_report_send_time);
			    vault_write("past_reports", pii_vault.past_reports);
			    if (report_number in delivery_attempts) {
				delete delivery_attempts[report_number];
			    }
			}
			else if (data == "Duplicate Entry") {
			    // Report successfully sent. Update the actual send time.
			    report.actual_report_send_time = new Date();
			    console.log("APPU INFO: Report '" + report.reportid
					+ "'  is duplicate entry at the server. Not going to send it again. ");
			    vault_write("past_reports", pii_vault.past_reports);
			    if (report_number in delivery_attempts) {
				delete delivery_attempts[report_number];
			    }
			}
		    };
		}(report, report_number)})
	    .error(function(report, report_number) {
		    return function(data, status) {
			print_appu_error("Appu Error: Error while posting 'periodic report' to the server: " 
					 + (new Date()));
			report.send_attempts.push(new Date());
			vault_write("past_reports", pii_vault.past_reports);
		    }
		}(report, report_number));
    }
    catch (e) {
	print_appu_error("Appu Error: Error while posting 'periodic report' to the server: " + (new Date()));
	report.send_attempts(push(new Date()));
	vault_write("past_reports", pii_vault.past_reports);
    }

    if (report_number == 1) {
	pii_vault.current_report.report_updated = false;
	pii_vault.past_reports.unshift(pii_vault.current_report);
	if (pii_vault.past_reports.length > 10) {
	    pii_vault.past_reports.pop();
	}

	pii_vault.config.reportid += 1;

	initialize_current_report();

	pii_vault.total_site_list = [];
	vault_write("total_site_list", pii_vault.total_site_list);
	vault_write("past_reports", pii_vault.past_reports);

	console.log("APPU INFO: Current report is added to past reports. " +
		    "New current report is created with reporting time: " 
		    + pii_vault.current_report.scheduled_report_time);

    }

    console.log("APPU INFO: Report '" + report.reportid + "'  is scheduled for sending.");
}


function initialize_current_report() {
	pii_vault.config.next_reporting_time = pii_next_report_time();
	flush_selective_entries("config", ["reportid", "next_reporting_time"]);

	pii_vault.current_report = initialize_report();
	flush_current_report();
}


function purge_report_entry(report_number, table_name, entry_key) {
    var report = undefined;
    var is_it_current_report = true;
    if (report_number == 1) {
	//This is current report
	report = pii_vault.current_report;
    }
    else {
	//Adjust index for past reports.
	//Report number 1 is current report.
	//So in the past reports, report number 2 is at index '0'
	report_number -= 2;
	report = pii_vault.past_reports[report_number];
	is_it_current_report = false;
    }

    if (report.actual_report_send_time == "Not delivered yet") {
	report.report_modified = "yes";
    }

    var report_table = report[table_name];
    if (report_table instanceof Array) {
	for(var i = 0; i < report_table.length; i++) {
	    if (report_table[i][0] == entry_key) {
		report_table.splice(i, 1);
		break;
	    }
	}
    }
    else {
	delete report_table[entry_key];
    }

    //Flush to disk
    if (is_it_current_report) {
	flush_selective_entries("current_report", ["report_modified", table_name]);
    }
    else {
	vault_write("past_reports", pii_vault.past_reports);
    }
}


function pii_get_differential_report(message) {
    var r = {};
    return r;
    //Need to fix this one.
    r.pwd_reuse_report = [];
    r.master_profile_list = [];
    r.scheduled_report_time = pii_vault.config.next_reporting_time;

    for (var i = 0; i < pii_vault.master_profile_list.length; i++) {
	var copied_entry = {};
	copied_entry.site_name = pii_vault.master_profile_list[i];

	if (!pii_check_if_entry_exists_in_past_profile_list(pii_vault.master_profile_list[i])) {
	    copied_entry.index = i;
	    r.master_profile_list.push(copied_entry);
	}
    }

    return r;
}


//Probably deprecated..also f'king big names..what was I thinking?
function pii_check_if_entry_exists_in_past_profile_list(curr_entry) {
    for(var i=0; i < pii_vault.past_reports.length; i++) {
	var past_master_profile_list = pii_vault.past_reports[i].master_profile_list;
	for(var j = 0; j < past_master_profile_list.length; j++) {
	    if (past_master_profile_list[j] == curr_entry) {
		return true;
	    }
	}
    }
    return false;
}


//Probably deprecated..also f'king big names..what was I thinking?
function pii_check_if_entry_exists_in_past_pwd_reports(curr_entry) {
    var ce = {};
    var ce_str = "";
    ce.site = curr_entry.site;
    ce.other_sites = curr_entry.other_sites;

    ce.other_sites.sort();
    ce_str = JSON.stringify(ce);

    for(var i=0; i < pii_vault.past_reports.length; i++) {
	var past_report = pii_vault.past_reports[i].pwd_reuse_report;
	for(var j = 0; j < past_report.length; j++) {
	    var past_report_entry = {};
	    var pre_str = "";
	    past_report_entry.site = past_report[j].site;
	    past_report_entry.other_sites = past_report[j].other_sites;
	    past_report_entry.other_sites.sort();
	    pre_str = JSON.stringify(past_report_entry);
	    if (pre_str == ce_str) {
		return true;
	    }
	}
    }
    return false;
}


function pii_get_report_by_number(report_number) {
    var response_report = undefined;
    var original_report = undefined;
    if ( report_number == 1) {
	original_report = pii_vault.current_report;

    }
    else {
	original_report = pii_vault.past_reports[report_number - 2];
    }

    response_report = $.extend(true, {}, original_report);
    return [response_report, original_report];
}


//---------------------------------------------------------------------------
//Following functions are not really managing current report.
//Rather they update the displayed current_report on any tab if user is viewing it.


function send_pwd_group_row_to_reports(type, grp_name, sites, strength) {
    for (var i = 0; i < report_tab_ids.length; i++) {
	chrome.tabs.sendMessage(report_tab_ids[i], {
	    type: "report-table-change-row",
	    table_name: "pwd_groups",
	    mod_type: type,
	    changed_row: [
		grp_name,
		sites.sort().join(", "),
		strength.join(", "),
		strength.join(", "),
	    ],
	});
    }
}


function send_user_account_site_row_to_reports(site_name) {
    var uas_entry = pii_vault.current_report.user_account_sites[site_name];
    for (var i = 0; i < report_tab_ids.length; i++) {
	chrome.tabs.sendMessage(report_tab_ids[i], {
	    type: "report-table-change-row",
	    table_name: "user_account_sites",
	    mod_type: "replace",
	    changed_row: [
		site_name,
		uas_entry.pwd_unchanged_duration,
		uas_entry.pwd_stored_in_browser,
		uas_entry.my_pwd_group,
		uas_entry.num_logins,
		uas_entry.tts,
		uas_entry.latest_login,
		uas_entry.tts_login,
		uas_entry.tts_logout,
		uas_entry.num_logouts,
		uas_entry.site_category
	    ],
	});
    }
}

