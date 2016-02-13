

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

    chrome.extension.sendMessage("", {
	    type: "content_script_debug",
		msg: "DELETE ME: RRRR ROM 1.1: " + JSON.stringify(pwd_element),
		});


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


function check_passwd_reuse(jevent) {
    chrome.extension.sendMessage("", {
	    type: "content_script_debug",
		msg: "DELETE ME: In check_passwd_reuse()",
	});
    if (are_usernames_present == false) {
	if ( jevent.target.value != "" ) {
	    var message = {};
	    var uname_results = undefined;
	    try {
		uname_results = get_username_element_value(jevent.target);
	    }
	    catch (e) {
		uname_results = {rc: false};
		console.log("Error: In exception");
	    }

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
	    
	    chrome.extension.sendMessage("", {
		    type: "content_script_debug",
			msg: "DELETE ME: RRRR Setting pwd_checked_for-1: " + message.passwd,
			});

	}
    }
}


//If 'ENTER' is pressed, then unfortunately browser will move on 
//(content scripts cannot hijack events from main scripts),
//before notification is flashed.
//In that case, show the warning as pending warning on the next page.
function check_for_enter(e) {
    chrome.extension.sendMessage("", {
	    type: "content_script_debug",
		msg: "DELETE ME: In check_for_enter()",
	});

    if (e.which == 13) {
	if ( e.target.value != "" ) {
	    if (are_usernames_present == false) {
		$(e.target).data("is_reuse_checked", true);
		$(e.target).data("pwd_checked_for", e.target.value);
		
		chrome.extension.sendMessage("", {
			type: "content_script_debug",
			    msg: "DELETE ME: RRRR Setting pwd_checked_for-2: " + e.target.value,
			    });


		var message = {};
		message.type = "check_passwd_reuse";

		chrome.extension.sendMessage("", {
			type: "content_script_debug",
			    msg: "DELETE ME: RRRR ROM 1: ",
			    });

		var uname_results = undefined;
		try {
		    uname_results = get_username_element_value(e.target);
		}
		catch (e) {
		    uname_results = {rc: false};
		    console.log("Error: In exception");
		}

		chrome.extension.sendMessage("", {
			type: "content_script_debug",
			    msg: "DELETE ME: RRRR ROM 2: ",
			    });

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

    chrome.extension.sendMessage("", {
	    type: "content_script_debug",
		msg: "DELETE ME: KKKK In final_password_reuse_check(): " + all_passwds.length,
	});

    try {
	for(var i = 0; i < all_passwds.length; i++) {
		chrome.extension.sendMessage("", {
		    type: "content_script_debug",
			msg: "DELETE ME: ZZZZ In final_password_reuse_check: " + all_passwds[i].value + ", visible: " + $(all_passwds[i]).is(":visible"),
			});


            if (all_passwds[i].value != "" && 
		($(all_passwds[i]).is(":visible") == true || 
		 $(all_passwds[i]).attr("appu_pwd_visible") == "visible" )) {
		
		if ($(all_passwds[i]).data("is_reuse_checked") == true &&
		    $(all_passwds[i]).data("pwd_checked_for") == all_passwds[i].value) {
		    chrome.extension.sendMessage("", {
			    type: "content_script_debug",
				msg: "DELETE ME: QQQQ CONT...: " + $(all_passwds[i]).data("pwd_checked_for"),
				});

		    continue;
		}

		if (are_usernames_present == false) {
		    var message = {};

		    chrome.extension.sendMessage("", {
			    type: "content_script_debug",
				msg: "DELETE ME: In final_password_reuse_check: actuallly seching",
				});

		    
		    message.pwd_sentmsg = $(all_passwds[i]).data("is_reuse_checked");
		    message.type = "check_passwd_reuse";
		    var uname_results = undefined;
		    try {
			uname_results = get_username_element_value($(all_passwds[i]));
		    }
		    catch (e) {
			uname_results = {rc: false};
			console.log("Error: In exception");
		    }

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
