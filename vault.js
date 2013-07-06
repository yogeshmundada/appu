
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
	"monitor_icon_setting",
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
	"session_cookie_store",		
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
	"num_pwds",
	"pwd_groups",
	"pwd_similarity",
	"per_site_pi",
	"pi_field_value_identifiers",
    ],
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
	pii_vault.guid = generate_random_id();
	
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
	// Value: { 
	//    'pwd_full_hash':'xyz', 
	//    'pwd_short_hash':'a', 
	//    'salt' : 'zz',
	//    'pwd_group' : '',
	//    'initialized': Date } 
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
	pii_vault.config.deviceid = generate_random_id();
	
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

    if (!pii_vault.options.monitor_icon_setting) {
	pii_vault.options.monitor_icon_setting = "no";
	console.log("vault_init(): Updated MONITOR_ICON_SETTING in vault");
	vault_write("options:monitor_icon_setting", pii_vault.options.monitor_icon_setting);
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
	    //console.log("APPU DEBUG: vault_write(), key: " + key + ", " + value);
	    localStorage[key] = JSON.stringify(value);
	}
	else if (key !== undefined) {
	    var write_key = pii_vault.guid + ":" + key;
	    //console.log("APPU DEBUG: vault_write(), key: " + write_key + ", " + value);
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


function flush_session_cookie_store() {
    flush_selective_entries("aggregate_data", ["session_cookie_store"]);
}


function flush_version() {
    flush_selective_entries("config", ["current_version"]);
}
