
function process_investigate_cookies_messages(message, sender, send_response) {
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
	var res = check_if_username_present(username_list, "cookiesets-investigation");
	var present_usernames = res.present_usernames;
	var message = {};
	message.invisible_check_invoked = false;
		    
	if (Object.keys(present_usernames.frequency).length == 0) {
	    res = check_if_username_present(username_list, "cookiesets-investigation", false);
	    present_usernames = res.present_usernames;
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
	message.closest_username = res.closest_username;
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