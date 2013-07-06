

//Function to see if Appu server is up
//Also tells the server that this appu installation is still running
function pii_check_if_stats_server_up() {
    var stats_server_url = "http://woodland.gtnoise.net:5005/"
    try {
	var wr = {};
	wr.guid = (sign_in_status == 'signed-in') ? pii_vault.guid : '';
	wr.version = pii_vault.config.current_version;
	wr.deviceid = (sign_in_status == 'signed-in') ? pii_vault.config.deviceid : 'Not-reported';

	$.post(stats_server_url, JSON.stringify(wr),
	       function(data, textStatus, jqxhr) {
		   var is_up = false;
		   stats_message = /Hey ((?:[0-9]{1,3}\.){3}[0-9]{1,3}), Appu Stats Server is UP!/;
		   is_up = (stats_message.exec(data) != null);
		   console.log("Appu stats server, is_up? : "+ is_up);
	       })
	.error(function (data, status) {
		console.log("Appu: Could not check if server is up: " + stats_server_url
			    + ", status: " + status.toString());
		print_appu_error("Appu Error: Seems like server was down. " +
				 "Status: " + status.toString() + " " 
				 + (new Date()));
	    });
    }
    catch (e) {
	console.log("Error while checking if stats server is up");
    }
    last_server_contact = new Date();
}


function pii_modify_status(message) {
    if (message.status == "enable") {
	clearInterval(pii_vault.config.enable_timer);
	pii_vault.config.status = "active";
	pii_vault.config.disable_period = -1;
	flush_selective_entries("config", ["enable_timer", "status", "disable_period"]);

	chrome.browserAction.setIcon({path:'images/appu_new19.png'});

	chrome.tabs.query({}, function(all_tabs) {
	    for(var i = 0; i < all_tabs.length; i++) {
		chrome.tabs.sendMessage(all_tabs[i].id, {
			type: "status-enabled",
			    show_monitor_icon: pii_vault.options.monitor_icon_setting});
	    }
	});

    }
    else if (message.status == "disable") {
	pii_vault.config.status = "disabled";
	pii_vault.config.disable_period = message.minutes;
	pii_vault.config.disable_start = (new Date()).toString();
	pii_vault.config.enable_timer = setInterval(start_time_loop, 1000);
	flush_selective_entries("config", ["disable_start", "enable_timer", "status", "disable_period"]);

	pii_vault.current_report.appu_disabled.push(message.minutes);
	flush_selective_entries("current_report", ["appu_disabled"]);

	chrome.browserAction.setIcon({path:'images/appu_new19_offline.png'});
	console.log((new Date()) + ": Disabling Appu for " + message.minutes + " minutes");

	chrome.tabs.query({}, function(all_tabs) {
	    for(var i = 0; i < all_tabs.length; i++) {
		chrome.tabs.sendMessage(all_tabs[i].id, {type: "status-disabled"});
	    }
	});

    }
}


function background_tasks() {
    //report = pii_vault.past_reports[report_number - 2];
    for (var i = 0; i < pii_vault.past_reports.length; i++) {
	var cr = pii_vault.past_reports[i];
	if (cr.actual_report_send_time == 'Not delivered yet') {
	    //To adjust for current_report(=1) and start index (0 instead of 1)
	    var report_number = i + 2;
	    console.log("APPU DEBUG: Report " + cr.actual_report_send_time + " is undelivered");
	    if (report_number in delivery_attempts) {
		var dat = delivery_attempts[report_number];
		var curr_time = new Date();
		var td = curr_time.getTime() - dat.getTime();	    
		if (td < (60 * 60 * 24 * 1000)) {
		    //Less than 24-hours, Skip
		    // 		    console.log("APPU DEBUG: Report " + report_number + 
		    // " was already attempted to " +
		    // 				"be delivered, so skipping");
		    continue;
		}
	    }
	    delivery_attempts[report_number] = new Date();
	    //	    console.log("APPU DEBUG: Attempting to send report " + report_number);
	    pii_send_report(report_number);   
	}
    }
    
    //If its been 24 hours, since we talked to server, just send a quick "I am alive" 
    //message
    var curr_time = new Date();
    var td = curr_time.getTime() - last_server_contact.getTime();	    
    if (td > (60 * 60 * 24 * 1000)) {
	pii_check_if_stats_server_up();
    }
}


function start_time_loop() {
    var curr_time = new Date();
    if ((curr_time - (new Date(pii_vault.config.disable_start))) > 
	(60 * 1000 * pii_vault.config.disable_period)) {
	clearInterval(pii_vault.config.enable_timer);
	pii_vault.config.status = "active";
	pii_vault.config.disable_period = -1;
	flush_selective_entries("config", ["enable_timer", "status", "disable_period"]);

	chrome.browserAction.setIcon({path:'images/appu_new19.png'});
	console.log((new Date()) + ": Enabling Appu");

	chrome.tabs.query({}, function(all_tabs) {
	    for(var i = 0; i < all_tabs.length; i++) {
		chrome.tabs.sendMessage(all_tabs[i].id, {
			type: "status-enabled",
			    show_monitor_icon: pii_vault.options.monitor_icon_setting
			    });
	    }
	});
    } 
}


function shorten_reporting_time() {
    update_reporting_interval(60, 1);
    pii_vault.current_report.scheduled_report_time = new Date();
    flush_current_report();
}

function restore_reporting_time() {
    //Random time between 5 pm to 8 pm. Do we need to adjust according to local time?
    var rand_minutes = 1020 + Math.floor(Math.random() * 1000)%180;
    update_reporting_interval(4320, rand_minutes);
}
