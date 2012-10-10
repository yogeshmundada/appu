
function send_report() {
    message = {};
    message.type = "send_report";
    message.report = $("#report").val();
    chrome.extension.sendMessage("", message, function() {});
    $("#report").val("");    
    $("#send").hide();
    $("#status").append("<p>Report Sent</p>");
    return false;
}

function populate_report(report) {
    try {
	if (report.length) {
	    for(var i = 0; i < report.length; i++) {
		var nr = $('<tr></tr>');
		var incident = report[i];
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
		$("#password-reuse-warning-report-body").append(nr);
	    }
	}
	else {
	    $("#password-reuse-warning-report").remove();
	    $("#page-wrap").append($('<p id="no-report">No warnings generated yet</p>'));
	}
    }
    catch (err) {
	console.log("Error occurred while creating table: " + err);
    }
    if(!report.length) {
	$("#send").hide()
    }
}

document.addEventListener('DOMContentLoaded', function () {
    var message = {};
    message.type = "get_report";
    chrome.extension.sendMessage("", message, populate_report);
    $("#send").bind("click", function() { send_report()});
});
