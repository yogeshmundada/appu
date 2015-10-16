
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

function is_above_elment(focus_elem, test_elem) {
    var test_elem_bottom = $(test_elem).offset().top + $(test_elem).height();
    var focus_elem_start = $(focus_elem).offset().top;
    return (test_elem_bottom <= focus_elem_start);
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

    var all_matches = $();
    for (var i = 0; i < street_combos.length; i++) {
	all_matches = all_matches.add(find_deepest_nodes_matching_text(street_combos[i]));
    }

    if (all_matches.length == 0) {
	return false;
    }

    var city_long = full_address["city"].long_name;
    var city_short = full_address["city"].short_name;

    var state_long = full_address["state"].long_name;
    var state_short = full_address["state"].short_name;

    var zipcode = full_address["zipcode"].long_name;

    var city_found = false;
    var state_found = false;
    var zipcode_found = false;

    for (var i = 0; i < all_matches.length; i++) {
	var top_addr_line = all_matches[i];
	var nearby_elem = $(top_addr_line).nearest(':visible', {tolerance: 50, sameX: true})
	    .filter(function() { return !$.contains(this, top_addr_line); })
	    .filter(function() { return !is_above_elment(top_addr_line, this); });

	var nearby_elem_parents = $(nearby_elem).parent();

	if (find_deepest_nodes_matching_text(zipcode, $(nearby_elem).parent()).length > 0) {
	    zipcode_found = true;
	    return true;
	}

	if (find_deepest_nodes_matching_text(city_long, $(nearby_elem).parent()).length > 0) {
	    city_found = true;
	    return true;
	} else if (find_deepest_nodes_matching_text(city_short, $(nearby_elem).parent()).length > 0) {
	    city_found = true;
	    return true;
	}

	if (find_deepest_nodes_matching_text(state_short, $(nearby_elem).parent()).length > 0) {
	    state_found = true;
	    return true;
	} else if (find_deepest_nodes_matching_text(state_long, $(nearby_elem).parent()).length > 0) {
	    state_found = true;
	    return true;
	}
    }
    return false;
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
    var birthdates = Object.keys(pi_list['birthdates']);
    var occupations = Object.keys(pi_list['occupations']);
    var employments = Object.keys(pi_list['employments']);
    var schools = Object.keys(pi_list['schools']);

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

	    var p1 = phones[i].substring(0,3); 
	    var p2 = phones[i].substring(3,6); 
	    var p3 = phones[i].substring(6,10); 

	    var pat1 = p1 + p2 + p3;
	    var pat2 = p1 + " " + p2 + " " + p3;
	    var pat3 = p1 + "-" + p2 + "-" + p3;
	    var pat4 = "(" + p1 + ") " + p2 + " " + p3;
	    var pat5 = "(" + p1 + ") " + p2 + p3;
	    var pat6 = "(" + p1 + ") " + p2 + "-" + p3;
	    
	    var pats = [pat1, pat2, pat3, pat4, pat5, pat6];

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

    if ($(":Contains('credit card')").length > 0) {
	present_pi["ccns"] = [];
	for (var i = 0; i < ccns.length; i++) {
	    if (ccns[i].length != 4) {
		continue;
	    }

	    var r = find_text_with_label(ccns[i], 'credit card', 100, "numbers");

	    if (r) {
		present_pi["ccns"].push(ccns[i]);
	    }
	}
    }

    if ($(":Contains('birth')").length > 0) {
	present_pi["birthdates"] = [];
	for (var i = 0; i < birthdates.length; i++) {
	    var d = new Date(birthdates[i]);
	    var rc = find_date_with_label(d, "birth");

	    if (rc == true) {
		present_pi["birthdates"].push(birthdates[i]);
	    }
	}
    }

    if ($(":Contains('occupation')").length > 0) {
	present_pi["occupations"] = [];
	for (var i = 0; i < occupations.length; i++) {
	    var r = find_text_with_label(occupations[i], 'occupation', 200, "string");
	    if (r == true) {
		present_pi["occupations"].push(occupations[i]);
	    }
	}
    }    

    if ($(":Contains('employment')").length > 0) {
	present_pi["employments"] = [];
	for (var i = 0; i < employments.length; i++) {
	    var r = find_text_with_label(employments[i], 'employment', 200, "string");
	    if (r == true) {
		present_pi["employments"].push(employments[i]);
	    }
	}
    }    

    if ($(":Contains('school')").length > 0) {
	present_pi["schools"] = [];
	for (var i = 0; i < schools.length; i++) {
	    var r = find_text_with_label(schools[i], 'school', 200, "string");
	    if (r == true) {
		present_pi["schools"].push(schools[i]);
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
	elem_list: []
    };

    var all_elements = $();
    var longest_usernames = {};
    var closest_username = null;

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

    return {
	"present_usernames": present_usernames,
	"closest_username": closest_username,
	    };


//     check_only_visible = (check_only_visible == undefined) ? true : check_only_visible;
//     check_only_visible = (check_only_visible == true) ? ":visible" : "";

//     var elements_with_usernames = $();
//     for (var i = 0; i < usernames.length; i++) {
// 	elements_with_usernames = elements_with_usernames.add($(":Contains('" + usernames[i] + "')" + check_only_visible));
//     }
//     elements_with_usernames = $.unique(elements_with_usernames);

//     var elements_with_usernames_within_range = $();
//     for (var i = 0; i < elements_with_usernames.length; i++) {
// 	var pos = $(elements_with_usernames[i]).offset();
// 	var h = $(elements_with_usernames[i]).height();
// 	var w = $(elements_with_usernames[i]).width();
// // 	if (pos.top > 200 && pos.left > 200) {
// // 	    continue;
// // 	}
// // 	if ((pos.top+h) > 200 && (pos.left+w) > 200) {
// // 	    continue;
// // 	}

// 	elements_with_usernames_within_range = elements_with_usernames_within_range.add($(elements_with_usernames[i]));
//     }

//     var elements_with_text = $();
//     for (var i = 0; i < elements_with_usernames_within_range.length; i++) {
// 	var text = $.trim($(elements_with_usernames_within_range[i]).text()).toLowerCase();
// 	if (text == undefined || text == "") {
// 	    continue;
// 	}
// 	elements_with_text = elements_with_text.add($(elements_with_usernames_within_range[i]));
//     }

//     var elements_wo_kids = $();
//     for (var i = 0; i < elements_with_text.length; i++) {
// 	var kids = $(elements_with_text[i]).children();
// 	var kids_contain_username = false;

// 	if (kids.length > 0) {
// 	    for (var k = 0; k < kids.length; k++) {
// 		for (var j = 0; j < usernames.length; j++) {
// 		    if ($(":Contains(" + usernames[j] + ")" + check_only_visible, $(kids[k]).parent()).length > 0) {
// 			kids_contain_username = true;
// 			break;
// 		    }
// 		}
// 		if (kids_contain_username) {
// 		    break;
// 		}
// 	    }
// 	}

// 	if (!kids_contain_username) {
// 	    elements_wo_kids = elements_wo_kids.add($(elements_with_text[i]));
// 	}
//     }

//     for (var i = 0; i < usernames.length; i++) {
// 	var ue = $(":Contains('" + usernames[i] + "')" + check_only_visible, $(elements_wo_kids).parent());
// 	if (ue.length > 0) {
// 	    if (!(usernames[i] in present_usernames.frequency)) {
// 		present_usernames.frequency[usernames[i]] = 0;
// 	    }
// 	    present_usernames.frequency[usernames[i]] += ue.length;

// 	    for (var r = 0; r < ue.length; r++) {
// 		var pos = $(ue[r]).offset();

// 		if (pos.top < 0 ||
// 		    pos.left < 0) {
// 		    continue;
// 		}

// 		var e = $.extend(true, {}, $(ue[r]));

// 		pos.username = usernames[i];
// 		pos.element = e;
// 		var add_position = 0;
// 		var bool_add = true;
// 		var found_position = false;

// 		for (var k = 0; k < present_usernames.elem_list.length; k++) {
// 		    var curr_node = present_usernames.elem_list[k];
// 		    if (curr_node.element[0] == pos.element[0]) {
// 			if (curr_node.username.length < pos.username.length) {
// 			    curr_node.username = pos.username;
// 			}
// 			bool_add = false;
// 			break;
// 		    }

// 		    if ((pos.top < curr_node.top) && 
// 			(pos.left < curr_node.left)) {
// 			found_position = true;
// 		    }
// 		    else if (pos.left < curr_node.left) {
// 			found_position = true;
// 		    }

// 		    if (!found_position) {
// 			add_position += 1;
// 		    }
// 		}

// 		if (bool_add == true) {
// 		    present_usernames.elem_list.splice(add_position, 0, pos);
// 		}
// 	    }
// 	}
//     }

//     var final_elem_list = [];
//     for (var i = 0; i < present_usernames.elem_list.length; i++) {
// 	var curr_node = {};
// 	curr_node.top = present_usernames.elem_list[i].top;
// 	curr_node.left = present_usernames.elem_list[i].left;
// 	curr_node.username = present_usernames.elem_list[i].username;

// 	final_elem_list.push(curr_node);
//     }
 
//    present_usernames.elem_list = final_elem_list;
//     return present_usernames;
}
