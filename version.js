
function convert_existing_addresses_to_canonical_form() {
    var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;

    var name_regexes = [
			/address([0-9]+)/g,
			/real-address([0-9]+)/g,
			];

    for (var pi_values in vpfvi) {
	var identifier = vpfvi[pi_values];
	if (typeof(identifier) != "string") {
	    continue;
	}
	for (var j = 0; j < name_regexes.length; j++) {
	    if (identifier.match(name_regexes[j])) {
		var address = pi_values;

		(function(address, identifier) {
		    get_address_components(address, function(result) { 
			    var latitude = result["latitude"];
			    var longitude = result["longitude"];
			    pa = parse_address(result["address-components"]); 
			    canonical_address_attributes = [
							    "street_number",
							    "street",
							    "city",
							    "state",
							    "zipcode",
							    "country",
							    ];
			    for (var p = 0; p < canonical_address_attributes.length; p++) {
				if (!(canonical_address_attributes[p] in pa)) {
				    console.log("APPU ERROR: Address cannot be converted to canonical form: " + 
						JSON.stringify(address));
				    if (address in pii_vault.aggregate_data.pi_field_value_identifiers) {
					delete pii_vault.aggregate_data.pi_field_value_identifiers[address];
				    }
				    return;
				}
			    }
			    canonical_address = "street-number: " + pa["street_number"]["long_name"];
			    canonical_address += ", street: " + pa["street"]["long_name"];
			    canonical_address += ", city: " + pa["city"]["long_name"];
			    canonical_address += ", state: " + pa["state"]["long_name"];
			    canonical_address += ", zipcode: " + pa["zipcode"]["long_name"];
			    canonical_address += ", country: " + pa["country"]["long_name"];
			    console.log("DELETE ME: Canonical address('" + address + "'): " + canonical_address);

			    if (address in pii_vault.aggregate_data.pi_field_value_identifiers) {
				delete pii_vault.aggregate_data.pi_field_value_identifiers[address];
			    }
			    
			    pii_vault.aggregate_data.pi_field_value_identifiers[canonical_address] = {
				'identifier': identifier,
				'verified': 'no',
				'latitude': latitude,
				'longitude': longitude,
				'full-address': pa,
				'sites': [],
			    }
			});
		})(address, identifier);
		break;
	    }
	}
    }
}

function convert_pi_field_values_to_canonical_form() {
    var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;
    for (var pi_values in vpfvi) {
	var identifier = vpfvi[pi_values];
	if (typeof(identifier) == "string") {
	    console.log("DELETE ME: identifier: " + identifier + ", type: " + typeof(pi_values));

	    if (pi_values in pii_vault.aggregate_data.pi_field_value_identifiers) {
		delete pii_vault.aggregate_data.pi_field_value_identifiers[pi_values];
	    }
			    
	    pii_vault.aggregate_data.pi_field_value_identifiers[pi_values] = {
		'identifier': identifier,
		'verified': 'no',
		'sites': [],
	    }
	}
    }
}


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

    if (last_version < '0.3.97') {
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

	console.log("APPU DEBUG: Update specific changes(<0.3.97). Adding new field 'lottery_setting' to " + 
		    " current_report");
	
	pii_vault.current_report.lottery_setting = "not-participating";

	flush_aggregate_data();
	flush_current_report();

	console.log("APPU DEBUG: Update specific changes(<0.3.97). Adding new field 'lottery_setting' to " + 
		    " options");

	pii_vault.options.lottery_setting = "not-participating";
	vault_write("options:lottery_setting", pii_vault.options.lottery_setting);

	console.log("APPU DEBUG: Update specific changes(<0.3.97). Adding new field 'initialized' to " + 
		    " pii_vault");

	//Adding to current user
	pii_vault.initialized = true;
	vault_write("initialized", pii_vault.initialized);

	//Adding to default user
	var dug = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
	var read_key = dug + ":" + "initialized";
	localStorage[read_key] = JSON.stringify(pii_vault.initialized);
    }

    if (last_version < '0.4.7') {
	var per_site_pi = pii_vault.aggregate_data.per_site_pi;
	var sym_tab = pii_vault.aggregate_data.pi_field_value_identifiers;

	console.log("APPU DEBUG: Update specific changes(<0.4.7). Sanitizing phone numbers.");

	for (var value in sym_tab) {
	    var identifier = sym_tab[value];
	    if (identifier.match(/^phone([0-9]+)$/)) {
		var phone_array = [];
		phone_array.push(value);
		sanitize_phone(phone_array);
		sym_tab[phone_array[0]] = identifier;
	    }
	}

	console.log("APPU DEBUG: Update specific changes(<0.4.7). Sanitizing ccn numbers.");

	for (var value in sym_tab) {
	    var identifier = sym_tab[value];
	    if (identifier.match(/^ccn([0-9]+)$/)) {
		var ccn_array = [];
		ccn_array.push(value);
		sanitize_ccn(ccn_array);
		sym_tab[ccn_array[0]] = identifier;
	    }
	}

	console.log("APPU DEBUG: Update specific changes(<0.4.7). Sanitizing already downloaded " + 
		    "phones/ccns in per_site_pi.");

	for (var s in per_site_pi) {
	    if (per_site_pi[s].ccn) {
		sanitize_ccn(per_site_pi[s].ccn.values);
	    }

	    if (per_site_pi[s].phone) {
		sanitize_phone(per_site_pi[s].phone.values);
	    }
	}

	flush_selective_entries("aggregate_data", ["pi_field_value_identifiers"]);
    }

    if (last_version < '0.5.11') {
	console.log("APPU DEBUG: Update specific changes(<0.5.11). Creating a null identifier");

	var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;
	var vcr = pii_vault.current_report;
	var vad = pii_vault.aggregate_data;

	vpfvi[''] = 'null_identifier';
	flush_selective_entries("aggregate_data", ["pi_field_value_identifiers"]);

	console.log("APPU DEBUG: Update specific changes(<0.5.11). Zeroing out user_account_sites (CR & AD)");

	vad.num_user_account_sites = 0;
	vad.user_account_sites = {};
	vcr.num_user_account_sites = 0;
	vcr.user_account_sites = {};

	console.log("APPU DEBUG: Update specific changes(<0.5.11). Deleting sites from pwd_groups (AD)");
	for (var pg in vad.pwd_groups) {
	    vad.pwd_groups[pg].sites = [];
	}

	console.log("APPU DEBUG: Update specific changes(<0.5.11). Zeroing out pwd_groups (CR)");
	vcr.pwd_groups = {};

	console.log("APPU DEBUG: Update specific changes(<0.5.11). Adding a new field, current_loggedin_state to AD");
	pii_vault.aggregate_data.current_loggedin_state = {};

	flush_aggregate_data();
	flush_current_report();

	console.log("APPU DEBUG: Update specific changes(<0.5.11). Zeroing out password_hashes");
	pii_vault.password_hashes = {};
	vault_write("password_hashes", pii_vault.password_hashes);
    }

    if (last_version < '0.5.18') {
	console.log("APPU DEBUG: Update specific changes(<0.5.18). Creating 'files_uploaded' entries");
	pii_vault.current_report.files_uploaded = {};
	flush_selective_entries("current_report", ["files_uploaded"]);
	pii_vault.aggregate_data.files_uploaded = {};
	flush_selective_entries("aggregate_data", ["files_uploaded"]);
    }

    if (last_version < '0.5.20') {
	console.log("APPU DEBUG: Update specific changes(<0.5.20). Converting 'pi_field_value_identifiers' to new form");
	convert_existing_addresses_to_canonical_form();
	convert_pi_field_values_to_canonical_form();
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
