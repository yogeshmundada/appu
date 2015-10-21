
function delete_all_pi_field_value_identifiers() {
    pii_vault.aggregate_data.pi_field_value_identifiers = {};
    flush_selective_entries("aggregate_data", ["pi_field_value_identifiers"]);    
}

//Helpful function when testing FPIs again and again
function delete_fetched_pi(domain, force_permission) {
    delete pii_vault.aggregate_data.per_site_pi[domain];
    pii_vault.aggregate_data.per_site_pi[domain] = {};
    if ((!force_permission) && (force_permission != false)) {
	pii_vault.aggregate_data.per_site_pi[domain].user_approved = 'always';
    }
    flush_aggregate_data();
}

function delete_all_fetched_pi(force_permission) {
    var pvadpsp = pii_vault.aggregate_data.per_site_pi;
    for (var d in pvadpsp) {
	delete pvadpsp[d];
	pvadpsp[d] = {};
	if ((!force_permission) && (force_permission != false)) {
	    pvadpsp[d].user_approved = 'always';
	}
    }
    flush_aggregate_data();
}


function sanitize_ccn(ccn, field, cb) {
    var regex_digits = /([0-9]+)/g;

    all_digit_sequences = ccn.match(regex_digits);
    var final_ccn = '';

    if (all_digit_sequences) { 
	for (var k = 0; k < all_digit_sequences.length; k++) {
	    final_ccn += all_digit_sequences[k];
	}
	
	if (final_ccn.length > 4) {
	    final_ccn = final_ccn.substr(final_ccn.length - 4, final_ccn.length);
	}

	return cb(final_ccn, field);
    }
    return cb(null);
}

function sanitize_ssn(ssn, field, cb) {
    var regex_digits = /([0-9]+)/g;

    all_digit_sequences = ssn.match(regex_digits);
    var final_ssn = '';
    if (all_digit_sequences) { 
	for (var k = 0; k < all_digit_sequences.length; k++) {
	    final_ssn += all_digit_sequences[k];
	}
	
	if (final_ssn.length > 2) {
	    final_ssn = final_ssn.substr(final_ssn.length - 2, final_ssn.length);
	}
	
	return cb(final_ssn, field);
    }
    return cb(null);
}


function sanitize_phone(phone, field, cb) {
    var regex_digits = /([0-9]+)/g;
    all_digit_sequences = phone.match(regex_digits);
    var final_phone = '';
    if (all_digit_sequences) { 
	for (var k = 0; k < all_digit_sequences.length; k++) {
	    final_phone += all_digit_sequences[k];
	}
	if (final_phone.length == 10) {
	    return cb(final_phone, field);
	}
    }
    return cb(null);
}


function sanitize_name(name, field, cb) {
    var regex_at_least_one_letter = /([a-zA-Z]+)/g;
    var n = $.trim(name);
    if (n == "") {
	return cb(null);
    }
    if (n.match(regex_at_least_one_letter) == null) {
	return cb(null);
    }
    if (n.length <= 3) {
	return cb(null);
    }
    return cb(n, field);
}


function sanitize_address(address, field, cb) {
    get_address_components(address, function(result) {
	    if (result["total_results"] > 1) {
		return cb(null);
	    }
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
		    return cb(null);
		}
	    }
	    canonical_address = "street-number: " + pa["street_number"]["long_name"];
	    canonical_address += ", street: " + pa["street"]["long_name"];
	    canonical_address += ", city: " + pa["city"]["long_name"];
	    canonical_address += ", state: " + pa["state"]["long_name"];
	    canonical_address += ", zipcode: " + pa["zipcode"]["long_name"];
	    canonical_address += ", country: " + pa["country"]["long_name"];
	    console.log("DELETE ME: Canonical address('" + address + "'): " + canonical_address);

	    result["pa"] = pa;
	    result["canonical_address"] = canonical_address;

	    return cb(result, field);
	});
}


function get_pi_type(field) {
    if (field.match(/username/g)) {
	return "username";
    } else if (field.match(/name/g)) {
	return "name";
    } else if (field.match(/email/g)) {
	return "email";
    } else if (field.match(/address/g)) {
	return "address";
    } else if (field.match(/phone/g)) {
	return "phone";
    } else if (field.match(/ccn/g)) {    
	return "ccn";
    } else if (field.match(/ssn/g)) {
	return "ssn";
    }
}


function get_all_pi_of_type(type) {
    var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;
    var pi_values = Object.keys(vpfvi);

    var rc = {};

    for (i = 0; i < pi_values.length; i++) {
	var v = pi_values[i];
	if (vpfvi[v]["type"] == type) {
	    rc[v] = vpfvi[v];
	}
    }
    return rc;
}


function get_next_identifier_of_type(type) {
    var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;
    var pi_values = Object.keys(vpfvi);
    var identifier_array = [];

    for (i = 0; i < pi_values.length; i++) {
	var v = pi_values[i];
	if (vpfvi[v]["type"] == type) {
	    identifier_array.push(vpfvi[v]["identifier"]);
	}
    }

    var j = 1;
    var value_identifier = null;
    //Just to check that this identifier does not already exist.
    while(1) {
	value_identifier = type + j;
	if (identifier_array.indexOf(value_identifier) == -1) {
	    break;
	}
	j++;
    }
    return value_identifier;
}


function add_single_value_to_pi_field_value_identifiers(domain, field, value, detection_method) {
    var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;
    var is_verified = false;
    var type = get_pi_type(field);

    var additional_values = {};

    if (type == "address") {
	additional_values["full-address"] = value["pa"];
	value = value["canonical_address"];
    }

    if (field.match(/^verified/)) {
	is_verified = true;
    }
    
    if (value in vpfvi) {
	if (vpfvi[value]["sites"].indexOf(domain) == -1) {
	    vpfvi[value]["sites"].push(domain);
	    vpfvi[value]["detection-method"].push(detection_method);
	}
	if (is_verified && (vpfvi[value]["verified"] == "no")) {
	    vpfvi[value]["verified"] = "yes";
	}
    } else {
	var value_identifier = get_next_identifier_of_type(type);
	var verified = (is_verified) ? "yes" : "no";

	vpfvi[value] = {
	    'identifier': value_identifier,
	    'field': field,
	    'type' : type,
	    'verified': verified,
	    'sites': [domain],
	    'detection-method' : [detection_method],
	    'additional-notes' : {},
	    'additional-values' : additional_values,
	};
    }

    flush_selective_entries("aggregate_data", ["pi_field_value_identifiers"]);
    return value_identifier;
}


function sanitize_value(type, value, field, cb) {
    if (type == "name" || type == "username" || type == "email") {
	return sanitize_name(value, field, cb);
    } else if (type == "address") {
	return sanitize_address(value, field, cb);
    } else if (type == "phone") {
	return sanitize_phone(value, field, cb);
    } else if (type == "ccn") {
	return sanitize_ccn(value, field, cb);
    } else if (type == "ssn") {
	return sanitize_ssn(value, field, cb);
    } 
    return null;
}


function flush_to_pi_field_value_identifiers(domain, sanitized_field_values, detection_method) {
    for (var field in sanitized_field_values) {
	var type = get_pi_type(field);
	var value_array = sanitized_field_values[field];
	for (var i = 0; i < value_array.length; i++) {
	    add_single_value_to_pi_field_value_identifiers(domain, field, value_array[i], detection_method);
	}
    }
}


function add_single_field_with_multiple_values_to_per_site_pi(domain, pi_field, pi_value_array) {
    var pi_name = get_pi_type(pi_field);
    pi_name = pi_name.toLowerCase();

    if (pi_name == "address") {
	var new_pi_value_array = [];
	for (var i = 0; i < pi_value_array.length; i++) {
	    new_pi_value_array.push(pi_value_array[i]["canonical_address"]);
	}
	pi_value_array = new_pi_value_array;
    }

    console.log("APPU DEBUG: adding to per_site_pi, domain: " + domain + ", name:" + pi_name + ", value:" 
		+ pi_value_array);

    // Nullify the previously existing value in case of
    // refetch after 'X' number of days.
    pii_vault.aggregate_data.per_site_pi[domain][pi_name] = {};
    pii_vault.aggregate_data.per_site_pi[domain][pi_name].values = [];

    var domain_pi = pii_vault.aggregate_data.per_site_pi[domain];
    //pi_value could be an array in case of a vector
    var new_arr = domain_pi[pi_name].values.concat(pi_value_array);

    //eliminate duplicates.
    //e.g. over time, if we fetch pi from same site,
    //(for additions like addresses/ccns) then 
    //remove duplicates.
    unique_new_arr = new_arr.filter(function(elem, pos) {
	return new_arr.indexOf(elem) == pos;
    })

    domain_pi[pi_name].values = unique_new_arr;
}

function flush_to_per_site_pi(domain, sanitized_field_values, detection_method) {
    var old_pi_values = (domain in pii_vault.aggregate_data.per_site_pi) ? 
	pii_vault.aggregate_data.per_site_pi[domain] : {};

    //Make it blank first.
    pii_vault.aggregate_data.per_site_pi[domain] = {};

    pii_vault.aggregate_data.per_site_pi[domain]['attempted_download_time'] = 
	old_pi_values['attempted_download_time'];
    pii_vault.aggregate_data.per_site_pi[domain]['user_approved'] =
	old_pi_values['user_approved'];

    var new_per_site_pi = pii_vault.aggregate_data.per_site_pi[domain];

    for (var pi_field in sanitized_field_values) {
	var all_values = sanitized_field_values[pi_field];
	if (all_values.length > 0) {
	    var pi_name = get_pi_type(pi_field);
	    add_single_field_with_multiple_values_to_per_site_pi(domain, pi_field, all_values);
	    new_per_site_pi[pi_name].change_type = 'added';
	    if (pi_name in old_pi_values && ('values' in old_pi_values[pi_name])) {
		if (new_per_site_pi[pi_name].values.sort().join(", ") == 
		    old_pi_values[pi_name].values.sort().join(", ")) {
	    	    new_per_site_pi[pi_name].change_type = 'no-change';
		}
		else {
	    	    new_per_site_pi[pi_name].change_type = 'modified';
		}
	    }
	}
    }

    new_per_site_pi.download_time = new Date();

    for (var pi_field in old_pi_values) {
	if (!(pi_field in new_per_site_pi) && (old_pi_values[pi_field].change_type != 'deleted')) {
	    new_per_site_pi[pi_field] = { 
		'values' : undefined, 
		'change_type': 'deleted'
	    };
	}
    }

    console.log("APPU DEBUG: Current per_site_pi: " + JSON.stringify(pii_vault.aggregate_data.per_site_pi[domain]));
    flush_selective_entries("aggregate_data", ["per_site_pi"]);
}


function calculate_new_downloaded_pi_structure(domain) {
    var new_per_site_pi = pii_vault.aggregate_data.per_site_pi[domain];

    var downloaded_fields = [];

    for (field in new_per_site_pi) {
	if (field == 'download_time' ||
	    field == 'attempted_download_time' ||
	    field == 'user_approved') {
	    continue;
	}

	var t = { 
	    'field': field, 
	    'change_type': new_per_site_pi[field].change_type
	}
	if (new_per_site_pi[field].values == undefined) {
	    t.num_values = 0;
	}
	else {
	    t.num_values = new_per_site_pi[field].values.length;
	}
	downloaded_fields.push(t);
    }

    //Update current report
    pii_vault.current_report.downloaded_pi[domain] = {
	'download_time' : new_per_site_pi.download_time,
	'downloaded_fields' : downloaded_fields,
    };
    flush_selective_entries("current_report", ["downloaded_pi"]);
}

// Returns dictionary: 
// Keys --> field names
// Value --> Dictionary-2
// 
// Dictionary-2: 
// Keys -- Actual values such as "abc@bbc.com" etc
// Values -- Sites sharing those common values
//
// The result is private. Should not go out without anonymization processing. 
function get_all_pi_data() {
    var r = {};

    var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;
    var pi_actual_values = Object.keys(vpfvi);

    for (i = 0; i < pi_actual_values.length; i++) {
	var pi_single_value = pi_actual_values[i];
	var pi_single_value_attributes = vpfvi[pi_single_value];
	var type = pi_single_value_attributes["type"];
	var sites = pi_single_value_attributes["sites"];

	if (!(type in r)) {
	    r[type] = {};
	}

	if (!(pi_single_value in r[type])) {
	    r[type][pi_single_value] = ""; 
	}

	r[type][pi_single_value] = sites.join(", ");
    }
    return r;
}


function calculate_new_common_fields_structure() {
    var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;
    var pi_actual_values = Object.keys(vpfvi);
    var common_fields = {};

    for (i = 0; i < pi_actual_values.length; i++) {
	var pi_single_value = pi_actual_values[i];
	var pi_single_value_attributes = vpfvi[pi_single_value];
	var value_identifier = pi_single_value_attributes["identifier"];
	var sites = pi_single_value_attributes["sites"];
	if (!(value_identifier in common_fields)) {
	    common_fields[value_identifier] = {};
	}

	for (key in pi_single_value_attributes) {
	    if (key == 'additional-values') {
		continue;
	    }
	    common_fields[value_identifier][key] = pi_single_value_attributes[key];
	}
    }

    pii_vault.current_report.common_fields = common_fields;
    flush_selective_entries("current_report", ["common_fields"]);
}


function store_fpi_data_for_site(domain, sanitized_field_values, detection_method) {
    // add to pi_field_value_identifiers (aggregate_data)
    flush_to_pi_field_value_identifiers(domain, sanitized_field_values, detection_method);

    // add to per_site_pi (aggregate_data)
    flush_to_per_site_pi(domain, sanitized_field_values, detection_method);

    // calculate downloaded_pi (current_report)
    calculate_new_downloaded_pi_structure(domain);

    // calculate common_fields (current_report)
    calculate_new_common_fields_structure();
}

// Following should be called instead of store_per_site_pi_data()
function sanitize_and_store_downloaded_fpi_data(domain, site_pi_fields, detection_method) {
    var sanitized_field_values = {};
    var domain = get_domain(domain);

    var pending_sanitize_values = 0;
    for (var field in site_pi_fields) {
	pending_sanitize_values += site_pi_fields[field].value.length;
    }

    // domain, field, type, accumulation

    for (var field in site_pi_fields) {
	var type = get_pi_type(field);
	var value_array = site_pi_fields[field].value;
	for (var i = 0; i < value_array.length; i++) {
	    var type = type;
	    var field = field;

	    sanitize_value(type, value_array[i], field, function(value, nf) {
			    pending_sanitize_values -= 1;
			    console.log("DELETE ME: inside here field: " + nf);
			    if (value != null) {
				if (!(nf in sanitized_field_values)) {
				    sanitized_field_values[nf] = [];
				}
				sanitized_field_values[nf].push(value);
			    }
			    if (pending_sanitize_values <= 0) {
				store_fpi_data_for_site(domain, sanitized_field_values, detection_method);
			    }
			});
	}
    }
}


// Checks if the username has identifier associated with it.
// If there is, it returns the identifier.
// Otherwise, creates an identifier for that username and returns it.
function get_username_identifier(domain, username, bool_add_if_not_present) {
    var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;
    var username_identifier_prefix = "";

    var regex_at_least_one_letter = /([a-zA-Z]+)/g;
    var username = $.trim(username);
    if (username == "") {
	return null;
    }
    if (username.match(regex_at_least_one_letter) == null) {
	return null;
    }

    bool_add_if_not_present = (bool_add_if_not_present == undefined) ? false: bool_add_if_not_present;

    if (username.indexOf("@") == -1) {
	username_identifier_prefix = "username";
    }
    else {
	username_identifier_prefix = "email";
    }

    var username_identifier = undefined;
    if (username in vpfvi) {
	username_identifier = vpfvi[username]["identifier"];
    }
    else if (bool_add_if_not_present) {
	username_identifier = add_single_value_to_pi_field_value_identifiers(domain, 
									     username_identifier_prefix, 
									     username, 
									     "active");
    }
    return username_identifier;
}


function does_username_have_identifier(username) {
    var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;
    if (username in vpfvi) {
	return true;
    }
    return false;
}


// Accepts identifier like "username2" and returns it length and actual identifier-value
function get_idenfier_value(identifier) {
    var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;
    for (var i in vpfvi) {
	if (vpfvi[i]['identifier'] == identifier) {
	    return [i.length, i];
	}
    }
    return [0, undefined];
}


function get_all_values_of_types(types, bool_include_full_email) {
    bool_include_full_email = (bool_include_full_email == undefined) ? false : bool_include_full_email;

    var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;

    var name_regexes = [
			/username([0-9]+)/g,
			/^name([0-9]+)/g,
			/last-name([0-9]+)/g,
			/first-name([0-9]+)/g,
			/email([0-9]+)/g,
			];

    var all_usernames = [];

    for (var pi_value in vpfvi) {
	var pi_value_attributes = vpfvi[pi_value];
	var pi_value_type = pi_value_attributes["type"];
	if (types.indexOf(pi_value_type) != -1) {
	    var uname = pi_value;
	    var complete_uname = pi_value;

	    if (bool_include_full_email &&
		type == "email" &&
		complete_uname.length > 3) {
		uname = uname;
	    } else {
		uname = uname.split("@")[0];
	    }

	    if (all_usernames.indexOf(uname) == -1 &&
		uname.length > 3) {
		all_usernames.push(uname);
	    }
	}
    }
    return all_usernames;
}


//Should return values with attribute whether it is
// verified information or not.
function get_pi(pi_type) {
    var vpfvi = pii_vault.aggregate_data.pi_field_value_identifiers;
    var pi = {};

    for (var pi_value in vpfvi) {
	var pi_value_attributes = vpfvi[pi_value];
	var identifier = pi_value_attributes["identifier"];
	var type = pi_value_attributes["type"];
	var is_verified = (pi_value_attributes["verified"] == 'yes') ? true: false;

	if (type == pi_type) {
	    if (pi_type != "address") {
		pi[pi_value] = "not-verified";
		if (is_verified) {
		    pi[pi_value] = "verified";
		} 
	    } else {
		pi[pi_value] = {
		    "full-address": pi_value_attributes["additional-values"]["full-address"],
		    "verified": "not-verified",
		};

		if (is_verified) {
		    pi[pi_value] = "verified";
		} 
	    }
	}
    }
    return pi;
}