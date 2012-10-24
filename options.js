
//Modify options for:
// Blacklisted sites.
// DontBugMe sites.
// Report automatically checkbox.
// Appu is enabled or disabled...if disabled for how many more minutes.
// Reporting time

function blacklist_sites() {
    var sites = $("#sites").val().split(/\n/);
    console.log("Got value: " + $("#sites").val());
    message = {};
    message.type = "modify_blacklist";
    message.sites = sites;
    chrome.extension.sendMessage("", message, function() {});
    $("#submit").hide();
    return false;
}

function populate_blacklist(blacklist) {
    for(var i = 0; i < blacklist.length; i++) {
	if (!$("#sites").val()) {
	    $("#sites").val($("#sites").val() + blacklist[i]);
	}
	else {
	    $("#sites").val($("#sites").val() + "\n" + blacklist[i]);
	}
    }
}

function show_submit() {
    $("#submit").show();
}

document.addEventListener('DOMContentLoaded', function () {
    var message = {};
    message.type = "get_blacklist";
    chrome.extension.sendMessage("", message, populate_blacklist);
    $("#submit").bind("click", function() { blacklist_sites()});
    $("#submit").hide();
    $("#sites").bind("change keyup", show_submit);
});
