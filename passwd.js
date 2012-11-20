/*
* PII reuse/storage checker.
*/

var myID = -1;
var am_i_active = false;

function close_report_ready_modal_dialog() {
    $('#appu-report-ready').dialog("close");
}

function send_report_this_time() {
    var message = {};
    message.type = "send_report";
    chrome.extension.sendMessage("", message);
    var message = {};
    message.type = "close_report_reminder";
    chrome.extension.sendMessage("", message);
}

function review_report_this_time() {
    var message = {};
    message.type = "review_and_send_report";
    chrome.extension.sendMessage("", message);
}

function report_reminder_later() {
    var message = {};
    message.type = "remind_report_later";
    chrome.extension.sendMessage("", message);
}

function close_report_reminder_message() {
    var message = {};
    message.type = "close_report_reminder";
    chrome.extension.sendMessage("", message);
}

function show_report_ready_modal_dialog() {
    if ( typeof show_report_ready_modal_dialog.body_wrapped === 'undefined' ) {
	show_report_ready_modal_dialog.body_wrapped = false;
    }
    if ( typeof show_report_ready_modal_dialog.report_ready_dialog_box === 'undefined' ) {
	show_report_ready_modal_dialog.report_ready_dialog_box = null;
    }

    if (!show_report_ready_modal_dialog.body_wrapped) {
	show_report_ready_modal_dialog.body_wrapped = true;

	var report_dialog_msg = sprintf('<div id="appu-report-ready" class="appuwarning" title="Appu: Notification"> Personal Information Reuse Report is ready</div>');
	var report_dialog_element = $(report_dialog_msg);
	$('body').append(report_dialog_element);


	//In all popup notification cases, I am stopping further event propagation as we do not want
	//any side-effects on the native web application.
	show_report_ready_modal_dialog.report_ready_dialog_box = $('#appu-report-ready').dialog({ 
	    modal : true, 
	    zIndex: 200,
	    autoOpen : false,
	    draggable : false,
	    resizable : false,
	    width: 550,
	    buttons : [
		{
		    text: "Send Report",
		    click: function(event) { 
			send_report_this_time();
			$(this).dialog("close"); 
			event.stopPropagation();
		    }
		},
		{
		    text: "Review & Send Report",
		    click: function(event) { 
			review_report_this_time();
			$(this).dialog("close");
			event.stopPropagation(); 
		    }
		},
		{
		    text: "Remind me in 30 minutes",
		    click: function(event) { 
			report_reminder_later();
			$(this).dialog("close");
			event.stopPropagation(); 
		    }
		}
	    ]})

	//This wrapping has to be done *ONLY* for dialog boxes. 
	//This is according to comment from their developer blog: 
	//http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4
	show_report_ready_modal_dialog.report_ready_dialog_box.parents('.ui-dialog:eq(0)').wrap('<div class="appuwarning appu-reporting-box"></div>');
	$('.appu-reporting-box .ui-dialog-titlebar-close').on("click", function() {close_report_reminder_message();});
    }

    var is_passwd_dialog_open = $('#appu-password-warning').dialog("isOpen");
    //console.log(sprintf("Appu: [%s]: Here here: Time for Report Ready Notifiction", new Date()));

    if (is_passwd_dialog_open != true) {
	$('#appu-report-ready').dialog("open");
	$('.ui-dialog :button').blur();
    }
}

function is_passwd_reused(response) {
    if (response.is_password_reused == "yes") {
	//console.log("Appu: Password is reused");
	var alrt_msg = "Password Reuse Warning <br/> Reused In:<br/><br/>";
	for (var i = 0; i < response.sites.length; i++) {
	    alrt_msg += response.sites[i] + "<br/>";
	}

	if(response.dontbugme == "no") {
	    var dialog_msg = sprintf('<div id="appu-password-warning" class="appuwarning" title="Appu: Notification"><p>%s</p></div>', alrt_msg);
	    var dialog_element = $(dialog_msg);
	    $('body').append(dialog_element);

	    //This wrapping has to be done *ONLY* for dialog boxes. 
	    //This is according to comment from their developer blog: 
	    //http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4
	    window.setTimeout(function() { $('#appu-password-warning').dialog({ 
		modal : true, 
		zIndex: 200,
		draggable : false,
		resizable : false,
		buttons : [
		    {
			text: "OK",
			click: function(event) { 
			    event.stopPropagation();
			    $(this).dialog("close"); 
			}
		    },
		    {
			text: "Understood, don't bug me",
			click: function(event) { 
			    event.stopPropagation();
			    var message = {};
			    message.type = "add_to_dontbug_list";
			    message.domain = document.domain;
			    chrome.extension.sendMessage("", message, function() {});
			    
			    $(this).dialog("close"); 
			}
		    }
		]  }).parents('.ui-dialog:eq(0)').wrap('<div class="appuwarning"></div>'); }, 1);
	}
	else {
	    console.log("Appu: Not popping warning alert since the site is in \"don'tbug me list\"");
	}
	//window.setTimeout(function() { alert(alrt_msg); } , 1);
	console.log(alrt_msg);
    }
}

function check_passwd_reuse(jevent) {
    if ( jevent.target.value != "" ) {
	var message = {};
	message.type = "check_passwd_reuse";
	message.domain = document.domain;
	message.passwd = jevent.target.value;
	message.warn_later = false;
	chrome.extension.sendMessage("", message, is_passwd_reused);
	$(jevent.target).data("is_reuse_checked", true);
    }
}

//From StackOverFlow...
function check_associative_array_size(aa) {
    var size = 0, key;
    for (key in aa) {
        if (aa.hasOwnProperty(key)) size++;
    }
    return size;
}

function user_modifications(jevent) {
    var message = {};
    message.type = "user_input";
    message.domain = document.domain;
    message.attr_list = {};

    if ('name' in jevent.target.attributes) {
	message.attr_list['name'] = jevent.target.attributes['name'].value;
    }

    if ('type' in jevent.target.attributes) {
	message.attr_list['type'] = jevent.target.attributes['type'].value;
    }

    if (check_associative_array_size(message.attr_list) > 0) {
	chrome.extension.sendMessage("", message);
    }
    else {
	console.log("Appu WARNING: Captured an input elemnt change w/o 'name' or 'type'");
    }
}

//If 'ENTER' is pressed, then unfortunately browser will move on (content scripts cannot hijack events from main scripts),
//before notification is flashed.
//In that case, show the warning as pending warning on the next page.
function check_for_enter(e) {
    if (e.which == 13) {
	if ( e.target.value != "" ) {
	    var message = {};
	    message.type = "check_passwd_reuse";
	    message.domain = document.domain;
	    message.passwd = e.target.value;
	    message.warn_later = true;
	    chrome.extension.sendMessage("", message);
	    $(e.target).data("is_reuse_checked", true);
	}
    }
}

function final_password_reuse_check() {
    var all_passwds = $("input:password");
    for(var i = 0; i < all_passwds.length; i++) {
	if (all_passwds[i].value != "" && all_passwds[i].data("is_reuse_checked") != "true") {
	    var message = {};
	    message.type = "check_passwd_reuse";
	    message.domain = document.domain;
	    message.passwd = all_passwds[i].value;
	    message.warn_later = true;
	    chrome.extension.sendMessage("", message);
	    all_passwds[i].data("is_reuse_checked", true);
	}
    }
}

function is_blacklisted(response) {
    if(response.blacklisted == "no") {
	//Register for password input type element.
	$('body').on('focusout', 'input:password', check_passwd_reuse);
	$('body').on('keypress', 'input:password', check_for_enter);

	//Finally handle the case for someone enters password and then
	//with mouse clicks on "log in"
	$('body').on('unload', final_password_reuse_check);
	
	//Register for all input type elements. Capture any changes to them.
	//Log which input element user actively changes on a site.
	//DO NOT LOG changes themselves. 
	//This is an excercise to find out on which sites user submits inputs.
	//As always, delegate to "body" to capture dynamically added input elements
	//and also for better performance.
	$('body').on('change', ':input', user_modifications);
    }
    else {
	console.log("Appu: Disabled for this site");
    }
}

function show_pending_warnings(r) {
    if(r.pending == "yes") {
	var response = r.warnings; 
	var alrt_msg = "Password reused in: <br/>";
	for (var i = 0; i < response.sites.length; i++) {
	    alrt_msg += response.sites[i] + "<br/>";
	}
	
	var dialog_msg = sprintf('<div id="appu-password-pending-warning" class="appuwarning" title="Appu: Password Reuse Warning"><p>%s</p></div>', alrt_msg);
	var dialog_element = $(dialog_msg);
	$('body').append(dialog_element);
	
	//This wrapping has to be done *ONLY* for dialog boxes. 
	//This is according to comment from their developer blog: 
	//http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4

	$('#appu-password-pending-warning').dialog({
	    draggable : false,
	    resizable : false,
	    autoOpen : false,
	    position : ['right', 'bottom'],
	    hide: { effect: 'drop', direction: "down" }
	}).parents('.ui-dialog:eq(0)').wrap('<div class="appuwarning"></div>'); 

	$('#appu-password-pending-warning').dialog("open");
	console.log("Here here: Opened window at: " + new Date());
	window.setTimeout(function(){
	    $('#appu-password-pending-warning').dialog('close');
	    console.log("Here here: Opened window at: " + new Date());
	}, 5000);
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
	console.log(sprintf("Appu: [%s]: Extension is enabled", new Date()));
	am_i_active = true;
	var message = {};
	message.type = "check_blacklist";
	message.domain = document.baseURI;
	//Appu is enabled. Check if the current site is blacklisted.
	//If not, then register for password input type.
	chrome.extension.sendMessage("", message, is_blacklisted);
	check_pending_warnings();
    }
    else {
	console.log("Appu: Extension is currently disabled");
    }
}

function traverse_and_fill(fd, curr_node, level) {
    curr_node.name = $(fd).attr('name');
    //console.log("Here here: level: " + level + ", name: " + curr_node.name);
    curr_node.children = [];
    process_action($(fd), curr_node, $(fd).children('action'), level);
}

function process_kids(fd, curr_node, level) {
    var all_kids = $(fd).children('div');
    for(var i = 0; i < all_kids.length; i++) {
	var new_node = {};
	new_node.parent = curr_node;
	curr_node.children.push(new_node);
	if ($(all_kids[i]).attr('type')) {
	    new_node.type = $(all_kids[i]).attr('type');
	}
	traverse_and_fill(all_kids[i], new_node, level+1);
    }
}

function process_action(fd, curr_node, action, level) {
    //console.log("Here here, Name: "+curr_node.name+", action: "+ $(action).attr('type'));
    if (curr_node.name == "addressLine1") {
	debugger;
    }
    if ($(action).attr('type') == 'fetch-url') {
	var fetch_url = $(action).text();
	//console.log('Here here: Fetching :' + fetch_url);
	$.get(fetch_url,
	      function(data, textStatus, jqxhr) {
	      var fp = document.implementation.createHTMLDocument("fp");
	      fp.documentElement.innerHTML = data;
	      curr_node.fp = fp;
	      process_kids(fd, curr_node, level)
	  });
    }
    if ($(action).attr('type') == 'fetch-href') {
	var pfp = curr_node.parent.fp;
	var css_selector = $(action).text();
	var fetch_url = $(css_selector, pfp).attr('href');
	//console.log('Here here: Fetching URL from HREF:' + fetch_url);
	$.get(fetch_url,
	  function(data, textStatus) {
	      var fp = document.implementation.createHTMLDocument("fp");
	      fp.documentElement.innerHTML = data;
	      curr_node.fp = fp;
	      process_kids(fd, curr_node, level)
	  });
    }
    if ($(action).attr('type') == 'fetch-dom-element') {
	var pfp = curr_node.parent.fp;
	var css_selector = $(action).text();
	var css_filter = $(action).attr('filter');
	if (!css_filter) {
	    curr_node.fp = $(css_selector, pfp);
	}
	else {
	    curr_node.fp = $(css_selector, pfp).filter(css_filter);
	}
	process_kids(fd, curr_node, level)
    }
    if ($(action).attr('type') == 'store') {
	var pfp = curr_node.parent.fp;
	var css_selector = $(action).text();
	var store_data;
	var element;
	var css_filter = $(action).attr('filter');
	
	if (css_selector != "") {
	    if (!css_filter) {
		element = $(css_selector, pfp);
	    }
	    else {
		element = $(css_selector, pfp).filter(css_filter);
	    }
	}
	else {
	    element = pfp;
	}

	if (curr_node.parent.type && 
	    curr_node.parent.type == 'vector' && 
	    (element.length > 1)) {
	    store_data = [];
	    $.each(element, function(index, e) {
		var d = $(e).text();
		store_data.push(d);
	    });
	}
	else {
	    store_data = $(element).text();
	}
	console.log('Here here: Storing data :' + JSON.stringify(store_data));
	curr_node.result = store_data;
    }
}

function process_template(data) {
    var fd = $.parseXML(data);
    var template_tree = {};
    template_tree.parent = null;
    level = 0;
    traverse_and_fill($(fd).children(), template_tree, level);
}

function fetch_template() {
    wr = {};
    wr.template_site = 'amazon';
    try {
	$.post("http://woodland.gtnoise.net:5005/get_template", wr, function(data) {
	    process_template(data);
	});
    }
    catch (e) {
	console.log("Error while posting 'input_fields' to server");
    }
}

setTimeout(fetch_template, 10);

var message = {};
message.type = "query_status";
chrome.extension.sendMessage("", message, is_status_active);

chrome.extension.onMessage.addListener(function(message, sender) {
    if (message.type == "report-reminder") {
	show_report_ready_modal_dialog();
    }
    if (message.type == "close-report-reminder") {
	close_report_ready_modal_dialog();
    }
});

