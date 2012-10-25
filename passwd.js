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
    //console.log("Here here: Checking password on: " + message.domain);
    chrome.extension.sendMessage("", message, is_passwd_reused);
}


function user_modifications(jevent) {
    console.log("Here here: User modified:");
    var message = {};
    message.type = "user_input";
    message.domain = document.domain;
    message.attr_list = {};

    var all_attrs = $(jevent.target.attributes);
    for(var i = 0; i < all_attrs.length; i++) {
	message.attr_list[all_attrs[i].name] = all_attrs[i].value;
    }

    chrome.extension.sendMessage("", message);
}

function is_blacklisted(response) {
    if(response.blacklisted == "no") {
	//Register for password input type element.
	var pwd_ip_elements = undefined;
	pwd_ip_elements = $('input:password');
	if (pwd_ip_elements) {
	    //console.log("Here here: Found password elements, registering on them");
	    pwd_ip_elements.focusout(check_passwd_reuse);
	}
	
	//Register for all input type elements. Capture any changes to them.
	//Log which input element user actively changes on a site.
	//DO NOT LOG changes themselves. 
	//This is an excercise to find out which sites user submits inputs to.
	all_input_elements = $(":input");
	all_input_elements.change(user_modifications);

    }
    else {
	console.log("Appu is disabled for this blacklisted site");
    }
}

function show_pending_warnings(r) {
    if(r.pending == "yes") {
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
	message.domain = document.baseURI;
	//Appu is enabled. Check if the current site is blacklisted.
	//If not, then register for password input type.
	chrome.extension.sendMessage("", message, is_blacklisted);
	check_pending_warnings();
    }
    else {
	console.log("Extension Appu is currently disabled");
    }
}

var message = {};
message.type = "querystatus";
chrome.extension.sendMessage("", message, is_status_active);

