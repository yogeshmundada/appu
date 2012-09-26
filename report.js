
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
    for(var i = 0; i < report.length; i++) {
	if (!$("#report").val()) {
	    $("#report").val($("#report").val() + report[i]);
	}
	else {
	    $("#report").val($("#report").val() + "\n" + report[i]);
	}
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
