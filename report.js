
var current_report = undefined;
var current_report_number = undefined;
//Whether deletion is enabled for this report.
//No point in deleting things from report that is already sent out
var current_report_delete_enabled = true;

// One to one mapping between on disk structure to html table
var html_to_disk_tables = {
    "#per-site-account-data-table"          : "user_account_sites",
    '#password-stats-table'                 : "pwd_groups",
    '#password-edit-distance-table'         : 'pwd_similarity',
    '#password-reuse-warnings-table'        : "pwd_reuse_warnings",
    '#pi-metadata-table'                    : "downloaded_pi", 
    '#pi-reuse-table'                       : "common_fields", 
    '#user-interaction-metadata-table'      : "input_fields",           
};


// One to one mapping between on html table to on disk structures
var disk_to_html_tables = {
    "user_account_sites"   :      "#per-site-account-data-table",     
    "pwd_groups"	        :      '#password-stats-table',            
    'pwd_similarity'	        :      '#password-edit-distance-table',    
    "pwd_reuse_warnings"   :      '#password-reuse-warnings-table',   
    "downloaded_pi"        :      '#pi-metadata-table',               	    
    "common_fields"        :      '#pi-reuse-table',                  	    
    "input_fields"         :      '#user-interaction-metadata-table',
};

var pi_field_color_code = {
    "ccn" : "code-red",
    "address" : "code-orange",
    "phone" : "code-orange",
    "ccn-address" : "code-orange",
    "name" : "code-yellow",
    "birthdate" : "code-yellow",
}

var pi_field_value = {
    "ccn" : 10,
    "address" : 5,
    "phone" : 5,
    "ccn-address" : 5,
    "name" : 4,
    "birthdate" : 4,
}

var all_help_descriptions = {
    "help-user-id" : "This is your globally unique user-id. Appu keeps all your reports stored against this ANONYMOUS id",
    "help-report-duration" : "Statistics covered in this report is related only to the sites accessed during report duration. For aggregate statistics, check 'My Footprint' page",
    "help-device-id" : "This is a randomly generated number to distinguish between reports sent from multiple devices (if you have installed Appu at multiple places). It has no other purpose than to differentiate reports.",
    "help-total-sites" : "Total number of sites that you visited during report duration",
    "help-sites-with-ac" : "Total number of sites where you actually logged in during report duration",
    "help-sites-wo-ac" : "Total number of sites that you accessed w/o logging in during report duration. This could mean 1. sites do not require user login, 2. you do not have an account on the site or 3. you have an account but you did not login",
    "help-total-time" : "Total time spent browsing any site",
    "help-total-time-logged-in" : "Total time spent logged-in with your account on any site. When you are logged in on any site, every action you take on that site can be correlated with your personal data present on that site",
    "help-total-time-logged-out" : "Total time spent browsing sites without logging in",
    "help-login-frequency" : "Number of times you entered username and password during report duration",
    "help-logout-frequency" : "Number of times you explicitly logged out during report duration",
    "help-total-passwords" : "Total number of DIFFERENT passwords entered by you during report duration",
    "help-browser" : "To estimate number of Appu users using a particular browser",
    "help-browser-version" : "To code browser version specific features",
    "help-os" : "To estimate number of Appu users using a particular operating system",
    "help-os-version" : "To code OS version specific features",
    "help-layout-engine" : "To estimate number of Appu users using a particular layout-engine",
    "help-layout-engine-version" : "To code layout-engine version specific features",
    "help-report-modified" : "If you have modified this report by deleting some entries",
    "help-report-visited" : "Number of times you accessed this report during report duration",
    "help-report-review" : "Total amount of time spent by you reviewing this report",
    "help-user-approved" : "If you explicitly approved sending out of this report. This value is invalid if reporting option is set to 'auto'",
    "help-report-delivered" : "If the report has been successfully delivered. For many reasons such as if you are not connected to Internet or if Appu server is down, report might not actually get sent even after getting your approval",
    "help-scheduled-report" : "Time scheduled by Appu to deliver this report",
    "help-actual-report-time" : "Actual report send time. This could differ from scheduled time because you postponed sending report or you were not connected to Internet or Appu server was down",
    "help-report-send-attempts" : "Number of times report uploading to server was attempted. This could be greater than one because Appu server was down",
    "help-reporting-type" : "Reporting type could be 'auto', 'manual' or 'differential'. You can change this setting from Appu Options page. Default is 'manual'. If the setting is 'manual', Appu will ask you to review the report everytime it is ready to send the report. If the setting is 'auto' it will automatically send the report when it is ready. If the setting is 'differential' then it will only send out report w/o asking you if it is not so different from past reports. Please check out FAQ to find out which fields we compare",
    "help-user-report-postpone" : "Number of times you rescheduled uploading of this report by pressing 'remind me later'. This field is invalid if reporting type is 'auto'",
    "help-appu-disabled" : "Number of times you disabled Appu.",
    "help-disabled-durations" : "Duration of disabling Appu each time",
    "help-donotbugme-list" : "New sites that you added to DONOTBUGME list. If you add a site to this list, then it will silently warn you about password reuse after you log in at right bottom",
    "help-extension-updated" : "If extension was updated during last reporting period",
    "help-myfootprint-visits" : "Number of times you visited and reviewed 'My Footprint' page",
    "help-myfootprint-time-spent" : "Total time spent on 'My Footprint' page revewing the data",
};

function simulate_hover() {
    console.log("APPU DEBUG: in simulate hover");
    $(".brand").trigger("mouseover").delay(2 * 1000).trigger("mouseout");
}

function openTab(url) {
}

function print_text_report() {
    console.log("APPU DEBUG: In print_text_report():" + new Date());
    chrome.tabs.create({ url: 'text_report.html' }, function (tab) {
	// Send which report to show to background.js
	chrome.extension.sendMessage("", {
	    'type' : 'show-text-report',
	    'tabid' : tab.id,
	    'reportnumber': current_report_number,
	});
    });
}

function expand_persite_account_table() {
    var button_value = $(this).text().trim();

    $("#per-site-account-data-table_length select").val('5').trigger('change');

    var dtTable = $("#per-site-account-data-table").dataTable();

    $("#per-site-account-data-table_wrapper").appendTo("#per-site-account-data-table-modal-body");
    $.each([6, 7, 8, 9, 10], function(index, value) {
    	dtTable.fnSetColumnVis( value, true);
    });
}

function contract_persite_account_table() {
    var button_value = $(this).text().trim();
    var dtTable = $("#per-site-account-data-table").dataTable();
    $("#per-site-account-data-table_wrapper").appendTo("#per-site-account-data-table-div");

    $.each([6, 7, 8, 9, 10], function(index, value) {
    	dtTable.fnSetColumnVis( value, false);
    });

    $("#per-site-account-data-table_length select").val('10').trigger('change');
}

function clear_table(table_name) {
    var dtTable = $(table_name).dataTable();
    dtTable.fnClearTable();
}

// This table adds dynamic updates to the reports page tables.
// These updates are async. 
// As compared to these, aggregate stats like "Overall Statistics" and
// "Appu Metadata" are synchronously updated every 5 minutes.
// mod_type could be: "add", "replace"
// changed_row: new row or modified row. Its responsibility of the calling entity
// (in this case, background.js) to send flat rows.
function modify_tables(disk_table_name, mod_type, changed_row) {
    // 1. For User Account Table: Modify, Add
    // 2. Password Sharing, strength: Modify, Add
    // 3. Password Edit Distance: Reconstruct Table
    // 4. Password Reuse Warnings: Add
    // 5. Fetched Personal Info: Modify, Add
    // 6. Common PI table: Modify, Add
    // 7. User Interaction Metadata: Add

    var html_table_name = disk_to_html_tables[disk_table_name];
    var dtTable = $(html_table_name).dataTable();

    if (mod_type === "replace") {
	var ori_tr = $(html_table_name + " tr:contains('" + changed_row[0] + "')")[0];
	if (ori_tr != undefined) {
	    dtTable.fnDeleteRow(ori_tr);
	}
    }
    dtTable.fnAddData(changed_row);
}

function count_attributes(obj) {
    var count = 0;
    for (var k in obj) {
	if (obj.hasOwnProperty(k)) {
	    ++count;
	}
    }
    return count;
}

function reconstruct_table(message) {
    if (message.table_name == "pwd_similarity") {
	populate_password_similarity_table(message.pwd_similarity, message.pwd_groups);
    }
    else if (message.table_name == "common_fields") {
	populate_common_fields_table(message.common_fields);
    }
}

function populate_common_fields_table(common_fields) {
    dtTable = $('#pi-reuse-table').dataTable();
    dtTable.fnClearTable();
    dtTable.fnDestroy();

    $('#pi-reuse-table').remove();
    var html_cf_table = $("<table></table>");
    html_cf_table.attr("id", "pi-reuse-table");
    html_cf_table.attr("cellpadding", "0");
    html_cf_table.attr("cellspacing", "0");
    html_cf_table.attr("border", "0");
    html_cf_table.attr("width", "0");

    html_cf_table.addClass("display all-data-tables");
    
    var html_column_headings = $("<tr></tr>");
    html_column_headings.append("<th>Site</th>");
    html_column_headings.append("<th>Fetch Time</th>");
    html_column_headings.append("<th>Fetched Fields</th>");
    html_column_headings.append("<th>Delete</th>");

    html_cf_table.append($("<thead></thead>").append(html_column_headings));
    html_cf_table.append("<tbody></tbody>");
    html_cf_table.append($("<tfoot></tfoot>").append(html_column_headings.clone()));
    
    $("#pi-metadata-table-div").append(html_cf_table);

    $("#pi-reuse-table").dataTable({
	"sDom": "<'row'<'span6'><'span6'>r>lft<'row'<'span6'i><'span6'p>>",
	"sPaginationType": "bootstrap",
	"aaSorting" : [ [1, 'desc'] ],
	"aLengthMenu": [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
	"aoColumnDefs" : [
	    { 
		"aTargets" : [3], 
		"mData": null, 
		"bSortable" : false, 
		"sWidth" : "10px",
		"sDefaultContent": '<i class="icon-trash delete-pi-reuse-entry"></i>' 
	    }
	]
    });

    var report = { 'common_fields' : common_fields };
    var prt_records = create_datatable_consumable_records(report, "common_fields", []);
    dtTable = $('#pi-reuse-table').dataTable();
    dtTable.fnAddData(prt_records);
    $("#pi-reuse-table_length select").val('5').trigger('change');
    dtTable.fnSetColumnVis(3, current_report_delete_enabled);
}

function populate_password_similarity_table(pwd_similarity, pwd_groups) {
    dtTable = $('#password-edit-distance-table').dataTable();
    dtTable.fnClearTable();
    dtTable.fnDestroy();

    $('#password-edit-distance-table').remove();
    var html_ped_table = $("<table></table>");
    html_ped_table.attr("id", "password-edit-distance-table");
    html_ped_table.attr("cellpadding", "0");
    html_ped_table.attr("cellspacing", "0");
    html_ped_table.attr("border", "0");
    html_ped_table.attr("width", "0");

    html_ped_table.addClass("display all-data-tables");
    
    var html_column_headings = $("<tr></tr>");
    html_column_headings.append("<th>Password Group</th>");
    for (var grp in pwd_groups) {
	if (pwd_groups.hasOwnProperty(grp)) {
	    var headers = $("<th>" + grp + "</th>");
	    html_column_headings.append(headers);
	}
    }

    html_ped_table.append($("<thead></thead>").append(html_column_headings));
    html_ped_table.append("<tbody></tbody>");
    html_ped_table.append($("<tfoot></tfoot>").append(html_column_headings.clone()));
    
    $("#password-edit-distance-div").append(html_ped_table);

    $("#password-edit-distance-table").dataTable({
    	"sDom": "<'row'<'span6'><'span6'>r>ft<'row'<'span6'><'span6'>>",
    	"sPaginationType": "bootstrap",
	"aLengthMenu": [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
    });

    var pst_records = [];
    for (var pwd_grp in pwd_similarity) {
	if (pwd_similarity.hasOwnProperty(pwd_grp)) {
	    var pst_object = pwd_similarity[pwd_grp];
	    var pst_entry = [];
	    pst_entry.push(pwd_grp);
	    for (var i = 0; i < pst_object.length; i++) {
		pst_entry.push(pst_object[i]);
	    }
	    pst_records.push(pst_entry);
	}
    }

    var dtTable = $('#password-edit-distance-table').dataTable();
    dtTable.fnAddData(pst_records);
}

function report_received(report_number, report, do_render) {
    var dtTable = null;
    var last_displayed_report_number = current_report_number;
    if (report_number == current_report_number && (!report.report_updated)) {
	// Its the same report that we are showing without any changes. No point in updating.
	return;
    }

    current_report = report;
    current_report_number = report_number;

    console.log("APPU DEBUG: Got the report: " + report_number);

    if ((current_report_number != 1) && current_report.actual_report_send_time != 'Not delivered yet') {
	current_report_delete_enabled = false;
	$('body').addClass('report-delivered')
    }
    else {
	current_report_delete_enabled = true;
	$('body').removeClass('report-delivered')
    }

    if(current_report.user_approved != false) {
	$('#send-report-button').hide();
    }
    else {
	$('#send-report-button').show();
    }

    if (!current_report_delete_enabled) {
	//$("#display-warning").hide();
    }
    else {
	$("#display-warning").show();
    }

    ///////// Populate Extension Version and Report Dates
    $('#version-info').text(report.extension_version); 
    var report_init_time = new Date(report.initialize_time);
    $('#report-start-date').text(report_init_time.getFullYear() + 
				 "/" + (pad(report_init_time.getMonth()+1)) +
				 "/" + (pad(report_init_time.getDate())) );

    if (report.user_approved) {
	var report_end_time = new Date(report.user_approved);
	$('#report-end-date').text(report_end_time.getFullYear() + 
				     "/" + (pad(report_end_time.getMonth()+1)) +
				     "/" + (pad(report_end_time.getDate())) );

    }
    else if (report.report_setting == "auto" && 
	     (new Date() > new Date(report.scheduled_report_time))) {
	var report_end_time = new Date(report.scheduled_report_time);
	$('#report-end-date').text(report_end_time.getFullYear() + 
				     "/" + (pad(report_end_time.getMonth()+1)) +
				     "/" + (pad(report_end_time.getDate())) );
    }
    else {
	var report_end_time = "current";
	$('#report-end-date').text("Current");
    }

    if (new Date() < new Date(report.scheduled_report_time) || (report.user_approved != false)) {
	$('#send-report-button').addClass("disabled");
    }

    /////////// Populate Past Reports List
    $("#past-report-list").empty();
    var prev_brow = $('<li class="get-prev-report"><a href="#">Prev</a></li>');
    prev_brow.appendTo("#past-report-list");
    var first_report_number = 1;
    var last_report_number = 1;
    // Four is a magic number. Makes the reporting pagination good looking.
    if (report.num_total_report <= 4) {
	first_report_number = 1;
	last_report_number = report.num_total_report;
    }
    else {
	first_report_number = ((current_report_number + 4) > report.num_total_report) ? 
	    (report.num_total_report - 4 + 1) : current_report_number;
	last_report_number = ((current_report_number + 4) > report.num_total_report) ? 
	    report.num_total_report : (current_report_number + 4 - 1);
    }

    for (var i = first_report_number; i <= last_report_number; i++) {
	var rep = $('<li class="get-report-number"><a href="#">' + i + '</a></li>');
	rep.appendTo("#past-report-list");
	if (current_report_number == i) {
	    rep.addClass("disabled");
	}
    }
    var next_brow = $('<li class="get-next-report"><a href="#">Next</a></li>');
    next_brow.appendTo("#past-report-list");

    if (report.num_total_report == 1) {
	$(".get-prev-report").addClass("disabled");
	$(".get-next-report").addClass("disabled");
    }
    else if (current_report_number == 1) {
	$(".get-prev-report").addClass("disabled");
    }
    else if (current_report_number == report.num_total_report) {
    	$(".get-next-report").addClass("disabled");
    }

    add_hooks();

//     if (!do_render) {
// 	//This means the query was just to update this structure.
// 	return;
//     }

    ////////// Populate Overall Stats
    $("#appu-version-div span b").text(report.extension_version);
    $("#guid-div span b").text(report.guid);
    $("#report-id-div span b").text(report.reportid);

    if ('deviceid' in report) {
	$("#device-id-div span b").text(report.deviceid);
    }
    else {
	$("#device-id-div span b").text('');
    }

    $("#report-duration-div span b").text(get_report_duration(report));

    $("#total-sites-div span b").text(report.num_total_sites);
    $("#total-sites-with-ac-div span b").text(report.num_user_account_sites);
    $("#total-sites-wo-ac-div span b").text(report.num_non_user_account_sites);

    $("#total-time-spent-div span b").text(format_display_time(report.total_time_spent, "no"));
    $("#total-time-spent-loggedin-div span b").text(format_display_time(report.total_time_spent_logged_in, "no"));
    $("#total-time-spent-wo-loggedin-div span b").text(format_display_time(report.total_time_spent_wo_logged_in, "no"));

    $("#login-freq-div span b").text(cumulative_value(report.user_account_sites, "num_logins"));
    $("#logout-freq-div span b").text(cumulative_value(report.user_account_sites, "num_logouts"));
    $("#total-passwords-div span b").text(report.num_pwds);

    if ('browser' in report) {
	$("#browser-div span b").text(report.browser);
	$("#browser-version-div span b").text(report.browser_version);
    }

    if ('os' in report) {
	$("#os-div span b").text(report.os);
	$("#os-version-div span b").text(report.os_version);
    }

    if ('layout_engine' in report) {
	$("#layout-engine-div span b").text(report.layout_engine);
	$("#layout-engine-version-div span b").text(report.layout_engine_version);
    }

    ////////// Populate Appu Metadata
    $("#report-modified-div span b").text(report.report_modified);
    $("#report-visited-div span b").text(report.num_report_visits);
    $("#report-review-time-div span b").text(format_display_time(report.report_time_spent, "no"));

    var has_user_approved = (report.user_approved == false) ? "no" : 
	format_display_date((new Date(report.user_approved)).getTime(), false);

    has_user_approved = has_user_approved.replace("<br/>", "");
    has_user_approved = has_user_approved.replace("<span class='report-time'>", " (");
    has_user_approved = has_user_approved.replace('</span>', ")");
    has_user_approved = '<span>' + has_user_approved + '</span>';
    
    $("#user-approved-div span b").html(has_user_approved);
    
    var is_report_delivered = (report.actual_report_send_time == 'Not delivered yet') ? 
	'Not delivered yet' : 'Yes';
    $("#report-delivered-div span b").html(is_report_delivered);

    var sched_send_time = format_display_date((new Date(report.scheduled_report_time)).getTime(), true);
    
    sched_send_time = sched_send_time.replace("<br/>", "");
    sched_send_time = sched_send_time.replace("<span class='report-time-add-info'>", " ");
    sched_send_time = sched_send_time.replace("<span class='report-time'>", " ");
    sched_send_time = sched_send_time.replace('</span>', " ");
    sched_send_time = '<span>' + sched_send_time + '</span>';

    $("#sched-upload-time-div span b").html(sched_send_time);

    var report_send_time = (report.actual_report_send_time == 'Not delivered yet') ? 'Not delivered yet' : 
	format_display_date((new Date(report.actual_report_send_time)).getTime(), false);
    
    report_send_time = report_send_time.replace("<br/>", "");
    report_send_time = report_send_time.replace("<span class='report-time'>", " (");
    report_send_time = report_send_time.replace('</span>', ")");
    report_send_time = '<span>' + report_send_time + '</span>';

    $("#actual-report-upload-time-div span b").html(report_send_time);

    $("#number-of-send-attempts-div span b").text(report.send_attempts.length);
    $("#reporting-type-div span b").text(report.report_setting);
    $("#report-postponing-div span b").text(report.send_report_postponed);

    $("#my-footprint-visits-div span b").text(report.num_myfootprint_visits);
    $("#my-footprint-time-spent-div span b").text(format_display_time(report.myfootprint_time_spent, "no"));

    $("#appu-disabled-div span b").text(report.appu_disabled.length);
    $("#appu-disabled-durations-div span b").text(report.appu_disabled.join(", "));
    $("#donotbugmelist-div span b").text(report.dontbuglist.join(", "));
    $("#extension-updated-div span b").text(report.extension_updated);

    for (var i = 0; i < report.appu_errors.length; i++) {
	var error = $("<p>" + report.appu_errors[i] + "</p>");
	$("#appu-errors-div").append(error);
    }

    if (last_displayed_report_number && (last_displayed_report_number == current_report_number)) {
	//This means that the report was already showing this report_number
	//Since tables are dynamically updated, no need to update them again
	return;
    }

    ////////// Populate Per Site User Account Table

    clear_table('#per-site-account-data-table');
    var psadt_records = create_datatable_consumable_records(report, "user_account_sites", 
							    [
							     'pwd_unchanged_duration',
							     'pwd_stored_in_browser',
							     'my_pwd_group',
							     'num_logins',
							     'tts',
							     'latest_login',
							     'tts_login',
							     'tts_logout',
							     'num_logouts',
							     'site_category'
							    ]);
    dtTable = $('#per-site-account-data-table').dataTable();
    dtTable.fnAddData(psadt_records);
    dtTable.fnSetColumnVis(9, current_report_delete_enabled);
    ////////// Populate Password Stats Table

    clear_table('#password-stats-table');
    var pst_records = create_datatable_consumable_records(report, "pwd_groups", 
							    [
								'sites',
								'strength',
								'strength',
							    ]);
    dtTable = $('#password-stats-table').dataTable();
    dtTable.fnAddData(pst_records);
    $("#password-stats-table_length select").val('5').trigger('change');

    ////////// Populate Password Edit Distance Table
    
    populate_password_similarity_table(report.pwd_similarity, report.pwd_groups);

    ////////// Populate Password Reuse Warnings Table

    clear_table('#password-reuse-warnings-table');
    dtTable = $('#password-reuse-warnings-table').dataTable();
    dtTable.fnAddData(report.pwd_reuse_warnings);
    $("#password-reuse-warnings-table_length select").val('5').trigger('change');
    dtTable.fnSetColumnVis(4, current_report_delete_enabled);
    ////////// Populate PI Metadata Table

    clear_table('#pi-metadata-table');

    //This func_val is for backward compatibility.
    //I changed the format of downloaded_fields array in downloaded_pi
    //Earlier it contained only strings like "email", "name"
    //Now it contains objects of format {"email", "no-change", "3"}
    //First: field name, Second: If there was change since last download, Third: Number of values on that site.
    //I am passing this function so that any past reports will still show proper information.
    var func_val = undefined;
    if (Object.keys(report.downloaded_pi).length > 0) {
	var site = Object.keys(report.downloaded_pi)[0];
	if (Object.prototype.toString.call(report.downloaded_pi[site].downloaded_fields[0]) 
	    == "[object Object]") {
	    func_val = function(o) { return o.field };
	}
    }

    var pmt_records = create_datatable_consumable_records(report, "downloaded_pi", 
							    [
								'download_time',
								'downloaded_fields',
							     ], func_val);
    for (var i = 0; i < pmt_records.length; i++) {
	for (var field in pi_field_color_code) {
	    var re = new RegExp(field+"(,|$)");
	    pmt_records[i][2] = pmt_records[i][2].replace(re, "<span class='"+ pi_field_color_code[field] +"'>"+ field +"</span>$1");	    
	}
    }
    dtTable = $('#pi-metadata-table').dataTable();
    dtTable.fnAddData(pmt_records);
    $("#pi-metadata-table_length select").val('5').trigger('change');
    dtTable.fnSetColumnVis(3, current_report_delete_enabled);
    ////////// Populate PI Reuse Table

    clear_table('#pi-reuse-table');
    var prt_records = create_datatable_consumable_records(report, "common_fields", []);

    for (var i = 0; i < prt_records.length; i++) {
	var orig_value = prt_records[i][0];
	prt_records[i][0] = "<a id='pi-field-value-" + orig_value + "' href=''>" + orig_value + "</a>";
    }

    dtTable = $('#pi-reuse-table').dataTable();
    dtTable.fnAddData(prt_records);
    $("#pi-reuse-table_length select").val('5').trigger('change');
    dtTable.fnSetColumnVis(3, current_report_delete_enabled);

    var all_nodes = dtTable.fnGetNodes();
    for (var i = 0; i < all_nodes.length; i++) {
	var n = $("a[id^='pi-field-value-']", all_nodes[i]);
	var n_id = $(n).attr('id');
	var orig_value = /pi-field-value-(.*)/g.exec(n_id)[1];
	$('td:eq(0) a', all_nodes[i]).tooltip({
		'title': "This value is NOT sent to the server. Only displayed for your convenience<br/><br/>" + 
		    "<span class='pi-value'>" + report.pi_field_value_identifiers[orig_value] + "</span>", 
		    'html' : true,
		    'placement' : 'right',
		    //'delay': { 'show': 1000, 'hide': 0 },
		    });
    }

    ////////// Populate User Interaction Metadata Table

    clear_table('#user-interaction-metadata-table');
    dtTable = $('#user-interaction-metadata-table').dataTable();
    dtTable.fnAddData(report.input_fields);
    $("#user-interaction-metadata-table_length select").val('5').trigger('change');
    dtTable.fnSetColumnVis(6, current_report_delete_enabled);
}

function send_report() {
    if ($("#send-report-button").hasClass("disabled")) {
	return;
    }

    //Send background message that the user is okay to send this report
    //This will push this report and create a new one.
    var message = {};
    message.type = "report_user_approved";
    message.report_number = current_report_number;
    chrome.extension.sendMessage("", message);
    
    //Give confirmation to user
    
    var report_init_time = new Date(current_report.initialize_time);
    var report_end_time = new Date();
    var duration = report_init_time.getFullYear() + 
	"/" + (pad(report_init_time.getMonth()+1)) +
	"/" + (pad(report_init_time.getDate()));
    duration += (" - " + report_end_time.getFullYear() +
		 "/" + (pad(report_end_time.getMonth()+1)) +
		 "/" + (pad(report_end_time.getDate())));

    $("#report-number-send-modal").text(current_report.reportid);
    $("#report-duration-send-modal").text(duration);
    
    $("#send-report-modal").modal({});
    console.log("APPU DEBUG: Pressed send report");
    
    //Now report for the latest report
    //Since number 1 is the latest report, get that
    request_report_number(1, true);
}

function add_hooks() {
    ///////// Hooks to browse through reports
    $(".get-prev-report").on("click", function() {
	if (current_report_number == 1) {
	    return;
	}
	request_report_number(current_report_number - 1, true);
    });

    $(".get-next-report").on("click", function() {
	if (current_report_number == current_report.num_total_report) {
	    return;
	}
	request_report_number(current_report_number + 1, true);
    });

    $(".get-report-number").on("click", function() {
	request_report_number($(this).text(), true);
    });

    ///////// Add tooltips for all Deletes
    $('.icon-trash').tooltip({
	'title': 'Delete this record from the report', 
	'placement' : 'left',
	    //'delay': { 'show': 300, 'hide': 0 },
    });

    /////// Add delete entry hooks
    $(".delete-per-site-account-data-entry").on("click", function() { 
	var dtTable = $('#per-site-account-data-table').dataTable();
	var row_pos = dtTable.fnGetPosition( $(this).closest('tr')[0] );
	var row_data = dtTable.fnGetData(row_pos);
	var entry_key = row_data[0]; 
	console.log("APPU DEBUG: Clicked on delete-per-site-account-data-entry, key: " + entry_key);
	delete_table_entry("user_account_sites", entry_key, dtTable, row_pos);
    });

    $(".delete-password-reuse-warning-entry").on("click",  function() { 
	var dtTable = $('#password-reuse-warnings-table').dataTable();
	var row_pos = dtTable.fnGetPosition( $(this).closest('tr')[0]);
	var row_data = dtTable.fnGetData(row_pos);
	var entry_key = row_data[0]; 
	console.log("APPU DEBUG: Clicked on delete-password-reuse-warning-entry, key: " + entry_key); 
	delete_table_entry("pwd_reuse_warnings", entry_key, dtTable, row_pos);
    });

    $(".delete-pi-metadata-entry").on("click",  function() { 
	var dtTable = $('#pi-metadata-table').dataTable();
	var row_pos = dtTable.fnGetPosition( $(this).closest('tr')[0]);
	var row_data = dtTable.fnGetData(row_pos);
	var entry_key = row_data[0]; 
	console.log("APPU DEBUG: Clicked on delete-pi-metadata-entry, key: " + entry_key); 
	delete_table_entry("downloaded_pi", entry_key, dtTable, row_pos);
    });

    $(".delete-pi-reuse-entry").on("click",  function() { 
	var dtTable = $('#pi-reuse-table').dataTable();
	var row_pos = dtTable.fnGetPosition( $(this).closest('tr')[0]);
	var row_data = dtTable.fnGetData(row_pos);
	var entry_key = row_data[0]; 
	console.log("APPU DEBUG: Clicked on delete-pi-reuse-entry, key: " + entry_key); 
	delete_table_entry("common_fields", entry_key, dtTable, row_pos);
    });

    $(".delete-user-interaction-metadata-entry").on("click",  function() { 
	var dtTable = $('#user-interaction-metadata-table').dataTable();
	var row_pos = dtTable.fnGetPosition( $(this).closest('tr')[0]);
	var row_data = dtTable.fnGetData(row_pos);
	var entry_key = row_data[0]; 
	console.log("APPU DEBUG: Clicked on delete-user-interaction-metadata-entry, key: " + entry_key); 
	delete_table_entry("input_fields", entry_key, dtTable, row_pos);
    });
}

function delete_table_entry(table_name, entry_key, dtTable, row_pos) {
    var message = {};
    message.type = "delete_entry";
    message.table_name = table_name;
    message.report_number = current_report_number;
    message.entry_key = entry_key;
    chrome.extension.sendMessage("", message);

    current_report.report_modified = "yes";
    $("#report-modified-div span b").text(current_report.report_modified);

    var report_table = current_report[table_name];
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
    
    dtTable.fnDeleteRow(row_pos);
}

function format_date(data, type, full) {
    var raw_date = new Date(data);
    var formatted_str = raw_date.getFullYear() + "-" + (raw_date.getMonth() + 1)
}


var start_focus_time = undefined;

function focus_check() {
    if (start_focus_time != undefined) {
	var curr_time = new Date();
	//Lets just put it for 4.5 minutes
	if((curr_time.getTime() - last_user_interaction.getTime()) > (270 * 1000)) {
	    //No interaction in this tab for last 5 minutes. Probably idle.
	    window_unfocused();
	}
    }
}

function window_focused(eo) {
    last_user_interaction = new Date();
    if (start_focus_time == undefined) {
	start_focus_time = new Date();
    }
}

function window_unfocused(eo) {
    if (start_focus_time != undefined) {
	var stop_focus_time = new Date();
	var total_focus_time = stop_focus_time.getTime() - start_focus_time.getTime();
	start_focus_time = undefined;
	var message = {};
	message.type = "report_time_spent";
	message.time_spent = total_focus_time;
	chrome.extension.sendMessage("", message);
	console.log("Here here: Sending message the report-tab is unfocused");
    }
}

function request_report_number(report_number, do_render) {
    var message = {};
    report_number = Number(report_number);
    message.type = "get_report_by_number";
    message.report_number = report_number;
    chrome.extension.sendMessage("", message, function(report) {
	report_received(report_number, report, do_render);
    });
}

$(window).on("focus", window_focused);
$(window).on("blur", window_unfocused);

setInterval(focus_check, 300 * 1000);

function get_latest_report() {
    if (current_report_number == 1) {
	//No point in fetching past reports as they won't change.
	request_report_number(1, true);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    ///////// Print text report
    $("#print-text-report").on("click", print_text_report);
    ///////// Send Report
    $("#send-report-button").on("click", send_report);

    //Report numbering starts from 1. Current report is number 1.
    //Report before that is number 2. So on.
    request_report_number(1, true);

    //Keep fetching latest current report every 2 minutes
    setInterval(get_latest_report, 1000 * 120);

    $.each(all_help_descriptions, function(key, value) {
	$('#' + key).tooltip({
	    'title' : value,
	    'placement' : 'right',
	    'delay': { 'show': 1500, 'hide': 0 },
	})
    });

    $('#other-reports').tooltip({
	'title': 'Access statistics from past reports', 
	'placement' : 'right',
	'delay': { 'show': 1500, 'hide': 0 },
    });

    $('.icon-trash').tooltip({
	'title': 'Delete this record from the report', 
	'placement' : 'left',
	'delay': { 'show': 1000, 'hide': 0 },
    });

    setTimeout(simulate_hover, 3 * 1000);

    $("#expand-per-site-account-data-table").on("click", expand_persite_account_table);
    $(".per-site-account-data-table-modal-dismiss").on("click", contract_persite_account_table);

    $("#per-site-account-data-table").dataTable({
	"sDom": "<'row'<'span6'><'span6'>r>lft<'row'<'span6'i><'span6'p>>",
	"sPaginationType": "bootstrap",
	"aLengthMenu": [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
	"aaSorting" : [ [1, 'desc'], [2, 'desc'], [3, 'desc'] ],
	"aoColumnDefs" : [
	    { 
		"aTargets" : [1], 
		"mRender": function(data, type, full) {
		    if (type === "display") {
			return get_duration(data);
		    }
		    return data;
		}
	    },
	    { 
		"aTargets" : [5], 
		"mRender": function(data, type, full) {
		    if (type === "display") {
			return format_display_time(data);
		    }
		    return data;
		}
	    },
	    { 
		"bVisible" : false, 
		"aTargets" : [6], 
		"mRender": function(data, type, full) {
		    if (type === "display") {
			return format_display_date(data, true);
		    }
		    return data;
		}
	    },
	    { "bVisible" : false, 
	      "aTargets" : [7],
	      "mRender": function(data, type, full) {
		  if (type === "display") {
		      return format_display_time(data);
		  }
		  return data;
	      }
	    },
	    { 
		"bVisible" : false, 
		"aTargets" : [8],
		"mRender": function(data, type, full) {
		    if (type === "display") {
			return format_display_time(data);
		    }
		    return data;
		}
	    },
	    { 
		"bVisible" : false, 
		"aTargets" : [9],
		"sWidth" : "5px"
	    },
	    { 
		"bVisible" : false, 
		"aTargets" : [10]
	    },
	    { 
		"bSortable" : false, 
		"aTargets" : [11], 
		"sWidth" : "10px",
		"mData": null, 
		"sDefaultContent": '<i class="icon-trash delete-per-site-account-data-entry"></i>'
	    }
	]
    });

    $("#password-stats-table").dataTable({
	"sDom": "<'row'<'span6'><'span6'>r>lft<'row'<'span6'i><'span6'p>>",
	"sPaginationType": "bootstrap",
	"aLengthMenu": [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
	"aaSorting" : [ [2, 'asc'] ],
	"aoColumnDefs" : [
	    { 
		"aTargets" : [2], 
		"mRender": function(data, type, full) {
		    //Data is supposed to be a string of type "entropy, crack_time, crack_time_display"
		    return data.split(",")[0];
		}
	    },
	    { 
		"aTargets" : [3], 
		"mRender": function(data, type, full) {
		    //Data is supposed to be a string of type "entropy, crack_time, crack_time_display"
		    if (type === "display") {
			//return crack time display
			return data.split(",")[2];
		    }
		    if (type === "sort") {
			//return crack time display
			return data.split(",")[1];
		    }
		    return data.split(",")[2];
		}
	    },
	]
    });

    $("#password-edit-distance-table").dataTable({
	"sDom": "<'row'<'span6'><'span6'>r>lft<'row'<'span6'i><'span6'p>>",
	"sPaginationType": "bootstrap",
	"aLengthMenu": [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
    });

    $("#password-reuse-warnings-table").dataTable({
	"sDom": "<'row'<'span6'><'span6'>r>lft<'row'<'span6'i><'span6'p>>",
	"sPaginationType": "bootstrap",
	"aLengthMenu": [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
	"aoColumnDefs" : [
	    { 
		"aTargets" : [0], 
		"mData": 0, 
		"bVisible" : false,
	    },
	    { 
		"aTargets" : [1], 
		"mData": 1,
		"mRender": function(data, type, full) {
		    if (type === "display") {
			return format_display_date(data, true);
		    }
		    return data;
		}
	    },
	    { "aTargets" : [2], "mData": 2},
	    { "aTargets" : [3], "mData": 3},
	    { 
		"aTargets" : [4], 
		"bSortable" : false, 
		"sWidth" : "10px",
		"mData": null, 
		"sDefaultContent": '<i class="icon-trash delete-password-reuse-warning-entry"></i>' 
	    }
	]
    });

    $("#pi-metadata-table").dataTable({
	"sDom": "<'row'<'span6'><'span6'>r>lft<'row'<'span6'i><'span6'p>>",
	"sPaginationType": "bootstrap",
	"aLengthMenu": [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
	"aoColumnDefs" : [
	    { 
		"aTargets" : [1], 
		"mRender": function(data, type, full) {
		    if (type === "sort") {
			return data;
			return format_display_date(data, true);
		    }
		    return format_display_date(data, true);
		    return data;
		}
	    },
	    { 
		"aTargets" : [3], 
		"bSortable" : false, 
		"mData": null, 
		"sWidth" : "10px",
		"sDefaultContent": '<i class="icon-trash delete-pi-metadata-entry"></i>' 
	    }
	]
    });

    $("#pi-reuse-table").dataTable({
	"sDom": "<'row'<'span6'><'span6'>r>lft<'row'<'span6'i><'span6'p>>",
	"sPaginationType": "bootstrap",
	"aaSorting" : [ [0, 'desc'] ],
	"aLengthMenu": [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
	"aoColumnDefs" : [
	    { 
		"sType" : "numeric",
		"aTargets" : [0], 
		"mRender": function(data, type, full) {
		    if (type == "sort") {
			var pi_field = /\<a( .*)?\>(.*)\<\/a\>/g.exec(data)[2];
			pi_field = /(.*)[0-9]+/g.exec(pi_field)[1];		
			if (pi_field in pi_field_value) {
			    return pi_field_value[pi_field];
			}
			return 1;
		    }
		    return data;
		}
	    },
	    { 
		"aTargets" : [3], 
		"mData": null, 
		"bSortable" : false, 
		"sWidth" : "10px",
		"sDefaultContent": '<i class="icon-trash delete-pi-reuse-entry"></i>' 
	    }
	]
    });

    $("#user-interaction-metadata-table").dataTable({
	"sDom": "<'row'<'span6'><'span6'>r>lft<'row'<'span6'i><'span6'p>>",
	"sPaginationType": "bootstrap",
	"aaSorting" : [ [4, 'desc'] ],
	"aLengthMenu": [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
	"aoColumnDefs" : [
	    { "aTargets" : [0], "mData": 0, "bVisible" : false}, 
	    { 
		"aTargets" : [1], 
		"mData": 1,
		"mRender": function(data, type, full) {
		    if (type === "display") {
		    	return format_display_date(data, false);
		    }
		    return data;
		}
	    },
	    { "aTargets" : [2], "mData": 2},
	    { "aTargets" : [3], "mData": 3},
	    { "aTargets" : [4], "mData": 4},
	    { "aTargets" : [5], "mData": 5},
	    { 
		"aTargets" : [6], 
		"mData": null, 
		"sWidth" : "10px",
		"bSortable" : false, 
		"sDefaultContent": '<i class="icon-trash delete-user-interaction-metadata-entry"></i>' 
	    }
	]
    });

    $.extend( $.fn.dataTableExt.oStdClasses, {
	"sWrapper": "dataTables_wrapper form-inline"
    } );

    var message = {};
    message.type = "report_tab_opened";
    chrome.extension.sendMessage("", message);

});

$(window).on("unload", function() {
    window_unfocused();
    var message = {};
    message.type = "report_tab_closed";
    chrome.extension.sendMessage("", message);
});

chrome.extension.onMessage.addListener(function(message, sender, send_response) {
    //Check if current report number is 1. No point in changing otherwise.
    if (message.type == "report-table-change-row" && 1 == current_report_number) {
	modify_tables(message.table_name, message.mod_type, message.changed_row);
	//Request updated copy of the report. No need to render it.
	request_report_number(current_report_number, false);
    }
    else if (message.type == "report-table-change-table" && 1 == current_report_number) {
	//This is to reconstruct an entire table.
	reconstruct_table(message);
	//Request updated copy of the report. No need to render it.
	request_report_number(current_report_number, false);
    }
});