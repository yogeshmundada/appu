
function show_version(response) {
    console.log("APPU DEBUG: Version is: " + response.version);
    $('#version-info').text(response.version);
}

function store_answers() {
    var ips = $("input");
    var survey = {};

    ips = ips.add($("textarea"));

    for (var i = 0; i < ips.length; i++) {
	var id = $(ips[i]).attr("id");
	var ans = $(ips[i]).val();
	survey[id] = ans;
    }
    
    chrome.extension.sendMessage("", {
	    'type' : 'initial-survey',
		'survey': survey,
		});
}

document.addEventListener('DOMContentLoaded', function () {
    $("#intial-survey-submit").on("click", store_answers);
});


$(document).ready(function() {
    chrome.extension.sendMessage("", {
	'type' : 'get-version',
    }, show_version);
});
