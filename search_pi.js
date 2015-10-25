

function find_deepest_nodes_matching_text(text, context, is_visible) {
    var me = null;
    var filter_text = ":not(script):not(style):not(head)";

    is_visible = (is_visible == undefined) ? "" : ":visible";

    if (context == undefined) {
	me = $("*:Contains('" + text + "')" + is_visible).filter(filter_text);
    } else {
	me = $("*:Contains('" + text + "')" + is_visible, context).filter(filter_text);
    }

    var all_parents = null;

    if (context == undefined) {
	all_parents = $(me).parents();
    } else {
	all_parents = $(me).parentsUntil(context);
    }

    return $(me).not(all_parents);
}

function extract_numbers_and_match(search_number, surrounding_string) {
    var extracted_numbers = surrounding_string.match(/\d+/g);
    if (extracted_numbers) {
	for (var i = 0; i < extracted_numbers.length; i++) {
	    var re = new RegExp(search_number + "$", 'g');
	    
	    if (extracted_numbers[i].match(re) != null) {
		return true;
	    }
	}
    }
    return false;
}


function is_search_text_present(search_text, parent_elem, text_type) {
    if (text_type == "string") {
	var surrounding_text = $(parent_elem).text().toLowerCase();
	if (surrounding_text.indexOf(search_text) != -1) {
	    return true;
	}
	return false;
    } else if (text_type == "numbers") {
	var just_the_parent_text = $(parent_elem)
	    .clone()    
	    .children() 
	    .remove()   
	    .end()  
	    .text();

	just_the_parent_text = just_the_parent_text.trim();
	if (just_the_parent_text.length != 0) {
	    if (extract_numbers_and_match(search_text, just_the_parent_text)) {
		return true;
	    }
	}

	var kids = $(parent_elem).children();
	if (kids.length == 0) {
	    return false;
	}

	for (var j = 0; j < kids.length; j++) {
	    var rc = is_search_text_present(search_text, kids[j], text_type);
	    if (rc == true) {
		return true;
	    }
	}
    }

    return false;
}


function is_text_present_in_nearby_elements(search_text, curr_elem, text_limit_length, text_type) {
    var max_traverse = 5;
    var original_text = $(curr_elem).text().toLowerCase();    
    var surrounding_text = "";

    text_limit_length = (text_limit_length == undefined) ? 100 : text_limit_length;
    text_type = (text_type == undefined) ? "string" : text_type;

    while (max_traverse > 0) {
	curr_elem = $(curr_elem).parent();
	if (curr_elem.length == 0) {
	    break;
	}

	surrounding_text = $(curr_elem).text().toLowerCase();

	if (original_text != surrounding_text) {
	    break;
	}
	max_traverse -= 1;
    }

    if (surrounding_text.length > text_limit_length) {
	return [false, null];
    }

    if (is_search_text_present(search_text, curr_elem, text_type)) {
	return [true, curr_elem];
    }

    return [false, null];
}

function find_text_with_label(text, label, text_limit_length, text_type) {
    text_limit_length = (text_limit_length == undefined) ? 1000 : text_limit_length;
    text_type = (text_type == undefined) ? "string" : text_type;

    var all_elems_containing_label = find_deepest_nodes_matching_text(label);
    for (var i = 0; i < all_elems_containing_label.length; i++) {
	var r = is_text_present_in_nearby_elements(text, all_elems_containing_label[i], text_limit_length, text_type);
	if (r[0] == true) {
	    return true;
	}
    }
}

function get_common_ancestor(a, b, context) {
    $parentsa = $(a).parentsUntil(context);
    $parentsb = $(b).parentsUntil(context);

    var found = null;

    $parentsa.each(function() {
	    var thisa = this;

	    $parentsb.each(function() {
		    if (thisa == this) {
			found = this;
			return false;
		    }
		});

	    if (found) return false;
	});

    return found;
}

function find_date_with_label(orig_date, label) {
    var all_elems_containing_label = find_deepest_nodes_matching_text(label);
    for (var i = 0; i < all_elems_containing_label.length; i++) {
	var year = orig_date.getFullYear();
	var month_string_short = orig_date.toDateString().split(" ")[1];
	var monthnames = ["January", "February", "March", "April", "May", "June",
			  "July", "August", "September", "October", "November", "December"
			  ];
	var month_string_full = monthnames[orig_date.getMonth()];
	var month_digit = orig_date.getMonth() + 1;

	var is_year_present = is_text_present_in_nearby_elements(year, all_elems_containing_label[i], 100, "numbers");
	if (is_year_present[0] == true) {
	    var is_month_present = [false, null];
	    is_month_present = is_text_present_in_nearby_elements(month_string_short, all_elems_containing_label[i], 
								  100, "string");
	    if (!is_month_present[0]) {
		is_month_present = is_text_present_in_nearby_elements(month_string_full, all_elems_containing_label[i], 
								      100, "string");
		if (!is_month_present[0]) {
		    is_month_present = is_text_present_in_nearby_elements(month_digit, all_elems_containing_label[i], 
									  100, "numbers");
		    if (!is_month_present[0]) {
			// Month is not present near current element containing label (e.g. birthdate)
			// Moving to next label matching element
			continue;
		    }
		}
	    }

	    var common_parent = get_common_ancestor(is_year_present[1], is_month_present[1], all_elems_containing_label[i]);

	    var found_date = new Date(common_parent.text());
	    var orig_date = new Date(date.text());
	    if (found_date == "Invalid Date") {
		continue;
	    } 
	    
	    if (found_date.toString() == orig_date.toString()) {
		return true;
	    }
	}
    }
    return false;
}

function distance_between_elements(e1, e2) {
    var x = $(e1).offset().left + $(e1).width()/2;
    var y = $(e1).offset().top + $(e1).height()/2;
    var center1 = {
	'x': x, 
	'y': y, 
    };

    x = $(e2).offset().left + $(e2).width()/2;
    y = $(e2).offset().top + $(e2).height()/2;
    var center2 = {
	'x': x,
	'y': y,
    };

    var d = Math.pow((center1.x - center2.x), 2) + Math.pow((center1.y - center2.y), 2);
    d = Math.sqrt(d);
    return d;
}

function is_address_present(address) {
    var address_fields = address.split(", ");
    var address_fields_elements = {};
    
    var not_all_fields_found = false;
    for (var j = 0; j < address_fields.length; j++) {
	var e = find_deepest_nodes_matching_text(address_fields[j]);
	if (e.length == 0) {
	    not_all_fields_found = true;
	    break;
	}
	if (!(address_fields[j] in address_fields_elements)) {
	    address_fields_elements[address_fields[j]] = e;
	}
    }
    
    if (not_all_fields_found == true) {
	return false;
    }
    
    var first_field_elem = address_fields_elements[address_fields[0]];
    for (var k = 0; k < first_field_elem.length; k++) {
	var last_touching_elem = first_field_elem[k];
	var not_all_fields_are_touching = false;
	for (var m = 1; m < address_fields.length; m++) {
	    last_touching_elem = $(last_touching_elem).touching(address_fields_elements[m], {'includeSelf': true});
	    if (last_touching_elem.length == 0) {
		not_all_fields_are_touching = true;
		break;
	    }
	}
	if (not_all_fields_are_touching == false) {
	    return true;
	}
    }
    
    return false;
}

function is_above_element(focus_elem, test_elem) {
    var test_elem_bottom = $(test_elem).offset().top + $(test_elem).height();
    var focus_elem_start = $(focus_elem).offset().top;
    return (test_elem_bottom < focus_elem_start);
}

function is_on_the_left_of_elment(focus_elem, test_elem) {
    var test_elem_right = $(test_elem).offset().left + $(test_elem).width();
    var focus_elem_left = $(focus_elem).offset().left;
    return (test_elem_right < focus_elem_left);
}

// When given a couple of search strings, returns set of elements
//  that are close to each other and contain those search strings
function are_address_components_present(full_address) {
    var matching_element_sets = {};
    var street_combos = [];
    var combo = null;

    combo = [full_address["street_number"].long_name, full_address["street"].long_name].join(" ");
    if (street_combos.indexOf(combo) == -1) {
	street_combos.push(combo);
    }
    combo = [full_address["street_number"].long_name, full_address["street"].long_name].join(", ");
    if (street_combos.indexOf(combo) == -1) {
	street_combos.push(combo);
    }

    combo = [full_address["street_number"].long_name, full_address["street"].short_name].join(" ");
    if (street_combos.indexOf(combo) == -1) {
	street_combos.push(combo);
    }

    combo = [full_address["street_number"].long_name, full_address["street"].short_name].join(", ");
    if (street_combos.indexOf(combo) == -1) {
	street_combos.push(combo);
    }

    var all_street_matches = $();
    for (var i = 0; i < street_combos.length; i++) {
	all_street_matches = all_street_matches.add(find_deepest_nodes_matching_text(street_combos[i]));
    }

    if (all_street_matches.length == 0) {
	return false;
    }

    var city_long = full_address["city"].long_name;
    var city_short = full_address["city"].short_name;
    var all_city_matches = $();
    all_city_matches = all_city_matches.add(find_deepest_nodes_matching_text(city_long));
    all_city_matches = all_city_matches.add(find_deepest_nodes_matching_text(city_short));

    var state_long = full_address["state"].long_name;
    var state_short = full_address["state"].short_name;
    var all_state_matches = $();
    all_state_matches = all_state_matches.add(find_deepest_nodes_matching_text(state_long));
    all_state_matches = all_state_matches.add(find_deepest_nodes_matching_text(state_short));

    var zipcode = full_address["zipcode"].long_name;
    var all_zipcode_matches = $();
    all_zipcode_matches = all_state_matches.add(find_deepest_nodes_matching_text(zipcode));

    var city_found = false;
    var state_found = false;
    var zipcode_found = false;

    for (var i = 0; i < all_street_matches.length; i++) {
	var top_addr_line = all_street_matches[i];
	var nearby_zipcode_elem = $(top_addr_line).nearest(all_zipcode_matches, {tolerance: 50, sameX: true, includeSelf: true})
	    .filter(function() { return !$.contains(this, top_addr_line); })
	    .filter(function() { return !is_above_element(top_addr_line, this); });

	if (nearby_zipcode_elem.length > 0) {
	    return true;
	}

	var nearby_city_elem = $(top_addr_line).nearest(all_city_matches, {tolerance: 50, sameX: true, includeSelf: true})
	    .filter(function() { return !$.contains(this, top_addr_line); })
	    .filter(function() { return !is_above_element(top_addr_line, this); });

	if (nearby_city_elem.length > 0) {
	    city_found = true;
	}

	var nearby_state_elem = $(top_addr_line).nearest(all_state_matches, {tolerance: 50, sameX: true, includeSelf: true})
	    .filter(function() { return !$.contains(this, top_addr_line); })
	    .filter(function() { return !is_above_element(top_addr_line, this); });

	if (nearby_state_elem.length > 0) {
	    state_found = true;
	}

	if (city_found && state_found) {
	    return true;
	}
    }
    return false;
}

function get_common_phone_formats(phone) {
    var p1 = phone.substring(0,3); 
    var p2 = phone.substring(3,6); 
    var p3 = phone.substring(6,10); 
    
    var pats = [];
    pats.push(p1 + p2 + p3);
    pats.push(p1 + " " + p2 + " " + p3);
    pats.push(p1 + "-" + p2 + "-" + p3);
    pats.push("(" + p1 + ") " + p2 + " " + p3);
    pats.push("(" + p1 + ") " + p2 + p3);
    pats.push("(" + p1 + ") " + p2 + "-" + p3);
    
    return pats;
}

// Returns closest element from second set for each element in first set.
// Threshold tells amount of acceptable distance between elements.
// Constraint is "sameX" or "sameY"
function find_pairs_of_closest_elements(set_one, set_two, threshold, constraint) {
    var pairs = [];
    var samex = false;
    var samey = false;
    var is_it_a_preceding_element = null;

    threshold = (threshold == undefined) ? 50 : threshold;

    if (constraint == "sameX") {
	samex = true;
	is_it_a_preceding_element = is_above_element;
    } else if (constraint == "sameY") {
	samey = true;
	is_it_a_preceding_element = is_on_the_left_of_elment;
    }

    for (var i = 0; i < set_one.length; i++) {
	var ne = $(set_one[i]).nearest(set_two, {tolerance: threshold, sameX: samex, sameY: samey, includeSelf: true})
	    .filter(function() { 
		    if ($.contains(this, set_one[i])) {
			return false;
		    }
		    if (is_it_a_preceding_element != null) {
			return !is_it_a_preceding_element(set_one[i], this);
		    }
		    return true;
		});

	if (ne.length > 0) {
	    var a = $();
	    a = a.add(set_one[i]);
	    a = a.add(ne);
	    pairs.push(a);
	}
    }
    return pairs;
}


function should_we_check_for_credit_cards() {
    var elems_that_could_have_ccns_nearby = $();
    var elems_with_credit_text = find_deepest_nodes_matching_text("credit", undefined, true);
    if (elems_with_credit_text.length > 0) {
	var elems_with_card_text = find_deepest_nodes_matching_text("card", undefined, true);
	if (elems_with_card_text.length > 0) {
	    var t = elems_with_card_text
		.filter(function() { 
			for(var q = 0; q < elems_with_credit_text.length; q++) { 
			    if($(this).is(elems_with_credit_text[q])) { 
				return true;
			    }
			} 
			return false; 
		    });

	    elems_that_could_have_ccns_nearby = elems_that_could_have_ccns_nearby.add(t); 
	}
    }
    return elems_that_could_have_ccns_nearby;
}


function check_if_pi_present() {
    if (pi_list == null) {
	return;
    }
    console.log("APPU DEBUG: Detecting if known PIs are present on the webpage");
    name_is_present = false;
    present_pi = {};

    var names = Object.keys(pi_list['names']);
    var phones = Object.keys(pi_list['phones']);
    var emails = Object.keys(pi_list['emails']);

    var addresses = Object.keys(pi_list['addresses']);
    var ssns = Object.keys(pi_list['ssns']);
    var ccns = Object.keys(pi_list['ccns']);

    present_pi["names"] = [];
    for (var i = 0; i < names.length; i++) {
	var r = find_deepest_nodes_matching_text(names[i]);
	if (r.length > 0) {
	    present_pi["names"].push(names[i]);
	}
    }

    if (present_pi["names"].length > 0) {
	name_is_present = true;
    } else {
	return present_pi;
    }

    if ($(":Contains('phone')").length > 0) {
	present_pi["phones"] = [];
	for (var i = 0; i < phones.length; i++) {
	    if (phones[i].length != 10) {
		continue;
	    }

	    var pats = get_common_phone_formats(phones[i]);

	    for (var k = 0; k < pats.length; k++) {
		if ($(":Contains('" + pats[k] + "')").length > 0) {
		    present_pi["phones"].push(phones[i]);
		    break;
		}
	    }
	}
    }

    present_pi["emails"] = [];
    for (var i = 0; i < emails.length; i++) {
	var r = $(":Contains('" + emails[i] + "')");
	if (r.length > 0) {
	    present_pi["emails"].push(emails[i]);
	}
    }

    if ($(":Contains('social security')").length > 0) {
	present_pi["ssns"] = [];
	for (var i = 0; i < ssns.length; i++) {
	    if (ssns[i].length != 3) {
		continue;
	    }

	    var r = find_text_with_label(ssns[i], 'social security', 50, "numbers");

	    if (r) {
		present_pi["ssns"].push(ssns[i]);
	    }
	}
    }


    var elems_that_could_have_ccns_nearby = should_we_check_for_credit_cards();
    if (elems_that_could_have_ccns_nearby.length > 0) {
	present_pi["ccns"] = [];
	elems_with_ccns = $();
	for (var i = 0; i < ccns.length; i++) {
	    if (ccns[i].length != 4) {
		continue;
	    }

	    var r = find_deepest_nodes_matching_text(ccns[i]);

	    if (r.length > 0) {
		for (var p = 0; p < elems_that_could_have_ccns_nearby.length; p++) {
		    var e = elems_that_could_have_ccns_nearby[p];
		    var ne = $(e).nearest(r, {includeSelf: true})
		              .filter(function() { 
				      if ($.contains(this, e)) {
					  return false;
				      }

				      return !is_above_element(e, this);
				  });
		    if (ne.length > 0) {
			if (distance_between_elements(ne, e) < 100) {
			    present_pi["ccns"].push(ccns[i]);
			}
		    }
		}
	    }
	}
    }

    present_pi["addresses"] = [];
    for (var i = 0; i < addresses.length; i++) {
	var address = addresses[i];
	
// 	if (is_address_present(address)) {
// 	    present_pi["addresses"].push(addresses[i]);
// 	}

	if (are_address_components_present(pi_list["addresses"][address]["full-address"])) {
	    present_pi["addresses"].push(addresses[i]);
	}

    }


    message.type = "detected_pi";
    message.domain = document.domain;
    message.present_pi = present_pi;
    
    chrome.extension.sendMessage("", message);
    return;
}


var username_check_id = 1;
function check_if_username_present(usernames, operation_mode, check_only_visible) {
    var present_usernames = {
	frequency: {},
	elem_list: [],
	present_in_username_region: [],
    };

    var all_elements = $();
    var longest_usernames = {};
    var closest_username = null;

    var scrheight = $(window).height();
    var scrwidth = $(window).width();

    scrheight = scrheight/3;
    scrwidth = scrwidth/3;

    console.log("APPU DEBUG: Detecting if known usernames are present on the webpage for: " + operation_mode);

    for (var i = 0; i < usernames.length; i++) {
	var me = find_deepest_nodes_matching_text(usernames[i]);
	var mel = me.length;
	if (mel > 0) {
	    if (!(usernames[i] in present_usernames.frequency)) {
		present_usernames.frequency[usernames[i]] = 0;
	    }
	    present_usernames.frequency[usernames[i]] += mel;

	    for (var j = 0; j < me.length; j++) {

		var etop = $(me).offset().top;
		var eleft = $(me).offset().left;

		if ((etop < scrheight) || (eleft < scrwidth)) {
		    if (present_usernames.present_in_username_region.indexOf(usernames[i]) == -1) {
			present_usernames.present_in_username_region.push(usernames[i]);
		    }
		} 

		var curr_id = null;
		if ($(me[j]).data("username_check_id") == undefined) {
		    $(me[j]).data("username_check_id", username_check_id);
		    username_check_id += 1;
		}

		curr_id = $(me[j]).data("username_check_id");
		if (curr_id in longest_usernames) {
		    if (longest_usernames[curr_id].length < usernames[i].length) {
			longest_usernames[curr_id] = usernames[i];
		    }
		} else {
		    longest_usernames[curr_id] = usernames[i];
		}
	    }

	    all_elements = all_elements.add(me);
	}
    }

    all_elements = $.unique(all_elements);
    if (all_elements.length > 0) {
	var closest = $.nearest({x: 0, y: 0}, all_elements);
	if (closest != null) {
	    closest = closest[0];
	}
	var closest_id = $(closest).data("username_check_id");
	if (closest_id in longest_usernames) {
	    closest_username = longest_usernames[closest_id];
	}
    }

    if (present_usernames.present_in_username_region.length > 0) {
	are_usernames_present = true;
    }

    return {
	"present_usernames": present_usernames,
	"closest_username": closest_username,
    };
}
