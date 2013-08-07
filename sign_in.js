
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
	console.log("Here here: " + response.initialized);
	$("#login-container-div").show();
	$("#login-container-div").visible();
	chrome.extension.sendMessage("", {
		'type' : 'get-signin-status',
		    }, 
	    handle_current_user);
    }
    else {
	$("#age-verification-container-div").show();
	$("#age-verification-container-div").visible();
	$("#sign-in-title").text("Age Verification");
	$("#age-verification-checkbox").change(function() {
		if(this.checked) {
		    $("#age-verification-button").removeClass("disabled");
		    console.log("Here here: checkbox change: " + this.checked);
		    $("#age-verification-button").on("click", goto_lottery);
		}
		else {
		    $("#age-verification-button").addClass("disabled");
		    $("#age-verification-button").off("click", goto_lottery);
		}
	    });
    }
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

    chrome.extension.sendMessage("", {
	    'type' : 'set_appu_initialized',
		});
    
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
    max = 5;
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
	redirect_to_check_report();
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
	redirect_to_check_report();
    }
    else if (message.type == "account-failure") {
	$("#top-status").addClass("text-error");
	$("#top-status").text(message.desc);
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
