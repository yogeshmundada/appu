
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
    console.log("Here Here");
    try {
	for(var i = 0; i < report.length; i++) {
	    var nr = $('<tr></tr>');
	    var fields = report[i].split('|');
	    for(var j = 0; j < fields.length; j++) {
		var ntd = $('<td></td>');
		console.log("Attaching vaule: " + fields[j]);
		$(ntd).text(fields[j]);
		console.log("New value is::::" + $(ntd).text());
		$(nr).append(ntd);
	    }
	    console.log("Attaching to tree: " + nr);
	    $("#password-reuse-warning-report-body").append(nr);
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
