

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

	response.dontbugme = 'yes';
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
    return;
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


function show_fpi_download_in_progress_warning() {
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