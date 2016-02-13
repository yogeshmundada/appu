
//Following three functions from:
//http://stackoverflow.com/questions/9614622/equivalent-of-jquery-hide-to-set-visibility-hidden
jQuery.fn.visible = function() {
    return this.css('visibility', 'visible');
}

jQuery.fn.invisible = function() {
	return this.css('visibility', 'hidden');
}

jQuery.fn.visibilityToggle = function() {
    return this.css('visibility', function(i, visibility) {
	    return (visibility == 'visible') ? 'hidden' : 'visible';
	});
}

function check_for_enter(e) {
    if (e.which == 13) {
	if (e.data.type == 'login') {
	    login();
	}
	else if (e.data.type == 'create-account') {
	    create_account();
	}
    }
}

function handle_current_user(response) {
    if (response.login_name != "default") {
	$(".login-form").hide();
	$(".create-account-form").hide();
	$("#username-info").hide();
	$("#top-status").addClass("text-error");
	$("#top-status").text("You are already logged-in as '" + response.login_name + 
			      "'. First sign out from menu.");
    }
}

function show_version(response) {
    console.log("APPU DEBUG: Version is: " + response.version);
    $('#version-info').text(response.version);
}

function handle_appu_initialized(response) {
    if (response.initialized == "yes") {
	$("#login-container-div").show();
	$("#login-container-div").visible();
	chrome.extension.sendMessage("", {
		'type' : 'get-signin-status',
		    }, 
	    handle_current_user);
    }
    else {
	age_verification_confirm();
    }
}

function age_verification_confirm() {
    $("#age-verification-container-div").show();
    $("#age-verification-container-div").visible();
    $("#sign-in-title").text("Age Verification");
    $("#age-verification-checkbox").change(function() {
	    if (this.checked) {
		$("#age-verification-button").removeClass("disabled");
		console.log("Here here: checkbox change: " + this.checked);
		$("#age-verification-button").on("click", 
						 function() {
						     $("#age-verification-container-div").hide();
						     $("#age-verification-container-div").invisible();
						     goto_login();
						     });
	    }
	    else {
		$("#age-verification-button").addClass("disabled");
		$("#age-verification-button").off("click", function() {
						     $("#age-verification-container-div").hide();
						     $("#age-verification-container-div").invisible();
						     goto_login();
						     });
	    }
	});
}

function verify_accounts_exist() {
    $("#age-verification-container-div").invisible();
    $("#age-verification-container-div").hide();
    
    $("#site-accounts-verification-container-div").show();
    $("#site-accounts-verification-container-div").visible();

    $("#sign-in-title").text("Accounts Verification");

    $('.site-accounts').change(function() {
	    console.log("DELETE ME: Total length of checked: " + $(".site-accounts:checked").length);
	    if ($(".site-accounts:checked").length == 5 ) {
		    $("#site-accounts-verification-button").removeClass("disabled");
		    $("#site-accounts-verification-button").on("click", cookie_deletion_verification);
	    } else {
		    $("#site-accounts-verification-button").addClass("disabled");
		    $("#site-accounts-verification-button").off("click", cookie_deletion_verification);
	    }
	});

}

function cookie_deletion_verification() {
    $("#top-status").removeClass("text-success");
    $("#top-status").text("");

    $("#site-accounts-verification-container-div").invisible();
    $("#site-accounts-verification-container-div").hide();
    
    $("#delete-cookies-verification-container-div").show();
    $("#delete-cookies-verification-container-div").visible();

    $("#sign-in-title").text("Consent to Cookie-Deletion Action");

    $("#delete-cookies-verification-checkbox").change(function() {
	    if (this.checked) {
		$("#delete-cookies-verification-button").removeClass("disabled");
		$("#delete-cookies-verification-button").on("click", actually_delete_cookies);
	    }
	    else {
		$("#delete-cookies-verification-button").addClass("disabled");
		$("#delete-cookies-verification-button").off("click", actually_delete_cookies);
	    }
	});
}

function actually_delete_cookies() {
    chrome.extension.sendMessage("", {
	'type' : 'delete_all_cookies',
	    }, function() {
	    pi_to_download = "google";
	    setTimeout(start_initial_pi_download, 5000);
	});

    $(".progress-div").show();
    $(".progress-div").visible();
    time = 1;
    max = 3;
    int = setInterval(function() {
	    $("#progress").css("width", Math.floor(100 * time++ / max) + '%');
	}, 1000);
}


pi_to_download = "";

function start_initial_pi_download() {
    $(".progress-div").hide();
    $(".progress-div").invisible();

    if (pi_to_download == "facebook") {
	goto_facebook();
	pi_to_download = "amazon";
    } else if (pi_to_download == "google") {
	goto_google();
	pi_to_download = "facebook";
    } else if (pi_to_download == "amazon") {
	goto_amazon();
	pi_to_download = "linkedin";
    } else if (pi_to_download == "linkedin") {
	goto_linkedin();
	pi_to_download = "paypal";
    } else if (pi_to_download == "paypal") {
	goto_paypal();
	pi_to_download = "done";
    } else if (pi_to_download == "done") {
	chrome.extension.sendMessage("", {
		'type' : 'set_appu_initialized',
		    });
	redirect_to_check_report();
    }
}

function goto_facebook() {
    var login_url = "https://www.facebook.com/login/";
    var site_name = "facebook";
    chrome.tabs.create({ url: login_url },
		       function(tab) {
			   chrome.extension.sendMessage("", {
				   'type' : 'initial_slave_login_tab_opened',
				       'tabid': tab.id,
				       'site_name': site_name,
				       });
		       });
}

function goto_google() {
    var login_url = "https://accounts.google.com/ServiceLogin";
    var site_name = "google";
    chrome.tabs.create({ url: login_url },
		       function(tab) {
			   chrome.extension.sendMessage("", {
				   'type' : 'initial_slave_login_tab_opened',
				       'tabid': tab.id,
				       'site_name': site_name,
				       });
		       });
}

function goto_amazon() {
    var login_url = "https://goo.gl/qMDpb4";
    var site_name = "amazon";
    chrome.tabs.create({ url: login_url },
		       function(tab) {
			   chrome.extension.sendMessage("", {
				   'type' : 'initial_slave_login_tab_opened',
				       'tabid': tab.id,
				       'site_name': site_name,
				       });
		       });
}

function goto_linkedin() {
    var login_url = "https://www.linkedin.com/";
    var site_name = "linkedin";
    chrome.tabs.create({ url: login_url },
		       function(tab) {
			   chrome.extension.sendMessage("", {
				   'type' : 'initial_slave_login_tab_opened',
				       'tabid': tab.id,
				       'site_name': site_name,
				       });
		       });
}

function goto_paypal() {
    var login_url = "https://goo.gl/ItwTo0";
    var site_name = "paypal";
    chrome.tabs.create({ url: login_url },
		       function(tab) {
			   chrome.extension.sendMessage("", {
				   'type' : 'initial_slave_login_tab_opened',
				       'tabid': tab.id,
				       'site_name': site_name,
				       });
		       });
}

function goto_lottery() {
	$("#age-verification-container-div").invisible();
	$("#age-verification-container-div").hide();

	$("#lottery-container-div").show();
	$("#lottery-container-div").visible();

	$("#sign-in-title").text("Lottery Participation");
	$('input[name=lottery-opts]').change(function() {
		$("#lottery-setting-button").removeClass("disabled");
		$("#lottery-setting-button").on("click", goto_login);
	    });
}

function goto_login() {
    $("#sign-in-title").text("Log-in");
    lottery_part = $('input[name=lottery-opts]:checked').val();
    if (lottery_part == "yes") {
	chrome.extension.sendMessage("", {
		'type' : 'set_lottery_setting',
		    'lottery_setting' : 'lottery-on'
		    });
    }
    else if (lottery_part == "no") {
	chrome.extension.sendMessage("", {
		'type' : 'set_lottery_setting',
		    'lottery_setting' : 'lottery-off'
		    });
    }
    
    $("#lottery-container-div").invisible();
    $("#lottery-container-div").hide();

    $("#login-container-div").show();
    $("#login-container-div").visible();
    chrome.extension.sendMessage("", {
	    'type' : 'get-signin-status',
		}, 
	handle_current_user);
}

function login() {
    var username = $.trim($("#login-username").val());
    var password = $.trim($("#login-password").val());
    if (username != '' && password != '') {
	chrome.extension.sendMessage("", {
	    'type' : 'sign-in',
	    'username' : username,
	    'password' : password,
	});
    }
    else {
	$("#top-status").addClass("text-error");
	$("#top-status").text('Username or Password is empty');
    }
}

function redirect_to_check_report() {
    $(".progress-div").show();
    $(".progress-div").visible();
    time = 1;
    max = 2;
    int = setInterval(function() {
	    $("#progress").css("width", Math.floor(100 * time++ / max) + '%');
	    time - 1 == max && function() {
		clearInterval(int);
		window.location = chrome.extension.getURL('report.html');
	    }();
	}, 1000);
}

function create_account() {
    var username = $("#ca-username").val();
    var password = $("#ca-password").val();
    var confirm_password = $("#ca-confirm-password").val();

    if (username != '' && password != '') {
	if (password == confirm_password) {
	    chrome.extension.sendMessage("", {
		'type' : 'create-account',
		'username' : username,
		'password' : password,
	    });
	}
	else {
	    $("#top-status").addClass("text-error");
	    $("#top-status").text("Password and Confirm-password does not match");
	}
    }
    else {
	$("#top-status").addClass("text-error");
	$("#top-status").text("Username or Password empty");
    }
}

document.addEventListener('DOMContentLoaded', function () {
    $("#login-submit").on("click", login);
    $('#create-account-submit').on('click', create_account);
    $('body .login-form').on('keypress', 'input:password, input:text', 
			     {'type': 'login'}, check_for_enter);
    $('body .create-account-form').on('keypress', 'input:password, input:text', 
				      {'type': 'create-account'}, check_for_enter);
});

chrome.extension.onMessage.addListener(function(message, sender, send_response) {
    if (message.type == "login-success") {
	$(".login-form").hide();
	$(".create-account-form").hide();
	$("#username-info").hide();
	$("#top-status").removeClass("text-error");
	$("#top-status").addClass("text-success");
	$("#top-status").text(message.desc);
	verify_accounts_exist();
    }
    else if (message.type == "login-failure") {
	$("#top-status").addClass("text-error");
	$("#top-status").text(message.desc);
    }
    else if (message.type == "account-success") {
	$(".login-form").hide();
	$(".create-account-form").hide();
	$("#username-info").hide();
	$("#top-status").removeClass("text-error");
	$("#top-status").addClass("text-success");
	$("#top-status").text(message.desc);
	verify_accounts_exist();
    }
    else if (message.type == "account-failure") {
	$("#top-status").addClass("text-error");
	$("#top-status").text(message.desc);
    }
    else if (message.type == "initial-login-done") {
	console.log("APPU DEBUG: DELETE ME: Successfully logged-into: " + message.site_name);
	start_initial_pi_download();
    }
});

$(document).ready(function() {
    chrome.extension.sendMessage("", {
	'type' : 'get-version',
    }, show_version);

    chrome.extension.sendMessage("", {
	'type' : 'get_appu_initialized',
    }, handle_appu_initialized);
});
