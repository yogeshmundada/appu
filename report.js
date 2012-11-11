
function send_report() {
    message = {};
    message.type = "send_report";
    chrome.extension.sendMessage("", message);

    //Re-populate with new entries
    var message = {};
    message.type = "get_report";
    chrome.extension.sendMessage("", message, populate_report);
}

function populate_report(r) {
    var r_copy = $.extend(true, {}, r);
    clear_all_reports();
    populate_text_report(r);
    populate_graphical_report(r_copy);
}

function master_profile_list_delete_entry() {
    var mpl_re = /pro-entry-([0-9]+)/;
    var report_entry = mpl_re.exec(this.id)[1];
    console.log("Delete pressed, my id: " + report_entry);

    $(this).parent().parent().remove();

    var message = {};
    message.type = "delete_master_profile_list_entry";
    message.report_entry = report_entry;
    chrome.extension.sendMessage("", message);
}

function password_reuse_report_delete_entry() {
    var prrd_re = /re-([0-9]+)/;
    var report_entry = prrd_re.exec(this.id)[1];
    console.log("Delete pressed, my id: " + report_entry);

    $(this).parent().parent().remove();
    var message = {};
    message.type = "delete_password_reuse_report_entry";
    message.report_entry = report_entry;
    chrome.extension.sendMessage("", message);
}

function clear_all_reports() {
    $("#password-reuse-warning-report-table > tbody > tr").remove();
    $("#master-profile-list-table > tbody > tr").remove(); 
    $("#pwru-report > #no-report").remove(); 
    $("#mpl-report > #no-profile-report").remove(); 

    $('#appu-text-report-area').val('');
}

function populate_graphical_report(r) {
    var pwd_reuse_report = r.pwd_reuse_report;
    var master_profile_list = r.master_profile_list;

    try {
	var next_report_time = new Date(r.scheduled_report_time);
	$("#scheduled-report-time").text(next_report_time.toDateString() + ", " + next_report_time.toLocaleTimeString());

	if (pwd_reuse_report.length) {
	    for(var i = 0; i < pwd_reuse_report.length; i++) {
		var nr = $('<tr class="report-entry"></tr>');
		var incident = pwd_reuse_report[i];
		var incident_time = new Date(incident.now);
		var incident_site = incident.site;
		var incident_other_sites = incident.other_sites;
		
		var ntd = $('<td></td>');
		$(ntd).text(incident_time.toDateString() + "," + incident_time.toLocaleTimeString());
		$(nr).append(ntd);
		
		ntd = $('<td></td>');
		$(ntd).text(incident_site);
		$(nr).append(ntd);
		
		ntd = $('<td></td>');
		var npr = $('<p></p>');
		$(npr).text(incident_other_sites.pop());
		$(ntd).append(npr);
		$(nr).append(ntd);

		for(var j = 0; j < incident_other_sites.length; j++) {
		    npr = $('<p></p>');
		    $(npr).text(incident_other_sites[j]);
		    $(ntd).append(npr);
		}

		ntd = $('<td></td>');
		var nimg_src = '<img id="re-'+ incident.index +'" class="password-reuse-report-entry-delete" src="images/cross-mark.png" height="22">';
		var nimg = $(nimg_src);
		$(ntd).append(nimg);
		$(nr).append(ntd);

		$("#password-reuse-warning-report-table-body").append(nr);
	    }
	}
	else {
	    //$("#password-reuse-warning-report-table").remove();
	    $("#pwru-report").append($('<p id="no-report">No password reuse warnings generated yet.</p>'));
	}

	if (master_profile_list.length) {
	    for(var i = 0; i < master_profile_list.length; i++) {
		var nr = $('<tr class="site-entry"></tr>');

		var ntd = $('<td></td>');
		$(ntd).text(master_profile_list[i].site_name);
		$(nr).append(ntd);

		ntd = $('<td></td>');
		var nimg_src = '<img id="pro-entry-'+ master_profile_list[i].index +'" class="profile-entry-delete" src="images/cross-mark.png" height="22">';
		var nimg = $(nimg_src);
		$(ntd).append(nimg);
		$(nr).append(ntd);

		$("#master-profile-list-table-body").append(nr);
	    }
	}
	else {
	    //$("#master-profile-list-table").remove();
	    $("#mpl-report").append($('<p id="no-profile-report">No site with user profile yet.</p>'));
	}
    }
    catch (err) {
	console.log("Error occurred while creating table: " + err);
    }

    if(!r.pwd_reuse_report.length && !r.master_profile_list.length) {
	$(".send-report-button").hide();
    }
    else {
	$(".send-report-button").show();
    }
}

function toggle_reports_expand() {
    if($("#expand-reports-checkbox").is(':checked')) {
	$("#accordion-master-profile-list").accordion("option", "active", 0);
	$("#accordion-password-reuse-report").accordion("option", "active", 0);
    }
    else {
	$("#accordion-master-profile-list").accordion("option", "active", false);
	$("#accordion-password-reuse-report").accordion("option", "active", false);
    }
}

function populate_text_report(r) {
    var pwd_reuse_report = r.pwd_reuse_report;
    var master_profile_list = r.master_profile_list;
    var text_report = '';

    try {
	if (master_profile_list.length) {
	    text_report += 'User Profile in:\n\n';
	    for(var i = 0; i < master_profile_list.length; i++) {
		text_report += (master_profile_list[i].site_name + '\n');
	    }
	}
	else {
	    text_report += 'No site with user profile yet\n';
	}

	text_report += '\n\n';
	if (pwd_reuse_report.length) {
	    for(var i = 0; i < pwd_reuse_report.length; i++) {
		var incident = pwd_reuse_report[i];
		var incident_time = new Date(incident.now);
		var incident_site = incident.site;
		var incident_other_sites = incident.other_sites;

		text_report += (incident_time.toDateString() + " " + incident_time.toLocaleTimeString() + " | ");
		text_report += ("Login Attempt: " + incident_site + " | ");
		text_report += ("Reused In: " + incident_other_sites.pop() + ",");
	
		for(var j = 0; j < incident_other_sites.length; j++) {
		    text_report += (incident_other_sites.pop() + ",");
		}
		text_report += '\n';
	    }
	}
	else {
	    text_report += 'No password reuse warnings\n';
	}
    }
    catch (err) {
	console.log("Error occurred while creating table: " + err);
    }

    $('#appu-text-report-area').val(text_report);

    if(!r.pwd_reuse_report.length && !r.master_profile_list.length) {
	$(".send-report-button").hide();
    }
    else {
	$(".send-report-button").show();
    }
}

function report_tab_loading(event, ui) {
    console.log("report_tab_loading called");
    // if (ui.newTab.text() == "Text Report") {
    // 	var message = {};
    // 	message.type = "get_report";
    // 	chrome.extension.sendMessage("", message, populate_text_report);
    // }
    // else if (ui.newTab.text() == "Graphical Report") {
    // 	var message = {};
    // 	message.type = "get_report";
    // 	chrome.extension.sendMessage("", message, populate_graphical_report);
    // }
}

function show_report_settings(r) {
    var report_opts = $('input:radio[name=grp-reporting-options]');
    report_opts.filter('[value='+ r.report_setting +']').attr('checked', true);
}

function search_report() {
    var search_text = $.trim($('#search-report-text').val());
    if (search_text != "") {
	$('#ready-to-search').toggle();
	$('#go-back-to-main-report').toggle();
	$('#search-report-text').val("");
	$("#search-phrase-span").text(search_text);

	var message = {};
	message.type = "get_report";
	message.search_phrase = search_text;
	chrome.extension.sendMessage("", message, populate_report);

	$("#accordion-master-profile-list").accordion("option", "active", 0);
	$("#accordion-password-reuse-report").accordion("option", "active", 0);
	$("#expand-reports-checkbox").attr('checked', true);
    }
}

function show_main_report() {
    $('#ready-to-search').toggle();
    $('#go-back-to-main-report').toggle();
    $("#search-phrase-span").text("");

    var message = {};
    message.type = "get_report";
    chrome.extension.sendMessage("", message, populate_report);
}

function search_differential_report() {
    $('#main-report-div').toggle();
    $('#diff-report-div').toggle();

    var message = {};
    message.type = "get_differential_report";
    chrome.extension.sendMessage("", message, populate_report);
}

function go_back_to_main_report() {
    $('#main-report-div').toggle();
    $('#diff-report-div').toggle();

    var message = {};
    message.type = "get_report";
    chrome.extension.sendMessage("", message, populate_report);
}

document.addEventListener('DOMContentLoaded', function () {
    var message = {};
    message.type = "report_tab_opened";
    chrome.extension.sendMessage("", message);

    var message = {};
    message.type = "get_report";
    chrome.extension.sendMessage("", message, populate_report);

    $(".send-report-button").on("click", send_report);
    $("#search-report-button").on("click", search_report);
    $("#show-main-report-button").on("click", show_main_report);

    $('#ready-to-search').show();
    $('#go-back-to-main-report').hide();

    $("#differential-report-button").on("click", search_differential_report);
    $("#go-back-to-main-report-button").on("click", go_back_to_main_report);

    $('#main-report-div').show();
    $('#diff-report-div').hide();


    $("#expand-reports-checkbox").prop("checked", false);
    $("#expand-reports-checkbox").on("change", toggle_reports_expand);

    $("#accordion-master-profile-list").accordion({
	collapsible: true,
	active: false,
	heightStyle: "content"
    });

    $("#accordion-password-reuse-report").accordion({
	collapsible: true,
	active: false,
	heightStyle: "content"
    });

    $("#password-reuse-warning-report-table").on("click", ".password-reuse-report-entry-delete", 
						 password_reuse_report_delete_entry);
    $("#master-profile-list-table").on("click", ".profile-entry-delete", 
				       master_profile_list_delete_entry);

    $("#appu-tabs").tabs({
	beforeActivate: report_tab_loading
    });

    var message = {};
    message.type = "get_report_setting";
    chrome.extension.sendMessage("", message, show_report_settings);

    $("input[name=grp-reporting-options]").change(function() {
	var message = {};
	message.type = "set_report_setting";
	message.report_setting = this.value;
	chrome.extension.sendMessage("", message);
    });
});

$(window).on("unload", function() {
    var message = {};
    message.type = "report_tab_closed";
    chrome.extension.sendMessage("", message);
});
