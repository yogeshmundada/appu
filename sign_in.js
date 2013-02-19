
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
    $('#version-info').text(response.version);
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
	'type' : 'get-signin-status',
    }, handle_current_user);
});
