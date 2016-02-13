/*
* PII reuse/storage checker.
*/

var myID = -1;
var is_appu_active = false;
var am_i_lottery_member = false;
var last_user_interaction = undefined;
var am_i_logged_in = false;
var pwd_pending_warn_timeout = undefined;

var are_usernames_present = false;

var pi_list = null;
var is_site_loaded = undefined;

// For cookie-investigation
var curr_epoch_id = -1;

var is_cookie_investigator_tab = false;
var is_template_processing_tab = false;

var is_blacklist_check_done = false;

// Total number of times when we reached document
// in interactive state.
var tot_interactive_state_times = 0;

// If the site is blacklisted, then ignore
// all messages
var do_not_watch_this_site = undefined;

var page_load_start = undefined;


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

	var message = {};
	message.type = "file_uploaded";
	message.domain = document.domain;
	message.am_i_logged_in = am_i_logged_in;
	message.file_name = files[i].name;
	message.file_type = files[i].type;
	message.file_size = files[i].size;
	chrome.extension.sendMessage("", message);

// 	var fr = new FileReader();

// 	fr.onload = (function(theFile) {
// 		return function(e) {
// 		    if (e.target.readyState == FileReader.DONE) { 
// 			console.log("Here here: File content: " + e.target.result);
// 		    }
// 		};
// 	    })(files[i]);

// 	var blob = files[i].slice(0, 1024);
// 	fr.readAsBinaryString(blob);
    }
}

function test_file_click(e) {
    console.log("Here here: File input was clicked");
}

function is_blacklisted(response) {
    console.log("DELETE ME: I am here in is_blacklisted()");
    is_blacklist_check_done = true;
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
	console.log("DELETE ME: registering all passwd callbacks");
	$('body').on('focusout', 'input:password', check_passwd_reuse);
	$('body').on('keydown', 'input:password', check_for_enter);
	$('body').on('keyup', 'input:password', update_current_password);
	
	$('input:password:visible').each(function(i) { 
		    $(this).attr('appu_pwd_visible', "visible");
	    });

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
    console.log("APPU DEBUG: In is_status_active(): " + response.status);
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
	show_fpi_download_in_progress_warning();
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



function form_submit_called(e) {
    console.log("DELETE ME: FORM submit called");
}


function do_document_ready_functions() {
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
    
    if (!is_blacklist_check_done) {
	return;
    }

    if (curr_epoch_id > -1) {
	// "curr_epoch_id > -1" ensures that the "content_script_started" 
	// message has been processed by background and answered back.
	console.log("APPU DEBUG: Document is loaded");
	clearInterval(is_site_loaded);
	var message = {};
	message.type = "am_i_active";
	message.URL = document.URL;
	chrome.extension.sendMessage("", message, function (r) {
		if (r.am_i_active) {
		    window_focused(undefined);
		}
	    });

	var page_load_time = (new Date()).getTime() - page_load_start.getTime();

	message = {};
	//page_is_loaded response function is_status_active() is NOT CALLED
	// if this is not a cookie_investigator_tab
	// if this is not a cookie_investigator_tab, then "check-if-username-present" 
	// message is sent by background

	message.type = "page_is_loaded";
	message.url = document.URL;
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

		    var forms = $('form');
		    for (var i = 0; i < forms.length; i++) {
			if ($(forms[i]).data("form_input_is_callback_set") == undefined) {
			    $(forms[i]).data("form_input_is_callback_set", true);
			    $(forms[i]).submit(form_submit_called);
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

    //Every 10 minutes, check if user is actually looking at the site actively.
    //Otherwise, count it as focus not checked.
    //This could create problems for sites like youtube or video sites.
    //Need to check somehow if Flash is active on the current site.
    setInterval(focus_check, 600 * 1000);

    is_site_loaded = setInterval(do_document_ready_functions, 200);
    
    chrome.extension.onMessage.addListener(function(message, sender, send_response) {
	    console.log("DELETE ME: Here here: " + JSON.stringify(message));
	    if (((is_cookie_investigator_tab == false && is_template_processing_tab == false) && 
		 (do_not_watch_this_site == undefined || do_not_watch_this_site == true)) ||
		curr_epoch_id == -1) {
		// Ignore all messages if we are not sure if this site should be monitored or not.
		// Or if epoch-id is -1 then likely this is a message for last page and not for us.
		console.log("DELETE ME: Here here: returning :(: template:  " + is_template_processing_tab);
		console.log("DELETE ME: Here here: returning :(: " + curr_epoch_id);
		return;
	    }

	    console.log("DELETE ME: Continuing");

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
		execute_simulate_click(message, sender, send_response);
		return true;
	    }
	    else if (message.type == "get-html") {
		//Adding 2 seconds delay because some sites like Google+ have data populated asynchronously.
		//So the page loads but actual data is populated later.
		get_current_page_html(message, sender, send_response);
		return true;
	    }
	    else if (message.type == "get-permission-to-fetch-pi") {
		get_permission_to_fetch_pi(message.site, send_response);
		return true;
	    } else if (message.type == "check-if-pi-present") {
		pi_list = message.pi;
		check_if_pi_present();
		return true;
	    }
	    else if (message.type == "check-if-username-present") {
		console.log("APPU DEBUG: DELETE ME: In check-if-username-present");
		if (message.usernames_present == true) {
		    var username_list = message.usernames;
		    var res = check_if_username_present(username_list, "normal-operation");
		    var present_usernames = res.present_usernames;
		    
		    var message = {};
		    message.invisible_check_invoked = false;
		    if (Object.keys(present_usernames.frequency).length == 0) {
			var res = check_if_username_present(username_list, "normal-operation", false);
			present_usernames = res.present_usernames;
			message.invisible_check_invoked = true;
		    }
		    
		    if (Object.keys(present_usernames.frequency).length != 0) {
			am_i_logged_in = true;
		    }
		    
		    // Even if no usernames detected, just send the message.
		    message.type = "usernames_detected";
		    message.domain = document.domain;
		    message.curr_epoch_id = curr_epoch_id;
		    message.present_usernames = present_usernames;
		    message.closest_username = res.closest_username;
		    message.num_password_boxes = $("input:password:visible").length;
		    
		    chrome.extension.sendMessage("", message, function(response) {
			    if (response.command == "load_page") {
				console.log("Here here: Loading page again to investigate cookies");
				//window.location.href = response.url;
				window.location.reload(true);
			    }
			});
		}
		// Now we can also detect for any signout, signin links
		detect_if_user_logged_in();

		return true;
	    }
	    else if(message.type == "investigate_cookies") {
		process_investigate_cookies_messages(message, sender, send_response);
	    }
	});
}