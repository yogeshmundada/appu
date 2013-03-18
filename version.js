
function remove_redundant_pi_identifiers() {
    var new_pfvi = {};
    var pfvi = pii_vault.aggregate_data.pi_field_value_identifiers;
    for (var id in pfvi) {
	if (!(pfvi[id] in new_pfvi)) {
	    new_pfvi[pfvi[id]] = id;
	}
	else {
	    if (id < new_pfvi[pfvi[id]]) {
		new_pfvi[pfvi[id]] = id;
	    }
	}
    }
    pii_vault.aggregate_data.pi_field_value_identifiers = new_pfvi;
    flush_selective_entries("aggregate_data", ["pi_field_value_identifiers"]);
}

function update_specific_changes(last_version) {
    if (last_version == '0.0.0') {
	console.log("APPU DEBUG: Update specific changes(0.0.0). Deleting the entire past storage system");
	delete localStorage[ext_id];
	pii_vault = { "options" : {}, "config": {}};
    }
    else if (last_version == '0.3.84') {
	console.log("APPU DEBUG: Update specific changes(0.3.84). Adding new field 'pi_field_value_identifiers' " + 
		    "to aggregate_data");
	//The new field added to aggregate data.
	pii_vault.aggregate_data.pi_field_value_identifiers = {};
	flush_selective_entries("aggregate_data", ["pi_field_value_identifiers"]);
	calculate_common_fields();
    }
    else if (last_version == '0.3.86' || last_version == '0.3.84') {
	console.log("APPU DEBUG: Update specific changes(0.3.86). Adding browser, os and layout info " + 
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

	console.log("APPU DEBUG: Update specific changes(0.3.86). Adding deviceid");
	pii_vault.config.deviceid = generate_random_id();
	flush_selective_entries("config", ["deviceid"]);
	pii_vault.current_report.deviceid = pii_vault.config.deviceid;	
	flush_selective_entries("current_report", ["deviceid"]);

	console.log("APPU DEBUG: Update specific changes(0.3.86). Adding pwd_unchanged_duration to all UAS");
	for (site in pii_vault.current_report.user_account_sites) {
	    if (!('pwd_unchanged_duration' in pii_vault.current_report.user_account_sites[site])) {
		pii_vault.current_report.user_account_sites[site].pwd_unchanged_duration = 0;
	    }
	}
	flush_selective_entries("current_report", ["user_account_sites"]);

	console.log("APPU DEBUG: Update specific changes(0.3.86). Adding pwd_unchanged_duration to all past UAS");
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
    else if (last_version < '0.3.92') {
	console.log("APPU DEBUG: Update specific changes(<0.3.92). Deleting existing password hashes." + 
		    " This is for added security. " + 
		    "Also deleting existing pwd groups as they are inconsistent form report to report");
	pii_vault.password_hashes = {};
	vault_write("password_hashes", pii_vault.password_hashes);
	pii_vault.current_report.pwd_groups = {};
	flush_selective_entries("current_report", ["pwd_groups"]);
	pii_vault.aggregate_data.non_user_account_sites = {};
	flush_selective_entries("aggregate_data", ["non_user_account_sites"]);
	remove_redundant_pi_identifiers();
    }
}


function make_version_check() {
    //Detect if there has been an update.
    var am_i_updated = false;
    var last_version = pii_vault.config.current_version ? pii_vault.config.current_version : '0.0.0';

    response_text = read_file('manifest.json');
    var manifest = JSON.parse(response_text);
    console.log("APPU DEBUG: Current version: " + manifest.version);
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
