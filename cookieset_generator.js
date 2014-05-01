
importScripts("cookiesets.js");

start_time = new Date();


// Functions that generate decimal cookiesets from arrays
function generate_s_a_LLB_decimal_cookiesets(s_a_LLB_cookiesets_array, suspected_account_cookies_array) {
    s_a_LLB_decimal_cookiesets = [];
    
    for (var i = 0; i < s_a_LLB_cookiesets_array.length; i++) {
	rc = add_to_set(s_a_LLB_cookiesets_array[i], 
			undefined, 
			s_a_LLB_decimal_cookiesets, 
			suspected_account_cookies_array,
			undefined);
    }

    return s_a_LLB_decimal_cookiesets;
}


// Generate "s_na_LLB_decimal_cookiesets" from
// "s_na_LLB_cookiesets_array"
// need to give "suspected_account_cookies_array"
function generate_s_na_LLB_decimal_cookiesets(s_na_LLB_cookiesets_array, suspected_account_cookies_array) {
    s_na_LLB_decimal_cookiesets = [];
    
    for (var i = 0; i < s_na_LLB_cookiesets_array.length; i++) {
	rc = add_to_set(s_na_LLB_cookiesets_array[i], 
			undefined, 
			s_na_LLB_decimal_cookiesets, 
			suspected_account_cookies_array,
			undefined);
    }

    return s_na_LLB_decimal_cookiesets;
}


// Generate "s_a_GUB_decimal_cookiesets" from
// "s_a_GUB_cookiesets_array"
// need to give "suspected_account_cookies_array"
function generate_s_a_GUB_decimal_cookiesets(s_a_GUB_cookiesets_array, suspected_account_cookies_array) {
    s_a_GUB_decimal_cookiesets = [];
    
    for (var i = 0; i < s_a_GUB_cookiesets_array.length; i++) {
	rc = add_to_set(s_a_GUB_cookiesets_array[i], 
			undefined, 
			s_a_GUB_decimal_cookiesets, 
			suspected_account_cookies_array,
			undefined);
    }
    return s_a_GUB_decimal_cookiesets;
}


// Generate "s_na_GUB_decimal_cookiesets" from
// "s_na_GUB_cookiesets_array"
// need to give "suspected_account_cookies_array"
function generate_s_na_GUB_decimal_cookiesets(s_na_GUB_cookiesets_array, suspected_account_cookies_array) {
    s_na_GUB_decimal_cookiesets = [];
    
    for (var i = 0; i < s_na_GUB_cookiesets_array.length; i++) {
	rc = add_to_set(s_na_GUB_cookiesets_array[i], 
			undefined, 
			s_na_GUB_decimal_cookiesets, 
			suspected_account_cookies_array,
			undefined);
    }

    return s_na_GUB_decimal_cookiesets;
}


function find_next_llb_cookieset(curr_binary_cs, 
				 num_cookies_drop_for_round, 
				 tot_cookies, 
				 s_a_LLB_decimal_cookiesets,
				 s_na_LLB_decimal_cookiesets,
				 s_a_GUB_decimal_cookiesets,
				 s_na_GUB_decimal_cookiesets,
				 cookiesets_optimization_stats) {
    var next_llb_cookieset_array = undefined;

    var rc = get_next_binary_cookieset_X(curr_binary_cs, 
					 num_cookies_drop_for_round, 
					 tot_cookies, 
					 s_a_LLB_decimal_cookiesets,
					 s_na_LLB_decimal_cookiesets,
					 s_a_GUB_decimal_cookiesets,
					 s_na_GUB_decimal_cookiesets,
					 "normal",
					 cookiesets_optimization_stats);
	    
    if (rc == 0) {
	console.log("APPU DEBUG: LLB Cookieset testing round finished for drop: " + num_cookies_drop_for_round);
	num_cookies_drop_for_round += 1;
    }
    else if (rc == 1) {
	console.log("APPU DEBUG: LLB No more cookiesets generated for: " + num_cookies_drop_for_round);
	num_cookies_drop_for_round += 1;
    }
    else if (rc == -1) {
	console.log("APPU Error: (LLB) Could not generate cookiesets for round: " + num_cookies_drop_for_round
		    + "(round = number of cookies to be dropped)");

	self.postMessage({
		'status' : 'error'
	    });
	self.close();
    }
    else {
	curr_binary_cs = rc.binary_cookieset;
	next_llb_cookieset_array = convert_binary_cookieset_to_cookie_array(curr_binary_cs,
									    suspected_account_cookies_array);
	console.log("APPU DEBUG: Next LLB binary cookieset: " + JSON.stringify(curr_binary_cs));
    }

    return {
	'next_llb_cookieset_array' : next_llb_cookieset_array,
	    'cookiesets_optimization_stats' : cookiesets_optimization_stats,
	    'num_cookies_drop_for_round' : num_cookies_drop_for_round    
    };
}


function find_next_gub_cookieset(curr_gub_binary_cs, 
				 num_cookies_pass_for_round, 
				 tot_cookies, 
				 s_a_LLB_decimal_cookiesets,
				 s_na_LLB_decimal_cookiesets,
				 s_a_GUB_decimal_cookiesets,
				 s_na_GUB_decimal_cookiesets,
				 cookiesets_optimization_stats) {
    var next_gub_cookieset_array = undefined;

    var rc = get_next_gub_binary_cookieset_X(curr_gub_binary_cs, 
					     num_cookies_pass_for_round, 
					     tot_cookies, 
					     s_a_LLB_decimal_cookiesets,
					     s_na_LLB_decimal_cookiesets,
					     s_a_GUB_decimal_cookiesets,
					     s_na_GUB_decimal_cookiesets,
					     "normal",
					     cookiesets_optimization_stats);
	    
    if (rc == 0) {
	console.log("APPU DEBUG: GUB Cookieset testing round finished for: " + num_cookies_pass_for_round);
	num_cookies_pass_for_round += 1;
    }
    else if (rc == 1) {
	console.log("APPU DEBUG: GUB Cookieset testing round finished for: " + num_cookies_pass_for_round);
	num_cookies_pass_for_round += 1;
    }
    else if (rc == -1) {
	console.log("APPU Error: (GUB) Could not generate cookiesets for round: " + num_cookies_pass_for_round
		    + "(round = number of cookies to be passed)");

	self.postMessage({
		'status' : 'error'
		    });
	self.close();
    }
    else {
	curr_gub_binary_cs = rc.binary_cookieset;
	next_gub_cookieset_array = convert_binary_cookieset_to_cookie_array(curr_gub_binary_cs,
									    suspected_account_cookies_array);

	console.log("APPU DEBUG: Next GUB binary cookieset: " + JSON.stringify(curr_gub_binary_cs));
    }

    return {
	'next_gub_cookieset_array' : next_gub_cookieset_array,
	    'cookiesets_optimization_stats' : cookiesets_optimization_stats,
	    'num_cookies_pass_for_round' : num_cookies_pass_for_round    
    };
}


function process_past_state(url, pcs) {
    var url_wo_paramters = my_url.replace(/\?.*/,'');
    pcs = pcs["Cookie Investigation State:" + url_wo_paramters];
	
    var suspected_account_cookies_array      = pcs["suspected_account_cookies_array"];
    var non_suspected_account_cookies_array  = pcs["non_suspected_account_cookies_array"];
    var cookiesets_optimization_stats        = pcs["cookiesets_optimization_stats"];
    var tot_cookies                          = suspected_account_cookies_array.length;

    var num_cookies_drop_for_round           = pcs["num_cookies_drop_for_round"];
    var num_cookies_pass_for_round           = pcs["num_cookies_pass_for_round"];

    var curr_llb_cookieset_array        = pcs["curr_llb_cookieset_array"];
    var curr_binary_cs                  = undefined;
    if (curr_llb_cookieset_array) {
	curr_binary_cs = convert_cookie_array_to_binary_cookieset(curr_llb_cookieset_array, 
								  suspected_account_cookies_array);
    }
    
    var curr_gub_cookieset_array    = pcs["curr_gub_cookieset_array"];
    var curr_gub_binary_cs          = undefined; 
    if (curr_gub_cookieset_array) {
	curr_gub_binary_cs = convert_cookie_array_to_binary_cookieset(curr_gub_cookieset_array, 
								      suspected_account_cookies_array);
    }
    
    var next_llb_cookieset_array    = pcs["next_llb_cookieset_array"];
    var next_gub_cookieset_array    = pcs["next_gub_cookieset_array"];
    
    var on_disk_s_a_LLB_cookiesets_array     = pcs["on_disk_s_a_LLB_cookiesets_array"];
    var s_a_LLB_decimal_cookiesets           = generate_s_a_LLB_decimal_cookiesets(on_disk_s_a_LLB_cookiesets_array,
										   suspected_account_cookies_array);

    var on_disk_s_na_LLB_cookiesets_array    = pcs["on_disk_s_na_LLB_cookiesets_array"];
    var s_na_LLB_decimal_cookiesets          = generate_s_na_LLB_decimal_cookiesets(on_disk_s_na_LLB_cookiesets_array,
										    suspected_account_cookies_array);

    var on_disk_s_a_GUB_cookiesets_array     = pcs["on_disk_s_a_GUB_cookiesets_array"];
    var s_a_GUB_decimal_cookiesets           = generate_s_a_GUB_decimal_cookiesets(on_disk_s_a_GUB_cookiesets_array,
										   suspected_account_cookies_array);

    var on_disk_s_na_GUB_cookiesets_array    = pcs["on_disk_s_na_GUB_cookiesets_array"];
    var s_na_GUB_decimal_cookiesets          = generate_s_na_GUB_decimal_cookiesets(on_disk_s_na_GUB_cookiesets_array,
										    suspected_account_cookies_array);
    
    if (next_llb_cookieset_array != undefined) {
	rc = find_next_llb_cookieset(curr_binary_cs, 
				     num_cookies_drop_for_round, 
				     tot_cookies, 
				     s_a_LLB_decimal_cookiesets,
				     s_na_LLB_decimal_cookiesets,
				     s_a_GUB_decimal_cookiesets,
				     s_na_GUB_decimal_cookiesets,
				     cookiesets_optimization_stats);

	next_llb_cookieset_array      = rc.next_llb_cookieset_array;
	cookiesets_optimization_stats = rc.cookiesets_optimization_stats;
	num_cookies_drop_for_round    = rc.num_cookies_drop_for_round;
	curr_llb_cookieset_array = undefined;
    }
    else {
	console.log("APPU DEBUG: next_llb_cookieset_array is already present");
    }

    if (next_gub_cookieset_array != undefined) {
	rc = find_next_gub_cookieset(curr_gub_binary_cs, 
				     num_cookies_pass_for_round, 
				     tot_cookies, 
				     s_a_LLB_decimal_cookiesets,
				     s_na_LLB_decimal_cookiesets,
				     s_a_GUB_decimal_cookiesets,
				     s_na_GUB_decimal_cookiesets,
				     cookiesets_optimization_stats);

	next_gub_cookieset_array      = rc.next_gub_cookieset_array;
	cookiesets_optimization_stats = rc.cookiesets_optimization_stats;
	num_cookies_pass_for_round    = rc.num_cookies_pass_for_round;
	curr_gub_cookieset_array = undefined;
    }
    else {
	console.log("APPU DEBUG: next_gub_cookieset_array is already present");
    }

    var tt = pcs.tot_time_taken + 
	((new Date()).getTime() - start_time.getTime())/1000;    

    var tot_time_since_last_lo_change = pcs.tot_time_since_last_lo_change + 
	((new Date()).getTime() - start_time.getTime())/1000;

    pcs.curr_llb_cookieset_array = curr_llb_cookieset_array;
    pcs.curr_gub_cookieset_array = curr_gub_cookieset_array;

    pcs.next_llb_cookieset_array = next_llb_cookieset_array;
    pcs.next_gub_cookieset_array = next_gub_cookieset_array;

    pcs.tot_time_taken	               =    tt;
    pcs.cookiesets_optimization_stats  =    cookiesets_optimization_stats;
    pcs.tot_time_since_last_lo_change  =    tot_time_since_last_lo_change;
    pcs.num_cookies_pass_for_round     =    num_cookies_pass_for_round;
    pcs.num_cookies_drop_for_round     =    num_cookies_drop_for_round;

    return pcs;
}


self.postMessage("Invoked cookieset generator worker");
self.onmessage = function(event) {
    var msg = event.data;
    var url = msg.url;
    var cookie_investigation_state = msg.cookie_investigation_state;

    var ret_msg = {};

    var modified_cookie_investigation_state = process_past_state(url, cookie_investigation_state);

    ret_msg['status']                                = 'success';
    ret_msg['modified_cookie_investigation_state']   = modified_cookie_investigation_state;

    self.postMessage(ret_msg);
    self.close();
};