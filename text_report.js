var current_report = undefined;

function window_focused() {

}

function window_unfocused() {

}

function process_report(report) {
    current_report = report;
    // ////////// Populate Overall Stats
    $("body").append("Overall statistics:");
    $("body").append("Appu version: " + report.extension_version + "<br/>");
    $("body").append("GUID: " + report.guid + "<br/>");
    $("body").append("Report-ID: " + report.reportid + "<br/>");
    $("body").append("Report duration: " + get_report_duration(report) + "<br/>");

    $("body").append("Total sites visited: " + report.num_total_sites + "<br/>");
    $("body").append("Sites with user's account: " + report.num_user_account_sites + "<br/>");
    $("body").append("Sites w/o user's account: " + report.num_non_user_account_sites + "<br/>");

    $("body").append("Total time spent browsing: " + format_display_time(report.total_time_spent) + "<br/>");
    $("body").append("Total time spent while logged-in: " + 
		     format_display_time(report.total_time_spent_logged_in) + "<br/>");
    $("body").append("Total time spent w/o logging-in: " + 
		     format_display_time(report.total_time_spent_wo_logged_in) + "<br/>");
    $("body").append("Total number of logins: " + 
		     cumulative_value(report.user_account_sites, "num_logins") + "<br/>");
    $("body").append("Total number of explicit logouts: " + 
		     cumulative_value(report.user_account_sites, "num_logouts") + "<br/>");
    $("body").append("Total number of different passwords: " + report.num_pwds  + "<br/>");

    // ////////// Populate Per Site User Account Table
    $("body").append("<br/>Per-site statistics: <br/>"); 
    var psadt_records = create_datatable_consumable_records(report, "user_account_sites", 
    							    [
    								'my_pwd_group',
    								'num_logins',
    								'tts',
    								'latest_login',
    								'tts_login',
    								'tts_logout',
    								'num_logouts',
    								'site_category'
    							    ]);
    for (var i = 0; i < psadt_records.length; i++) {
	$("body").append(psadt_records[i].join(", ") + "<br/>");
    }
    // ////////// Populate Password Stats Table
    $("body").append("<br/>Password Stats: <br/>"); 
    var pst_records = create_datatable_consumable_records(report, "pwd_groups", 
    							    [
    								'sites',
    								'strength',
    								'strength',
    							    ]);
    for (var i = 0; i < pst_records.length; i++) {
	$("body").append(pst_records[i].join(", ") + "<br/>");
    }
    // ////////// Populate Password Edit Distance Table
    $("body").append("<br/>Password Similarity: <br/>"); 
    for (var k in report.pwd_similarity) {
	$("body").append(k + " : " + report.pwd_similarity[k].join(", ") + "<br/>" ); 
    }
    // ////////// Populate Password Reuse Warnings Table
    $("body").append("<br/>Password Reuse Warnings: <br/>"); 
    for (var i = 0; i < report.pwd_reuse_warnings.length; i++) {
	$("body").append(report.pwd_reuse_warnings[i].join(", ") + "<br/>");
    }
    // ////////// Populate PI Metadata Table
    $("body").append("<br/>Personal Information Metadata: <br/>"); 

    var pmt_records = create_datatable_consumable_records(report, "downloaded_pi", 
    							    [
    								'download_time',
    								'downloaded_fields'
    							    ]);
    for (var i = 0; i < pmt_records.length; i++) {
	$("body").append(pmt_records[i].join(", ") + "<br/>");
    }
    // ////////// Populate PI Reuse Table
    $("body").append("<br/>Personal Information Reuse: <br/>"); 

    var prt_records = create_datatable_consumable_records(report, "common_fields", []);
    for (var i = 0; i < prt_records.length; i++) {
	$("body").append(prt_records[i].join(", ") + "<br/>");
    }

    // ////////// Populate User Interaction Metadata Table
    $("body").append("<br/>User Interaction Metadata: <br/>"); 
    for (var i = 0; i < report.input_fields.length; i++) {
	$("body").append(report.input_fields[i].join(", ") + "<br/>");
    }
    // ////////// Populate Appu Metadata
    $("body").append("<br/>Appu Metadata:<br/>");
    $("body").append("Is report modified?: " + report.report_modified  + "<br/>");
    $("body").append("Number of times report was visited by user: " + report.num_report_visits + "<br/>");
    $("body").append("Total time spent on report page by user: " + 
		     format_display_time(report.report_time_spent) + "<br/>");

    var has_user_approved = (report.user_approved == false) ? "no" : 
    	format_display_date((new Date(report.user_approved)).getTime(), false);
    
    has_user_approved = has_user_approved.replace("<br/>", "");
    has_user_approved = has_user_approved.replace("<span class='report-time'>", " (");
    has_user_approved = has_user_approved.replace('</span>', ")");
    has_user_approved = '<span>' + has_user_approved + '</span>';

    $("body").append("Has user approved sending of report: " + 
		     has_user_approved + "<br/>");
    
    var is_report_delivered = (report.actual_report_send_time == 'Not delivered yet') ? 
    	'Not delivered yet' : 'Yes';
    $("body").append("Is report delivered yet?: " + 
		     is_report_delivered + "<br/>");

    var sched_send_time = format_display_date((new Date(report.scheduled_report_time)).getTime(), true);
    
    sched_send_time = sched_send_time.replace("<br/>", "");
    sched_send_time = sched_send_time.replace("<span class='report-time-add-info'>", " ");
    sched_send_time = sched_send_time.replace("<span class='report-time'>", " ");
    sched_send_time = sched_send_time.replace('</span>', " ");
    sched_send_time = '<span>' + sched_send_time + '</span>';

    $("body").append("Scheduled delivery time: " + 
		     sched_send_time + "<br/>");

    var report_send_time = (report.actual_report_send_time == 'Not delivered yet') ? 'Not delivered yet' : 
    	format_display_date((new Date(report.actual_report_send_time)).getTime(), false);
    
    report_send_time = report_send_time.replace("<br/>", "");
    report_send_time = report_send_time.replace("<span class='report-time'>", " (");
    report_send_time = report_send_time.replace('</span>', ")");
    report_send_time = '<span>' + report_send_time + '</span>';

    $("body").append("Actual delivery time: " + 
		     report_send_time + "<br/>");

    $("body").append("Number of delivery attempts: " + 
		     report.send_attempts.length + "<br/>");
    $("body").append("Reporting setting: " + 
		     report.report_setting + "<br/>");
    $("body").append("Send report postponed: " + 
		     report.send_report_postponed + "<br/>");
    $("body").append("Number of times 'My Footprint' was visited: " + 
		     report.num_myfootprint_visits + "<br/>");
    $("body").append("Total time spent on 'My Footprint' page: " + 
		     format_display_time(report.myfootprint_time_spent) + "<br/>");

    $("body").append("Total number of times Appu was disabled by user: " + 
		     report.appu_disabled.length + "<br/>");
    $("body").append("Duration of each 'Appu disabled' period in minutes: " + 
		     report.appu_disabled.join(", ") + "<br/>");
    $("body").append("Sites added to DO-NOT-BUG-ME-LIST: " + 
		     report.dontbuglist.join(", ") + "<br/>");
    $("body").append("Is extension updated?: " + 
		     report.extension_updated + "<br/>");

    $("body").append("<br/>Appu Errors: <br/>"); 

    for (var i = 0; i < report.appu_errors.length; i++) {
    	var error = report.appu_errors[i] + "<br/>";
    	$("body").append(error);
    }

}

function fetch_report(response) {
    console.log("APPU DEBUG: Report number: " + response.reportnumber);
    chrome.extension.sendMessage("", {
	'type' : "get_report_by_number",
	'report_number' : response.reportnumber
    }, process_report);
}

$(window).on("focus", window_focused);
$(window).on("blur", window_unfocused);

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function() {
	var message = {};
	message.type = "report_tab_closed";
	chrome.extension.sendMessage("", {
	    'type' : "get-text-report-number"
	}, fetch_report);
    }, 300);

});

$(window).on("unload", function() {
});

chrome.extension.onMessage.addListener(function(message, sender, send_response) {
});