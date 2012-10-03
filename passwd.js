/*
* PII reuse/storage checker.
*/

var myID = -1;
var amIactive = "no";

function is_passwd_reused(response) {
    if (response.is_password_reused == "yes") {
	//console.log("Password is reused");
	var alrt_msg = "Password reused in: <br/>";
	for (var i = 0; i < response.sites.length; i++) {
	    alrt_msg += response.sites[i] + "<br/>";
	}

	if(response.dontbugme == "no") {
	    var dialog_msg = sprintf('<div id="appu-warning" class="appuwarning" title="Appu: Password Reuse Warning"><p>%s</p></div>', alrt_msg);
	    var dialog_element = $(dialog_msg);
	    $('body').append(dialog_element);

	    //This wrapping has to be done *ONLY* for dialog boxes. 
	    //This is according to comment from their developer blog: 
	    //http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4
	    window.setTimeout(function() { $('#appu-warning').dialog({ 
		modal : true, 
		buttons : [
		    {
			text: "Ok",
			click: function() { $(this).dialog("close"); }
		    },
		    {
			text: "Understood, don't bug me",
			click: function() { 
			    var message = {};
			    message.type = "dont_bug";
			    message.domain = document.domain;
			    chrome.extension.sendMessage("", message, function() {});
			    
			    $(this).dialog("close"); 
			}
		    }
		]  }).parents('.ui-dialog:eq(0)').wrap('<div class="appuwarning"></div>'); }, 1);
	}
	else {
	    console.log("Not popping warning alert since the site is in \"don'tbug me list\"");
	}
	//window.setTimeout(function() { alert(alrt_msg); } , 1);
	console.log(alrt_msg);
    }
}

function check_passwd_reuse(jevent) {
    var message = {};
    message.type = "check_passwd_reuse";
    message.domain = document.domain;
    message.passwd = jevent.target.value;
    chrome.extension.sendMessage("", message, is_passwd_reused);
}

function is_blacklisted(response) {
    if(response.blacklisted == "no") {
	$(':password').focusout(check_passwd_reuse);
    }
    else {
	console.log("Appu is disabled for this blacklisted site");
    }
}

function show_pending_warnings(r) {
    if(r.pending == "yes") {
	console.log("Here: Showing pending warnings");
	var response = r.warnings; 
	var alrt_msg = "Password reused in: <br/>";
	for (var i = 0; i < response.sites.length; i++) {
	    alrt_msg += response.sites[i] + "<br/>";
	}
	
	var dialog_msg = sprintf('<div id="appu-warning" class="appuwarning" title="Appu: Password Reuse Warning"><p>%s</p></div>', alrt_msg);
	var dialog_element = $(dialog_msg);
	$('body').append(dialog_element);
	
	//This wrapping has to be done *ONLY* for dialog boxes. 
	//This is according to comment from their developer blog: 
	//http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4

	// window.setTimeout(function() { $('#appu-warning').dialog({
	//     position : ['right', 'bottom']
	// }).parents('.ui-dialog:eq(0)').wrap('<div class="appuwarning"></div>'); }, 1);

	$('#appu-warning').dialog({
	    position : ['right', 'bottom'],
	    hide: { effect: 'drop', direction: "down" }
	}).parents('.ui-dialog:eq(0)').wrap('<div class="appuwarning"></div>'); 
	window.setTimeout(function(){$('#appu-warning').dialog('close');}, 5000);
    }
}

function show_pending_warnings_async(r) {
    window.setTimeout(function() {show_pending_warnings(r)}, 2000);
}

function check_pending_warnings() {
    var message = {};
    message.type = "check_pending_warning";
    chrome.extension.sendMessage("", message, show_pending_warnings_async);
}

function is_status_active(response) {
    if (response.status == "active") {
	console.log("Extension Appu is enabled");
	amIactive = "yes";
	var message = {};
	message.type = "check_blacklist";
	message.domain = document.domain;
	chrome.extension.sendMessage("", message, is_blacklisted);
	check_pending_warnings();
    }
    else {
	console.log("Extension Appu is disabled");
    }
}

var message = {};
message.type = "querystatus";
chrome.extension.sendMessage("", message, is_status_active);

