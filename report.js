
function send_report() {
    message = {};
    message.type = "send_report";
    chrome.extension.sendMessage("", message);

    //Re-populate with new entries
    var message = {};
    message.type = "get_report";
    chrome.extension.sendMessage("", message, populate_report);
}

function master_profile_list_delete_entry() {
    console.log("Here here:");
    var report_entry = $(this).parent().parent().index();
    $(this).parent().parent().remove();
    var message = {};
    message.type = "delete_master_profile_list_entry";
    message.report_entry = report_entry - 1;
    chrome.extension.sendMessage("", message);
}

function password_reuse_report_delete_entry() {
    console.log("Here here:");
    var report_entry = $(this).parent().parent().index();
    $(this).parent().parent().remove();
    var message = {};
    message.type = "delete_password_reuse_report_entry";
    message.report_entry = report_entry - 1;
    chrome.extension.sendMessage("", message);
}

function populate_report(r) {
    var pwd_reuse_report = r.pwd_reuse_report;
    var master_profile_list = r.master_profile_list;

    try {
	console.log("Displaying scheduled report time: " + r.scheduled_report_time);
	$("#scheduled-report-time").text(r.scheduled_report_time);

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
		var nimg_src = '<img id="re-'+ i +'" class="password-reuse-report-entry-delete" src="images/cross-mark.png" height="22">';
		var nimg = $(nimg_src);
		$(ntd).append(nimg);
		$(nr).append(ntd);

		$("#password-reuse-warning-report-table-body").append(nr);
	    }
	}
	else {
	    $("#password-reuse-warning-report-table").remove();
	    $("#pwru-report").append($('<p id="no-report">No password reuse warnings generated yet.</p>'));
	}

	if (master_profile_list.length) {
	    for(var i = 0; i < master_profile_list.length; i++) {
		var nr = $('<tr class="site-entry"></tr>');

		var ntd = $('<td></td>');
		$(ntd).text(master_profile_list[i]);
		$(nr).append(ntd);

		ntd = $('<td></td>');
		var nimg_src = '<img id="pro-entry-'+ i +'" class="profile-entry-delete" src="images/cross-mark.png" height="22">';
		var nimg = $(nimg_src);
		$(ntd).append(nimg);
		$(nr).append(ntd);

		$("#master-profile-list-table-body").append(nr);
	    }
	}
	else {
	    $("#master-profile-list-table").remove();
	    $("#mpl-report").append($('<p id="no-report">No site with user profile yet.</p>'));
	}
    }
    catch (err) {
	console.log("Error occurred while creating table: " + err);
    }

    if(!r.pwd_reuse_report.length && !r.master_profile_list.length) {
	$("#send").hide()
    }
}

function toggle_reports_expand() {
    console.log("Here here: I am here here: " + $("#expand-reports-checkbox").is(':checked'));

    if($("#expand-reports-checkbox").is(':checked')) {
	$("#accordion-master-profile-list").accordion("option", "active", 0);
	$("#accordion-password-reuse-report").accordion("option", "active", 0);
    }
    else {
	$("#accordion-master-profile-list").accordion("option", "active", false);
	$("#accordion-password-reuse-report").accordion("option", "active", false);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    var message = {};
    message.type = "report_tab_opened";
    chrome.extension.sendMessage("", message);

    var message = {};
    message.type = "get_report";
    chrome.extension.sendMessage("", message, populate_report);

    $(".send-report-button").on("click", send_report);

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
});

$(window).on("unload", function() {
    var message = {};
    message.type = "report_tab_closed";
    chrome.extension.sendMessage("", message);
});
