

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
	//if (am_i_logged_in == false) {
	//    am_i_logged_in = true;
	//}

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
