
importScripts("cookiesets.js");

start_time = new Date();

find_next_llb_cookieset() {
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
	console.log("APPU DEBUG: LLB Cookieset testing round finished for: " + num_cookies_drop_for_round);
	
	num_cookies_drop_for_round += 1;
	store_intermediate_state(true);
	
	// Adding (num_cookies_pass_for_round - 1) instead of num_cookies_pass_for_round
	// because I do not finish GUB rounds. I stop them as soon as tested_cookiesets in
	// a round exceeds tot_cookies. Thus num_cookies_pass_for_round does not necessarily
	// say finished round. The round could very well be in progress.
	if ((num_cookies_drop_for_round + (num_cookies_pass_for_round - 1)) >= tot_cookies) {
	    console.log("APPU DEBUG: (cookieset testing) Number of cookies to drop exceed total cookies");
	    console.log("APPU DEBUG: Cookieset testing successfully finished. No more cookiesets generated");
	    
	    bool_is_cookie_testing_done = true;
	    
	    return "done";
	}
	
	curr_binary_cs = undefined;
	curr_decimal_cs = undefined;
	
		return "attempt_next_state";
    }
    else if (rc == 1) {
	console.log("APPU DEBUG: LLB No more cookiesets generated for: " + num_cookies_drop_for_round);
	
	num_cookies_drop_for_round += 1;
	store_intermediate_state(true);
	
	if ((num_cookies_drop_for_round + (num_cookies_pass_for_round - 1)) >= tot_cookies) {
	    console.log("APPU DEBUG: LLB (cookieset testing) Number of cookies to drop exceed total cookies");
	    console.log("APPU DEBUG: Cookieset testing successfully finished. No more cookiesets generated");
	    bool_is_cookie_testing_done = true;
	    return "done";
	}
	curr_binary_cs = undefined;
	curr_decimal_cs = undefined;
	
	return "attempt_next_state";
	// return "attempt_same_state";
    }
    else if (rc == -1) {
	console.log("APPU Error: (" + state + ")Could not generate cookiesets for round: " + num_cookies_drop_for_round
		    + "(round = number of cookies to be dropped)");
	report_fatal_error(state + "-cookiesets-generation-error-at-X=" + num_cookies_drop_for_round);
	has_error_occurred = true;
	return "error";
    }
    else {
	reset_for_llb_cookieset_testing(false);
	
	curr_binary_cs = rc.binary_cookieset;
	curr_decimal_cs = rc.decimal_cookieset;
	disabled_cookies = convert_binary_cookieset_to_cookie_array(curr_binary_cs,
								    suspected_account_cookies_array);
	console.log("APPU DEBUG: Next decimal cookieset: " + curr_decimal_cs);
	return "success";
    }
}

function store_found_cookiesets(quiet,
				my_url,
				start_time,
				curr_intermediate_state,
				next_binary_cs,
				next_decimal_cs,
				next_gub_binary_cs,
				next_gub_decimal_cs,
				num_cookies_pass_for_round,
				num_cookies_drop_for_round,
				cookiesets_optimization_stats) { 
    quiet = (quiet == undefined) ? false : true;

    console.log("APPU DEBUG: Storing new found cookiessets");
    var tt = curr_intermediate_state.tot_time_taken + 
	((new Date()).getTime() - start_time.getTime())/1000;    

    var tot_time_since_last_lo_change = curr_intermediate_state.tot_time_since_last_lo_change + 
	((new Date()).getTime() - start_time.getTime())/1000;

    if (next_binary_cs && next_decimal_cs) {
	curr_intermediate_state.next_binary_cs     =    next_binary_cs;     
	curr_intermediate_state.next_decimal_cs	   =    next_decimal_cs;    
    }

    if (next_gub_binary_cs && next_gub_decimal_cs) {
	curr_intermediate_state.next_gub_binary_cs	=    next_gub_binary_cs; 
	curr_intermediate_state.next_gub_decimal_cs	=    next_gub_decimal_cs;
    }

    curr_intermediate_state.tot_time_taken	           =    tt;
    curr_intermediate_state.cookiesets_optimization_stats  =    cookiesets_optimization_stats;
    curr_intermediate_state.tot_time_since_last_lo_change  =    tot_time_since_last_lo_change;
    curr_intermediate_state.num_cookies_pass_for_round     =    num_cookies_pass_for_round;
    curr_intermediate_state.num_cookies_drop_for_round     =    num_cookies_drop_for_round;

    offload_cookie_investigation_state(my_url, curr_intermediate_state, quiet);
}

function process_past_state(pcs) {
    if (!pcs) {
	console.log("APPU DEBUG: No pending cookie investigation state exists for: " + url);
	return;
    }

    {
	var url_wo_paramters = my_url.replace(/\?.*/,'');
	var pcs = config_start_params.pending_cookie_investigation_state["Cookie Investigation State:" + url_wo_paramters];
	
	if (pcs != undefined) {
	    // Do not move this from here. This has to be first.
	    // So that the already tested cookisets are generated properly.
	    if (pcs.expand_state_discovered_cookies != undefined) {
		expand_state_discovered_cookies = JSON.parse(pcs.expand_state_discovered_cookies);
		console.log("APPU DEBUG: Restoring previously discovered expand-state cookies: " +
			    JSON.stringify(expand_state_discovered_cookies));
		
		var cs = pii_vault.aggregate_data.session_cookie_store[my_domain];		    
		for (var p = 0; p < expand_state_discovered_cookies.length; p++) {
		    var cookie_key = expand_state_discovered_cookies[p];
		    
		    if (suspected_account_cookies_array.indexOf(cookie_key) == -1) {
			if (cookie_key in cs.cookies) {
			    cs.cookies[cookie_key].is_part_of_account_cookieset = true;
			}
			else {
			    console.log("Here here: Previously detected cookie in expand-state no longer present: " +
					cookie_key);
			}
			console.log("APPU DEBUG: Previously discovered expand-state cookie(" + cookie_key +
				    ") was not present in the " +
				    "suspected-account-cookies array. Adding it.");
			suspected_account_cookies_array.push(cookie_key);
			tot_cookies++;
			var index_to_delete = non_suspected_account_cookies_array.indexOf(cookie_key);
			if (index_to_delete != -1) {
			    non_suspected_account_cookies_array.splice(index_to_delete, 1);		
			    tot_ns_cookies -= 1;
			}
		    }
		}
		flush_aggregate_data();
	    }
	    
	    if (JSON.stringify(suspected_account_cookies_array.sort()) == 
		JSON.stringify(pcs.suspected_account_cookies_array.sort())) {
		console.log("APPU DEBUG: Looks like suspected_account_cookies_array is unchanged");
		if (pcs.num_cookies_drop_for_round &&
		    pcs.num_cookies_pass_for_round) {
		    num_cookies_drop_for_round = pcs.num_cookies_drop_for_round;
		    num_cookies_pass_for_round = pcs.num_cookies_pass_for_round;
		    console.log("APPU DEBUG: Restoring num_cookies_drop_for_round to: " + num_cookies_drop_for_round);
		    console.log("APPU DEBUG: Restoring num_cookies_pass_for_round to: " + num_cookies_pass_for_round);
		}
		
		if (pcs.next_binary_cs != undefined &&
		    pcs.next_decimal_cs != undefined) {
		    curr_binary_cs = pcs.next_binary_cs;
		    curr_decimal_cs = pcs.next_decimal_cs;
		    console.log("APPU DEBUG: Restoring curr_binary_cs to: "   + curr_binary_cs);
		    console.log("APPU DEBUG: Restoring curr_decimal_cs to: "  + curr_decimal_cs);
		}
		
		if (pcs.next_gub_binary_cs != undefined &&
		    pcs.next_gub_decimal_cs != undefined) {
		    curr_gub_binary_cs = pcs.next_gub_binary_cs;
		    curr_gub_decimal_cs = pcs.next_gub_decimal_cs;
		    console.log("APPU DEBUG: Restoring curr_gub_binary_cs to: "   + curr_gub_binary_cs);
		    console.log("APPU DEBUG: Restoring curr_gub_decimal_cs to: "  + curr_gub_decimal_cs);
		}
	    }
	    
	    if (pcs.on_disk_s_a_LLB_cookiesets_array != undefined) {
		s_a_LLB_cookiesets_array = pcs.on_disk_s_a_LLB_cookiesets_array;
		generate_s_a_LLB_decimal_cookiesets();
	    }
	    
	    if (pcs.on_disk_s_na_LLB_cookiesets_array != undefined) {
		s_na_LLB_cookiesets_array = pcs.on_disk_s_na_LLB_cookiesets_array;
		generate_s_na_LLB_decimal_cookiesets();
	    }
	    
	    if (pcs.on_disk_s_a_GUB_cookiesets_array != undefined) {
		s_a_GUB_cookiesets_array = pcs.on_disk_s_a_GUB_cookiesets_array;
		generate_s_a_GUB_decimal_cookiesets();
	    }
	    
	    if (pcs.on_disk_s_na_GUB_cookiesets_array != undefined) {
		s_na_GUB_cookiesets_array = pcs.on_disk_s_na_GUB_cookiesets_array;
		generate_s_na_GUB_decimal_cookiesets();
	    }
	    
	    if (pcs.on_disk_ns_na_LLB_cookiesets_array != undefined) {
		ns_na_LLB_cookiesets_array = pcs.on_disk_ns_na_LLB_cookiesets_array;
		generate_ns_na_LLB_decimal_cookiesets();
	    }
	    
	    if (pcs.on_disk_ns_a_GUB_cookiesets_array != undefined) {
		ns_a_GUB_cookiesets_array = pcs.on_disk_ns_a_GUB_cookiesets_array;
		generate_ns_a_GUB_decimal_cookiesets();
	    }
	    
	    if (pcs.tot_time_taken != undefined) {
		tot_time_taken = pcs.tot_time_taken;
	    }
	    
	    if (pcs.tot_bytes_sent != undefined) {
		tot_bytes_sent = pcs.tot_bytes_sent;
	    }
	    
	    if (pcs.tot_bytes_recvd != undefined) {
		tot_bytes_recvd = pcs.tot_bytes_recvd;
	    }
	    
	    if (pcs.tot_time_since_last_lo_change != undefined) {
		tot_time_since_last_lo_change = pcs.tot_time_since_last_lo_change;
	    }
	    
	    if (pcs.tot_attempts != undefined) {
		tot_attempts = pcs.tot_attempts;
	    }
	    
	    if (pcs.tot_page_reloads_overall != undefined) {
		tot_page_reloads_overall = pcs.tot_page_reloads_overall;
	    }
	    
	    if (pcs.tot_page_reloads_naive != undefined) {
		cookiesets_optimization_stats.tot_page_reloads_naive = pcs.tot_page_reloads_naive;
	    }
	    
	    if (pcs.tot_page_reloads_since_last_lo_change != undefined) {
		tot_page_reloads_since_last_lo_change = pcs.tot_page_reloads_since_last_lo_change;
	    }
	    
	    if (pcs.tot_cookiesets_tested_overall != undefined) {
		tot_cookiesets_tested_overall = pcs.tot_cookiesets_tested_overall;
	    }
	    
	    if (pcs.tot_gub_cookiesets_tested_overall != undefined) {
		tot_gub_cookiesets_tested_overall = pcs.tot_gub_cookiesets_tested_overall;
	    }
	    
	    if (pcs.tot_expand_state_cookiesets_tested_overall != undefined) {
		tot_expand_state_cookiesets_tested_overall = pcs.tot_expand_state_cookiesets_tested_overall;
	    }
	    
	    if (pcs.tot_expand_state_entered != undefined) {
		tot_expand_state_entered = pcs.tot_expand_state_entered;
	    }
	    
	    if (pcs.tot_inconclusive_cookiesets_overall != undefined) {
		tot_inconclusive_cookiesets_overall = pcs.tot_inconclusive_cookiesets_overall;
	    }
	    
	    if (pcs.cookiesets_optimization_stats != undefined) {
		cookiesets_optimization_stats = pcs.cookiesets_optimization_stats;
	    }
	}
    }
    
    find_next_llb_cookieset();
    find_next_gub_cookieset();
}

self.postMessage("Invoked cookieset generator worker");
self.onmessage = function(event) {
    var msg = event.data;
    var ret_msg = {};
    var url = msg.url;
    
    if (msg.cmd == "generate-cookieset") {
	load_cookie_investigation_state(url, process_past_state); 

	ret_msg['status']                         = 'success';
	ret_msg['rc']                             = rc;
    }
    else {
	ret_msg['status'] = 'failure';
	ret_msg['reason'] = "Wrong cmd: " + msg.cmd;
    }

    self.postMessage(ret_msg);
    self.close();
};