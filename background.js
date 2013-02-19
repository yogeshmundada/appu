
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var ext_id = chrome.i18n.getMessage('@@extension_id');

var pii_vault = { "options" : {}, "config": {}};

var pending_warnings = {}; 
var pending_pi_fetch = {};

//If user says remind me later
var report_reminder_interval = 30;

//Report check interval in minutes
var report_check_interval = 5;

//Do background tasks like send undelivered reports,
//feedbacks etc
var bg_tasks_interval = 10;

//Is user processing report?
var is_report_tab_open = 0;

//All open report pages. These are useful to send updates to stats
var report_tab_ids = [];

// Which text report to be shown in which tab-id
var text_report_tab_ids = {};

//All open "My footprint" pages. These are useful to send updates to stats
var myfootprint_tab_ids = [];

var template_processing_tabs = {};

//Was an undelivered report attempted to be sent in last-24 hours?
var delivery_attempts = {};

//Keep server updated about my alive status
var last_server_contact = undefined;

var tld = undefined;
var focused_tabs = 0;

var current_user = "default";
var sign_in_status = "not-signed-in";

function print_appu_error(err_str) {
    if (err_str.indexOf("Appu Error: Could not process FPI template for:") == 0) {
	//No need to push that a template is not present again and again
	if (pii_vault.current_report.appu_errors.indexOf(err_str) == -1) {
	    pii_vault.current_report.appu_errors.push(err_str);
	}
    }
    else {
	pii_vault.current_report.appu_errors.push(err_str);
    }

    console.log(err_str);
    flush_selective_entries("current_report", ["appu_errors"]);
}

function pii_next_report_time() {
    var curr_time = new Date();

    curr_time.setSeconds(0);
    // Set next send time after 3 days
    curr_time.setMinutes( curr_time.getMinutes() + 4320);
    curr_time.setMinutes(0);
    curr_time.setHours(0);
    curr_time.setMinutes( curr_time.getMinutes() + pii_vault.config.reporting_hour);
    return new Date(curr_time.toString());
}

//Only useful for reading extension specific files
function read_file(filename) {
    var url = chrome.extension.getURL(filename);
    var request = new XMLHttpRequest();
    // false so that request is processed sync and we dont have to do callback BS
    request.open("GET", url, false);
    request.send();
	
    return request.responseText;
}

function update_specific_changes(last_version) {
    if (last_version == '0.0.0') {
	console.log("Here here: Update specific changes(0.0.0). Deleting the entire past storage system");
	delete localStorage[ext_id];
	pii_vault = { "options" : {}, "config": {}};
    }
    else if (last_version == '0.3.84') {
	console.log("Here here: Update specific changes(0.3.84). Adding new field 'pi_field_value_identifiers' " + 
		    "to aggregate_data");
	//The new field added to aggregate data.
	pii_vault.aggregate_data.pi_field_value_identifiers = {};
	flush_selective_entries("aggregate_data", ["pi_field_value_identifiers"]);
	calculate_common_fields();
    }
    else if (last_version == '0.3.86') {
	console.log("Here here: Update specific changes(0.3.86). Adding browser, os and layout info " + 
		    "to current_report");
	//The browser, layout and os to current report
	var environ = voodoo.ua();
	//General info about user's environment
	pii_vault.current_report.browser = environ.browser.name;
	pii_vault.current_report.browser_version = environ.browser.version;
	pii_vault.current_report.os = environ.platform.name;                      
	pii_vault.current_report.os_version = environ.platform.version;                                    
	pii_vault.current_report.layout_engine = environ.browser.engine;           
	pii_vault.current_report.layout_engine_version = environ.browser.engineVersion;
	flush_selective_entries("current_report", ["browser", "browser_version", 
						   "os", "os_version", 
						   "layout_engine", "layout_engine_version"]);

	console.log("Here here: Update specific changes(0.3.86). Adding deviceid");
	pii_vault.config.deviceid = generate_guid();
	flush_selective_entries("config", ["deviceid"]);
	pii_vault.current_report.deviceid = pii_vault.config.deviceid;	
	flush_selective_entries("current_report", ["deviceid"]);

	console.log("Here here: Update specific changes(0.3.86). Adding pwd_unchanged_duration to all UAS");
	for (site in pii_vault.current_report.user_account_sites) {
	    if (!('pwd_unchanged_duration' in pii_vault.current_report.user_account_sites[site])) {
		pii_vault.current_report.user_account_sites[site].pwd_unchanged_duration = 0;
	    }
	}
	flush_selective_entries("current_report", ["user_account_sites"]);

	console.log("Here here: Update specific changes(0.3.86). Adding pwd_unchanged_duration to all past UAS");
	for (var i = 0; i < pii_vault.past_reports.length; i++) {
	    var report = pii_vault.past_reports[i];
	    for (site in report.user_account_sites) {
		if (!('pwd_unchanged_duration' in report.user_account_sites[site])) {
		    report.user_account_sites[site].pwd_unchanged_duration = 0;
		}
	    }
	}
	vault_write("past_reports", pii_vault.past_reports);
    }
}

function make_version_check() {
    //Detect if there has been an update.
    var am_i_updated = false;
    var last_version = pii_vault.config.current_version ? pii_vault.config.current_version : '0.0.0';

    response_text = read_file('manifest.json');
    var manifest = JSON.parse(response_text);
    console.log("Here here: Current version: " + manifest.version);
    if ((!pii_vault.config.current_version) || (manifest.version > pii_vault.config.current_version)) {
	if (manifest.version > pii_vault.config.current_version) {
	    pii_vault.config.current_version = manifest.version;
	    flush_selective_entries("config", ["current_version"]);
	}
	am_i_updated = true;
	if (pii_vault.current_report) {
	    pii_vault.current_report.extension_updated = true;
	    pii_vault.current_report.extension_version = pii_vault.config.current_version;
	    flush_selective_entries("current_report", ["extension_updated", "extension_version"]);
	}
    }

    return [am_i_updated, last_version];
}

function init_user_account_sites_entry() {
    var uas_entry = {};
    uas_entry.num_logins = 0;
    uas_entry.pwd_unchanged_duration = 0;
    uas_entry.num_logouts = 0;
    uas_entry.latest_login = 0;
    //Specifically naming it with prefix "my_" because it was
    //creating confusion with current_report.pwd_groups (Notice 's' at the end)
    uas_entry.my_pwd_group = 'no group';
    uas_entry.tts = 0;
    uas_entry.tts_login = 0;
    uas_entry.tts_logout = 0;
    uas_entry.site_category = 'unclassified';
    return uas_entry;
}

function init_non_user_account_sites_entry() {
    var non_uas_entry = {};
    non_uas_entry.latest_access = 0;
    non_uas_entry.tts = 0;
    non_uas_entry.site_category = 'unclassified';
    return non_uas_entry;
}

function initialize_report() {
    var current_report = {};

    //Current report initialized
    current_report.initialize_time = new Date();

    //Current report: Id
    current_report.reportid = pii_vault.config.reportid;

    //Current report: Device Id
    current_report.device_id = pii_vault.config.deviceid;

    //Current report: is it modified?
    current_report.report_modified = "no";
    //Current report: GUID
    current_report.guid = pii_vault.guid;
    current_report.num_report_visits = 0;
    current_report.report_time_spent = 0;

    //Errors generated during this reporting period.
    //Send them out for fixing
    current_report.appu_errors = [];

    //Has user viewed "My Footprint" page since
    //last report? Shows general curiosity and tech savvyness on behalf of 
    //user. Also tells us how engaging appu is.
    current_report.num_myfootprint_visits = 0;
    current_report.myfootprint_time_spent = 0;

    //Current report: was it reviewed?
    //Necessary because even if report sending is set to auto, a person
    //still might do review.
    current_report.report_reviewed = false;

    //Current report - Has user 'explicitly' approved it to be sent out?
    //This is either "false" or the timestamp of user approval.
    //In case report_setting is manual, then it is equal to scheduled_reporting_time.
    current_report.user_approved = false;

    // ** Following entry is totally experimental and most likely would be
    //    DEPRECATED in the future releases **
    //Sites where users have been entering inputs.
    //Its only use is for Appu to detect the kind of
    //inputs that users have been entering and where.
    //Also, if the input type is TEXT or similar, then length of the data 
    //entered
    //Each entry is of the form:
    // [1, new Date(1354966002000), 'www.abc.com', 'test', 'button', 'length'],
    // Very first entry is the unique record number useful for deletion.
    // Second is timestamp
    // Third name of the site
    // Fourth name of the input field
    // Fifth type of the input field - text, textarea, button etc
    // Sixth length of the input field
    current_report.input_fields = [];

    //Current report - How many attempts it took to send the report 
    //                 to the server? 
    // (This could be because either stats servers were down OR
    //  user was not connected to the Internet)
    current_report.send_attempts = [];

    //Current report - What was the extension version at the time of
    //                 this report?
    current_report.extension_version = pii_vault.config.current_version;

    //Current report - Was there a version update event in between?
    current_report.extension_updated = false;

    //Current report - Is the report structure updated?
    //This is useful so that if user has opened REPORTS page,
    //he will get dynamic 'aggregate' updates every 5 minutes.
    //Table row updates are sent asynchronously whenever they happen
    current_report.report_updated = false;

    //Scheduled time for this report
    current_report.scheduled_report_time = pii_next_report_time();
    //Actual send report time for this report
    current_report.actual_report_send_time = 'Not delivered yet';

    //"auto", "manual" or "differential"
    current_report.report_setting = pii_vault.options.report_setting;

    //How many times did user hit "remind me later" for this report?
    current_report.send_report_postponed = 0;
    //Total unique sites accessed since the last report
    //But don't actually enlist those sites
    current_report.num_total_sites = 0;
    //Total time spent on each site
    current_report.total_time_spent = 0;
    current_report.total_time_spent_logged_in = 0;
    current_report.total_time_spent_wo_logged_in = 0;

    //Sites with user's account that users have logged into
    //since last report
    current_report.num_user_account_sites = 0;

    //Each site is a record such as
    // site_name --> Primary Key
    // tts = Total Time Spent
    // tts_login = Total Time Spent Logged In
    // tts_logout = Total Time Spent Logged out
    // num_logins = Number of times logged in to a site
    // num_logouts = Number of times logged out of a site explicitly
    // latest_login = Last login time in the account
    // pwd_group = To group by sites using same password
    // site_category = Type of the site
    // A function init_user_account_sites_entry() gives the empty value for each site
    current_report.user_account_sites = {};

    //Sites where user does not have account (but "log in" is present)
    //Once again don't enlist those sites
    current_report.num_non_user_account_sites = 0;

    //Number of times appu was disabled. 
    //and how long each time
    current_report.appu_disabled = [];

    //New list of sites added to dontbuglist since last report
    current_report.dontbuglist = [];

    //Number of different passwords used since the last report
    current_report.num_pwds = 0;

    //Password group name, sites in each group and password strength
    //Each group has an entry like "pwd_group_0", "google.com, facebook.com", "30/100" etc
    current_report.pwd_groups = {};

    //Similarity distance between each different password
    //Each entry is like {"pwd_group_0" : [{ "pwd_group_1" : 23}, { "pwd_group_2" : 14}]} 
    current_report.pwd_similarity = {};

    //Downloaded PI from following sites
    //Each entry is like: {'site_name' : { download_time: xyz, downloaded_fields: [a, b, c]}}
    current_report.downloaded_pi = {};

    //Fields that share common values across sites
    //Each entry is like: {'field_name' : ['site_1', 'site_2', 'site_3']} etc 
    //One has to consult aggregate stats for this.
    current_report.common_fields = {};

    //Finally our old pwd_reuse_warnings
    //Each record is of the following form:
    //[1, 1355555522298, 'aaa.com', 'bbb.com, ggg.com'],
    // First entry is the unique identifier to delete the record.
    // Second is timestamp
    // Third is site where user was warned on
    // Fourth is list of sites for which user was warned
    current_report.pwd_reuse_warnings = [];

    var environ = voodoo.ua();
    //General info about user's environment
    current_report.browser = environ.browser.name;
    current_report.browser_version = environ.browser.version;
    current_report.os = environ.platform.name;                      
    current_report.os_version = environ.platform.version;                                    
    current_report.layout_engine = environ.browser.engine;
    current_report.layout_engine_version = environ.browser.engineVersion;

    return current_report
}

//Aggregate data is gathered over the time unlike daily reports.
//Also aggregate data will contain sensitive data such as per_site_pi
//that is not sent to the server. Only user can view it from "My Footprint"
function initialize_aggregate_data() {
    var aggregate_data = {};

    //When was this created?
    aggregate_data.initialized_time = new Date();
    //Is user aware? How many times is he reviewing his own data?
    //This could be used as a feedback to the system about user's awareness
    //(hence an indirect metric about users' savviness) and
    //also to warn user.
    aggregate_data.num_viewed = 0;
    aggregate_data.total_time_spent = 0;

    //Stats about general sites access
    aggregate_data.num_total_sites = 0;
    aggregate_data.all_sites_total_time_spent = 0;
    aggregate_data.all_sites_stats_start = new Date();

    //Stats and data about sites with user accounts (i.e. where user logs in)
    //user_account_sites[] is an associative array with key: site_name

    //Value corresponding to that is an object with following dictionary:
    //Each site is a record such as
    // site_name --> Primary Key
    // tts = Total Time Spent
    // tts_login = Total Time Spent Logged In
    // tts_logout = Total Time Spent Logged out
    // num_logins = Number of times logged in to a site
    // num_logouts = Number of times logged out of a site explicitly
    // latest_login = Last login time in the account
    // pwd_group = To group by sites using same password
    // site_category = Type of the site
    aggregate_data.num_user_account_sites = 0;
    aggregate_data.user_account_sites = {};

    //Stats and data about sites where user browses but never logs in
    //IMPORTANT: This detailed list of sites is only maintained in aggregate stats.
    //           Its never reported to the server.
    //non_user_account_sites[] is an associative array with key: site_name
    //Value corresponding to that is an object with following dictionary:
    //site_name, last_access_time, total_time_spent, site_category
    aggregate_data.num_non_user_account_sites = 0;
    aggregate_data.non_user_account_sites = {};
    
    //Passwords data
    //pwd_groups is an associative array. Key is group name and values are list of sites
    //sharing that password
    aggregate_data.num_diff_pwds = 0;
    aggregate_data.pwd_groups = {};
    aggregate_data.pwd_similarity = {};

    //Per site PI downloaded
    //Key: site name
    //Values: time downloaded
    // field_name --> field value
    aggregate_data.per_site_pi = {};
    
    //This is used to assign a unique identifier to
    //each possible value of PI.
    //For eg. an address like "122, 5th ST SE, ATLANTA 30318, GA, USA" will
    //get an identifier like "address1"
    //Or a name like "Appu Singh" will get an identifier like "name3"
    //This is useful to show in reports page (so that the real values are
    // shown in the tooltip). Also it helps to always assign a unique 
    //identifier even if that thing is downloaded multiple times over the
    //time.
    aggregate_data.pi_field_value_identifiers = {};

    return aggregate_data;
}

function flush_current_report() {
    for (var j = 0; j < on_disk_values.current_report.length; j++) {
	var write_key = "current_report:" + on_disk_values.current_report[j];
	vault_write(write_key, pii_vault.current_report[on_disk_values.current_report[j]]);
    }
}

function flush_aggregate_data() {
    for (var j = 0; j < on_disk_values.aggregate_data.length; j++) {
	var write_key = "aggregate_data:" + on_disk_values.aggregate_data[j];
	vault_write(write_key, pii_vault.aggregate_data[on_disk_values.aggregate_data[j]]);
    }
}

function flush_selective_entries(struct_name, entry_list) {
    for (var j = 0; j < entry_list.length; j++) {
	var write_key = struct_name + ":" + entry_list[j];
	vault_write(write_key, pii_vault[struct_name][entry_list[j]]);
    }
}

function create_account(sender_tab_id, username, password) {
    var new_guid = generate_guid();
    var wr = { 
	'guid': new_guid, 
	'username': CryptoJS.SHA1(username).toString(), 
	'password' : CryptoJS.SHA1(password).toString(),
	'version' : pii_vault.config.current_version 
    }

    $.post("http://192.168.56.101:59000/create_new_account", 
	   JSON.stringify(wr),
	   function(data) {
	       if (data == 'Success') {
		   chrome.tabs.sendMessage(sender_tab_id, {
		       type: "account-success", 
		       desc: "Account was created successfully. You are now logged-in"
		   }); 

		   //Reset pii_vault.
		   pii_vault = { "options" : {}, "config": {}};
		   pii_vault.guid = new_guid;
		   console.log("create_account(): Updated GUID in vault: " + pii_vault.guid);
		   vault_write("guid", pii_vault.guid);
		   
		   current_user = username;
		   pii_vault.current_user = username;
		   vault_write("current_user", pii_vault.current_user);

		   sign_in_status = 'signed-in';
		   pii_vault.sign_in_status =  'signed-in';
		   vault_write("sign_in_status", pii_vault.sign_in_status);
		   //GUID has changed, call init() to create new fields. Otherwise it
		   //will not do anything.
		   vault_init();
		   console.log("Here here: Account creation was success");
	       }
	       else if (data.split(' ')[0] == 'Failed') {
		   var temp = data.split(' ');
		   temp.shift();
		   reason = temp.join(' ');
		   chrome.tabs.sendMessage(sender_tab_id, {
		       type: "account-failure", 
		       desc: reason
		   }); 
		   console.log("Here here: Account creation was failure: " + reason);
	       }
	       else {
		   chrome.tabs.sendMessage(sender_tab_id, {
		       type: "account-failure", 
		       desc: "Account creation failed for unknown reasons"
		   }); 
		   console.log("Here here: Account creation was failure: Unknown Reason");
	       }
	   })	
	.error(function(sender_tab_id) {
		return function(data, status) {
		    print_appu_error("Appu Error: Account creation failed at the server: " 
				     + status.toString() + " @ " + (new Date()));
		    chrome.tabs.sendMessage(sender_tab_id, { 
			    type: "account-failure", 
				desc: "Account creation failed, service possibly down"
				}); 
		    console.log("Here here: Account creation was failure: Unknown Reason");
		}
	    } (sender_tab_id));
}

function sign_in(sender_tab_id, username, password) {
    //zero out pii_vault first if guid is differnt
    var wr = { 
	'guid': pii_vault.guid, 
	'username': CryptoJS.SHA1(username).toString(), 
	'password' : CryptoJS.SHA1(password).toString(),
	'version' : pii_vault.config.current_version
    }

    $.post("http://192.168.56.101:59000/sign_in_account", 
	   JSON.stringify(wr),
	   function(data) {
	       if (data.split(' ')[0] == 'Success') {
		   chrome.tabs.sendMessage(sender_tab_id, {
		       type: "login-success", 
		       desc: "You have logged-in successfully"
		   }); 
		   current_user = username;
		   pii_vault.current_user = username;
		   vault_write("current_user", pii_vault.current_user);

		   sign_in_status = 'signed-in';
		   pii_vault.sign_in_status =  'signed-in';
		   vault_write("sign_in_status", pii_vault.sign_in_status);

		   var new_guid = data.split(' ')[1];
		   if (pii_vault.guid != new_guid) {
		       //Reset pii_vault.
		       pii_vault = { "options" : {}, "config": {}};
		       pii_vault.guid = new_guid;
		       console.log("sign_in(): Updated GUID in vault: " + pii_vault.guid);
		       vault_write("guid", pii_vault.guid);

		       current_user = username;
		       pii_vault.current_user = username;
		       vault_write("current_user", pii_vault.current_user);

		       sign_in_status = 'signed-in';
		       pii_vault.sign_in_status =  'signed-in';
		       vault_write("sign_in_status", pii_vault.sign_in_status);
		   }
		   //In case GUID has changed, call init() to create new fields. Otherwise it
		   //will not do anything.
		   vault_read();
		   vault_init();
		   console.log("Here here: Account sign-in was success, new_guid: " + new_guid);
	       }
	       else if (data.split(' ')[0] == 'Failed') {
		   chrome.tabs.sendMessage(sender_tab_id, {
		       type: "login-failure", 
		       desc: 'Failed to sign-in (Possibly username or password is wrong)'
		   }); 
		   console.log("Here here: Account sign-in was failure");
	       }
	       else {
		   chrome.tabs.sendMessage(sender_tab_id, {
		       type: "login-failure", 
		       desc: "Account sign-in failure for unknown reasons"
		   }); 
		   console.log("Here here: Account sign-in was failure, Unknown reason");
	       }
	   })
	.error(function(sender_tab_id) {
		return function(data, status) {
		    print_appu_error("Appu Error: Account sign-in failed at the server: " 
				     + status.toString() + " @ " + (new Date()));
		    chrome.tabs.sendMessage(sender_tab_id, {
			    type: "login-failure", 
				desc: "Account sign-in failed, possibly service is down"
				}); 
		   console.log("Here here: Account creation was failure: Unknown Reason");
		}
	    } (sender_tab_id));
}

function sign_out() {
    //First close all old tabs for current user
    for (var i = 0; i < report_tab_ids.length; i++) {
	chrome.tabs.remove(report_tab_ids[i]);
    }
    for (var i = 0; i < myfootprint_tab_ids.length; i++) {
	chrome.tabs.remove(myfootprint_tab_ids[i]);
    }

    //Reset pii_vault.
    pii_vault = { "options" : {}, "config": {}};
    current_user = "default";
    sign_in_status = 'not-signed-in';
    //This is a new default user, create a new vault for him
    vault_init();
}


function generate_guid() {
    var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	return v.toString(16);
    });
    return guid;
}

//Initializing each property. 
//TODO: Perhaps a better way is to write a generic function
//that accepts property_name and property initializer for that property.
//It will test if property exists. If not, then call the initializer function on that property.
//It will shorten the code and make it decent.
function vault_init() {
    var vault_modified = false;

    console.log("vault_init(): Initializing missing properties from last release");
    // All top level values
    if (!pii_vault.guid) {
	//Verifying that no such user-id exists is taken care by
	//Create Account or Sign-in.
	//However, if there is a duplicate GUID then we are in trouble.
	//Need to take care of that somehow.
	pii_vault.guid = generate_guid();
	
	console.log("vault_init(): Updated GUID in vault: " + pii_vault.guid);
	vault_write("guid", pii_vault.guid);

	pii_vault.current_user = current_user;
	vault_write("current_user", pii_vault.current_user);

	pii_vault.sign_in_status = sign_in_status;
	vault_write("sign_in_status", pii_vault.sign_in_status);
    }

    if (!pii_vault.salt_table) {
	var salt_table = {};
	//current_ip for current input, not ip address
	var current_ip = pii_vault.guid;
	for(var i = 0; i < 1000; i++) {
	    salt_table[i] = CryptoJS.SHA1(current_ip).toString();
	    current_ip = salt_table[i];
	}
	pii_vault.salt_table = salt_table;
	
	console.log("vault_init(): Updated SALT TABLE in vault");
	vault_write("salt_table", pii_vault.salt_table);
    }

    if (!pii_vault.initialized) {
	pii_vault.initialized = true;
	console.log("vault_init(): Updated INITIALIZED in vault");
	vault_write("initialized", pii_vault.initialized);
    }

    if (!pii_vault.total_site_list) {
	// This is maintained only to calculate total number of DIFFERENT sites visited
	// from time to time. Its reset after every new current_report is created.
	pii_vault.total_site_list = [];
	console.log("vault_init(): Updated TOTAL_SITE_LIST in vault");
	vault_write("total_site_list", pii_vault.total_site_list);
    }

    if (!pii_vault.password_hashes) {
	// This is maintained separarely from current_report as it should not
	// be sent to the server. 
	// Structure is: Key: 'username:etld'
	// Value: { 'pwd_hash':'xyz', 'initialized': Date} 
	//Each entry is basically eTLD and password_hash
	pii_vault.password_hashes = {};
	console.log("vault_init(): Updated PASSWORD_HASHES in vault");
	vault_write("password_hashes", pii_vault.password_hashes);
    }

    if (!pii_vault.past_reports) {
	pii_vault.past_reports = [];
	console.log("vault_init(): Updated PAST_REPORTS in vault");
	vault_write("past_reports", pii_vault.past_reports);
    }

    // All config values
    if (!pii_vault.config.deviceid) {
	//A device id is only used to identify all reports originating from a 
	//specific Appu install point. It serves no other purpose.
	pii_vault.config.deviceid = generate_guid();
	
	console.log("vault_init(): Updated DEVICEID in vault: " + pii_vault.config.deviceid);
	flush_selective_entries("config", ["deviceid"]);
    }

    if (!pii_vault.config.current_version) {
	response_text = read_file('manifest.json');
	var manifest = JSON.parse(response_text);
	pii_vault.config.current_version = manifest.version;
	console.log("vault_init(): Updated CURRENT_VERSION in vault: " + pii_vault.config.current_version);
	flush_selective_entries("config", ["current_version"]);
    }

    if (!pii_vault.config.status) {
	pii_vault.config.status = "active";
	console.log("vault_init(): Updated STATUS in vault");
	vault_write("config:status", pii_vault.config.status);
    }

    if (!pii_vault.config.disable_period) {
	pii_vault.config.disable_period = -1;
	console.log("vault_init(): Updated DISABLE_PERIOD in vault");
	vault_write("config:disable_period", pii_vault.config.disable_period);
    }

    if (!pii_vault.config.reporting_hour) {
	pii_vault.config.reporting_hour = 0;
	//Random time between 5 pm to 8 pm. Do we need to adjust according to local time?
	var rand_minutes = 1020 + Math.floor(Math.random() * 1000)%180;
	pii_vault.config.reporting_hour = rand_minutes;
	console.log("vault_init(): Updated REPORTING_HOUR in vault");
	vault_write("config:reporting_hour", pii_vault.config.reporting_hour);
    }    

    if (!pii_vault.config.next_reporting_time) {
	var curr_time = new Date();
	//Advance by 3 days. 
	curr_time.setMinutes( curr_time.getMinutes() + 4320);
	//Third day's 0:0:0 am
	curr_time.setSeconds(0);
	curr_time.setMinutes(0);
	curr_time.setHours(0);
	curr_time.setMinutes( curr_time.getMinutes() + pii_vault.config.reporting_hour);
	//Start reporting next day
	pii_vault.config.next_reporting_time = curr_time.toString();
	
	console.log("Report will be sent everyday at "+ Math.floor(rand_minutes/60) + ":" + (rand_minutes%60));
	console.log("Next scheduled reporting is: " + curr_time);
	console.log("vault_init(): Updated NEXT_REPORTING_TIME in vault");
	vault_write("config:next_reporting_time", pii_vault.config.next_reporting_time);
    }

    if (!pii_vault.config.report_reminder_time) {
	pii_vault.config.report_reminder_time = -1;
	console.log("vault_init(): Updated REPORT_REMINDER_TIME in vault");
	vault_write("config:report_reminder_time", pii_vault.config.report_reminder_time);
    }

    if (!pii_vault.config.reportid) {
	pii_vault.config.reportid = 1;
	console.log("vault_init(): Updated REPORTID in vault");
	vault_write("config:reportid", pii_vault.config.reportid);
    }

    // All options values
    if (!pii_vault.options.blacklist) {
	pii_vault.options.blacklist = [];
	console.log("vault_init(): Updated BLACKLIST in vault");
	vault_write("options:blacklist", pii_vault.options.blacklist);
    }

    if (!pii_vault.options.dontbuglist) {
	pii_vault.options.dontbuglist = [];
	console.log("vault_init(): Updated DONTBUGLIST in vault");
	vault_write("options:dontbuglist", pii_vault.options.dontbuglist);
    }

    //Three different types of reporting.
    //Manual: If reporting time of the day and if report ready, interrupt user and ask 
    //        him to review, modify and then send report.
    //Auto: Send report automatically when ready.
    //Differential: Interrupt user to manually review report only if current report
    //                   entries are different from what he reviewed in the past.
    //                   (How many past reports should be stored? lets settle on 10 for now?).
    //                   Highlight the different entries with different color background.
    if (!pii_vault.options.report_setting) {
	pii_vault.options.report_setting = "manual";
	console.log("vault_init(): Updated REPORT_SETTING in vault");
	vault_write("options:report_setting", pii_vault.options.report_setting);
    }    

    // All current report values
    if (!pii_vault.current_report) {
	pii_vault.current_report = initialize_report();
	console.log("vault_init(): Updated CURRENT_REPORT in vault");

	flush_current_report();
    }

    // All aggregate data values
    if (!pii_vault.aggregate_data) {
	pii_vault.aggregate_data = initialize_aggregate_data();
	console.log("vault_init(): Updated AGGREGATE_DATA in vault");

	flush_aggregate_data();
    }
}

var on_disk_values = {
    "top_level" : [
	"current_user",
	"sign_in_status",
	"salt_table",
	"initialized",
	"total_site_list",
	"password_hashes",
	"past_reports",
    ],
    "config" : [
	"deviceid",
	"current_version",
	"status",
	"disable_period",
	"disable_start",
	"enable_timer",
	"reporting_hour",
	"next_reporting_time",
	"report_reminder_time",
	"reportid",
    ],
    "options" : [
	"blacklist",
	"dontbuglist",
	"report_setting",
    ],
    "current_report" : [
	"initialize_time",
	"reportid",
	"deviceid",
	"report_modified",
	"guid",
	"num_report_visits",
	"report_time_spent",
	"appu_errors",
	"num_myfootprint_visits",
	"myfootprint_time_spent",
	"report_reviewed",
	"user_approved",
	"input_fields",
	"send_attempts",
	"extension_version",
	"extension_updated",
	"scheduled_report_time",
	"actual_report_send_time",
	"report_setting",
	"send_report_postponed",
	"num_total_sites",
	"total_time_spent",
	"total_time_spent_logged_in",
	"total_time_spent_wo_logged_in",
	"num_user_account_sites",
	"user_account_sites",
	"num_non_user_account_sites",
	"appu_disabled",
	"dontbuglist",
	"num_pwds",
	"pwd_groups",
	"pwd_similarity",
	"downloaded_pi",
	"common_fields",
	"pwd_reuse_warnings",
	"browser",
	"browser_version",
	"os",
	"os_version",
	"layout_engine",
	"layout_engine_version",
    ],
    "aggregate_data" : [
	"initialized_time",
	"num_viewed",
	"total_time_spent",
	"num_total_sites",
	"all_sites_total_time_spent",
	"all_sites_stats_start",
	"num_user_account_sites",
	"user_account_sites",
	"num_non_user_account_sites",
	"non_user_account_sites",
	"num_diff_pwds",
	"pwd_groups",
	"pwd_similarity",
	"per_site_pi",
	"pi_field_value_identifiers",
    ],
}

function vault_read() {
    try {
	pii_vault.guid = JSON.parse(localStorage.guid);
    	if (pii_vault.guid) {
	    for (k in on_disk_values) {
		if (on_disk_values.hasOwnProperty(k)) {
		    var read_key_prefix = pii_vault.guid + ":";
		    if (k != 'top_level') {
			read_key_prefix += (k + ":");
		    }
		    var all_properties = on_disk_values[k];
		    for (var i = 0; i < all_properties.length; i++) {
			var read_key = read_key_prefix + all_properties[i];
			try {
			    var val = JSON.parse(localStorage[read_key]);
			    if (k === 'top_level') {
				pii_vault[all_properties[i]] = val;
				if (all_properties[i] == 'current_user') {
				    current_user = val;
				}
				if (all_properties[i] == 'sign_in_status') {
				    sign_in_status = val;
				}
			    }
			    else {
				if (!pii_vault[k]) {
				    pii_vault[k] = {};
				}
				pii_vault[k][all_properties[i]] = val;
			    }
			}
			catch (e) {

			}
		    }
		}
	    }
    	    if(pii_vault.guid) {
    		console.log("User Id: " + pii_vault.guid);
    	    }
    	    if("salt_table" in pii_vault) {
    		//console.log("salt_table length: " + Object.size(pii_vault.salt_table));
    	    }
    	}
    	else {
	    pii_vault = { "options" : {}, "config": {}};
    	}
    }
    catch (e) {
    	console.log("Loading extension for the first time. Initializing extension data");
	pii_vault = { "options" : {}, "config": {}};
    }
}

//Since this function is getting called async from many different points,
//ideally it should have a lock to avoid race conditions (and possibly corruption).
//However, apparently JS is threadless and JS engine takes care of this issue
//under the hood. So we are safe.
function vault_write(key, value) {
    if (value !== undefined) {
	if (key && key == "guid") {
	    //console.log("Here here: vault_write(), key: " + key + ", " + value);
	    localStorage[key] = JSON.stringify(value);
	}
	else if (key !== undefined) {
	    var write_key = pii_vault.guid + ":" + key;
	    //console.log("Here here: vault_write(), key: " + write_key + ", " + value);
	    localStorage[write_key] = JSON.stringify(value);
	    if (key.split(':').length == 2 && key.split(':')[0] === 'current_report') {
		//This is so that if the reports tab queries for current_report,
		//we can send it an updated one. There is no need to flush this to disk.
		pii_vault.current_report.report_updated = true;
	    }
	}
    }
    else {
	print_appu_error("Appu Error: vault_write(), Value is empty for key: " + key);
    }
}

function vault_update_domain_passwd(message, already_exists) {
    var domain = message.domain;
    try {
	var r = Math.floor((Math.random() * 1000)) % 1000;
	var rand_salt = pii_vault.salt_table[r];
	var salted_pwd = rand_salt + ":" + message.passwd;
	var pwd_sha1sum = CryptoJS.SHA1(salted_pwd).toString();

	var hk = '' + ':' + domain;

	if (already_exists == 'no') {
	    pii_vault.password_hashes[hk] = {};
	    pii_vault.password_hashes[hk].initialized = new Date();
	}
	pii_vault.password_hashes[hk].pwd_hash = pwd_sha1sum;

	vault_write("password_hashes", pii_vault.password_hashes);

	pii_vault.current_report.user_account_sites[domain].pwd_unchanged_duration =
	    new Date() - new Date(pii_vault.password_hashes[hk].initialized);
	flush_selective_entries("current_report", ["user_account_sites"]);
    }
    catch (e) {
	print_appu_error("Appu Error: Got an exception: " + e.message);
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
		chrome.tabs.sendMessage(all_tabs[i].id, {type: "status-enabled"});
	    }
	});

    } 
}


/// Template processing code START
// Creates a dictionary that has all PI fields mentioned in this template with
// information such as which one of them can be null and which ones are mandatory.
// Returns a tree of created template nodes.
function traverse_template_create_tree(fd, curr_node, site_pi_fields) {
    var all_kids = $(fd).children('div');
    var last_kid = null;

    curr_node.children = [];
    curr_node.xml_node = fd;
    curr_node.name = $(fd).attr('name');

    if (all_kids.length == 0) {
	//This is a leaf node .. represents actual value to be downloaded from the site
	var name = $(fd).attr('name');

	var can_be_a_null = $(fd).attr('can_be_a_null');
	site_pi_fields[name] = {};
	if (can_be_a_null != undefined) {
	    site_pi_fields[name].can_be_a_null = (can_be_a_null == 'no') ? false : true;
	}
	else {
	    site_pi_fields[name].can_be_a_null = true;
	}

	site_pi_fields[name].filled = false;
	site_pi_fields[name].processed = false;
	site_pi_fields[name].value = [];
    }
    else {
	for(var i = 0; i < all_kids.length; i++) {
	    var new_node = {};
	    new_node.parent = curr_node;
	    new_node.sibling_num = i;
	    new_node.completely_processed = false;
	    
	    if (last_kid != null) {
		new_node.left_sibling = last_kid;
		last_kid.right_sibling = new_node;
		new_node.right_sibling = null;
		last_kid = new_node;
	    }
	    else {
		new_node.left_sibling = null;
		last_kid = new_node;
	    }

	    curr_node.children.push(new_node);
	    if ($(all_kids[i]).attr('type')) {
		new_node.type = $(all_kids[i]).attr('type');
	    }

	    traverse_template_create_tree(all_kids[i], new_node, site_pi_fields);
	}
    }
}

function wait_on_sibling_processing_to_finish(curr_node, site_pi_fields, my_slave_tab, level) {
    var event_namespace = sprintf('.%s-%s-%s', my_slave_tab.tabid, level, curr_node.sibling_num);
    var event_name = "sibling-is-done" + event_namespace;

    console.log("Here here: WAIT_ON_SIBLING_PROCESSING_TO_FINISH(), event: " + event_name + " sleeping on: " + 
		$(curr_node.parent.child_processing_div).attr('id') + ", my-name: " + curr_node.name);

    $('#' + $(curr_node.parent.child_processing_div).attr('id'))
	.on(event_name, { en : event_namespace} , function(event) {
	    console.log("Here here: HOHOHOHOHOHOHOHOHOHOHOHOH");
	if (event.currentTarget.id == event.target.id) {
	    event.stopPropagation();
	    var event_namespace = event.data.en;
	    if (curr_node.parent.process_next_kid == true) {
		console.log("Here here: WAIT_ON_SIBLING_PROCESSING_TO_FINISH(), woken up on: " + 
			    $(curr_node.parent.child_processing_div).attr('id') + ", my-name: " + curr_node.name);
		
		$('#' + $(curr_node.parent.child_processing_div).attr('id')).off("sibling-is-done" + 
										 event_namespace);

		curr_node.parent.process_next_kid = false;
		curr_node.process_next_kid = true;
		process_action(curr_node, $(curr_node.xml_node).children('action'), 
			       site_pi_fields, my_slave_tab, level);
	    }
	    else {
		console.log("Here here: WAIT_ON_SIBLING_PROCESSING_TO_FINISH(), Again sleeping on: " + 
			    $(curr_node.parent.child_processing_div).attr('id') + ", my-name: " + curr_node.name);
	    }
	}
    });
}


//Instead of doing direct recursion, one has to do indirect one
//as JS has all the calls such as fetch URLs async.(to not annoy users waiting and blocking)
//and also because slave-tab is a resource that multiple nodes will want to use
//to fetch their URLs.
//This async business is making me insane...because of soooo much indirection.
//Can't wait to have "yield" in ECMAScript 6.
function traverse_and_fill(curr_node, site_pi_fields, my_slave_tab, level) {
    if (curr_node.parent == null) {
	console.log("Here here: Creating root process_div");
	//This is the root node. So we should be good to process next kid.
	curr_node.process_next_kid = true;

	//Also create a <div> element and attach it to main body.
	//This will be used to indicate that the current child has been
	//processed upto its leaf node.
	//Current level(which will be 0) and since this node is root, child number = 0;
	var dummy_tab_id = sprintf('child-processing-complete-%s-%s-%s', my_slave_tab.tabid, level, "0");
	var dummy_div_str = sprintf('<div id="%s"></div>', dummy_tab_id);
	var dummy_div = $(dummy_div_str);
	$('body').append(dummy_div);
	curr_node.child_processing_div = dummy_div;

	console.log("Here here: TRAVERSE_AND_FILL(), curr_node: " + curr_node.name + ", PROCEEDING (ROOT)");
	process_action(curr_node, $(curr_node.xml_node).children('action'), 
		       site_pi_fields, my_slave_tab, level);
    }
    else {
	//We are not root node.
	var dummy_tab_id = sprintf('child-processing-complete-%s-%s-%s',  my_slave_tab.tabid, 
				   level, curr_node.sibling_num);
	var dummy_div_str = sprintf('<div id="%s"></div>', dummy_tab_id);
	var dummy_div = $(dummy_div_str);
	$($(curr_node.parent.child_processing_div)).append(dummy_div);
	curr_node.child_processing_div = dummy_div;

	if (curr_node.parent.process_next_kid == true) {
	    curr_node.parent.process_next_kid = false;
	    curr_node.process_next_kid = true;
	    console.log("Here here: TRAVERSE_AND_FILL(), curr_node: " + curr_node.name + ", PROCEEDING");
	    process_action(curr_node, $(curr_node.xml_node).children('action'), 
			   site_pi_fields, my_slave_tab, level);
	}
	else {
	    curr_node.process_next_kid = false;
	    console.log("Here here: TRAVERSE_AND_FILL(), curr_node: " + curr_node.name + ", SLEEPING");
	    wait_on_sibling_processing_to_finish(curr_node, site_pi_fields, my_slave_tab, level);
	}
    }
}

function process_kids(curr_node, site_pi_fields, my_slave_tab, level) {
    for(var i = 0; i < curr_node.children.length; i++) {
	traverse_and_fill(curr_node.children[i], site_pi_fields, my_slave_tab, level+1);
    }
}

function send_cmd_to_tab(action_type, curr_node, site_pi_fields, fetch_url, my_slave_tab, level) {
    //Send message to my dedicated tab slave to fetch the url for me and
    //send back the HTML document.
    if (action_type == "fetch-url") {
	chrome.tabs.sendMessage(my_slave_tab.tabid, {
	    type: "goto-url", 
	    url: fetch_url
	}); 
	template_processing_tabs[my_slave_tab.tabid] = fetch_url;
    }
    else if (action_type == "simulate-click") {
	console.log("Here here: In SIMULATE-CLICK, selector: " + curr_node.css_selector 
		    + ", filter: " + curr_node.css_filter);
	
	// Send first child node action as well to detect the change in the web page.
	var child_node_action = $(curr_node.children[0].xml_node).children('action');
	var child_node_action_css = $.trim($(child_node_action).text());

	chrome.tabs.sendMessage(my_slave_tab.tabid, {
	    type: "simulate-click", 
	    css_selector : curr_node.css_selector,
	    css_filter : curr_node.css_filter,
	    detect_change_css : child_node_action_css
	});

	template_processing_tabs[my_slave_tab.tabid] = "dummy-url";
    }
    else {
	print_appu_error("Appu Error: Unknow action for slave tab: " + action_type);
    }

    // console.log("Here here: ZZZ tabid: " + my_slave_tab.tabid + ", value: " + 
    // 		template_processing_tabs[my_slave_tab.tabid]);


    //Now the tricky part. We want to know that the tab we just sent message to
    //has the document ready. For this, wait on a custom event on a dummy <div>.
    var dummy_tab_id = sprintf('tab-%s', my_slave_tab.tabid);
    
    $('#' + dummy_tab_id).on("page-is-loaded", function() {
	console.log("Here here: Requesting for page-html");
	$('#' + dummy_tab_id).off("page-is-loaded");
	chrome.tabs.sendMessage(my_slave_tab.tabid, {
	    type: "get-html"
	}, function process_fetched_html(html_data) {
	    my_slave_tab.in_use = false;
	    
	    $('#wait-queue-tab-' + my_slave_tab.tabid).trigger("waiting_queue");
	    var fp = document.implementation.createHTMLDocument("fp");
	    
	    fp.documentElement.innerHTML = html_data;
	    curr_node.fp = fp;

	    process_kids(curr_node, site_pi_fields, my_slave_tab, level);
	}); 
    });
}

//Simulate a waiting queue. When someone calls to fetch url and if their slave tab is busy 
//fetching another url, then put that node on waiting queue.
//Waiting on the slave tab occurs in a situation where parent-node's link has been fetched
//and all children now want to fetch their links.
function make_slavetab_do_work(action_type, curr_node, site_pi_fields, fetch_url, my_slave_tab, level) {
    if (!('gatekeeper_initialized' in my_slave_tab)) {
	my_slave_tab.gatekeeper_initialized = true;
	my_slave_tab.wait_queue = [];
	var event_name = "waiting_queue";
	var wait_dummy_tab_id = sprintf('wait-queue-tab-%s', my_slave_tab.tabid);
	$('#' + wait_dummy_tab_id).on(event_name, function() {
	    console.log("Here here: woken up from SLAVE-TAB waiting queue");
	    if (my_slave_tab.in_use == true) {
		console.log("Here here: Woken up from wait queue but tab is in use");
	    }
	    else {
		if (my_slave_tab.wait_queue.length > 0) {
		    var t = my_slave_tab.wait_queue.pop();
		    my_slave_tab.in_use = true;
		    send_cmd_to_tab(t.action_type, t.curr_node, t.site_pi_fields, 
				       t.fetch_url, my_slave_tab, t.level);
		}
	    }
	});
    }

    if (my_slave_tab.in_use == true) {
	var t = {
	    'action_type' : action_type,
	    'curr_node' : curr_node,
	    'site_pi_fields' : site_pi_fields,
	    'fetch_url' : fetch_url,
	    'level' : level
	};
	my_slave_tab.wait_queue.push(t);
    }
    else {
	my_slave_tab.in_use = true;
	send_cmd_to_tab(action_type, curr_node, site_pi_fields, fetch_url, my_slave_tab, level);
    }
}

function process_action(curr_node, action, site_pi_fields, my_slave_tab, level) {
    //console.log("Here here, Name: " + curr_node.name + ", action: " + $(action).attr('type'));

    if ($(action).attr('type') == 'fetch-url') {
	var fetch_url = $.trim($(action).text());
	//console.log('Here here: Fetching :' + fetch_url);
	make_slavetab_do_work("fetch-url", curr_node, site_pi_fields, fetch_url, my_slave_tab, level);
    }
    else if ($(action).attr('type') == 'fetch-href') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var fetch_url = $.trim($(css_selector, pfp).attr('href'));
	console.log("Here here: Got fetch-href: " + fetch_url);
	make_slavetab_do_work("fetch-url", curr_node, site_pi_fields, fetch_url, my_slave_tab, level);
    }
    else if ($(action).attr('type') == 'simulate-click') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var css_filter = $.trim($(action).attr('filter'));
	curr_node.css_selector = css_selector;
	curr_node.css_filter = css_filter;
	make_slavetab_do_work('simulate-click', curr_node, site_pi_fields, undefined, my_slave_tab, level);
    }
    else if ($(action).attr('type') == 'fetch-dom-element') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var css_filter = $.trim($(action).attr('filter'));

	curr_node.fp = apply_css_filter(apply_css_selector(pfp, css_selector), css_filter);
	process_kids(curr_node, site_pi_fields, my_slave_tab, level)
    }
    else if ($(action).attr('type') == 'store') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var store_data = [];
	var element;
	var css_filter = $.trim($(action).attr('filter'));
	
	var result = [];

 	var is_editable = $(action).attr('field_type');
 	if (is_editable != undefined) {
 		is_editable = (is_editable == 'editable') ? true : false;
 	} else{
 		is_editable = false;
 	}

	console.log("Here here: In store");

	if (curr_node.parent.type && 
	    curr_node.parent.type == 'vector') {
	    $.each(pfp, function(index, e) {
		r = apply_css_filter(apply_css_selector(e, css_selector), css_filter);
		result.push(r);
	    });
	}
	else {
	    r = apply_css_filter(apply_css_selector(pfp, css_selector), css_filter);
	    result.push(r);
	}

	for(var i = 0; i < result.length; i++) {
	    var field_value = "";
 	    if(is_editable){
		field_value = $.trim($(result[i]).val());
 	    } 
	    else {
		field_value = $.trim($(result[i]).text());
 	    }

	    if (field_value != "") {
		store_data.push(field_value);
	    }
	}

	if (store_data.length > 0) {
	    console.log('Here here: Storing data :' + JSON.stringify(store_data));
	    curr_node.result = store_data;
	    
	    site_pi_fields[curr_node.name].value = site_pi_fields[curr_node.name].value.concat(store_data);
	    site_pi_fields[curr_node.name].filled = true;
	    site_pi_fields[curr_node.name].processed = true;
	}

	inform_parent(curr_node);
    }
    else if ($(action).attr('type') == 'combine-n-store') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var store_data = [];
	var element;
	var css_filter = $.trim($(action).attr('filter'));
	
	var result = [];

 	var is_editable = $(action).attr('field_type');
 	if (is_editable != undefined) {
 		is_editable = (is_editable == 'editable') ? true : false;
 	} else{
 		is_editable = false;
 	}

	if (curr_node.parent.type && 
	    curr_node.parent.type == 'vector') {
	    $.each(pfp, function(index, e) {
		r = apply_css_filter(apply_css_selector(e, css_selector), css_filter);
		result.push(r);
	    });
	}
	else {
	    r = apply_css_filter(apply_css_selector(pfp, css_selector), css_filter);
	    result.push(r);
	}

	for(var i = 0; i < result.length; i++) {
	    var combined_value = "";

	    if ($(result[i]).length > 1) {
		$.each(result[i], function(index, value) { 
		    var field_value = "";
 		    if(is_editable){
			field_value = $.trim($(value).val());
 		    } 
		    else {
			field_value = $.trim($(value).text());
 		    }

		    if (field_value != "") {
			combined_value += field_value + ", " 
		    }
		});
		
		if (combined_value.length >= 2 && 
		    (combined_value.substring(combined_value.length - 2) == ", ")) {
		    combined_value = combined_value.substring(0, combined_value.length - 2);
		}
	    }
	    else {
		var field_value = "";
 		if(is_editable) {
		    field_value = $.trim($(result[i]).val());
 		} 
		else {
		    field_value = $.trim($(result[i]).text());
 		}

		if (field_value != "") {
		    combined_value = field_value;
		}
	    }

	    if (combined_value != "") {
		store_data.push(combined_value);
	    }
	}

	if (store_data.length > 0) {
	    console.log('Here here: Storing data :' + JSON.stringify(store_data));
	    curr_node.result = store_data;
	    
	    site_pi_fields[curr_node.name].value = site_pi_fields[curr_node.name].value.concat(store_data);
	    site_pi_fields[curr_node.name].filled = true;
	    site_pi_fields[curr_node.name].processed = true;
	}

	inform_parent(curr_node);
    }
    else {
	print_appu_error("Appu Error: Unknow action in FPI template: " + $(action).attr('type'));
    }
}

function are_all_kids_processed(node) {
    var all_processed = true;
    for(var i = 0; i < node.children.length; i++) {
	if (node.children[i].completely_processed == false) {
	    all_processed = false;
	    break;
	}
    }
    return all_processed;
}

function fpi_processing_complete(tabid, site_pi_fields, domain, shut_timer) {
    var main_tab = sprintf("#tab-%s", tabid);
    var wait_queue_tab = sprintf("#wait-queue-tab-%s", tabid);
    var child_processing_tab = sprintf("#child-processing-complete-%s-0-0", tabid);
    var successfully_processed = true;
	
    for(var pi_name in site_pi_fields) {
	if (!site_pi_fields[pi_name].can_be_a_null) {
	    if (site_pi_fields[pi_name].value.length == 0) {
		print_appu_error("Appu Error: FPI failed due to PI: " + pi_name + ", domain: " + domain);
		successfully_processed = false;
		break;
	    }
	}
    }
    
    if (successfully_processed) {
	console.log("Here here: SUCCESSFUL:: Identified all kids: " + 
		    JSON.stringify(site_pi_fields));

	store_per_site_pi_data(domain, site_pi_fields);
    }
    else {
	print_appu_error("Appu Error: Could not process FPI template for: " + domain);
    }
    
    if (shut_timer != undefined) {
	window.clearTimeout(shut_timer);
    }

    $(main_tab).remove();
    $(wait_queue_tab).remove();
    $(child_processing_tab).remove();
    delete template_processing_tabs[tabid];
    chrome.tabs.remove(tabid);
}

function inform_parent(leaf_node) {
    leaf_node.completely_processed = true;
    var curr_node = leaf_node;
    var all_processed = true;
    console.log("Here here: INFORM_PARENT(), setting done for: " + curr_node.name);
    while(all_processed && curr_node.parent != null) {
	all_processed = are_all_kids_processed(curr_node.parent);
	if (all_processed) {
	    curr_node.parent.completely_processed = true;
	    curr_node = curr_node.parent;
	}
    }

    console.log("Here here: INFORM_PARENT(), all_siblings_processed: " + all_processed + ", parent null?: " + 
		(curr_node.parent == null));

    if (all_processed && (curr_node.parent == null)) {
	//Satisfying above condition means that all nodes in FPI are processed and
	//curr node is ROOT.
	//So it will have all the attributes set at the beginning of process_template()
	console.log("Here here: ROOT node is processed, time to close tab");
	fpi_processing_complete(curr_node.my_slave_tab.tabid,  curr_node.site_pi_fields, 
				curr_node.domain, curr_node.shut_timer);
    }
    else {
	//All of my subtree is processed...give a chance to sibling subtrees.
	curr_node.parent.process_next_kid = true;
	console.log("Here here: INFORM_PARENT(), triggering sibling-is-done for: " + 
		    $(curr_node.parent.child_processing_div).attr('id') + ", my-name: " + curr_node.name);

	$('#' + $(curr_node.parent.child_processing_div).attr('id')).trigger("sibling-is-done");
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

function process_template(domain, data, my_slave_tab) {
    var fd = $.parseXML(data);
    var template_tree = {};
    var site_pi_fields = {};

    //Hard timeout..
    //Stop processing after 300 seconds.
    var shut_tab_forcefully = window.setTimeout(function() {
    	console.log("Here Here: In forceful shutdown for FPI of domain: " + domain);
	fpi_processing_complete(template_tree.my_slave_tab.tabid,  template_tree.site_pi_fields, 
				template_tree.domain, undefined);
    }, 300 * 1000);

    template_tree.shut_timer = shut_tab_forcefully;
    template_tree.parent = null;
    template_tree.name = 'root';
    template_tree.completely_processed = false;
    template_tree.domain = domain;
    template_tree.site_pi_fields = site_pi_fields;

    template_tree.my_slave_tab = my_slave_tab;

    level = 0;
    console.log("Here here: PROCESS_TEMPLATE called");
    traverse_template_create_tree($(fd).children(), template_tree, site_pi_fields);

    traverse_and_fill(template_tree, site_pi_fields, my_slave_tab, level);
}

/// Template processing code END

function start_pi_download_process(domain, data) {
    var process_template_tabid = undefined;
    //Just some link so that appu content script runs on it.
    var default_url = 'http://google.com';
    
    //Create a new tab. Once its ready, send message to process the template.
    chrome.tabs.create({ url: default_url, active: false }, function(tab) {
	process_template_tabid = tab.id;
	var my_slave_tab = { tabid: process_template_tabid, 'in_use': true}
	template_processing_tabs[process_template_tabid] = default_url;
	//console.log("Here here: XXX tabid: " + tab.id + ", value: " + 
	// template_processing_tabs[tab.id]);
	
	//Dummy element to wait for HTML fetch
	var dummy_tab_id = sprintf('tab-%s', process_template_tabid);
	var dummy_div_str = sprintf('<div id="%s"></div>', dummy_tab_id);
	var dummy_div = $(dummy_div_str);
	$('body').append(dummy_div);
	
	//Dummy element to wait for SLAVE tab to become free.
	var wait_dummy_tab_id = sprintf('wait-queue-tab-%s', process_template_tabid);
	var wait_dummy_div_str = sprintf('<div id="%s"></div>', wait_dummy_tab_id);
	var wait_dummy_div = $(wait_dummy_div_str);
	$('body').append(wait_dummy_div);
	
	$('#' + dummy_tab_id).on("page-is-loaded", function() {
	    my_slave_tab.in_use = false;
	    $('#' + dummy_tab_id).off("page-is-loaded");
	    process_template(domain, data, my_slave_tab);    
	});
    });
}

function check_if_pi_fetch_required(domain, sender_tab_id) {
    if (!(domain in pii_vault.aggregate_data.per_site_pi)) {
	pii_vault.aggregate_data.per_site_pi[domain] = {};
	flush_selective_entries("aggregate_data", ["per_site_pi"]);
    }

    var curr_time = new Date();
    
    if ('download_time' in pii_vault.aggregate_data.per_site_pi[domain]) {
	var last_update = new Date(pii_vault.aggregate_data.per_site_pi[domain].download_time);
	var td = curr_time.getTime() - last_update.getTime();
	if (td < (60 * 60 * 24 * 10 * 1000)) {
	    //This means that the PI was downloaded just 10 days ago.
	    //No need to download it just yet.
	    console.log("Here here: Recently updated the PI, no need to update it for: " + domain);
	    return;
	}
    }
    
    //Following is a throttle on download attempts in a single day.
    if ('attempted_download_time' in pii_vault.aggregate_data.per_site_pi[domain]) {
	var last_download_attempt = new Date(pii_vault.aggregate_data.per_site_pi[domain]
					     .attempted_download_time);
	var td = curr_time.getTime() - last_download_attempt.getTime();
	//Check if its been 1 day since last download attempt
	if (td < (60 * 60 * 24 * 1 * 1000)) {
	    console.log("Here here: Not attempting PI download. Just did so in last 24-hours: " + domain);
	    return;
	}
    }

    if ('user_approved' in pii_vault.aggregate_data.per_site_pi[domain]) {
	if (pii_vault.aggregate_data.per_site_pi[domain].user_approved == 'never') {
	    //Why go through all the pain of downloading FPI?
	    return;
	}
    }
    
    wr = {};
    wr.command = 'get_template';
    wr.domain = domain;

    try {
	$.post("http://appu.gtnoise.net:5005/get_template", JSON.stringify(wr), function(data) {
	    pii_vault.aggregate_data.per_site_pi[domain].attempted_download_time = new Date();
	    flush_selective_entries("aggregate_data", ["per_site_pi"]);
	    
	    if (data.toString() != 'No template present') {
		console.log("Here here: Got the template for: " + domain);
		// We are here that means template is present.
		// Attempt to fetch the PI if user has already approved it.
		if ('user_approved' in pii_vault.aggregate_data.per_site_pi[domain]) {
		    if (pii_vault.aggregate_data.per_site_pi[domain].user_approved == 'always') {
			//We are here, that means user has given PI download approval for this site
			start_pi_download_process(domain, data);
			return;
		    }
		    else if (pii_vault.aggregate_data.per_site_pi[domain].user_approved == 'never') {
			console.log("Here here: User has already set NEVER for PI on this domain: " + domain);
			return;
			}
		}

		//We are here, that means that we have to seek permission from user to download PI for
		//this site.
		chrome.tabs.sendMessage(sender_tab_id, {
		    'type' : "get-permission-to-fetch-pi",
		    'site' : domain,
		}, function(response) {
		    if (response.fetch_pi_permission == "always") {
			pii_vault.aggregate_data.per_site_pi[domain].user_approved = 'always';
			flush_selective_entries("aggregate_data", ["per_site_pi"]);
			start_pi_download_process(domain, data);
		    }
		    else if (response.fetch_pi_permission == "just-this-time") {
			pii_vault.aggregate_data.per_site_pi[domain].user_approved = 'seek-permission';
			flush_selective_entries("aggregate_data", ["per_site_pi"]);
			start_pi_download_process(domain, data);
		    }
		    else if (response.fetch_pi_permission == "never") {
			pii_vault.aggregate_data.per_site_pi[domain].user_approved = 'never';
			flush_selective_entries("aggregate_data", ["per_site_pi"]);
			console.log("Here here: User set NEVER for PI on this domain: " + domain);
		    }
		});
	    }
	    else {
		print_appu_error("Appu Error: FPI Template for domain(" + domain 
				 + ") is not present on the server");
	    }
	})
	.error(function(domain) {
		return function(data, status) {
		    print_appu_error("Appu Error: Service down, attempted to fetch template: " 
				     + domain + ", " + status.toString() + " @ " + (new Date()));
		   console.log("Here here: Service down, attempted to fetch:" + domain);
		}
	    } (domain));
    }
    catch (e) {
	console.log("Error: while fetching template(" + domain + ") from server");
    }
    
    return;
}

function get_all_pi_data() {
    var r = {};
    for (var site in pii_vault.aggregate_data.per_site_pi) {
	for(var field in pii_vault.aggregate_data.per_site_pi[site]) {
	    if (field == 'download_time' ||
		field == 'attempted_download_time' ||
		field == 'user_approved') {
		continue;
	    }
	    var values = pii_vault.aggregate_data.per_site_pi[site][field].values;
	    if (!(field in r)) {
		r[field] = {};
	    }
	    for (var v = 0; v < values.length; v++) {
		if (!(values[v] in r[field])) {
		    r[field][values[v]] = "";
		}
		r[field][values[v]] += site + ", ";  
	    }
	}
    }
    return r;
}

//Per site PI downloaded (aggregate_data)
//Key: site name
//Values: time downloaded
// field_name --> field value
// {
//   'domain_name' : {
//                     'download_time' : 'xyz',
//                     'field_name_1' : {
//                                       'values' : [val1, val2, val3],
//                                       'change_type' : 'modified'/'added'/'deleted'/'no-change'
//                                    }
//                     'attempted_download_time' : 'xyz',
//                     'user_approved' : 'always/seek-permission/never' 
//                   }
// }
function store_per_site_pi_data(domain, site_pi_fields) {
    domain = tld.getDomain(domain);
    var downloaded_fields = [];
    var old_pi_values = (domain in pii_vault.aggregate_data.per_site_pi) ? 
	pii_vault.aggregate_data.per_site_pi[domain] : {};

    //Make it blank first.
    pii_vault.aggregate_data.per_site_pi[domain] = {};

    pii_vault.aggregate_data.per_site_pi[domain]['attempted_download_time'] = 
	old_pi_values['attempted_download_time'];
    pii_vault.aggregate_data.per_site_pi[domain]['user_approved'] =
	old_pi_values['user_approved'];

    var curr_site_pi = pii_vault.aggregate_data.per_site_pi[domain];

    for (var field in site_pi_fields) {
	if (site_pi_fields[field].value.length > 0) {
	    add_field_to_per_site_pi(domain, field, site_pi_fields[field].value);
	    if (field in old_pi_values) {
		if (curr_site_pi[field].values.sort().join(", ") == 
		    old_pi_values[field].values.sort().join(", ")) {
	    	    curr_site_pi[field].change_type = 'no-change';
		}
		else {
	    	    curr_site_pi[field].change_type = 'modified';
		}
	    }
	    else {
		curr_site_pi[field].change_type = 'added';
	    }
	}
    }

    curr_site_pi.download_time = new Date();

    for (var pi in old_pi_values) {
	if (!(pi in curr_site_pi) && (old_pi_values[pi].change_type != 'deleted')) {
	    curr_site_pi[pi] = { 
		'values' : undefined, 
		'change_type': 'deleted'
	    };
	}
    }

    console.log("Here here: Current site pi: " + JSON.stringify(pii_vault.aggregate_data.per_site_pi[domain]));
    flush_selective_entries("aggregate_data", ["per_site_pi"]);

    for (field in curr_site_pi) {
	if (field == 'download_time' ||
	    field == 'attempted_download_time' ||
	    field == 'user_approved') {
	    continue;
	}

	var t = { 
	    'field': field, 
	    'change_type': curr_site_pi[field].change_type
	}
	if (curr_site_pi[field].values == undefined) {
	    t.num_values = 0;
	}
	else {
	    t.num_values = curr_site_pi[field].values.length;
	}
	downloaded_fields.push(t);
    }

    //Update current report
    pii_vault.current_report.downloaded_pi[domain] = {
	'download_time' : curr_site_pi.download_time,
	'downloaded_fields' : downloaded_fields,
    };
    
    //Aggregate by values on sites
    calculate_common_fields();
    flush_selective_entries("current_report", ["downloaded_pi"]);

    for (var i = 0; i < report_tab_ids.length; i++) {
	chrome.tabs.sendMessage(report_tab_ids[i], {
	    type: "report-table-change-row",
	    table_name: "downloaded_pi",
	    mod_type: "replace",
	    changed_row: [
		domain,
		curr_site_pi.download_time,
		downloaded_fields.join(", "),
	    ],
	});
    }
}

//This is supposed to consolidate common fields w/o revealing them.
//It takes care of multiple field values. For eg. if name on 3 sites is Joe
//and 2 others is John, it will create
//name1: ["site1", "site2", "site3"]
//name2: ["site4", "site5"]
function calculate_common_fields() {
    var r = get_all_pi_data();
    var common_fields = {};
    for (f in r) {
	for (v in r[f]) {
	    var value_identifier = undefined;
	    if (v in pii_vault.aggregate_data.pi_field_value_identifiers) {
		value_identifier = pii_vault.aggregate_data.pi_field_value_identifiers[v];
	    }
	    else {
		var j = 1;
		//Just to check that this identifier does not already exist.
		while(1) {
		    value_identifier = f + j;
		    if (!(value_identifier in pii_vault.aggregate_data.pi_field_value_identifiers)) {
			break;
		    }
		    j++;
		}
		pii_vault.aggregate_data.pi_field_value_identifiers[value_identifier] = v;
	    }
	    common_fields[value_identifier] = r[f][v].substring(0, r[f][v].length - 2 ).split(",");
	}
    }
 
    pii_vault.current_report.common_fields = common_fields;
    flush_selective_entries("current_report", ["common_fields"]);
    flush_selective_entries("aggregate_data", ["pi_field_value_identifiers"]);
}

function sanitize_phone(phones) {
    var ph_regex = /\(([0-9]{3})\) ([0-9]{3})-([0-9]{4})/;

    for (var i = 0; i < phones.length; i++) {
	if (ph_regex.exec(phones[i]) != null) {
	    phones[i] = phones[i].replace(ph_regex, "$1-$2-$3");
	}
    }
}

function sanitize_ccn(ccns) {
    var ccn_regex = /\*\*\*\*\*\*\*\*\*\*\*\*([0-9]{4})/;

    for (var i = 0; i < ccns.length; i++) {
	if (ccn_regex.exec(ccns[i]) != null) {
	    ccns[i] = ccns[i].replace(ccn_regex, "XXXX-XXXX-XXXX-$1");
	}
    }
}

function add_field_to_per_site_pi(domain, pi_name, pi_value) {
    pi_name = pi_name.toLowerCase();

    console.log("Here here: adding to per_site_pi, domain: " + domain + ", name:" + pi_name + ", value:" 
		+ pi_value);

    if (pi_name == "phone") {
	sanitize_phone(pi_value);
    }
    if (pi_name == "ccn") {
	sanitize_ccn(pi_value);
    }

    //Nullify the previously existing value in case of
    //refetch after 'X' number of days.
    pii_vault.aggregate_data.per_site_pi[domain][pi_name] = {};
    pii_vault.aggregate_data.per_site_pi[domain][pi_name].values = [];

    var domain_pi = pii_vault.aggregate_data.per_site_pi[domain];
    //pi_value could be an array in case of a vector
    var new_arr = domain_pi[pi_name].values.concat(pi_value);

    //eliminate duplicates.
    //e.g. over time, if we fetch pi from same site,
    //(for additions like addresses/ccns) then 
    //remove duplicates.
    unique_new_arr = new_arr.filter(function(elem, pos) {
	return new_arr.indexOf(elem) == pos;
    })

    console.log("Here here: Adding this data: " + unique_new_arr);
    domain_pi[pi_name].values = unique_new_arr;
    
    //delete empty entries.
    // if(domain_pi[pi_name].values.length == 0) {
    // 	delete domain_pi[pi_name].values;
    // } 
}

function open_reports_tab() {
    var report_url = chrome.extension.getURL('report.html');
    chrome.tabs.create({ url: report_url });
    close_report_reminder_message();
}

function close_report_reminder_message() {
    chrome.tabs.query({}, function(all_tabs) {
	for(var i = 0; i < all_tabs.length; i++) {
	    chrome.tabs.sendMessage(all_tabs[i].id, {type: "close-report-reminder"});
	}
    });
}

function report_reminder_later(message) {
    var curr_time = new Date();
    curr_time.setMinutes(curr_time.getMinutes() + report_reminder_interval);

    pii_vault.config.report_reminder_time = curr_time.toString();
    flush_selective_entries("config", ["report_reminder_time"]);
    pii_vault.current_report.send_report_postponed += 1;
    flush_selective_entries("current_report", ["send_report_postponed"]);

    console.log(sprintf("[%s]: Report Reminder time postponed for: %dm", new Date(), report_reminder_interval));

    chrome.tabs.query({}, function(all_tabs) {
	for(var i = 0; i < all_tabs.length; i++) {
	    chrome.tabs.sendMessage(all_tabs[i].id, {type: "close-report-reminder"});
	}
    });
}

function check_report_time() {
    var curr_time = new Date();
    var is_report_different = true;

    //Find out if any entries from current report differ from past reports
    if (pii_vault.options.report_setting == "differential") {
	if(curr_time.getTime() > (new Date(pii_vault.current_report.scheduled_report_time)).getTime()) {

	    // for (var i = 0; i < pii_vault.report.length; i++) {
	    // 	var rc = pii_check_if_entry_exists_in_past_pwd_reports(pii_vault.report[i]);
	    // 	if (rc == false) {
	    // 	    is_report_different = true;
	    // 	    break;
	    // 	}
	    // }

	    if (!is_report_different) {
		for (var i = 0; i < pii_vault.master_profile_list.length; i++) {
		    var rc = pii_check_if_entry_exists_in_past_profile_list(pii_vault.master_profile_list[i]);
		    if (rc == false) {
			is_report_different = true;
			break;
		    }
		}
	    }
	}
    }

    //Make all the following checks only if reporting type is "manual"
    if (pii_vault.options.report_setting == "manual" || 
	(pii_vault.options.report_setting == "differential" && is_report_different)) {
	if (pii_vault.config.report_reminder_time == -1) {
	    //Don't want to annoy user with reporting dialog if we are disabled OR
	    //if user already has a review report window open (presumably working on it).
	    if (pii_vault.config.status == "active" && is_report_tab_open == 0) {
		if(curr_time.getTime() > (new Date(pii_vault.current_report.scheduled_report_time)).getTime()) {
		    //Send message to all the tabs that report is ready for review and sending
		    chrome.tabs.query({}, function(all_tabs) {
			for(var i = 0; i < all_tabs.length; i++) {
			    chrome.tabs.sendMessage(all_tabs[i].id, {type: "report-reminder"});
			}
		    });
		}
	    }
	}
	else if (curr_time.getTime() > (new Date(pii_vault.config.report_reminder_time)).getTime()) {
	    console.log(sprintf("[%s]: Enabling Report Reminder", new Date()));
	    pii_vault.config.report_reminder_time = -1;
	    flush_selective_entries("config", ["report_reminder_time"]);
	}
    }
    else if (pii_vault.options.report_setting == "auto" || 
	     (pii_vault.options.report_setting == "differential" && !is_report_different)) {
	if(curr_time.getTime() > (new Date(pii_vault.current_report.scheduled_report_time)).getTime()) {
	    //'1' for current report
	    schedule_report_for_sending(1);
	}
    }
}

// current_report.input_fields = [
// 	[1, new Date(1354966002000), 'www.abc.com', 'test', 'button', 0],

function pii_log_user_input_type(message) {
    var total_entries = pii_vault.current_report.input_fields.length;
    var last_index =  total_entries ? pii_vault.current_report.input_fields[total_entries - 1][0] : 0; 
    var domain_input_elements = [
	last_index + 1,
	new Date(), 
	tld.getDomain(message.domain), 
	message.attr_list.name,
	message.attr_list.type,
	message.attr_list.length,
    ];
    console.log("Appu Info: Appending to input_fields list: " + JSON.stringify(domain_input_elements));
    pii_vault.current_report.input_fields.push(domain_input_elements);
    flush_selective_entries("current_report", ["input_fields"]);

    for (var i = 0; i < report_tab_ids.length; i++) {
	chrome.tabs.sendMessage(report_tab_ids[i], {
	    type: "report-table-change-row",
	    table_name: "input_fields",
	    mod_type: "add",
	    changed_row: domain_input_elements,
	});
    }
}

function pii_add_dontbug_list(message) {
    var domain = tld.getDomain(message.domain);
    var r = {};
    if(pii_vault.options.dontbuglist.indexOf(domain) == -1) {
	pii_vault.options.dontbuglist.push(domain);
	vault_write("options:dontbuglist", pii_vault.options.dontbuglist);
	r.new_entry = domain;
	pii_vault.current_report.dontbuglist.push(domain);
	flush_selective_entries("current_report", ["dontbuglist"]);
    }
    else {
	r.new_entry = null;
    }

    console.log("New dontbugme list: " + pii_vault.options.dontbuglist);
    return r;
}

function pii_add_blacklisted_sites(message) {
    var dnt_site = message.dnt_site;
    var r = {};
    if (pii_vault.options.blacklist.indexOf(dnt_site) == -1) {
	pii_vault.options.blacklist.push(dnt_site);
	r.new_entry = dnt_site;
    }
    else {
	r.new_entry = null;
    }
    console.log("New blacklist: " + pii_vault.options.blacklist);
    vault_write("options:blacklist", pii_vault.options.blacklist);
    return r;
}

function pii_check_blacklisted_sites(message) {
    var r = {};
    r.blacklisted = "no";
    //console.log("Checking blacklist for site: " + message.domain);
    for (var i = 0; i < pii_vault.options.blacklist.length; i++) {
	var protocol_matched = "yes";
	var port_matched = "yes";
	var bl_url = pii_vault.options.blacklist[i];
	//Split URLs, simplifying assumption that protocol is only HTTP.
	var url_parts = bl_url.split('/');
	var bl_hostname = "";
	var bl_protocol = "";
	var bl_port = "";

	bl_hostname = ((url_parts[0].toLowerCase() == 'http:' || 
			url_parts[0].toLowerCase() == 'https:')) ? url_parts[2] : url_parts[0];
	bl_protocol = ((url_parts[0].toLowerCase() == 'http:' || 
			url_parts[0].toLowerCase() == 'https:')) ? url_parts[0].toLowerCase() : undefined;
	bl_port = (bl_hostname.split(':')[1] == undefined) ? undefined : bl_hostname.split(':')[1];

	var curr_url_parts = message.domain.split('/');
	var curr_hostname = "";
	var curr_protocol = "";
	var curr_port = "";

	curr_hostname = ((curr_url_parts[0].toLowerCase() == 'http:' || 
			  curr_url_parts[0].toLowerCase() == 'https:')) ? curr_url_parts[2] : curr_url_parts[0];
	curr_protocol = ((curr_url_parts[0].toLowerCase() == 'http:' || 
			  curr_url_parts[0].toLowerCase() == 'https:')) ? curr_url_parts[0].toLowerCase() : '';

	curr_port = (curr_hostname.split(':')[1] == undefined) ? '' : curr_hostname.split(':')[1];

	rev_bl_hostname = bl_hostname.split("").reverse().join("");
	rev_curr_hostname = curr_hostname.split("").reverse().join("");

	if (bl_protocol && (curr_protocol != bl_protocol)) {
	    protocol_matched = "no";
	} 

	if (bl_port && (curr_port != bl_port)) {
	    port_matched = "no";
	} 

	//First part of IF checks if the current URL under check is a 
	//subdomain of blacklist domain.
	if ((rev_curr_hostname.indexOf(rev_bl_hostname) == 0) && 
	    protocol_matched == "yes" && port_matched == "yes") {
	    r.blacklisted = "yes";
	    console.log("Site is blacklisted: " + message.domain);
	    break;
	}
    }
    return r;
}

//Function to see if Appu server is up
//Also tells the server that this appu installation is still running
function pii_check_if_stats_server_up() {
    var stats_server_url = "http://192.168.56.101:59000/"
    try {
	var wr = {};
	wr.guid = (sign_in_status == 'signed-in') ? pii_vault.guid : '';
	wr.version = pii_vault.config.current_version;
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

function schedule_report_for_sending(report_number) {
    //Store the approval timestamp in report.user_approved
    pii_vault.current_report.user_approved = new Date();
    flush_selective_entries("current_report", ["user_approved"]);
    pii_send_report(report_number);
}

function pii_send_report(report_number) {
    var report = undefined;
    if (report_number == 1) {
	report = pii_vault.current_report;
    }
    else {
	//Adjust by 2 as current_report's number is 1
	report = pii_vault.past_reports[report_number - 2];
    }
    var wr = {};
    wr.type = "periodic_report";

    //This is a temporary bug fix
    report.scheduled_report_time = new Date(report.scheduled_report_time);

    wr.current_report = report;

    try {
	$.post("http://192.168.56.101:59000/post_report", JSON.stringify(wr), 
	       function(report, report_number) {
		   return function(data, status) {
		       var is_processed = false;
		       stats_message = /Report processed successfully/;
		       is_processed = (stats_message.exec(data) != null);

		       if (is_processed) {
			   // Report successfully sent. Update the actual send time.
			   report.actual_report_send_time = new Date();
			   console.log("Appu Info: Report '" + report_number 
				       + "'  is successfully sent to the server at: " 
				       + report.actual_report_send_time);
			   vault_write("past_reports", pii_vault.past_reports);
			   if (report_number in delivery_attempts) {
			       delete delivery_attempts[report_number];
			   }
		       }
		   };
	       }(report, report_number))
	    .error(function(report, report_number) {
		       return function(data, status) {
			   print_appu_error("Appu Error: Error while posting 'periodic report' to the server: " 
					    + (new Date()));
			   report.send_attempts.push(new Date());
			   vault_write("past_reports", pii_vault.past_reports);
		       }
		   }(report, report_number));
    }
    catch (e) {
	print_appu_error("Appu Error: Error while posting 'periodic report' to the server: " + (new Date()));
	report.send_attempts(push(new Date()));
	vault_write("past_reports", pii_vault.past_reports);
    }

    if (report_number == 1) {
	pii_vault.current_report.report_updated = false;
	pii_vault.past_reports.unshift(pii_vault.current_report);
	if (pii_vault.past_reports.length > 10) {
	    pii_vault.past_reports.pop();
	}

	pii_vault.config.reportid += 1;
	pii_vault.config.next_reporting_time = pii_next_report_time();
	flush_selective_entries("config", ["reportid", "next_reporting_time"]);

	pii_vault.current_report = initialize_report();
	flush_current_report();
	vault_write("past_reports", pii_vault.past_reports);

	pii_vault.total_site_list = [];
	vault_write("total_site_list", pii_vault.total_site_list);

	console.log("Appu Info: Current report is added to past reports. " +
		    "New current report is created with reporting time: " 
		    + pii_vault.current_report.scheduled_report_time);
    }

    console.log("Appu Info: Report '" + report_number + "'  is scheduled for sending.");
}

function purge_report_entry(report_number, table_name, entry_key) {
    var report = undefined;
    var is_it_current_report = true;
    if (report_number == 1) {
	//This is current report
	report = pii_vault.current_report;
    }
    else {
	//Adjust index for past reports.
	//Report number 1 is current report.
	//So in the past reports, report number 2 is at index '0'
	report_number -= 2;
	report = pii_vault.past_reports[report_number];
	is_it_current_report = false;
    }

    if (report.actual_report_send_time == "Not delivered yet") {
	report.report_modified = "yes";
    }

    var report_table = report[table_name];
    if (report_table instanceof Array) {
	for(var i = 0; i < report_table.length; i++) {
	    if (report_table[i][0] == entry_key) {
		report_table.splice(i, 1);
		break;
	    }
	}
    }
    else {
	delete report_table[entry_key];
    }

    //Flush to disk
    if (is_it_current_report) {
	flush_selective_entries("current_report", ["report_modified", table_name]);
    }
    else {
	vault_write("past_reports", pii_vault.past_reports);
    }
}

function pii_delete_dnt_list_entry(message) {
    pii_vault.options.blacklist.splice(message.dnt_entry, 1);
    vault_write("options:blacklist", pii_vault.options.blacklist);
}

function pii_delete_dontbugme_list_entry(message) {
    pii_vault.options.dontbuglist.splice(message.dnt_entry, 1);
    vault_write("options:dontbuglist", pii_vault.options.dontbuglist);
}

function pii_get_differential_report(message) {
    var r = {};
    return r;
    //Need to fix this one.
    r.pwd_reuse_report = [];
    r.master_profile_list = [];
    r.scheduled_report_time = pii_vault.config.next_reporting_time;

    for (var i = 0; i < pii_vault.master_profile_list.length; i++) {
	var copied_entry = {};
	copied_entry.site_name = pii_vault.master_profile_list[i];

	if (!pii_check_if_entry_exists_in_past_profile_list(pii_vault.master_profile_list[i])) {
	    copied_entry.index = i;
	    r.master_profile_list.push(copied_entry);
	}
    }

    return r;
}

function pii_get_report_by_number(report_number) {
    var response_report = undefined;
    var original_report = undefined;
    if ( report_number == 1) {
	original_report = pii_vault.current_report;

    }
    else {
	original_report = pii_vault.past_reports[report_number - 2];
    }

    response_report = $.extend(true, {}, original_report);
    return [response_report, original_report];
}

function pii_get_blacklisted_sites(message) {
    var r = [];
    for (var i = 0; i < pii_vault.options.blacklist.length; i++) {
	r.push(pii_vault.options.blacklist[i]);
    }
    return r;
}

function pii_get_dontbugme_list(message) {
    var r = [];
    for (var i = 0; i < pii_vault.options.dontbuglist.length; i++) {
	r.push(pii_vault.options.dontbuglist[i]);
    }
    return r;
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
		chrome.tabs.sendMessage(all_tabs[i].id, {type: "status-enabled"});
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

function pii_check_pending_warning(message, sender) {
    var r = {};
    r.pending = "no";
    if( pending_warnings[sender.tab.id] != undefined) {
	r.warnings = pending_warnings[sender.tab.id];
	pending_warnings[sender.tab.id] = undefined;
	r.pending = "yes";
    }
    return r;
}

function pii_check_if_entry_exists_in_past_profile_list(curr_entry) {
    for(var i=0; i < pii_vault.past_reports.length; i++) {
	var past_master_profile_list = pii_vault.past_reports[i].master_profile_list;
	for(var j = 0; j < past_master_profile_list.length; j++) {
	    if (past_master_profile_list[j] == curr_entry) {
		return true;
	    }
	}
    }
    return false;
}

function pii_check_if_entry_exists_in_past_pwd_reports(curr_entry) {
    var ce = {};
    var ce_str = "";
    ce.site = curr_entry.site;
    ce.other_sites = curr_entry.other_sites;

    ce.other_sites.sort();
    ce_str = JSON.stringify(ce);

    for(var i=0; i < pii_vault.past_reports.length; i++) {
	var past_report = pii_vault.past_reports[i].pwd_reuse_report;
	for(var j = 0; j < past_report.length; j++) {
	    var past_report_entry = {};
	    var pre_str = "";
	    past_report_entry.site = past_report[j].site;
	    past_report_entry.other_sites = past_report[j].other_sites;
	    past_report_entry.other_sites.sort();
	    pre_str = JSON.stringify(past_report_entry);
	    if (pre_str == ce_str) {
		return true;
	    }
	}
    }
    return false;
}

//This function is supposed to generate group names such as 'A', 'B', .., 'AA', 'AB', 'AC' ..
function new_group_name(pwd_groups) {
    //Start at 'A'
    var init_group = 65;
    var new_name_detected = false;
    var new_name_arr = [];
    new_name_arr.push(init_group);

    while (!new_name_detected) {
	var char_new_name_arr = [];
	for (var i = 0; i < new_name_arr.length; i++) {
	    char_new_name_arr.push(String.fromCharCode(new_name_arr[i]));
	}
	var new_name = char_new_name_arr.reverse().join("");
	new_name_detected = !(('Grp ' + new_name) in pwd_groups);

	if (!new_name_detected) {
	    var array_adjusted = false;
	    while (!array_adjusted) {
		for (var j = 0; j < new_name_arr.length; j++) {
		    new_name_arr[j] += 1;
		    if (new_name_arr[j] <= 90) {
			array_adjusted = true;
			break;
		    }
		    else {
			new_name_arr[j] = 65;
		    }
		}
		if (!array_adjusted) {
		    new_name_arr.push(init_group);
		    array_adjusted = true;
		}
	    }//Adjust array infinite while
	}
	else {
	    return new_name;
	}
    }//Find new group name infinite while
}

function calculate_pwd_similarity(grp_name) {
    var pwd_similarity = pii_vault.current_report.pwd_similarity;
    var pwd_groups = pii_vault.current_report.pwd_groups;
    var total_grps = 0;
    for (g in pwd_similarity) {
	pwd_similarity[g].push(0);
	total_grps++;
    }
    pwd_similarity[grp_name] = [];
    for (var i = 0; i < (total_grps+1); i++) {
	pwd_similarity[grp_name].push(0);
    }
    flush_selective_entries("current_report", ["pwd_similarity"]);

    for (var i = 0; i < report_tab_ids.length; i++) {
	chrome.tabs.sendMessage(report_tab_ids[i], {
	    type: "report-table-change-table",
	    table_name: "pwd_similarity",
	    pwd_similarity: pii_vault.current_report.pwd_similarity,
	    pwd_groups: pii_vault.current_report.pwd_groups,
	});
    }
}

function send_pwd_group_row_to_reports(type, grp_name, sites, strength) {
    for (var i = 0; i < report_tab_ids.length; i++) {
	chrome.tabs.sendMessage(report_tab_ids[i], {
	    type: "report-table-change-row",
	    table_name: "pwd_groups",
	    mod_type: type,
	    changed_row: [
		grp_name,
		sites.sort().join(", "),
		strength.join(", "),
		strength.join(", "),
	    ],
	});
    }
}

function get_pwd_group(domain, other_domains, password_strength) {
    var pwd_groups = pii_vault.current_report.pwd_groups;
    var previous_group = false;
    var current_group = false;
    //First find if domain is already present in any of the groups
    for (g in pwd_groups) {
	if (pwd_groups[g].sites.indexOf(domain) != -1) {
	    previous_group = g;
	    break;
	}
    }

    if (previous_group != false) {
	var sites = other_domains.concat(domain);
	if (sites.sort().join(", ") == pwd_groups[previous_group].sites.sort().join(", ")) {
	    //This means that the site's group is same as earlier. We do not have to do
	    //anything.
	    current_group = previous_group;
	    if (password_strength.join(", ") != pwd_groups[previous_group].strength.join(", ")) {
		// Commenting this as last strength might have been calculated on incorrect password.
// 		print_appu_error("Appu Error: Strength mismatch from what was calculated earlier: " + 
// 				 domain, other_domains, password_strength, pwd_groups[previous_group].strength);
		pwd_groups[previous_group].strength = password_strength;
		send_pwd_group_row_to_reports('replace', current_group, pwd_groups[current_group].sites, 
					      pwd_groups[current_group].strength);
	    }
	}
	else {
	    //This means that the site's password was changed since it was accessed last time.

	    //First delete it from earlier group
	    pwd_groups[previous_group].sites.splice(pwd_groups[previous_group].sites.indexOf(domain), 1);
	    send_pwd_group_row_to_reports('replace', previous_group, pwd_groups[previous_group].sites, 
					  pwd_groups[previous_group].strength);
	}
    }

    if (current_group == false) {
	//Either the site was never in any of the groups or it is changing from one group to another.
	//Find the correct group
	for (g in pwd_groups) {
	    if (pwd_groups[g].sites.sort().join(", ") == other_domains.sort().join(", ")) {
		//This is the correct group to add the site to
		current_group = g;
		pwd_groups[current_group].sites.push(domain);
		if (password_strength.join(", ") != pwd_groups[current_group].strength.join(", ")) {
		    print_appu_error("Appu Error: Strength mismatch from what was calculated earlier: " + 
				     domain, other_domains, password_strength, 
				     pwd_groups[current_group].strength);
		}
		send_pwd_group_row_to_reports('replace', current_group, pwd_groups[current_group].sites, 
					      pwd_groups[current_group].strength);
		break;
	    }
	}
	
	if (current_group == false) {
	    //Create a new group and add this entry to the list
	    var new_grp = new_group_name(pwd_groups);
	    new_grp = 'Grp ' + new_grp;
	    pwd_groups[new_grp] = {};
	    pwd_groups[new_grp].sites = [].concat(other_domains.concat(domain).sort());
	    pwd_groups[new_grp].strength = password_strength;
	    
	    pii_vault.current_report.num_pwds += 1;
	    flush_selective_entries("current_report", ["num_pwds"]);
	    send_pwd_group_row_to_reports('add', new_grp, pwd_groups[new_grp].sites, 
					  pwd_groups[new_grp].strength);
	    calculate_pwd_similarity(new_grp);
	    current_group = new_grp;
	}
    }
    
    flush_selective_entries("current_report", ["pwd_groups"]);
    return current_group;
}

function send_user_account_site_row_to_reports(site_name) {
    var uas_entry = pii_vault.current_report.user_account_sites[site_name];
    for (var i = 0; i < report_tab_ids.length; i++) {
	chrome.tabs.sendMessage(report_tab_ids[i], {
	    type: "report-table-change-row",
	    table_name: "user_account_sites",
	    mod_type: "replace",
	    changed_row: [
		site_name,
		uas_entry.pwd_unchanged_duration,
		uas_entry.my_pwd_group,
		uas_entry.num_logins,
		uas_entry.tts,
		uas_entry.latest_login,
		uas_entry.tts_login,
		uas_entry.tts_logout,
		uas_entry.num_logouts,
		uas_entry.site_category
	    ],
	});
    }
}

function pii_check_passwd_reuse(message, sender) {
    var r = {};
    var os = [];
    r.is_password_reused = "no";
    r.already_exists = "no";
    r.sites = [];
    var curr_username = '';

    //We have to recalculate the pwd group everytime because passwords might get
    //changed every now and then.
    var pwd_strength = zxcvbn(message.passwd);
    r.pwd_strength = pwd_strength;
    
    for (var i = 0; i < 1000; i++) {
	var salted_pwd = pii_vault.salt_table[i] + ":" + message.passwd;
	//console.log("Checking for salted pwd: " + salted_pwd);
	var pwd_sha1sum = CryptoJS.SHA1(salted_pwd).toString();
	//console.log("salted pwd checksum: " + pwd_sha1sum);
	for(var hk in pii_vault.password_hashes) {
	    if (pii_vault.password_hashes[hk].pwd_hash == pwd_sha1sum) {
		if (hk.split(":")[1] != message.domain || hk.split(":")[0] != curr_username) {
		    r.is_password_reused = "yes";
		    r.dontbugme = "no";
		    r.sites.push(hk.split(":")[1]);
		    os.push(hk.split(":")[1]);
		    break;
		}
		if (hk.split(":")[1] == message.domain && hk.split(":")[0] == curr_username) {
		    r.already_exists = "yes";
		}
	    }
	}
    }


    if (r.is_password_reused == "yes") {
	if (message.warn_later) {
	    console.log("Appu Info: Warn Later: " + message.domain);
	    r.dontbugme = "yes";
	}
	else {
	    for(var dbl in pii_vault.options.dontbuglist) {
		// console.log("DONTBUGME: Checking: "+ pii_vault.options.dontbuglist[dbl] 
		//    +" against: " + message.domain);
		if (pii_vault.options.dontbuglist[dbl] == message.domain) {
		    console.log("Appu Info: Site in dontbuglist: " + message.domain);
		    r.dontbugme = "yes";
		    break;
		}
	    }
	}
    }
    
    //Add this site to current report
    if (!(message.domain in pii_vault.current_report.user_account_sites)) {
	pii_vault.current_report.user_account_sites[message.domain] = init_user_account_sites_entry();
	pii_vault.current_report.num_user_account_sites += 1;
	//Add this site to aggregate data
	if (!(message.domain in pii_vault.aggregate_data.user_account_sites)) {
	    pii_vault.aggregate_data.user_account_sites[message.domain] = init_user_account_sites_entry();
	    pii_vault.aggregate_data.num_user_account_sites += 1;
	    flush_selective_entries("aggregate_data", ["num_user_account_sites", "user_account_sites"]);
	}

	if (pii_vault.total_site_list.indexOf(message.domain) != -1 && 
	    !(does_user_have_account(message.domain))) {
	    // This means that this site was counted as non user account site before.
	    // So adjust it.
	    pii_vault.current_report.num_non_user_account_sites -= 1;
	    flush_selective_entries("current_report", ["num_non_user_account_sites"]);
	}
    }

    var curr_pwd_group = get_pwd_group(message.domain, os, [
	pwd_strength.entropy, 
	pwd_strength.crack_time,
	pwd_strength.crack_time_display
    ]);

    if (curr_pwd_group != pii_vault.current_report.user_account_sites[message.domain].my_pwd_group) {
	pii_vault.current_report.user_account_sites[message.domain].my_pwd_group = curr_pwd_group;
    }

    pii_vault.current_report.user_account_sites[message.domain].num_logins += 1;
    pii_vault.current_report.user_account_sites[message.domain].latest_login = new Date();

    if(r.is_password_reused == "no") {
	var user_log = sprintf("Appu Info: [%s]: Checked password for '%s', NO match was found", 
			       new Date(), message.domain);
	console.log(user_log);
    }
    else {
	var user_log = sprintf("Appu Info: [%s]: Checked password for '%s', MATCH was found: ", 
			       new Date(), message.domain);
	user_log += "{ " + os.join(", ") + " }";
	console.log(user_log);
    }

    if(r.is_password_reused == "yes") {
	var total_entries = pii_vault.current_report.pwd_reuse_warnings.length;
	var last_index =  total_entries ? pii_vault.current_report.pwd_reuse_warnings[total_entries - 1][0] : 0; 
	var new_row = [
	    last_index + 1, 
	    (new Date()).getTime(), 
	    message.domain,
	    os.join(", ")
	];

	pii_vault.current_report.pwd_reuse_warnings.push(new_row);
	flush_selective_entries("current_report", ["pwd_reuse_warnings"]);

	for (var i = 0; i < report_tab_ids.length; i++) {
	    chrome.tabs.sendMessage(report_tab_ids[i], {
		type: "report-table-change-row",
		table_name: "pwd_reuse_warnings",
		mod_type: "add",
		changed_row: new_row,
	    });
	}
    }

    // This is so that if there is next successful sign-in message,
    // trigger a check_pi_fetched_required()
    // This is more fullproof than waiting X amount of time as login may
    // be unsuccessful in that case.
    // However, most fullproof method is per-site login check.
    pending_pi_fetch[sender.tab.id] = message.domain;

    flush_selective_entries("current_report", ["user_account_sites", "num_user_account_sites"]);
    send_user_account_site_row_to_reports(message.domain);
    return r;
}

function does_user_have_account(domain) {
    for(var hk in pii_vault.password_hashes) {
	if (hk.split(":")[1] == domain) {
	    return true;
	}
    }
    return false;
}

function background_tasks() {
    //report = pii_vault.past_reports[report_number - 2];
    for (var i = 0; i < pii_vault.past_reports.length; i++) {
	var cr = pii_vault.past_reports[i];
	if (cr.actual_report_send_time == 'Not delivered yet') {
	    //To adjust for current_report(=1) and start index (0 instead of 1)
	    var report_number = i + 2;
	    console.log("Here here: Report " + report_number + " is undelivered");
	    if (report_number in delivery_attempts) {
		var dat = delivery_attempts[report_number];
		var curr_time = new Date();
		var td = curr_time.getTime() - dat.getTime();	    
		if (td < (60 * 60 * 24 * 1000)) {
		    //Less than 24-hours, Skip
		    // 		    console.log("Here here: Report " + report_number + 
		    // " was already attempted to " +
		    // 				"be delivered, so skipping");
		    continue;
		}
	    }
	    delivery_attempts[report_number] = new Date();
	    //	    console.log("Here here: Attempting to send report " + report_number);
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

// BIG EXECUTION START

vault_read();

//Detect if the version was updated.
//If updated, then do update specific code execution
var ret_vals = make_version_check();
var am_i_updated = ret_vals[0];
var last_version = ret_vals[1];

if (am_i_updated) {
    //Make one time changes for upgrading from older releases.
    update_specific_changes(last_version);
}

//Call init. This will set properties that are newly added from release to release.
//Eventually, after the vault properties stabilise, call it only if vault property
//"initialized" is not set to true.
vault_init();

tld = tld_module.init();

if (!(tld.rules.length > 0)) {
    print_appu_error("Appu Error: tld rules were not loaded correctly");
}
else {
    console.log("Here here: tld rules successfully loaded");
}

setInterval(check_report_time, 1000 * report_check_interval * 60);
setInterval(background_tasks, 1000 * bg_tasks_interval * 60);

//Check if appu was disabled in the last run. If yes, then check if disable period is over yet.
if (pii_vault.config.status == "disabled") {
    if (((new Date()) - (new Date(pii_vault.config.disable_start))) > 
	(60 * 1000 * pii_vault.config.disable_period)) {
	pii_vault.config.status = "active";
	pii_vault.config.disable_period = -1;
	flush_selective_entries("config", ["status", "disable_period"]);

	chrome.browserAction.setIcon({path:'images/appu_new19.png'});
	console.log((new Date()) + ": Enabling Appu");
    }
    else {
	console.log("Appu disabled at '" + pii_vault.config.disable_start + "' for " 
		    + pii_vault.config.disable_period + " minutes");
	
	pii_vault.config.enable_timer = setInterval(start_time_loop, 1000);
	vault_write("config:enable_timer", pii_vault.config.enable_timer);

	chrome.browserAction.setIcon({path:'images/appu_new19_offline.png'});
    }
}

pii_check_if_stats_server_up();

chrome.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
    if (change_info.status == "complete" && tab.active) {
	chrome.tabs.sendMessage(tab_id, {type: "you_are_active"});
    }
});


// All messages handled by the background server
// Total messages: 42
// Messages that can't be ignored (even if disabled): 32
// Message name, To be ignored when disabled
// Messages sent by content-script:
// 1. "user_input", yes
// 2. "i_have_focus", yes
// 3. "time_spent", yes
// 4. "check_pending_warning", yes
// 5. "check_passwd_reuse", yes
// 6. "signed_in", yes
// 7. "explicit_sign_out", yes
// 8. "simulate_click_done", yes
// 9. "check_blacklist", yes
// 10. "remind_report_later", NO
// 11. "close_report_reminder", NO
// 12. "review_and_send_report", NO
// 13. "am_i_active", NO
// 14. "query_status", NO
// 15. "clear_pending_warnings", NO

// Messages sent by popup:
// 1. "get-signin-status", NO
// 2. "status_change", NO
// 3. "sign-out", NO

//Messages sent by options:
// 1. "add_to_blacklist", NO
// 2. "get_blacklist", NO
// 3. "get_dontbugme_list", NO
// 4. "add_to_dontbug_list", NO (also from content-script)
// 5. "delete_dnt_site_entry", NO
// 6. "delete_dontbugme_site_entry", NO
// 7. "get_report_setting", NO
// 8. "set_report_setting", NO

//Messages sent by report or text_report
// 1. "get_report_by_number", NO
// 2. "get_differential_report", NO
// 3. "delete_entry", NO
// 4. "report_tab_closed", NO
// 5. "report_tab_opened", NO
// 6. "report_time_spent", NO
// 7. "report_user_approved", NO (also from content-script)
// 8. "show-text-report", NO
// 9. "get-text-report-number", NO

//Messages sent by My Footprint
// 1. "myfootprint_tab_opened", NO
// 2. "myfootprint_tab_closed", NO
// 3. "myfootprint_time_spent", NO
// 4. "get_per_site_pi", NO

//Messages sent by Sign-in
// 1. "sign-in", NO
// 2. "create-account", NO
// 3. "get-version", NO

//Generic channel listener. Catch messages from contents-scripts in various tabs.
//Also catch messages from popup.html, report.html and options.html
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    if (sign_in_status == 'not-signed-in' || pii_vault.config.status == "disabled") {
	// We are currently not enabled. Check if message falls in category to be ignored.
	// if so, just return.
	var ignore_messages = [
	    "user_input",
	    "i_have_focus",
	    "time_spent",
	    "check_pending_warning",
	    "check_passwd_reuse",
	    "signed_in",
	    "explicit_sign_out",
	    "simulate_click_done",
	    "check_blacklist"
	];

	if (ignore_messages.indexOf(message.type) != -1 ) {
	    return;
	}
    }

    //We don't want to put everything in a big IF ACTIVE STATUS condition
    //because user might want to check report or configure options when
    //Appu's intrusive functionality is disabled.
    //An ACTIVE STATUS for appu means active on pages or in other words 
    //content script is active.
    if (message.type == "user_input" && pii_vault.config.status == "active") {
	r = pii_log_user_input_type(message);
    }
    else if (message.type == "clear_pending_warnings") {
	//This message indicates that user has interacted with earlier warning in some way.
	//Hence, its not the case that user did not get to read it due to page redirects
	pending_warnings[sender.tab.id] = undefined;
    }
    else if (message.type == "get-signin-status") {
	var resp = {};
	sendResponse({
	    'login_name' : current_user,
	    'status' : sign_in_status,
	    'user' : current_user,
	    'appu_status' : pii_vault.config.status,
	});
    }
    else if (message.type == "i_have_focus") {
	focused_tabs += 1;
	return true;
    }
    else if (message.type == "time_spent") {
	focused_tabs -= 1;
	var domain = tld.getDomain(message.domain);
	
	pii_vault.current_report.total_time_spent += message.time_spent;
	if (message.am_i_logged_in) {
	    pii_vault.current_report.total_time_spent_logged_in += message.time_spent;
	}
	else {
	    pii_vault.current_report.total_time_spent_wo_logged_in += message.time_spent;
	}

	flush_selective_entries("current_report", ["total_time_spent", 
						   "total_time_spent_logged_in", 
						   "total_time_spent_wo_logged_in"]);

	pii_vault.aggregate_data.all_sites_total_time_spent += message.time_spent;
	flush_selective_entries("aggregate_data", ["all_sites_total_time_spent"]);

	if (!(does_user_have_account(domain)) && 
	    (domain in pii_vault.aggregate_data.non_user_account_sites)) {
	    pii_vault.aggregate_data.non_user_account_sites[domain].tts += message.time_spent;
	    flush_selective_entries("aggregate_data", ["non_user_account_sites"]);
	}

	if (domain in pii_vault.current_report.user_account_sites) {
	    pii_vault.current_report.user_account_sites[domain].tts += message.time_spent;
	    if (message.am_i_logged_in) {
		pii_vault.current_report.user_account_sites[domain].tts_login += message.time_spent;
	    }
	    else {
		pii_vault.current_report.user_account_sites[domain].tts_logout += message.time_spent;
	    }
	    flush_selective_entries("current_report", ["user_account_sites"]);
	    send_user_account_site_row_to_reports(domain);
	    // console.log("Here here: Time spent: " + pii_vault.current_report.user_account_sites[domain].tts + 
	    // 		", at: " + domain);
	}
    }
    else if (message.type == "am_i_active") {
	chrome.tabs.query( { active: true }, function(active_tabs) {
	    var response_sent = false; 
	    var r = {};
	    for(var i = 0; i < active_tabs.length; i++) {
		if (sender.tab.id == active_tabs[i].id) {
		    r = { am_i_active: true};
		    response_sent = true;
		}
	    }
	    if (!response_sent) {
		r = { am_i_active: false};
	    }
	    sendResponse(r);
	});
	return true;
    }
    else if (message.type == "check_pending_warning"  && pii_vault.config.status == "active") {
	r = pii_check_pending_warning(message, sender);
	r.id = sender.tab.id;
	sendResponse(r);
    }
    else if (message.type == "check_passwd_reuse"  && pii_vault.config.status == "active") {
	message.domain = tld.getDomain(message.domain);
	r = pii_check_passwd_reuse(message, sender);
	vault_update_domain_passwd(message, r.already_exists);

	var domain = message.domain;
	var hk = '' + ':' + domain;
	r.initialized = pii_vault.password_hashes[hk].initialized;

	//Add the current pwd info to pending warnings
	var pw = {};
	pw = $.extend(true, {}, r);
	pending_warnings[sender.tab.id] = pw;

	sendResponse(r);
    }
    else if (message.type == "status_change") {
	pii_modify_status(message);
    }
    else if (message.type == "query_status") {
//	console.log("Here here: tabid: "+sender.tab.id+", In query status: " + 
//	template_processing_tabs[sender.tab.id]);
	r = {};
	r.status = pii_vault.config.status;
	if (sender.tab.id in template_processing_tabs) {
	    if (template_processing_tabs[sender.tab.id] != "") { 
//		console.log(sprintf("Here here: Tab %s was sent a go-to url earlier", sender.tab.id));
		var dummy_tab_id = sprintf('tab-%s', sender.tab.id);
		template_processing_tabs[sender.tab.id] = "";
		//console.log("Here here: YYY tabid: " + sender.tab.id + ", value: " + template_processing_tabs[sender.tab.id]);
		r.status = "process_template";
		sendResponse(r);

		$('#' + dummy_tab_id).trigger("page-is-loaded");
	    }
	    else {
		r.status = "process_template";
		sendResponse(r);
	    }
	}
	else {
	    sendResponse(r);
	}
    }
    else if (message.type == "signed_in") {
	var domain = tld.getDomain(message.domain);

	if (message.value == 'yes') {
	    console.log("Here here: Signed in for site: " + tld.getDomain(message.domain));
	    if (!(domain in pii_vault.current_report.user_account_sites)) {
		pii_vault.current_report.user_account_sites[domain] = init_user_account_sites_entry();
		pii_vault.current_report.num_user_account_sites += 1;
		flush_selective_entries("current_report", ["user_account_sites", "num_user_account_sites"]);

		if (pii_vault.total_site_list.indexOf(domain) != -1 && 
		    !(does_user_have_account(domain))) {
		    // This means that this site was counted as non user account site before.
		    // So adjust it.
		    pii_vault.current_report.num_non_user_account_sites -= 1;
		    flush_selective_entries("current_report", ["num_non_user_account_sites"]);
		}
		send_user_account_site_row_to_reports(domain);
	    }
	    if (sender.tab.id in pending_pi_fetch) { 
		if (pending_pi_fetch[sender.tab.id] == domain) {
		    console.log("Here here: domain: " + domain + ", tab-id: " + sender.tab.id);
    		    check_if_pi_fetch_required(domain, sender.tab.id);		
		}
		else {
		    pending_pi_fetch[sender.tab.id] = "";
		}
	    }
	}
	else if (message.value == 'no') {
	    pending_pi_fetch[sender.tab.id] = "";
	    console.log("Here here: NOT Signed in for site: " + tld.getDomain(message.domain));
	}
	else if (message.value == 'unsure') {
	    pending_pi_fetch[sender.tab.id] = "";
	    console.log("Here here: Signed in status UNSURE: " + tld.getDomain(message.domain));
	}
	else {
	    console.log("Here here: Undefined signed in value " + 
			message.value + ", for domain: " + tld.getDomain(message.domain));
	}
    }
    else if (message.type == "explicit_sign_out") {
	var domain = tld.getDomain(message.domain);
	if (!(domain in pii_vault.current_report.user_account_sites)) {
	    pii_vault.current_report.user_account_sites[domain] = init_user_account_sites_entry();
	    pii_vault.current_report.num_user_account_sites += 1;
	    flush_selective_entries("current_report", ["user_account_sites", "num_user_account_sites"]);

	    if (pii_vault.total_site_list.indexOf(domain) != -1 && 
		!(does_user_have_account(domain))) {
		// This means that this site was counted as non user account site before.
		// So adjust it.
		pii_vault.current_report.num_non_user_account_sites -= 1;
		flush_selective_entries("current_report", ["num_non_user_account_sites"]);
	    }
	}
	pii_vault.current_report.user_account_sites[domain].num_logouts += 1;
	flush_selective_entries("current_report", ["user_account_sites"]);
	send_user_account_site_row_to_reports(domain);

	console.log("Here here: Explicitly signed out from: " + tld.getDomain(domain));
    }
    else if (message.type == "simulate_click_done") {
	console.log("Here here: tabid: " + sender.tab.id + ", In simulate click: " 
		    + template_processing_tabs[sender.tab.id]);
	if (sender.tab.id in template_processing_tabs) {
	    if (template_processing_tabs[sender.tab.id] != "") { 
		console.log(sprintf("Here here: Tab %s was sent a go-to url earlier", sender.tab.id));
		var dummy_tab_id = sprintf('tab-%s', sender.tab.id);
		template_processing_tabs[sender.tab.id] = "";
		console.log("Here here: YYY tabid: " + sender.tab.id + ", value: " 
			    + template_processing_tabs[sender.tab.id]);
		$('#' + dummy_tab_id).trigger("page-is-loaded");
	    }
	}
    }
    else if (message.type == "add_to_blacklist") {
	r = pii_add_blacklisted_sites(message);
	sendResponse(r);
    }
    else if (message.type == "get_blacklist") {
	var r = {};
	r.blacklist = pii_get_blacklisted_sites(message);
	sendResponse(r);
    }
    else if (message.type == "get_dontbugme_list") {
	var r = {};
	r.dontbugmelist = pii_get_dontbugme_list(message);
	sendResponse(r);
    }
    else if (message.type == "check_blacklist") {
	r = pii_check_blacklisted_sites(message);
	if (r.blacklisted == "no") {
	    var etld = tld.getDomain(message.domain);

	    if(pii_vault.total_site_list.indexOf(etld) == -1) {
		if (!(does_user_have_account(etld))) {
		    pii_vault.current_report.num_non_user_account_sites += 1;
		    flush_selective_entries("current_report", ["num_non_user_account_sites"]);
		    if (!(etld in pii_vault.aggregate_data.non_user_account_sites)) {
			pii_vault.aggregate_data.num_non_user_account_sites += 1;
			pii_vault.aggregate_data.non_user_account_sites[etld] = 
			    init_non_user_account_sites_entry();
			flush_selective_entries("aggregate_data", [
			    "num_non_user_account_sites", 
			    "non_user_account_sites"
			]);
		    }
		    pii_vault.aggregate_data.non_user_account_sites[etld].latest_access = new Date();
		    flush_selective_entries("aggregate_data", ["non_user_account_sites"]);
		}

		pii_vault.total_site_list.push(etld);
		vault_write("total_site_list", pii_vault.total_site_list);
		pii_vault.current_report.num_total_sites += 1;
		flush_selective_entries("current_report", ["num_total_sites"]);
		pii_vault.aggregate_data.num_total_sites += 1;
		flush_selective_entries("aggregate_data", ["num_total_sites"]);
	    }
	}
	sendResponse(r);
    }
    else if (message.type == "get_report_by_number") {
	var resp = pii_get_report_by_number(message.report_number);
	response_report = resp[0];
	original_report = resp[1];
	response_report.report_number = message.report_number;
	response_report.num_total_report = pii_vault.past_reports.length + 1;
	response_report.pi_field_value_identifiers = pii_vault.aggregate_data.pi_field_value_identifiers;
	sendResponse(response_report);

	original_report.report_updated = false;
    }
    else if (message.type == "get_differential_report") {
	//r = pii_get_differential_report(message);
	//sendResponse(r);
    }
    else if (message.type == "delete_entry") {
	purge_report_entry(message.report_number, message.table_name, message.entry_key);
    }
    else if (message.type == "add_to_dontbug_list") {
	r = pii_add_dontbug_list(message);
	sendResponse(r);
    }
    else if (message.type == "delete_dnt_site_entry") {
	r = pii_delete_dnt_list_entry(message);
    }
    else if (message.type == "delete_dontbugme_site_entry") {
	r = pii_delete_dontbugme_list_entry(message);
    }
    else if (message.type == "remind_report_later") {
	report_reminder_later(report_reminder_interval);
    }
    else if (message.type == "close_report_reminder") {
	close_report_reminder_message();
    }
    else if (message.type == "review_and_send_report") {
	open_reports_tab();
    }
    else if (message.type == "report_tab_closed") {
	report_tab_ids.splice(report_tab_ids.indexOf(sender.tab.id), 1);
	is_report_tab_open -= 1;
    }
    else if (message.type == "report_tab_opened") {
	report_tab_ids.push(sender.tab.id);
	is_report_tab_open += 1;
	pii_vault.current_report.num_report_visits += 1;
	flush_selective_entries("current_report", ["num_report_visits"]);
    }
    else if (message.type == "report_time_spent") {
	pii_vault.current_report.report_time_spent += message.time_spent;
	// console.log("Here here: Time spent in reports tab: " + message.time_spent 
	// 	    + ", total time: " + pii_vault.current_report.report_time_spent);
	flush_selective_entries("current_report", ["report_time_spent"]);
	if (((pii_vault.current_report.report_time_spent / (60*1000)) > 1) &&
	    (!pii_vault.current_report.report_reviewed)) {
	    //If user has spent more than a minute on reports page then set 
	    //report reviewed to true
	    pii_vault.current_report.report_reviewed = true;
	    flush_selective_entries("current_report", ["report_reviewed"]);
	}
    }
    else if (message.type == "myfootprint_tab_opened") {
	myfootprint_tab_ids.push(sender.tab.id);
	pii_vault.current_report.num_myfootprint_visits += 1;
	flush_selective_entries("current_report", ["num_myfootprint_visits"]);
	pii_vault.aggregate_data.num_viewed += 1;
	flush_selective_entries("aggregate_data", ["num_viewed"]);
    }
    else if (message.type == "myfootprint_tab_closed") {
	myfootprint_tab_ids.splice(myfootprint_tab_ids.indexOf(sender.tab.id), 1);
    }
    else if (message.type == "myfootprint_time_spent") {
	pii_vault.current_report.myfootprint_time_spent += message.time_spent;
	flush_selective_entries("current_report", ["myfootprint_time_spent"]);

	console.log("Here here: Time spent in myfootprint tab: " + message.time_spent 
		    + ", total time: " + pii_vault.current_report.myfootprint_time_spent);

	pii_vault.aggregate_data.total_time_spent += message.time_spent;
	flush_selective_entries("aggregate_data", ["total_time_spent"]);
    }
    else if (message.type == "get_report_setting") {
	r = {};
	r.report_setting = pii_vault.options.report_setting;
	sendResponse(r);
    }
    else if (message.type == "set_report_setting") {
	pii_vault.options.report_setting = message.report_setting;
	flush_selective_entries("options", ["report_setting"]);
	pii_vault.current_report.report_setting = message.report_setting;
	flush_selective_entries("current_report", ["report_setting"]);
    }
    else if (message.type == "get_per_site_pi") {
	r = get_all_pi_data();
	sendResponse(r);
    }
    else if (message.type == "report_user_approved") {
	schedule_report_for_sending(message.report_number);
    }
    else if (message.type == "sign-in") {
	sign_in(sender.tab.id, message.username, message.password);
    }
    else if (message.type == "create-account") {
	create_account(sender.tab.id, message.username, message.password);
    }
    else if (message.type == "sign-out") {
	if ( sign_in_status == "signed-in" ) {
	    sign_out();
	}
    }
    else if (message.type == "get-version") {
	sendResponse({'version' : pii_vault.config.current_version});
    }
    else if (message.type == "show-text-report") {
	text_report_tab_ids[message.tabid] = message.reportnumber;
    }
    else if (message.type == "get-text-report-number") {
	sendResponse({ 
	    'reportnumber' : text_report_tab_ids[sender.tab.id]
	});
    }

});


//// GENERAL TESTING code

////////////////////////////////// TEST DATA .. DELETE After wards or move to another JS

function test_report_data() {
    var current_report = {};

    current_report.initialize_time = new Date("Sun Dec 02 2012 16:16:40 GMT-0500 (EST)");
    current_report.reportid = pii_vault.config.reportid;
    current_report.guid = pii_vault.guid;
    current_report.report_modified = "no";
    
    current_report.num_report_visits = 2;
    current_report.report_time_spent = 1400000;

    current_report.num_myfootprint_visits = 12;
    current_report.myfootprint_time_spent = 5400000;

    current_report.report_reviewed = true;
    current_report.user_approved = new Date();

    current_report.input_fields = [
	[1, new Date(1354966002000), 'www.abc.com', 'test', 'button', 0],
	[2, new Date(1354976002000), 'www.example.com', 'test', 'email', 0],
	[3, new Date(1354986002000), 'www.reddit.com', 'zzz', 'button', 0],
	[4, new Date(1354996002000), 'www.mysite.com', 'test', 'text', 65],
	[5, new Date(1354956002000), 'www.yoursite.test.net', 'kkk', 'button', 0],
	[6, new Date(1354946002000), 'www.hello.com', 'test', 'button', 0],
	[7, new Date(1354936002000), 'www.buy.com', 'test', 'textarea', 323],
	[8, new Date(1354926002000), 'www.now.com', 'test', 'textarea', 12],
	[9, new Date(1354916002000), 'www.here.com', 'test', 'button', 0],
	[10, new Date(1355066002000), 'www.exit.com', 'test', 'button', 0],
    ];

    current_report.send_attempts = [new Date(1355156002000), new Date(1355256002000)];

    current_report.extension_version = pii_vault.config.current_version;
    current_report.extension_updated = false;
    current_report.report_updated = false;

    current_report.scheduled_report_time = new Date();
    current_report.scheduled_report_time = current_report.scheduled_report_time.setDate(
	(current_report.scheduled_report_time.getDate() + 1));
    //current_report.actual_report_send_time = 'Not delivered yet';
    current_report.actual_report_send_time = new Date();
    current_report.report_setting = pii_vault.options.report_setting;

    current_report.send_report_postponed = 4;
    current_report.num_total_sites = 57;
    current_report.total_time_spent = 28834500;
    current_report.total_time_spent_logged_in = 8834500;
    current_report.total_time_spent_wo_logged_in = 18834500;

    current_report.num_user_account_sites = 7;
    //Each site is a record such as
    //site_name, num_times_logged_in, latest_login, num_times_explicit_logout
    //pwd_group, total_time_spent_logged_in, total_time_spent_wo_logging_in
    //site_category
    current_report.user_account_sites = {
	'aaa.com' : { 'num_logins': 12, 'latest_login': 1357665588131, 
		      'num_logouts': 2, 'my_pwd_group': 3,
		      'tts': 44435001,
		      'tts_login': 14435000, 'tts_logout': 3643000,
		      'site_category': 'email/blog'
		    },
	'superverylongnamesite.com' : { 'num_logins': 6, 'latest_login': 1357604388000, 
		      'num_logouts': 0, 'my_pwd_group': 3,
		      'tts': 19425000,
		      'tts_login': 14435000, 'tts_logout': 3643000,
		      'site_category': 'email/blog'
		    },
	'ccc.com' : { 'num_logins': 5, 'latest_login': 1357517988000, 
		      'num_logouts': 2, 'my_pwd_group': 2,
		      'tts': 12225000,
		      'tts_login': 14435000, 'tts_logout': 3643000,
		      'site_category': 'email/blog'
		    },
	'ddd.com' : { 'num_logins': 14, 'latest_login': 1355555522298, 
		      'num_logouts': 2, 'my_pwd_group': 1,
		      'tts': 885000,
		      'tts_login': 14435000, 'tts_logout': 3643000,
		      'site_category': 'email/blog'
		    },
	'eee.com' : { 'num_logins': 10, 'latest_login': 1355555522298, 
		      'num_logouts': 2, 'my_pwd_group': 4,
		      'tts': 45000,
		      'tts_login': 14435000, 'tts_logout': 3643000,
		      'site_category': 'email/blog'
		    },
	'fff.com' : { 'num_logins': 12, 'latest_login': 1355555522298, 
		      'num_logouts': 2, 'my_pwd_group': 2,
		      'tts': 44435001,
		      'tts_login': 14435000, 'tts_logout': 3643000,
		      'site_category': 'email/blog'
		    },
	'ggg.com' : { 'num_logins': 9, 'latest_login': 1355555522298, 
		      'num_logouts': 2, 'my_pwd_group': 3,
		      'tts': 44435045,
		      'tts_login': 14435000, 'tts_logout': 3643000,
		      'site_category': 'email/blog'
		    },
    };

    setTimeout(function () {
	for (var i = 0; i < report_tab_ids.length; i++) {
	    chrome.tabs.sendMessage(report_tab_ids[i], {
		type: "report-table-change-row",
		table_name: "user_account_sites",
		mod_type: "add",
		changed_row: [
		    'totally_new_site.com',
		    4,
		    25,
		    44435045,
		    (new Date()).getTime(),
		    23,
		    44435000,
		    3,
		    "shopping",
		],
	    });

	    chrome.tabs.sendMessage(report_tab_ids[i], {
		type: "report-table-change-row",
		table_name: "user_account_sites",
		mod_type: "replace",
		changed_row: [
		    'ddd.com',
		    4,
		    9999,
		    44435045,
		    (new Date()).getTime(),
		    23,
		    44435000,
		    3,
		    "shopping",
		],
	    }); 
	}
    }, 30 * 1000);


    //Sites where user does not have account (but "log in" is present)
    //Once again don't enlist those sites
    current_report.num_non_user_account_sites = 6;

    //Number of times appu was disabled. 
    //and how long each time
    current_report.appu_disabled = [23, 45, 12];

    //New list of sites added to dontbuglist since last report
    current_report.dontbuglist = ['ttt.com', 'kkk.org', 'sss.txt'];

    //Number of different passwords used since the last report
    current_report.num_pwds = 4;

    //Password groups and sites in each group
    //Each group has an entry like "pwd_group_0", "google.com, facebook.com" etc
    current_report.pwd_groups = {
	'Grp 3': { 'sites' : ['aaa.com', 'bbb.com', 'ggg.com'], 'strength' : [4.5, 70536, "21 hours"] },
	'Grp 2': { 'sites' : ['ccc.com', 'fff.com'], 'strength' :  [7.8, 80536, "22 hours"] },
	'Grp 1': { 'sites' : ['ddd.com'], 'strength' : [9.2, 90536, "23 hours"] },
	'Grp 4': { 'sites' : ['eee.com'], 'strength' : [3.5, 60536, "20 hours"] }
    };

    //Levenshtein distance between each different password
    //Each entry is like {"pwd_group_0" : [{ "pwd_group_1" : 23}, { "pwd_group_2" : 14}]} 
    current_report.pwd_similarity = {
	'Grp 1': [0, 3, 14, 5],
	'Grp 2': [3, 0, 8, 7],
	'Grp 3': [14, 8, 0, 5],
	'Grp 4': [5, 7, 5, 0]
    };

    //Downloaded PI from following sites
    //Each entry is like: {'site_name' : { download_time: xyz, downloaded_fields: [a, b, c]}}
    current_report.downloaded_pi = {
	'aaa.com' : { 'downloaded_time' : 1355555522298,
		      'downloaded_fields' : ['name', 'phone', 'address']
		    },
	'bbb.com' : { 'downloaded_time' : 1355555522298,
		      'downloaded_fields' : ['name', 'phone', 'address', 'occupation', 'working']
		    },
	'ccc.com' : { 'downloaded_time' : 1355555522298,
		      'downloaded_fields' : ['name', 'phone', 'address', 'email']
		    }
    };

    //Fields that share common values across sites
    //Each entry is like: {'field_name' : ['site_1', 'site_2', 'site_3']} etc 
    //One has to consult aggregate stats for this.
    current_report.common_fields = {
	'name' : ['aaa.com', 'ccc.com'],
	'phone' : ['aaa.com', 'ccc.com', 'bbb.com'],
	'address' : ['aaa.com', 'bbb.com']
    };

    //Finally our old pwd_reuse_warnings
    current_report.pwd_reuse_warnings = [
	[1, 1355555522298, 'aaa.com', 'bbb.com, ggg.com'],
	[2, 1355555532298, 'bbb.com', 'ccc.com, ddd.com, hhh.info'],
	[3, 1355555512298, 'kkk.com', 'mmm.com, j.com']
    ];

    current_report.appu_errors = [
	"Appu Error: Could not download PI from facebook",
	"Appu Error: Could not download PI from google"
    ];

    return current_report;
}

//Aggregate data is gathered over the time unlike daily reports.
//Also aggregate data will contain sensitive data such as per_site_pi
//that is not sent to the server. Only user can view it from "My Footprint"
function test_initialize_aggregate_data() {
    var aggregate_data = {};

    //When was this created?
    aggregate_data.initialized_time = new Date();
    //Is user aware? How many times is he reviewing his own data?
    //This could be used as a feedback to the system about user's awareness
    //(hence an indirect metric about users' savviness) and
    //also to warn user.
    aggregate_data.num_viewed = 0;
    aggregate_data.total_time_spent = 0;

    //Stats about general sites access
    aggregate_data.num_total_sites = 0;
    aggregate_data.all_sites_total_time_spent = 0;
    aggregate_data.all_sites_stats_start = new Date();

    //Stats and data about sites with user accounts (i.e. where user logs in)
    //user_account_sites[] is an associative array with key: site_name
    //Value corresponding to that is an object with following dictionary:
    //num_times_logged_in, latest_login, num_times_explicit_logout
    //pwd_group, total_time_spent_logged_in, total_time_spent_wo_logging_in
    //site_category, hashed_pwd
    aggregate_data.num_user_account_sites = 0;
    aggregate_data.user_account_sites = {};

    //Stats and data about sites where user browses but never logs in
    //IMPORTANT: This detailed list of sites is only maintained in aggregate stats.
    //           Its never reported to the server.
    //non_user_account_sites[] is an associative array with key: site_name
    //Value corresponding to that is an object with following dictionary:
    //site_name, last_access_time, total_time_spent, site_category
    aggregate_data.num_non_user_account_sites = 0;
    aggregate_data.non_user_account_sites = {};
    
    //Passwords data
    //pwd_groups is an associative array. Key is group name and values are list of sites
    //sharing that password
    aggregate_data.num_diff_pwds = 0;
    aggregate_data.pwd_groups = {};
    aggregate_data.pwd_similarity = {};

    //Per site PI downloaded
    //Key: site name
    //Values: time downloaded
    // field_name --> field value
    aggregate_data.per_site_pi = {};
    
    return aggregate_data;
}
