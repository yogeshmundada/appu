
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
    if (last_version < '0.3.92') {
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
    else if (last_version < '0.3.97') {
	console.log("APPU DEBUG: Update specific changes(<0.3.97). Adding pwd_group " + 
		    "to pii_vault.password_hashes");

	var pvapg = pii_vault.aggregate_data.pwd_groups;
	for (var pwdgrp in pvapg) {
	    for (var i = 0; i < pvapg[pwdgrp].sites.length; i++) {
		var hk = ":" + pvapg[pwdgrp].sites[i];
		if (pii_vault.password_hashes[hk]) {
		    pii_vault.password_hashes[hk].my_pwd_group = pwdgrp;
		}
	    }
	}

	console.log("APPU DEBUG: Update specific changes(<0.3.97). Adding session_cookie_store " + 
		    "to pii_vault.aggregate_date");
	pii_vault.aggregate_data.session_cookie_store = {};
	flush_aggregate_data();

	console.log("APPU DEBUG: Update specific changes(<0.3.97). Adding new field 'am_i_logged_in' to " + 
		    " user_account_sites in both current_report and aggregate_data");

	var cr = pii_vault.current_report;
	var ad = pii_vault.aggregate_data;
	for (d in cr.user_account_sites) {
	    cr.user_account_sites[d].am_i_logged_in = 'maybe';
	}
	for (d in ad.user_account_sites) {
	    ad.user_account_sites[d].am_i_logged_in = 'maybe';
	}

	console.log("APPU DEBUG: Update specific changes(<0.3.97). Adding new field 'username' to " + 
		    " user_account_sites in both current_report and aggregate_data");

	var cr = pii_vault.current_report;
	var ad = pii_vault.aggregate_data;
	for (d in cr.user_account_sites) {
	    cr.user_account_sites[d].username = '';
	}
	for (d in ad.user_account_sites) {
	    ad.user_account_sites[d].username = '';
	}

	flush_aggregate_data();
	flush_current_report();
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
