/*
* PII reuse/storage checker.
*/

var myID = -1;
var is_appu_active = false;
var am_i_lottery_member = false;
var last_user_interaction = undefined;
var am_i_logged_in = false;
var pwd_pending_warn_timeout = undefined;

var is_site_loaded = undefined;

// For cookie-investigation
var curr_epoch_id = -1;

var is_cookie_investigator_tab = false;
var is_template_processing_tab = false;

// Total number of times when we reached document
// in interactive state.
var tot_interactive_state_times = 0;

// If the site is blacklisted, then ignore
// all messages
var do_not_watch_this_site = undefined;

var page_load_start = undefined;

function close_report_ready_modal_dialog() {
    $('#appu-report-ready').dialog("close");
}

function send_report_this_time() {
    var message = {};
    message.type = "report_user_approved";
    //'1' for current report
    message.report_number = 1;
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
	var report_message = "Appu would like to send anonymous report to its server. \
This report will indicate personal information reusage across sites. \
It will <b>NOT</b> send the actual information. <br/><br/> \
This step is <b>IMPORTANT</b> to find out how can you improve your online behavior<br/> \
You can delete entries from the report by reviewing it before sending it out";

	var report_dialog_msg = sprintf('<div id="appu-report-ready" class="appuwarning" title="Appu: Notification"> %s </div>', report_message);
	var report_dialog_element = $(report_dialog_msg);
	$("#appu-report-ready").remove();
	$('body').append(report_dialog_element);


	//In all popup notification cases, I am stopping further event propagation as we do not want
	//any side-effects on the native web application.
	show_report_ready_modal_dialog.report_ready_dialog_box = $('#appu-report-ready').dialog({ 
	    modal : true, 
	    zIndex: 200,
	    autoOpen : false,
	    draggable : false,
	    resizable : false,
	    position : [ window.innerWidth/2, window.innerHeight/2 ],
	    open : function (event, ui) {
		$('#appu-report-ready')
		    .dialog("option", "position", [
			window.innerWidth/2 - $('#appu-report-ready').width()/2, 
			window.innerHeight/2 - $('#appu-report-ready').height()
		    ]);
	    },
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
	    ]});

	//This wrapping has to be done *ONLY* for dialog boxes. 
	//This is according to comment from their developer blog: 
	//http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4
	show_report_ready_modal_dialog.report_ready_dialog_box.parents('.ui-dialog:eq(0)')
	    .wrap('<div class="appuwarning appu-reporting-box"></div>');
	$('.appu-reporting-box .ui-dialog-titlebar-close')
	    .on("click", function() {close_report_reminder_message();});
    }

    var is_passwd_dialog_open = $('#appu-password-warning').dialog("isOpen");
    //console.log(sprintf("Appu: [%s]: APPU DEBUG: Time for Report Ready Notifiction", new Date()));

    if (is_passwd_dialog_open != true) {
	$('#appu-report-ready').dialog("open");
	$('.ui-dialog :button').blur();
    }
}

function get_password_initialized_readable(pwd_init_time) {
    var pwd_init_date = new Date(pwd_init_time);
    var curr_date = new Date();
    var msg = "";
    var fields = 0;

    var diff = curr_date - pwd_init_date;

//     if (diff <= (24 * 60 * 60 * 1000)) {
// 	return "1 day";
//     }

    var total_seconds = Math.floor(diff / 1000);
    var years = Math.floor(total_seconds / 31536000);
    var days = Math.floor((total_seconds % 31536000) / 86400);
    var hours = Math.floor(((total_seconds % 31536000) % 86400) / 3600);
    var minutes = Math.floor((((total_seconds % 31536000) % 86400) % 3600) / 60);
    var seconds = Math.floor((((total_seconds % 31536000) % 86400) % 3600) % 60);

    if (years != 0) {
	msg = years + " yr";
	msg += ((years > 1) ? "s" : "");
	fields++;
    }
    if (days != 0) {
	msg += (msg == "" ? (days + " day") : (", " + days + " day")); 
	msg += ((days > 1) ? "s" : "");
	fields++;
    }
    if (hours != 0 && (fields < 2)) {
	msg += (msg == "" ? (hours + " hr") : (", " + hours + " hr")); 
	msg += ((hours > 1) ? "s" : "");
	fields++;
    }
    if (minutes != 0 && (fields < 2)) {
	msg += (msg == "" ? (minutes + " min") : (", " + minutes + " min")); 
	msg += ((minutes > 1) ? "s" : "");
	fields++;
    }
    if (seconds != 0 && (fields < 2)) {
	msg += (msg == "" ? (seconds + " sec") : (", " + seconds + " sec")); 
	msg += ((seconds > 1) ? "s" : "");
	fields++;
    }
    return msg;
}

function is_passwd_reused(response) {
    if (response.is_password_reused == "yes") {
	//console.log("Appu: Password is reused");
	var alrt_msg = "<b style='font-size:16px'>Password Warning</b> <br/>" +
	    "Estimated Password Cracking Time: <b>" + response.pwd_strength.crack_time_display + "</b><br/>";

	if (response.initialized != 'Not sure') {
	    alrt_msg += "Password not changed for: <b>" + get_password_initialized_readable(response.initialized) + "</b>";
	}
	
	alrt_msg += "<br/><br/><b style='font-size:16px'> Reused In:</b><br/>";
	for (var i = 0; i < response.sites.length; i++) {
	    alrt_msg += response.sites[i] + "<br/>";
	}

	if (am_i_lottery_member == true) {
	    return;
	}

	if(response.dontbugme == "no") {
	    var dialog_msg = sprintf('<div id="appu-password-warning" class="appuwarning" title="Appu: Notification"><p>%s</p></div>', alrt_msg);
	    var dialog_element = $(dialog_msg);
	    $("#appu-password-warning").remove();
	    $('body').append(dialog_element);

	    //This wrapping has to be done *ONLY* for dialog boxes. 
	    //This is according to comment from their developer blog: 
	    //http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4
	    $('#appu-password-warning').dialog({ 
		modal : true, 
		zIndex: 200,
		width: 450,
		//autoOpen : false,
		height: 250,
		maxHeight: 500,
		draggable : false,
		resizable : false,
		buttons : [
		    {
			text: "Close",
			click: function(event) { 
			    event.stopPropagation();
			    $(this).dialog("close"); 
			    var message = {};
			    message.type = "clear_pending_warnings";
			    chrome.extension.sendMessage("", message);
			}
		    },
		    {
			text: "Don't bother me about this page further",
			click: function(event) { 
			    event.stopPropagation();
			    var message = {};
			    message.type = "add_to_dontbug_list";
			    message.domain = document.domain;
			    chrome.extension.sendMessage("", message);
			    
			    var message = {};
			    message.type = "clear_pending_warnings";
			    chrome.extension.sendMessage("", message);
			    
			    $(this).dialog("close"); 
			}
		    }
		]  }).parents('.ui-dialog:eq(0)').wrap('<div class="appuwarning"></div>');;
	    
	    // $('#appu-password-warning').dialog("open");
	    $('.appuwarning .ui-dialog-titlebar-close')
		.on("click", function() {
		    var message = {};
		    message.type = "clear_pending_warnings";
		    chrome.extension.sendMessage("", message);
		});

	    //$('.appuwarning .ui-dialog-titlebar').css("background-color", "DarkGreen");
	}
	else {
	    console.log("Appu: Not popping warning alert since the site is in \"don'tbug me list\"");
	}
	//window.setTimeout(function() { alert(alrt_msg); } , 1);
	console.log(alrt_msg);
    }
}


function locate_probable_username_element() {
    var uname_element = $();

    uname_element = $("input[type=password]").parents('form').find('input[type=text], input[type=email]');
    if (uname_element.length > 1) {
	return uname_element;
    }
    
    var parent = $("input[type=password]").parent();
    while(parent.length > 0) {
	uname_element = $(parent).find('input[type=text], input[type=email]');
	if (uname_element.length > 1) {
	    return uname_element;
	}
	parent = $(parent).parent();
    } 

    return uname_element;
}

// What should be reported back to server:
// name anonymized: john.doe -> username1
// username text box (X,Y) and password text box (X,Y)
// reason for why that username was picked from that location (so if it is incorrect, that can be detected at the server)
// General Algorithm:
// 1. Find out any input box in the same form as password input box (what happens if there is no form?)
// 2. If one found multiple such boxes then only consider those username boxes that have their
//    left sides or top sides aligned with password boxes.
// 3. Now see if the remaining username elements have any attributes that match with 
//    typical username regex pattern. If there are multiple username boxes as a result of
//    step-2 then filter out those that do not match regular expression.
// 4. If there are still multiple username boxes from above two steps then select
//    that box which is closest to the password box (either on top of it or on left of it).
// 5. Send the value of this box as username along with reason as to why it was chosen.
function get_username_element_value(pwd_element) {
    var username = '';
    var reason = '';
    var pwd_element_pos = $(pwd_element).offset();
    var uname_element = locate_probable_username_element();

    if (uname_element.length > 1) {
	// First filter based on the X,Y coordinates
	var filtered_uname_elements = undefined;
	for (var k = 0; k < uname_element.length; k++) {
	    var tmp_off = $(uname_element[k]).offset();
	    if (tmp_off.left == pwd_element_pos.left || tmp_off.top == pwd_element_pos.top) {
		if ($(uname_element[k]).val().length == 0) {
		    continue;
		}
		if (!filtered_uname_elements) {
		    filtered_uname_elements = $(uname_element[k]); 
		}
		else {
		    filtered_uname_elements = filtered_uname_elements.add($(uname_element[k]));
		}
	    }
	}
	uname_element = filtered_uname_elements;
    }

    {
	var filtered_uname_elements = undefined;
	// check that element is either email or has username somewhere in it
	// look for 'id', 'name', 'aria-labelledby'
	var patterns = [
			/username/gi,
			/email/gi,
			/^id$/i,
			];
	var attributes = [
			  'id',
			  'name',
			  'aria-labelledby'
			  ];
	for (var k = 0; k < uname_element.length; k++) {
	    for (var i = 0; i < attributes.length; i++) {
		var attrib_val = $(uname_element[k]).attr(attributes[i]);
		if (!attrib_val) {
		    continue;
		}
		for (var j = 0; j < patterns.length; j++) {
		    var rc = attrib_val.match(patterns[j]);
		    if (rc) {
			reason += ", " + patterns[j] + ": " + attributes[i] + " = " + attrib_val;
			if (!filtered_uname_elements) {
			    filtered_uname_elements = $(uname_element[k]);
			}
			else {
			    filtered_uname_elements.add($(uname_element[k]));
			}
		    }
		}
	    }
	}

	if (uname_element.length > 1) {
	    uname_element = filtered_uname_elements;
	}
    }

    if (uname_element.length == 0) {
	// Error we found no username element.
	// This would help me debug the issue at server side.
	return {
	    rc : false,
		'reason': "Appu Error: No username element was found: " + document.domain,
		};
    }

    if (uname_element.length > 1) {
	// Now only pick the nearest element
	var min_vertical_distance = 100000;
	var min_horizontal_distance = 100000;
	// First filter based on the X,Y coordinates
	var curr_min_vertical_uname_element = undefined;
	var curr_min_horizontal_uname_element = undefined;
	for (var k = 0; k < uname_element.length; k++) {
	    var tmp_off = $(uname_element[k]).offset();
	    if ((tmp_off.left == pwd_element_pos.left) &&
		(tmp_off.top < pwd_element_pos.top) &&
		(Math.abs(tmp_off.top - pwd_element_pos.top) < min_vertical_distance)) {
		// In this case the password box and username box have their lefts aligned
		// So username box would be on top of password box.
		// If there are multiple username boxes, then we want the one that is 
		// closest to the password box. 
		 min_vertical_distance = Math.abs(tmp_off.top - pwd_element_pos.top);
		 curr_min_vertical_uname_element = $(uname_element[k]) 
	    }
	    if ((tmp_off.top == pwd_element_pos.top) &&
		(tmp_off.left < pwd_element_pos.left) &&
		(Math.abs(tmp_off.left - pwd_element_pos.left) < min_horizontal_distance)) {
		// In this case the password box and username box have their tops aligned
		// So username box would be on the left of password box.(see Facebook login).
		// If there are multiple username boxes, then we want the one that is 
		// closest to the password box. 
		 min_horizontal_distance = Math.abs(tmp_off.left - pwd_element_pos.left);
		 curr_min_horizontal_uname_element = $(uname_element[k]) 
	    }
	}
	uname_element = $([]);
	if (curr_min_vertical_uname_element) {
	    uname_element = uname_element.add($(curr_min_vertical_uname_element));
	}
	if (curr_min_horizontal_uname_element) {
	    uname_element = uname_element.add($(curr_min_horizontal_uname_element));
	}
    }

    if (uname_element.length > 1) {
	return {
	    rc : false,
		'reason': "Appu Error: More than one username element (" + 
		uname_element.length + ") found: " + document.domain,
		};
    }

    reason += ", type: " + $(uname_element).attr('type');

    var uname_element_pos = $(uname_element).offset();
    //make position check
    //Either 'X' coordinates should match (e.g. gmail)
    //Or 'Y' coordinates should match (e.g. facebook)
    reason += ", password position (" + pwd_element_pos.left + ","+ pwd_element_pos.top + ")";
    reason += ", username position (" + uname_element_pos.left + ","+ uname_element_pos.top + ")";

    username = $(uname_element).val();
    if (username == '') {
	// Log an error
	return {
	    rc : false,
		'reason': "Appu Error: Username length zero(" + document.domain + "), " + reason,
		};
    }

    return {
	'rc': true,
	    'username': username,
	    'reason': reason,
	    };
}

function check_passwd_reuse(jevent) {
    if ( jevent.target.value != "" ) {
	var message = {};
	var uname_results = get_username_element_value(jevent.target);
	message.type = "check_passwd_reuse";
	message.caller = "check_passwd_reuse";
	message.domain = document.domain;
	message.uname_results = uname_results;
	message.is_stored = is_password_stored(jevent.target);
	message.passwd = jevent.target.value;
	message.warn_later = false;
	chrome.extension.sendMessage("", message, is_passwd_reused);
	$(jevent.target).data("is_reuse_checked", true);
	$(jevent.target).data("pwd_checked_for", message.passwd);
    }
}

//Readymade from StackOverFlow...
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
    else {
	message.attr_list['name'] = 'no-name';
    }

    if ('type' in jevent.target.attributes) {
	message.attr_list['type'] = jevent.target.attributes['type'].value;
    }
    else {
	message.attr_list['type'] = 'no-type';
    }

    try {
	message.attr_list['length'] = $(jevent.target).val().length;
    }
    catch (e) {
	console.log("Appu Error: While calculating length");
	message.attr_list['length'] = -1;
    }

    if (check_associative_array_size(message.attr_list) > 0) {
	chrome.extension.sendMessage("", message);
    }
    else {
	console.log("Appu WARNING: Captured an input elemnt change w/o 'name' or 'type'");
    }
}

//If 'ENTER' is pressed, then unfortunately browser will move on 
//(content scripts cannot hijack events from main scripts),
//before notification is flashed.
//In that case, show the warning as pending warning on the next page.
function check_for_enter(e) {
    if (e.which == 13) {
	if ( e.target.value != "" ) {
	    $(e.target).data("is_reuse_checked", true);
	    $(e.target).data("pwd_checked_for", e.target.value);

	    var message = {};
	    message.type = "check_passwd_reuse";
	    var uname_results = get_username_element_value(e.target);
	    message.uname_results = uname_results;
	    message.caller = "check_for_enter";
	    message.pwd_sentmsg = $(e.target).data("is_reuse_checked");
	    message.domain = document.domain;
	    message.is_stored = is_password_stored(e.target);
	    message.passwd = e.target.value;
	    message.warn_later = true;
	    chrome.extension.sendMessage("", message);
	}
    }
}

function update_current_password(e) {
    if (e.which != 9) {
        //This is not a tab key. So that means user is actually modifying the values here.
	$(e.target).data("pwd_modified", true);
	$(e.target).data("pwd_current", e.target.value);
	password_changed(e.target);
     }
}

// This functions iterates over all the present
// password elements. It will store the value
// filled by browser (if passwords are stored in the browser).
// This is used to compare if user edited passwords later or
// if he just used values filled by browser.
function store_pwd_elements() {
    var ap = $('input:password');
    for (var i = 0; i < ap.length; i++) {
	$(ap[i]).data("pwd_element_id", i);
	$(ap[i]).data("pwd_orig", ap[i].value);
        if (ap[i].value.length > 0) {
	    $(ap[i]).data("pwd_stored", true);
        }
        else {
	    $(ap[i]).data("pwd_stored", false);
        }
	$(ap[i]).data("pwd_current", "");
	$(ap[i]).data("pwd_modified", false);
	$(ap[i]).data("pwd_checked_for", "");
    }
}

//Need to check usernames as well
function password_changed(pwd_elem) {
    if($(pwd_elem).data("pwd_modified") == false &&
       $(pwd_elem).data("pwd_orig") == pwd_elem.value) {
	//This is the most straightforward case. This means that password was not modified at all.
	//User is using the same password that was entered by the browser.
	$(pwd_elem).data("pwd_stored", true);
	return;
    }
    if($(pwd_elem).data("pwd_modified") == false &&
       $(pwd_elem).data("pwd_orig") != pwd_elem.value &&
       $(pwd_elem).data("pwd_current") == pwd_elem.value) {
	//This means that the user has actively modified the password sometime in the past.
	//So password stored is false.
	$(pwd_elem).data("pwd_stored", false);
	return;
    }
    if($(pwd_elem).data("pwd_modified") == false &&
       $(pwd_elem).data("pwd_orig") != pwd_elem.value &&
       $(pwd_elem).data("pwd_current") != pwd_elem.value) {
	//In this case, user did edit the password, but then he changed username to some username
	//that also has the password stored but is not equal to default uesrname that browser enters.
	//Hence, the password is still stored in the browser.
	$(pwd_elem).data("pwd_stored", true);
	$(pwd_elem).data("pwd_orig", pwd_elem.value);
	return;
    }
    if($(pwd_elem).data("pwd_modified") == true) {
	//In this case, user did edit the password, but then he changed username to some username
	//that also has the password stored but is not equal to default uesrname that browser enters.
	//Hence, the password is still stored in the browser.
	$(pwd_elem).data("pwd_modified", false);
	$(pwd_elem).data("pwd_stored", false);
	return;
    }
}

function is_password_stored(pwe) {
    password_changed(pwe);
    return $(pwe).data("pwd_stored");
}

function final_password_reuse_check() {
    var all_passwds = $("input:password");
    try {
	for(var i = 0; i < all_passwds.length; i++) {
            if (all_passwds[i].value != "" && 
		$(all_passwds[i]).is(":visible") == true) {
		
		if ($(all_passwds[i]).data("is_reuse_checked") == true &&
		    $(all_passwds[i]).data("pwd_checked_for") == all_passwds[i].value) {
		    continue;
		}

                var message = {};

		message.pwd_sentmsg = $(all_passwds[i]).data("is_reuse_checked");
                message.type = "check_passwd_reuse";
		var uname_results = get_username_element_value($(all_passwds[i]));
		message.uname_results = uname_results;
		message.caller = "final_password_reuse_check";
                message.domain = document.domain;
                message.passwd = all_passwds[i].value;
                message.is_stored = is_password_stored(all_passwds[i]);
                message.warn_later = true;
                chrome.extension.sendMessage("", message);
                $(all_passwds[i]).data("is_reuse_checked", true);
            }
        }
    }
    catch (e) {
	console.log("Error: In exception");
    }
}

function check_for_visible_pwd_elements() {
    var all_pwds = $("input:password");
    var rc = false;

    if (all_pwds.length == 0) {
	return false;
    }

    all_pwds.each(function() {
	    if ($(this).is(":visible") == true) {
		rc = true;
	    }
	});    

    return rc;
}


function record_prelogin_cookies() {
    var message = {};
    message.type = "record_prelogin_cookies";
    message.domain = document.domain;
    chrome.extension.sendMessage("", message);
}


function get_file_metadata(evt) {
    var files = evt.target.files;
    for (var i = 0; i < files.length; i++) {
	var lm = files[i].lastModifiedDate ? files[i].lastModifiedDate.toLocaleDateString() : 'n/a';
	console.log("Here here: fname("+ files[i].name +"), ftype("+ files[i].type +
		    "), fsize("+ files[i].size +"), last_modified("+ lm +")");
	var fr = new FileReader();

	fr.onload = (function(theFile) {
		return function(e) {
		    if (e.target.readyState == FileReader.DONE) { 
			console.log("Here here: File content: " + e.target.result);
		    }
		};
	    })(files[i]);

	var blob = files[i].slice(0, 1024);
	fr.readAsBinaryString(blob);
    }
}

function test_file_click(e) {
    console.log("Here here: File input was clicked");
}

function is_blacklisted(response) {
    if(response.blacklisted == "no") {
	do_not_watch_this_site = false;
	if (!check_for_visible_pwd_elements()) {
	    //This means that its a successful login.
	    //Otherwise, password might be wrong.
	    check_pending_warnings();
	}

	if ($("input:password").length > 0) {
	    // This means there could possibly an attempt to login.
	    // Hence record the current set of cookies.
	    record_prelogin_cookies();
	}

	//Register for password input type element. 
	$('body').on('focusout', 'input:password', check_passwd_reuse);
	$('body').on('keydown', 'input:password', check_for_enter);
	$('body').on('keyup', 'input:password', update_current_password);
	
	//Finally handle the case for someone enters password and then
	//with mouse clicks on "log in" 
	$(window).on('unload', final_password_reuse_check);


	//Register for all input type elements. Capture any changes to them.
	//Log which input element user actively changes on a site.
	//DO NOT LOG changes themselves. 
	//This is an excercise to find out on which sites user submits inputs.
	//As always, delegate to "body" to capture dynamically added input elements
	//and also for better performance.
	$('body').on('change', ':input', user_modifications);

	
	// Register for all file input events so that we can see what type of
	// file user has uploaded and what is the size of that file

	var file_inputs = $('input:file');
	for (var i = 0; i < file_inputs.length; i++) {
	    $(file_inputs[i]).data("file_input_is_callback_set", true);
	    $(file_inputs[i]).on('change', get_file_metadata);
	    $(file_inputs[i]).on('click', test_file_click);

	    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
	    
	    var observer = new MutationObserver(function(mutations, observer) {
		    console.log("Here here: Mutations were observed in INPUT:FILE");
		});
	    
	    //var config = { attributes: true, childList: true, characterData: true }
	    var config = { 
		subtree: true,
		childList: true,
		attributes: true,
		characterData: true,
	    };

	    observer.observe(file_inputs[i], config);
	}
    }
    else {
	console.log("Appu: Disabled for this site");
	do_not_watch_this_site = true;
    }
}

function get_permission_to_fetch_pi(domain, send_response) {
	var pi_permission_message = "Appu would like to download your personal information present on " + 
	    domain + ". This information <b>DOES NOT</b> get sent to the server. It'll <b>ALWAYS</b> stays \
on your local disk. <br/>\
If you choose to do so, Appu would open a new tab and download that information. \
<br/><br/>You can view downloaded information at 'Appu-Menu > My Footprint'. <br/> \
You can change the choice that you make now at any time from 'Appu-Menu > Options'. <br/><br/>\
Do you want Appu to download your personal information from this site?";

	var pi_permission_dialog_msg = sprintf('<div id="appu-pi-permission" class="appuwarning" title="Appu: Notification"> %s </div>', pi_permission_message);
	var pi_permission_dialog_element = $(pi_permission_dialog_msg);
	$("#appu-pi-permission").remove();
	$('body').append(pi_permission_dialog_element);

	//In all popup notification cases, I am stopping further event propagation as we do not want
	//any side-effects on the native web application.
	pi_permission_dialog_box = $('#appu-pi-permission').dialog({ 
	    modal : true, 
	    zIndex: 200,
	    autoOpen : false,
	    draggable : false,
	    resizable : false,
	    position : [ window.innerWidth/2, window.innerHeight/2 ],
	    open : function (event, ui) {
		$('#appu-pi-permission')
		    .dialog("option", "position", [
			window.innerWidth/2 - $('#appu-pi-permission').width()/2, 
			window.innerHeight/2 - $('#appu-pi-permission').height()
		    ]);
	    },
	    width: 550,
	    buttons : [
		{
		    text: "Always",
		    click: function(event) { 
			send_response({
			    'fetch_pi_permission' : 'always',
			});
			$(this).dialog("close"); 
			event.stopPropagation();
		    }
		},
		{
		    text: "Only this time",
		    click: function(event) { 
			send_response({
			    'fetch_pi_permission' : 'just-this-time',
			});
			$(this).dialog("close"); 
			event.stopPropagation();
		    }
		},
		{
		    text: "Never",
		    click: function(event) { 
			send_response({
			    'fetch_pi_permission' : 'never',
			});
			$(this).dialog("close"); 
			event.stopPropagation();
		    }
		}
	    ]});

	//This wrapping has to be done *ONLY* for dialog boxes. 
	//This is according to comment from their developer blog: 
	//http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4
	pi_permission_dialog_box.parents('.ui-dialog:eq(0)')
	    .wrap('<div class="appuwarning appu-permission-box"></div>');
	$('#appu-pi-permission').dialog("open");

	// $('.appu-permission-box .ui-dialog-titlebar-close')
	//     .on("click", function() {close_report_reminder_message();});
}

function show_pending_warnings(r) {
    if(r.pending == "yes") {
	var response = r.warnings;

	if (am_i_lottery_member == true) {
	    //Don't show any warnings to lottery members
	    return;
	}

	msg_type = (response.is_password_reused == "yes") ? "Warning" : "Information";
	    //console.log("Appu: Password is reused");
	var alrt_msg = "<b style='font-size:16px'>Password " + msg_type + "</b> <br/>" +
	    "Estimated Password Cracking Time: <b>" + response.pwd_strength.crack_time_display + "</b><br/>";

	if (response.initialized != 'Not sure') {
	    alrt_msg += "Password not changed for: <b>" + get_password_initialized_readable(response.initialized) + "</b>";
	}

	if (response.is_password_reused == "yes") {	    
	    alrt_msg += "<br/><br/><b style='font-size:16px'> Reused In:</b><br/>";
	    for (var i = 0; i < response.sites.length; i++) {
		alrt_msg += response.sites[i] + "<br/>";
	    }
	}
	
	var dialog_msg = sprintf('<div id="appu-password-pending-warning" class="appuwarning" title="Appu: Password Reuse %s"><p>%s</p></div>', msg_type, alrt_msg);
	var dialog_element = $(dialog_msg);
	$("#appu-password-pending-warning").remove();
	$('body').append(dialog_element);
	
	//This wrapping has to be done *ONLY* for dialog boxes. 
	//This is according to comment from their developer blog: 
	//http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4

	$('#appu-password-pending-warning').dialog({
	    draggable : false,
	    resizable : false,
	    autoOpen : false,
	    width: 350,
	    maxHeight: 500,
	    //position : ['right', 'bottom'],
	    position : [window.innerWidth - 100, window.innerHeight - 220],
	    hide: { effect: 'drop', direction: "down" },
	    open : function (event, ui) {
		$('#appu-password-pending-warning')
		    .dialog("option", "position", [
			window.innerWidth - $('#appu-password-pending-warning').width(), 
			window.innerHeight - ($('#appu-password-pending-warning').height() +
					      ($('#appu-password-pending-warning').height()/2) - 20)
		    ]);
	    }
	}).parents('.ui-dialog:eq(0)').wrap('<div class="appuwarning"></div>'); 

	$('#appu-password-pending-warning').dialog("open");
	console.log("APPU DEBUG: Opened window at: " + new Date());

	pwd_pending_warn_timeout = window.setTimeout(function(){
	    $('#appu-password-pending-warning').dialog('close');
	}, 5000);
	
	$('#appu-password-pending-warning').mouseover(function() {
	    window.clearTimeout(pwd_pending_warn_timeout);
	});

	$('#appu-password-pending-warning').mouseout(function() {
	    pwd_pending_warn_timeout = window.setTimeout(function(){
		$('#appu-password-pending-warning').dialog('close');
	    }, 5000);
	});
    }
}

function show_pending_warnings_async(r) {
    window.setTimeout(function() {show_pending_warnings(r)}, 2000);
}

function check_pending_warnings() {
    var message = {};
    message.type = "check_pending_warning";
    message.domain = document.domain;
    chrome.extension.sendMessage("", message, show_pending_warnings_async);
}

function is_status_active(response) {
    if (response.lottery_setting == "participating") {
	am_i_lottery_member = true;
    }

    if (response.status == "active") {
	console.log(sprintf("Appu: [%s]: Extension is enabled", new Date()));
	is_appu_active = true;

	if (response.show_monitor_icon == "yes") {
	    show_appu_monitor_icon();
	    $(window).resize(show_appu_monitor_icon);
	}

	var message = {};
	message.type = "check_blacklist";
	message.domain = document.domain;
	//Appu is enabled. Check if the current site is blacklisted.
	//If not, then register for password input type.
	chrome.extension.sendMessage("", message, is_blacklisted);
    }
    else if(response.status == "process_template") {
	// I am created with the sole purpose of downloading PI information
	// Once that is done, I would be closed.
	console.log("Appu: Ready to process template");

	var template_msg = sprintf('<div id="appu-template-process" class="appuwarning" title="Appu: Downloading Information"><p>%s</p></div>', "DO NOT CLOSE, Appu is downloading your information");
	var dialog_element = $(template_msg);
	$("#appu-template-process").remove();
	$('body').append(dialog_element);
	
	//This wrapping has to be done *ONLY* for dialog boxes. 
	//This is according to comment from their developer blog: 
	//http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4
	$('#appu-template-process').dialog({
	    draggable : false,
	    resizable : false,
	    autoOpen : false,
	    //position : ['right', 'bottom'],
	    position : [ window.innerWidth/2, window.innerHeight/2 ],
	    open : function (event, ui) {
		$('#appu-template-process')
		    .dialog("option", "position", [
			window.innerWidth/2 - $('#appu-template-process').width()/2, 
			window.innerHeight/2 - $('#appu-template-process').height()
		    ]);
	    },
	}).parents('.ui-dialog:eq(0)').wrap('<div class="appuwarning"></div>'); 

	$('#appu-template-process').dialog("open");
    }
    else {
	console.log("APPU DEBUG: Extension is currently disabled");
    }
}


function apply_css_filter(elements, css_filter) {
    if (css_filter && css_filter != "") {
	return $(elements).filter(css_filter);
    }
    return elements;
}

function apply_css_selector(elements, css_selector) {
    if (css_selector && css_selector != "") {
	return $(css_selector, elements);
    }
    return elements;
}

function simulate_click_worked(mutations, observer, simulate_done_timer, css_selector) {
    if ($(css_selector).length > 0) {
	console.log("APPU DEBUG: Simulate click was successful");
	observer.disconnect();
	window.clearTimeout(simulate_done_timer);
	var message = {};
	message.type = "simulate_click_done";
	chrome.extension.sendMessage("", message);
    }
}

var start_focus_time = undefined;

function focus_check() {
    if (start_focus_time != undefined) {
	var curr_time = new Date();
	//Lets just put it for 4.5 minutes
	if((curr_time.getTime() - last_user_interaction.getTime()) > (270 * 1000)) {
	    //No interaction in this tab for last 5 minutes. Probably idle.
	    window_unfocused();
	}
    }
}

function window_focused(eo) {
    last_user_interaction = new Date();
    if (start_focus_time == undefined) {
	start_focus_time = new Date();
	// var message = {};
	// message.type = "i_have_focus";
	// chrome.extension.sendMessage("", message);
    }
}

function window_unfocused(eo) {
    if (start_focus_time != undefined) {
	var stop_focus_time = new Date();
	var total_focus_time = stop_focus_time.getTime() - start_focus_time.getTime();
	start_focus_time = undefined;
	var message = {};
	message.type = "time_spent";
	message.domain = document.domain;
	message.am_i_logged_in = am_i_logged_in;
	message.time_spent = total_focus_time;
	chrome.extension.sendMessage("", message);
    }
}

function check_if_username_present(usernames, operation_mode, check_only_visible) {
    var present_usernames = {
	frequency: {},
	elem_list: []
    };

    console.log("APPU DEBUG: Detecting if known usernames are present on the webpage for: " + operation_mode);

    check_only_visible = (check_only_visible == undefined) ? true : check_only_visible;
    check_only_visible = (check_only_visible == true) ? ":visible" : "";

    var elements_with_usernames = $();
    for (var i = 0; i < usernames.length; i++) {
	elements_with_usernames = elements_with_usernames.add($(":Contains('" + usernames[i] + "')" + check_only_visible));
    }
    elements_with_usernames = $.unique(elements_with_usernames);

    var elements_with_usernames_within_range = $();
    for (var i = 0; i < elements_with_usernames.length; i++) {
	var pos = $(elements_with_usernames[i]).offset();
	var h = $(elements_with_usernames[i]).height();
	var w = $(elements_with_usernames[i]).width();
	if (pos.top > 200 && pos.left > 200) {
	    continue;
	}
	if ((pos.top+h) > 200 && (pos.left+w) > 200) {
	    continue;
	}
	elements_with_usernames_within_range = elements_with_usernames_within_range.add($(elements_with_usernames[i]));
    }

    var elements_with_text = $();
    for (var i = 0; i < elements_with_usernames_within_range.length; i++) {
	var text = $.trim($(elements_with_usernames_within_range[i]).text()).toLowerCase();
	if (text == undefined || text == "") {
	    continue;
	}
	elements_with_text = elements_with_text.add($(elements_with_usernames_within_range[i]));
    }

    var elements_wo_kids = $();
    for (var i = 0; i < elements_with_text.length; i++) {
	var kids = $(elements_with_text[i]).children();
	var kids_contain_username = false;

	if (kids.length > 0) {
	    for (var k = 0; k < kids.length; k++) {
		for (var j = 0; j < usernames.length; j++) {
		    if ($(":Contains(" + usernames[j] + ")" + check_only_visible, $(kids[k]).parent()).length > 0) {
			kids_contain_username = true;
			break;
		    }
		}
		if (kids_contain_username) {
		    break;
		}
	    }
	}

	if (!kids_contain_username) {
	    elements_wo_kids = elements_wo_kids.add($(elements_with_text[i]));
	}
    }

    for (var i = 0; i < usernames.length; i++) {
	var ue = $(":Contains('" + usernames[i] + "')" + check_only_visible, $(elements_wo_kids).parent());
	if (ue.length > 0) {
	    if (!(usernames[i] in present_usernames.frequency)) {
		present_usernames.frequency[usernames[i]] = 0;
	    }
	    present_usernames.frequency[usernames[i]] += ue.length;

	    for (var r = 0; r < ue.length; r++) {
		var pos = $(ue[r]).offset();

		if (pos.top < 0 ||
		    pos.left < 0) {
		    continue;
		}

		var e = $.extend(true, {}, $(ue[r]));

		pos.username = usernames[i];
		pos.element = e;
		var add_position = 0;
		var bool_add = true;
		var found_position = false;

		for (var k = 0; k < present_usernames.elem_list.length; k++) {
		    var curr_node = present_usernames.elem_list[k];
		    if (curr_node.element[0] == pos.element[0]) {
			if (curr_node.username.length < pos.username.length) {
			    curr_node.username = pos.username;
			}
			bool_add = false;
			break;
		    }

		    if ((pos.top < curr_node.top) && 
			(pos.left < curr_node.left)) {
			found_position = true;
		    }
		    else if (pos.left < curr_node.left) {
			found_position = true;
		    }

		    if (!found_position) {
			add_position += 1;
		    }
		}

		if (bool_add == true) {
		    present_usernames.elem_list.splice(add_position, 0, pos);
		}
	    }
	}
    }

    var final_elem_list = [];
    for (var i = 0; i < present_usernames.elem_list.length; i++) {
	var curr_node = {};
	curr_node.top = present_usernames.elem_list[i].top;
	curr_node.left = present_usernames.elem_list[i].left;
	curr_node.username = present_usernames.elem_list[i].username;

	final_elem_list.push(curr_node);
    }
 
   present_usernames.elem_list = final_elem_list;
    return present_usernames;
}


//Case insensitive "contains" .. from stackoverflow with thanks
//http://stackoverflow.com/questions/2196641/how-do-i-make-jquery-contains-case-insensitive-including-jquery-1-8
$.expr[":"].Contains = $.expr.createPseudo(function(arg) {
    return function( elem ) {
        return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
    };
});

//Detecting if a user has logged in or not is a bit tricky.
//Usually if a user has logged in, then there is a link somewhere on
//the webpage for logging out. That is a sufficient condition to
//identify that the user has logged in.
//However, for certain sites like stackoverflow, such a link is not
//"generated" until you click on the drop-down box for a logged in user
//(I am guessing this is because they also want to generate all sorts of
// stats for that user). 
//However, on SO, if a user has not logged in, then there is a prominent
//"log in" link. So for such site, detecting if user has logged in
//is negating the presence of "log in" link on the webpage.
//I am sure there will be sites that do no satisfy either category.
//But thats for later....

//If we find any log-in links, then the user has certainly not logged in.
function detect_login_links() {
    var signin_patterns = {
	"Sign in" : "^Sign in$", 
	"? Sign in" : "\\? Sign in$", 
	"Log in"  : "^Log in$" , 
	"Login"   : "^Login$"  ,
	"Sign In/Register for Account" : "^Sign In/Register for Account$" ,
    };

    var signin_elements = $([]);
    
    //console.log("APPU DEBUG: Detecting 'log in's");

    var signin_elements = detect_text_pattern(signin_patterns);

    return signin_elements;
}


function detect_text_pattern(patterns) {
    var detected_elements = $([]);
    Object.keys(patterns).forEach(function(value, index, array) {
	    detected_elements = detected_elements.add($(":Contains('" + value + "')").filter(function() { 
			var regex_val = patterns[value].toLowerCase();
			var text = $.trim($(this).text()).toLowerCase();
			var tagName = this.tagName;
			
			if (text == undefined || text == "") {
			    return false;
			}
			
			if (tagName == "SCRIPT" || 
			    tagName == "STYLE" ||
			    tagName == "NOSCRIPT" ) {
			    return false;
			}

			if (!text.match(regex_val)) {
			    return false;
			}
			
			return ($(this).children().length < 1); 
		    }));
	});
    return detected_elements;
}


function detect_input_type_pattern(patterns) {
    var detected_elements = $([]);
    Object.keys(patterns).forEach(function(value, index, array) {
	    detected_elements = detected_elements.add($(":input[value='"+ value +"']").filter(function() { 
			if (this.tagName == "SCRIPT") {
			    return false;
			}
			if (this.tagName == "NOSCRIPT") {
			    return false;
			}
			return ($(this).children().length < 1); 
		    }));
	});
    return detected_elements;
}


//If we can detect log-out links on a page then that means a user has
//certainly logged in.
function detect_logout_links() {
    var signout_elements = $([]);
    var signout_link_patterns = [
				 "logout",
				 "signout",
				 "log_out",
				 "sign_out",
				 "signoff",
    ];

    signout_link_patterns.forEach(function(value, index, array) {
	    signout_elements = signout_elements.add($("a, form").filter(function() {
			if (this.tagName == "A") {
			    if ($(this).attr('href') != undefined) {
				if ($(this).attr('href') == '#') {
				    return false;
				}
				
				if ($(this).attr('href').toLowerCase().indexOf(value) !== -1) {
				    return true;
				}
			    }
			}
			if (this.tagName == "FORM") {
			    if ($(this).attr("action") != undefined) {
				if ($(this).attr("action").toLowerCase().indexOf(value) !== -1) {
				    return true;
				}
			    }
			}
		    }));
	});    

    if (signout_elements.length != 0) {
	return signout_elements;
    }

    //We did not find logout elements, so now search as per actual text.
    var signout_patterns = {
	"Sign out" : "^Sign out$", 
	"Sign Off" : "^Sign Off$", 
	"? Sign out" : "\\? Sign out$", 
	"Log Out"  : "^Log Out$", 
	"Logout"   : "^Logout$",  
    };
   
    //console.log("APPU DEBUG: Detecting 'log out's");

    signout_elements = detect_text_pattern(signout_patterns);

    //Special case for sites like Facebook
    if (signout_elements.length == 0) {
	signout_elements = detect_input_type_pattern(signout_patterns);
    }

    //Special case for sites like Dropbox....need to generalize it later
    if (signout_elements.length == 0 && (document.domain.match(/dropbox.com$/) != null)) {
	signout_elements = signout_elements.add($(":contains('Sign out')")
						.filter(function() { return (this.tagName == 'A'); }));
    }

    //Special case for sites like Github....need to generalize it later
    if (signout_elements.length == 0 && (document.domain.match(/github.com$/) != null)) {
	signout_elements = signout_elements.add($("#logout")
						.filter(function() { return (this.tagName == 'A'); }));
    }

    return signout_elements;
}

function monitor_explicit_logouts(eo) {
    console.log("APPU DEBUG: In monitor_explicit_logouts");
    var signout_event = false;
    if ((eo.type == "click") || (eo.type == "keypress" && eo.which == 13)) {
	var message = {};
	message.type = "explicit_sign_out";
	message.domain = document.domain;
	chrome.extension.sendMessage("", message);
	console.log("APPU DEBUG: Sending message that I explicitly signed out");
    }
}

function detect_if_user_logged_in() {
    var signout_elements = detect_logout_links();
    var signin_elements = detect_login_links();

    if (signout_elements.length > 0 && signin_elements.length == 0) {
	var message = {};
	message.type = "signed_in";
	message.value = 'yes';
	message.domain = document.domain;
	chrome.extension.sendMessage("", message);
	console.log("APPU DEBUG: Sending SignIn status: YES");
	am_i_logged_in = true;

	$(signout_elements).on('click.monitor_explicit_logouts', monitor_explicit_logouts);
	$(signout_elements).on('keypress.monitor_explicit_logouts', monitor_explicit_logouts);
    }
    else if (signin_elements.length > 0 && signout_elements.length == 0) {
	var message = {};
	message.type = "signed_in";
	message.value = 'no';
	message.domain = document.domain;
	chrome.extension.sendMessage("", message);
	console.log("APPU DEBUG: Sending SignIn status: NO");
    }
    else {
	var message = {};
	message.type = "signed_in";
	message.value = 'unsure';
	message.domain = document.domain;
	chrome.extension.sendMessage("", message);
	console.log("APPU DEBUG: Sending SignIn status: UNSURE");
    }
}

function update_status(new_status) {

    if (am_i_lottery_member == true) {
	return;
    }

    var dialog_msg = sprintf('<div id="appu-status-update-warning" class="appuwarning" title="Appu: Status Change"><p>%s</p><br/>%s</div>', new_status, new Date());
	var dialog_element = $(dialog_msg);
	$("#appu-status-update-warning").remove();
	$('body').append(dialog_element);
	
	//This wrapping has to be done *ONLY* for dialog boxes. 
	//This is according to comment from their developer blog: 
	//http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4

	$('#appu-status-update-warning').dialog({
	    draggable : false,
	    resizable : false,
	    autoOpen : false,
	    // position : ['right', 'bottom'],
	    // hide: { effect: 'drop', direction: "down" }
	    position : [window.innerWidth - 100, window.innerHeight - 220],
	    hide: { effect: 'drop', direction: "down" },
	    open : function (event, ui) {
		$('#appu-status-update-warning')
		    .dialog("option", "position", [
			window.innerWidth - $('#appu-status-update-warning').width(), 
			window.innerHeight - ($('#appu-status-update-warning').height() +
					      ($('#appu-status-update-warning').height()/2) + 20)
		    ]);
	    },
	}).parents('.ui-dialog:eq(0)').wrap('<div class="appuwarning"></div>'); 

	$('#appu-status-update-warning').dialog("open");
	console.log("APPU DEBUG: Opened window at: " + new Date());
	window.setTimeout(function(){
	    $('#appu-status-update-warning').dialog('close');
	    console.log("APPU DEBUG: Closed window at: " + new Date());
	}, 3000);
}

function hide_appu_monitor_icon() {
    $("#appu-monitor-icon").hide();
}

function show_appu_monitor_icon() {
    if (am_i_lottery_member == true) {
	return;
    }

    if (is_appu_active) {
	if ($("#appu-monitor-icon").length == 0) {
	    var appu_img_src = chrome.extension.getURL('images/appu_new19.png');
	    var appu_img = $("<img id='appu-monitor-icon' src='" + appu_img_src + "'></img>");
	    $("body").append(appu_img);
	    $("#appu-monitor-icon").attr("title", "Appu is currently enabled. " + 
					 "You can disable it from Appu-Menu > Disable Appu<br/><br/>" +
					 "You can disable the CAT icon by clicking on it OR " + 
					 "from Appu-Menu > Options > Per-page Appu status indication");
	    $('#appu-monitor-icon').on("click", hide_appu_monitor_icon);
	}
	else {
	    $("#appu-monitor-icon").show();
	}
	    
	$("#appu-monitor-icon").css({
		"position" : "fixed",
		    //I have to use hardcoded value here because if I dynamically calculate
		    //the value using .height(), the element is not rendered and hence
		    //height is zero.
		    "top" : window.innerHeight - 19,
		    "left" : 0, 
		    });
	
	$(function() {
		$("#appu-monitor-icon").tooltip({ 
			    position: { my: "left+15 center-25", at: "right"},
			    tooltipClass : "appu-monitor-icon-tooltip",
			    });
	    });
    }
}

function do_document_ready_functions() {
    console.log("Here here: Document state: " + document.readyState);
    if (document.readyState !== "complete") {
	if (!is_cookie_investigator_tab) {
	    return;
	}

	if (curr_epoch_id != 1) {
	    if (is_cookie_investigator_tab &&
		document.readyState !== "complete") {
		if (document.readyState == "interactive") {
		    tot_interactive_state_times += 1;
		    if (tot_interactive_state_times < 1) {
			return;
		    }
		}
		else {
		    return;
		}
	    }
	}
	else {
	    return;
	}
    }
    
    if (curr_epoch_id > -1) {
	// "curr_epoch_id > -1" ensures that the "content_script_started" 
	// message has been processed by background and answered back.
	console.log("APPU DEBUG: Document is loaded");
	clearInterval(is_site_loaded);
	var message = {};
	message.type = "am_i_active";
	chrome.extension.sendMessage("", message, function (r) {
		if (r.am_i_active) {
		    window_focused(undefined);
		}
	    });

	var page_load_time = (new Date()).getTime() - page_load_start.getTime();

	message = {};
	message.type = "page_is_loaded";
	message.url = document.domain;
	message.curr_epoch_id = curr_epoch_id;
	message.page_load_time = page_load_time;
	chrome.extension.sendMessage("", message, is_status_active);
	console.log("APPU DEBUG: Sent message that page is loaded");

	if (!is_template_processing_tab &&
	    !is_cookie_investigator_tab) {
	    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
	    
	    var observer = new MutationObserver(function(mutations, observer) {
		    var pwd_elements = $("input:password:visible");
		    for (var i = 0; i < pwd_elements.length; i++) {
			if ($(pwd_elements[i]).data("pwd_element_id") == undefined) {
			    record_prelogin_cookies();
			}
		    }

		    var file_inputs = $('input:file');
		    for (var i = 0; i < file_inputs.length; i++) {
			if ($(file_inputs[i]).data("file_input_is_callback_set") == undefined) {
			    $(file_inputs[i]).data("file_input_is_callback_set", true);
			    $(file_inputs[i]).on('change', get_file_metadata);
			}
		    }
		});
	    
	    //var config = { attributes: true, childList: true, characterData: true }
	    var config = { 
		subtree: true,
		childList: true
	    };
	    observer.observe(document, config);
	}
    }
}

function get_screen_layout() {
    var se = $(":visible");
    var se_arr = {};

    for (var i = 0; i < se.length; i++) {
	var pos = $(se[i]).offset();
	var t = pos.top;
	var l = pos.left;
	var h = $(se[i]).height();
	var w = $(se[i]).width();
	var m = t + "_" + l + "_" + h + "_" + w;
	if (!(m in se_arr)) {
	    se_arr[m] = 1; 
	}
	else {
	    se_arr[m] += 1; 
	}
    }
    return se_arr;
}


if (document.URL.match(/.pdf$/) == null) {
    $(window).on('unload', window_unfocused);
    $(window).on("focus", window_focused);
    $(window).on("blur", window_unfocused);

    page_load_start = new Date();

    var message = {
	type : "content_script_started",
	epoch_id : curr_epoch_id,
	url : document.domain
    }

    chrome.extension.sendMessage("", message, function(r) {
	    curr_epoch_id = r.epoch_id;
	    is_template_processing_tab = r.is_template_processing_tab;
	    is_cookie_investigator_tab = r.is_cookie_investigator_tab;
	    console.log("APPU DEBUG: Setting epoch-id to: " + curr_epoch_id);
	});

    console.log("APPU DEBUG: Sending message 'content_script_started' to the background page.");

    $(document).ready(function() {
	    store_pwd_elements();

	    var message = {};
	    message.type = "query_status";
	    message.url = document.domain;
	    chrome.extension.sendMessage("", message, is_status_active);
	});


    $(window).on("click.do_i_have_focus", function() {
	    $(window).off("click.do_i_have_focus");
	    window_focused(undefined);
	});

    $(window).on("keypress.do_i_have_focus", function() {
	    $(window).off("keypress.do_i_have_focus");
	    window_focused(undefined);
	});

    //Every 5 minutes, check if user is actually looking at the site actively.
    //Otherwise, count it as focus not checked.
    //This could create problems for sites like youtube or video sites.
    //Need to check somehow if Flash is active on the current site.
    setInterval(focus_check, 300 * 1000);

    is_site_loaded = setInterval(do_document_ready_functions, 200);
    
    chrome.extension.onMessage.addListener(function(message, sender, send_response) {
	    if (((is_cookie_investigator_tab == false && is_template_processing_tab == false) && 
		 (do_not_watch_this_site == undefined || do_not_watch_this_site == true)) ||
		curr_epoch_id == -1) {
		// Ignore all messages if we are not sure if this site should be monitored or not.
		// Or if epoch-id is -1 then likely this is a message for last page and not for us.
		return;
	    }

	    if (message.type == "report-reminder") {
		show_report_ready_modal_dialog();
	    }
	    else if (message.type == "status-enabled") {
		console.log("APPU DEBUG: status-enabled");
		is_appu_active = true;

		if (message.show_monitor_icon == "yes") {
		    show_appu_monitor_icon();
		}
		update_status('Appu is enabled');
	    }
	    else if (message.type == "status-disabled") {
		console.log("APPU DEBUG: status-disabled");
		is_appu_active = false;
		hide_appu_monitor_icon();
		update_status('Appu is disabled');
	    }
	    else if (message.type == "you_are_active") {
		window_focused();
	    }
	    else if (message.type == "close-report-reminder") {
		close_report_ready_modal_dialog();
	    }
	    else if (message.type == "goto-url") {
		window.location = message.url;
	    }
	    else if (message.type == "simulate-click") {
		debugger;
		var element_to_click = apply_css_filter(apply_css_selector($(document), message.css_selector), 
							message.css_filter);

		var detect_change_css = message.detect_change_css;  

		//Hard timeout
		//Wait for 60 seconds before sending event that click cannot be 
		//completed.
		var simulate_done_timer = window.setTimeout(function() {
			var message = {};
			message.type = "simulate_click_done";
			chrome.extension.sendMessage("", message);
		    }, 60 * 1000);
		
		
		MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		
		var observer = new MutationObserver(function(mutations, observer) {
			simulate_click_worked(mutations, observer, simulate_done_timer, detect_change_css);
		    });
		
		//var config = { attributes: true, childList: true, characterData: true }
		var config = { subtree: true, characterData: true, childList: true, attributes: true };
		observer.observe(document, config);
		
		//Now do the actual click
		try {
		    //Commenting following as thats not foolproof
		    //$(element_to_click).trigger("click");
		    //Instead using following, thanks to SO: http://goo.gl/9zCJiu
		    //jsFiddle: http://jsfiddle.net/UtzND/26/
		    var evt = document.createEvent("MouseEvents");
		    evt.initMouseEvent('click', true, true, window, 
				       0, 0, 0, 0, 0, false, false, 
				       false, false, 0, null);
		    $(element_to_click)[0].dispatchEvent(evt);
		}
		catch(e) {
		    console.log("Here here: " + JSON.stringify(e));
		}

		console.log("Here here");
	    }
	    else if (message.type == "get-html") {
		//Adding 2 seconds delay because some sites like Google+ have data populated asynchronously.
		//So the page loads but actual data is populated later.
		window.setTimeout(function() {
			//To give each element unique-id
			$(function() { $('*').each(function(i) { $(this).attr('appu_uid', i);}); });
			//To make each element visible or hidden
			$(function() { 
				$('*').each(function(i) { 
					if ($(this).is(":visible")) {
					    $(this).attr('appu_rendering', "visible");
					}
					else {
					    $(this).attr('appu_rendering', "hidden");
					}
				    }); 
			    });
			var all_vals = {};
			var all_input_elements = $(":input[type='text'], " +
						   ":input[type='tel'], " + 
						   ":input[type='email'], " + 
						   "select");
			for (var i = 0; i < all_input_elements.length; i++) {
			    var uid = $(all_input_elements[i]).attr("appu_uid");
			    var val = $('[appu_uid='+ uid +']').val();
			    all_vals[uid] = val;
			}
			
			var html_data = $("html").html();
			send_response({
				'html_data' : html_data,
				    'all_vals'  :  all_vals
				    });
		    }, 2000);
		return true;
	    }
	    else if (message.type == "get-permission-to-fetch-pi") {
		get_permission_to_fetch_pi(message.site, send_response);
		return true;
	    }
	    else if (message.type == "check-if-username-present") {
		var username_list = message.usernames;
		present_usernames = check_if_username_present(username_list, "normal-operation");

		var message = {};
		message.invisible_check_invoked = false;
		if (Object.keys(present_usernames.frequency).length == 0) {
		    present_usernames = check_if_username_present(username_list, "normal-operation", false);
		    message.invisible_check_invoked = true;
		}

		// Even if no usernames detected, just send the message.
		message.type = "usernames_detected";
		message.domain = document.domain;
		message.curr_epoch_id = curr_epoch_id;
		message.present_usernames = present_usernames;
		message.num_password_boxes = $("input:password:visible").length;
		
		chrome.extension.sendMessage("", message, function(response) {
			if (response.command == "load_page") {
			    console.log("Here here: Loading page again to investigate cookies");
			    //window.location.href = response.url;
			    window.location.reload(true);
			}
		    });

		// Now we can also detect for any signout, signin links
		detect_if_user_logged_in();
		return true;
	    }
	    else if(message.type == "investigate_cookies") {
		if (message.command == "load_page") {
		    console.log("Here here: Loading page to investigate cookies");
		    if (window.location.href == message.url) {
			window.location.reload(true);
		    }
		    else {
			window.location.href = message.url;
		    }
		}
		else if (message.command == "check_usernames") {
		    var username_list = message.usernames;
		    var ud_start = new Date();
		    present_usernames = check_if_username_present(username_list, "cookiesets-investigation");
		    var message = {};
		    message.invisible_check_invoked = false;

		    if (Object.keys(present_usernames.frequency).length == 0) {
			present_usernames = check_if_username_present(username_list, "cookiesets-investigation", false);
			message.invisible_check_invoked = true;
		    }

		    var ud_end = new Date();
		    var ud_time = (ud_end.getTime() - ud_start.getTime()); 
		    console.log("APPU DEBUG: Time taken to detect usernames: " + 
				 ud_time + " ms");

		    // Even if no usernames detected, just send the message.
		    message.type = "usernames_detected";
		    message.total_time = (new Date()).getTime() - page_load_start.getTime();
		    message.user_detection_time = ud_time; 
		    message.domain = document.domain;
		    message.curr_epoch_id = curr_epoch_id;
		    message.present_usernames = present_usernames;
		    // message.visible_elements = get_screen_layout();
		    message.num_password_boxes = $("input:password:visible").length;
		    
		    chrome.extension.sendMessage("", message, function(response) {
			    if (response.command == "load_page") {
				console.log("Here here: Loading page again to investigate cookies");
				//window.location.href = response.url;
				window.location.reload(true);
			    }
			});
		}
	    }
	    else if (message.type == "check_passwd_reuse") {
	    }
	});
}