
// From: http://dreaminginjavascript.wordpress.com/2008/11/08/combinations-and-permutations-in-javascript/
function productRange(a,b) {
    var product=a,i=a;
 
    while (i++<b) {
	product*=i;
    }
    return product;
}

// From: http://dreaminginjavascript.wordpress.com/2008/11/08/combinations-and-permutations-in-javascript/
function combinations(n,k) {
    if (n==k) {
	return 1;
    } else {
	k=Math.max(k,n-k);
	return productRange(k+1,n)/productRange(1,n-k);
    }
}


// **** BEGIN - Cookiesets generation, manipulations functions

// Accepts a binary cookieset and returns how many
// 0's or 1's are present
function count_bit_values(cookieset, bit_val) {
    var total_bv = 0;
    for (i = 0; i < cookieset.length; i++) {
	if (parseInt(cookieset[i]) == bit_val) {
	    total_bv += 1;
	}
    }
    return total_bv;
}

// decimal_set1 is a decimal number like 44 (101100)
// decimal_set2 is a decimal number like 60 (111100)
// Here 44 is subset of 60
// if decimal_set1 is subset of decimal_set2 then return 1
// if decimal_set2 is subset of decimal_set1 then return 2
// if none is subset of other then return 0
function find_subset_relationship(decimal_set1, decimal_set2) {
    if ((decimal_set1 & decimal_set2) == decimal_set1) {
	return 1;
    }

    if ((decimal_set1 & decimal_set2) == decimal_set2) {
	return 2;
    }

    return 0;
}

    
// True if decimal_set1 is subset of decimal_set2
function is_a_subset(decimal_set1, decimal_set2) {
    var rc = find_subset_relationship(decimal_set1, decimal_set2);
    if (rc == 1) {
	return true;
    }
    return false;
}


// True if decimal_set1 is superset of decimal_set2
function is_a_superset(decimal_set1, decimal_set2) {
    var rc = find_subset_relationship(decimal_set1, decimal_set2);
    if (rc == 2) {
	return true;
    }
    return false;
}


function is_a_setmember_subset(decimal_element, decimal_set) {
    if(decimal_set.indexOf(decimal_element) != -1) {
	return true;
    }

    for (var k = 0; k < decimal_set.length; k++) {
	var rc = find_subset_relationship(decimal_element, decimal_set[k]);
	if (rc == 2) {
	    // decimal_set[k] is a subset of decimal_element
	    return true;
	}
    }
    return false;
}


function which_setmember_is_subset(decimal_element, decimal_set) {
    var index = decimal_set.indexOf(decimal_element);
    if (index != -1) {
	return index;
    }

    for (var k = 0; k < decimal_set.length; k++) {
	var rc = find_subset_relationship(decimal_element, decimal_set[k]);
	if (rc == 2) {
	    // decimal_set[k] is a subset of decimal_element
	    return k;
	}
    }
    return -1;
}

function is_a_setmember_superset(decimal_element, decimal_set) {
    if(decimal_set.indexOf(decimal_element) != -1) {
	return true;
    }

    for (var k = 0; k < decimal_set.length; k++) {
	var rc = find_subset_relationship(decimal_element, decimal_set[k]);
	if (rc == 1) {
	    // decimal_element is a subset of decimal_set[k]
	    return true;
	}
    }
    return false;
}

function which_setmember_is_superset(decimal_element, decimal_set) {
    var index = decimal_set.indexOf(decimal_element);
    if (index != -1) {
	return index;
    }

    for (var k = 0; k < decimal_set.length; k++) {
	var rc = find_subset_relationship(decimal_element, decimal_set[k]);
	if (rc == 1) {
	    // decimal_element is a subset of decimal_set[k]
	    return k;
	}
    }
    return -1;
}

// We can do ".indexOf()" instead of JSON.stringify because
// element is a decimal number and set is an array of decimal numbers
function is_a_member_of_set(decimal_element, decimal_set) {
    if(decimal_set.indexOf(decimal_element) != -1) {
	return true;
    }
    return false;
}


// Adds the element "cs" to the set "cookiesets" iff
// "cs" is already not present in "cookiesets".
// "cs" : ["http://abc.com/:cookie1", "https://abc.com/:cookie2"]
// "cookiesets" : array of cookieset like "cs"
// "decimal_cookiesets" : representation of "cookiesets" as per "suspected_account_cookies_array"
function add_to_set(cs, 
		    cookiesets, 
		    decimal_cookiesets, 
		    suspected_account_cookies_array,
		    decimal_cs) {
    var conv_cs = undefined;
    var dec_cs = undefined;

    if (decimal_cs == undefined) {
	conv_cs = convert_cookie_array_to_binary_cookieset(cs, suspected_account_cookies_array);
	dec_cs = conv_cs.decimal_cookieset;
    }
    else {
	dec_cs = decimal_cs;
    }

    if (decimal_cookiesets.indexOf(dec_cs) == -1) {
	if (cookiesets != undefined) {
	    cookiesets.push(cs.slice(0));
	}
	decimal_cookiesets.push(dec_cs);
	return 1;
    }
    return 0;
}


// Adds the element "cs" to the set "cookiesets" iff
//  "cs" is already not present in "cookiesets" AND
//  no member of "cookiesets" is subset of "cs"
// If there "cs" is added to "cookiesets" and if there are
//  some supersets present then they are deleted.
//
// "cs" : ["http://abc.com/:cookie1", "https://abc.com/:cookie2"]
// "cookiesets" : array of cookieset like "cs"
// "decimal_cookiesets" : representation of "cookiesets" as per "suspected_account_cookies_array"
function add_to_set_if_no_subset_member(cs, 
					cookiesets, 
					decimal_cookiesets, 
					suspected_account_cookies_array,
					decimal_cs) {
    var conv_cs = undefined; 
    var dec_cs = undefined;
    var index = undefined;

    if (decimal_cs == undefined) {
	conv_cs = convert_cookie_array_to_binary_cookieset(cs, suspected_account_cookies_array);
	dec_cs = conv_cs.decimal_cookieset;
    }
    else {
	dec_cs = decimal_cs;
    }

    if (is_a_member_of_set(dec_cs, decimal_cookiesets)) {
	index = which_setmember_is_subset(dec_cs, decimal_cookiesets);
	return [0, index];
    }

    var subset_found = false;
    var superset_elements = [];

    for (var k = 0; k < decimal_cookiesets.length; k++) {
	var curr_dec_num = decimal_cookiesets[k];
	var rc = find_subset_relationship(dec_cs, curr_dec_num);
	if (rc == 2) {
	    // curr_dec_num is subset of dec_cs
	    return [0, k];
	}
	else if (rc == 1) {
	    superset_elements.push(curr_dec_num);
	}
    }

    if (!subset_found) {
	// First delete all supersets
	var se_indexes = [];
	for (var i = 0; i < superset_elements.length; i++) {
	    var index_to_delete = decimal_cookiesets.indexOf(superset_elements[i]);
	    se_indexes.push(index_to_delete);
	    decimal_cookiesets.splice(index_to_delete, 1);		
	    if (cookiesets != undefined) {
		cookiesets.splice(index_to_delete, 1);		
	    }
	}

	if (cookiesets != undefined) {
	    cookiesets.push(cs.slice(0));
	}
	decimal_cookiesets.push(dec_cs);
	return [1, se_indexes];
    }
    return [0, undefined];
}


// Adds the element "cs" to the set "cookiesets" iff
//  "cs" is already not present in "cookiesets" AND
//  no member of "cookiesets" is superset of "cs"
// If there are subsets present, then delete them.
//
// "cs" : ["http://abc.com/:cookie1", "https://abc.com/:cookie2"]
// "cookiesets" : array of cookieset like "cs"
// "decimal_cookiesets" : representation of "cookiesets" as per "suspected_account_cookies_array"
function add_to_set_if_no_superset_member(cs, 
					  cookiesets, 
					  decimal_cookiesets, 
					  suspected_account_cookies_array,
					  decimal_cs) {
    var conv_cs = undefined;
    var dec_cs = undefined;

    if (decimal_cs == undefined) {
	conv_cs = convert_cookie_array_to_binary_cookieset(cs, suspected_account_cookies_array);
	dec_cs = conv_cs.decimal_cookieset;
    }
    else {
	dec_cs = decimal_cs;
    }

    if (is_a_member_of_set(dec_cs, decimal_cookiesets)) {
	return 0;
    }

    var superset_found = false;
    var subset_elements = [];

    for (var k = 0; k < decimal_cookiesets.length; k++) {
	var curr_dec_num = decimal_cookiesets[k];
	var rc = find_subset_relationship(dec_cs, curr_dec_num);
	if (rc == 1) {
	    // curr_dec_num is superset of dec_cs
	    superset_found = true;
	}
	else if (rc == 2) {
	    subset_elements.push(curr_dec_num);
	}
    }

    if (!superset_found) {
	// First delete all subsets
	for (var i = 0; i < subset_elements.length; i++) {
	    var index_to_delete = decimal_cookiesets.indexOf(subset_elements[i]);
	    decimal_cookiesets.splice(index_to_delete, 1);
	    cookiesets.splice(index_to_delete, 1);
	}

	cookiesets.push(cs.slice(0));
	decimal_cookiesets.push(dec_cs);
	return 1;
    }
    return 0;
}

// This function is just like: generate_super_cookiesets()
// Read the description there.
// Extra parameter: 
// 'x': Tells how many cookies to let pass through
function generate_super_cookiesets_efficient(url,
					     x,
					     tot_cookies, 
					     s_a_LLB_decimal_cookiesets,
					     s_a_GUB_decimal_cookiesets,
					     s_na_GUB_decimal_cookiesets) {
    var my_super_decimal_cookiesets = [];
    var my_super_binary_cookiesets = [];
    
    var tot_sets_equal_to_x = 0;
    var curr_bin_cs = decimal_to_binary_array(0, tot_cookies);
    var orig_x = x;
    
    var num_sets = Math.pow(2, tot_cookies);    
    
    console.log("APPU DEBUG: Going to generate GUB cookiesets(round=" + x + "), total cookiesets: " + num_sets);
    console.log("APPU DEBUG: Length of s_a_LLB_decimal_cookiesets: " + 
		s_a_LLB_decimal_cookiesets.length);
    console.log("APPU DEBUG: Length of s_a_GUB_decimal_cookiesets: " + 
		s_a_GUB_decimal_cookiesets.length);
    console.log("APPU DEBUG: Length of s_na_GUB_decimal_cookiesets: " + 
		s_na_GUB_decimal_cookiesets.length);
    
    var rc = set_last_X_bits_to_bit_val(x, 0, curr_bin_cs, 0);    
    if (rc == -1) {
	return -1;
    }
    
    do {
	var dec_cookieset = binary_array_to_decimal(curr_bin_cs);
	var bin_cookieset = curr_bin_cs;	

	rc = is_a_setmember_subset(dec_cookieset, 
				   s_a_LLB_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out anyway.
	    // No point in testing.
	    continue;
	}
	
	rc = is_a_setmember_superset(dec_cookieset, 
				     s_na_GUB_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-in.
	    // No point in testing.
	    continue;
	}
	
	rc = is_a_member_of_set(dec_cookieset, 
				s_a_GUB_decimal_cookiesets);
	if (rc) {
	    // This has been already tested and known to be accountcookie-superset.
	    // No point in testing again.
	    continue;
	}
	
	rc = is_a_setmember_subset(dec_cookieset, 
				   s_a_GUB_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out because
	    // there is already a set in s_a_GUB_decimal_cookiesets
	    // that is subset of curr_cookieset_decimal.
	    // No point in testing.
	    continue;
	}
	
	// First check which members discovered in previous iterations are
	//  either: subsets of this member in which case delete them
	//  or: supersets of this member in which case do not add it.
	var rc = add_to_set_if_no_superset_member(undefined, 
						  [], 
						  my_super_decimal_cookiesets, 
						  undefined,
						  dec_cookieset);
	
	if (rc) {
	    my_super_binary_cookiesets.push(bin_cookieset.slice(0));
	    tot_sets_equal_to_x = 1;
	}
    } while(generate_next_binary_cookieset_X(curr_bin_cs, 0) != null);
    
    var rc = check_if_binary_and_decimal_cookiesets_match(my_super_binary_cookiesets, 
							  my_super_decimal_cookiesets);
    
    if (rc == -1) {
	console.log("APPU Error: generate_super_cookiesets_efficient() binary, decimal cookiesets do not match");
	return -1;
    }
    
    console.log("APPU DEBUG: Total sets where X(=" + orig_x + ") cookies would be passed: " + 
		my_super_binary_cookiesets.length);
    
    
    return {
	decimal_super_cookiesets: my_super_decimal_cookiesets,
	    binary_super_cookiesets: my_super_binary_cookiesets
	    };
}

// Returns super cookiesets which are:
//     1. Have maximum '1's but are not tested so far.
//     2. Are not supersets of verified account-cookiesets.
//     3. Already not-verified to be account-super-cookiesets.
// Returned super-cookiesets are tested by dropping cookies marked by '1'.
// If the user is LOGGED-OUT, then we need to investigate permutations and combinations of subsets
//   to find the exact account-cookiesets.
// If the user is still LOGGED-IN then we do not need to test any subset of this superset.
//   because for any subset, the user would still be LOGGED-IN 
//
// MATHEMATICALLY:
// If cookiesets are thought to be partially ordered, then this function returns
//  greatest-upper-bounds of all *UN-tested* cookiesets currently.
// Please notice that these are greatest-upper-bounds and not least-upper-bounds(or supremum).
// Once we test all greatest-upper-bounds and if we find that one of them does not cause
//  user to be logged-out, then we need not test any subsets of this greatest-upper-bound.
// Obviously, in the very first run, the greatest-upper-bound would be jst one cookieset
//  with all values set to '1'.
// In the subsequent executions of this function:
//  1. Due to omitting already found and tested greatest-upper-bounds AND
//  2. Due to finding 'strict' account-cookiesets and omitting their supersets
//  we will find a different and probably multiple greatest-upper-bounds.
function generate_super_cookiesets(url,
				   tot_cookies, 
				   s_a_LLB_decimal_cookiesets,
				   s_a_GUB_decimal_cookiesets,
				   s_na_GUB_decimal_cookiesets,
				   x) {
    var my_super_decimal_cookiesets = [];
    var my_super_binary_cookiesets = [];
    var rc = true;
    var num_sets = Math.pow(2, tot_cookies);

    console.log("APPU DEBUG: Going to generate GUB cookiesets, total cookiesets: " + num_sets);
    console.log("APPU DEBUG: Length of s_a_LLB_decimal_cookiesets: " + 
		s_a_LLB_decimal_cookiesets.length);
    console.log("APPU DEBUG: Length of s_a_GUB_decimal_cookiesets: " + 
		s_a_GUB_decimal_cookiesets.length);
    console.log("APPU DEBUG: Length of s_na_GUB_decimal_cookiesets: " + 
		s_na_GUB_decimal_cookiesets.length);

    for (var i = 0; i < num_sets; i++) {
	var dec_cookieset = i;
	var bin_cookieset = decimal_to_binary_array(dec_cookieset, tot_cookies);

	if (x != undefined) {
	    var tot_zeros = 0;
	    for (var k = 0; k < bin_cookieset.length; k++) {
		if (bin_cookieset[k] == 0) {
		    tot_zeros += 1;
		}
	    }
	    if (tot_zeros != x) {
		continue;
	    }
	}
	    
	rc = is_a_setmember_subset(dec_cookieset, 
				   s_a_LLB_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out anyway.
	    // No point in testing.
	    continue;
	}

	rc = is_a_setmember_superset(dec_cookieset, 
				     s_na_GUB_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-in.
	    // No point in testing.
	    continue;
	}

	rc = is_a_member_of_set(dec_cookieset, 
				s_a_GUB_decimal_cookiesets);
	if (rc) {
	    // This has been already tested and known to be accountcookie-superset.
	    // No point in testing again.
	    continue;
	}

	rc = is_a_setmember_subset(dec_cookieset, 
				   s_a_GUB_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out because
	    // there is already a set in s_a_GUB_decimal_cookiesets
	    // that is subset of curr_cookieset_decimal.
	    // No point in testing.
	    continue;
	}

	// First check which members discovered in previous iterations are
	//  either: subsets of this member in which case delete them
	//  or: supersets of this member in which case do not add it.
	add_to_set_if_no_superset_member(undefined, 
					 [], 
					 my_super_decimal_cookiesets, 
					 undefined,
					 dec_cookieset);
    }

    console.log("APPU DEBUG: Number of GUB cookiesets to be tested: " + 
		my_super_decimal_cookiesets.length);
	
    for (var k = 0; k < my_super_decimal_cookiesets.length; k++) {
	var binary_cookieset = decimal_to_binary_array(my_super_decimal_cookiesets[k], tot_cookies);
	my_super_binary_cookiesets.push(binary_cookieset);
    }

    return {
	decimal_super_cookiesets: my_super_decimal_cookiesets,
	binary_super_cookiesets: my_super_binary_cookiesets
	    };
}


// Accepts a cookieset, something like: ["http://abc.com:cookie5", "http://abc.com:cookie2", 
//                                       "http://abc.com:cookie3"]
// Refers to suspected_account_cookies_array like: ["http://abc.com:cookie1", 
//                                        "http://abc.com:cookie2", 
//                                        "http://abc.com:cookie3", 
//                                        "http://abc.com:cookie4", 
//                                        "http://abc.com:cookie5"]
// Returns:
// If invert is 'false' or undefined:
//  binary_cookieset: [1, 0, 1, 1, 0]
//  decimal_cookieset: 22
// If invert is 'true':
//  binary_cookieset: [0, 1, 0, 0, 1]
//  decimal_cookieset: 9
function convert_cookie_array_to_binary_cookieset(cookie_array, suspected_account_cookies_array, bool_invert) {
    var my_bin_cookieset = [];
    var my_dec_cookieset = 0;

    bool_invert = (bool_invert == undefined) ? false : bool_invert;

    for (var i = 0; i < suspected_account_cookies_array.length; i++) {
	var index = cookie_array.indexOf(suspected_account_cookies_array[i]);
	if (index == -1) {
	    if (!bool_invert) {
		my_bin_cookieset.unshift(0);
	    }
	    else {
		my_bin_cookieset.unshift(1);
	    }
	}
	else {
	    if (!bool_invert) {
		my_bin_cookieset.unshift(1);
	    }
	    else {
		my_bin_cookieset.unshift(0);
	    }
	}
    }

    my_dec_cookieset = binary_array_to_decimal(my_bin_cookieset);
    return {
	binary_cookieset: my_bin_cookieset,
	    decimal_cookieset: my_dec_cookieset
	    }
}


// Accepts a binary-cookieset: [0, 1, 1, 0, 1]
//    AND
// suspected_account_cookies_array like: ["http://abc.com:cookie1", 
//                              "http://abc.com:cookie2", 
//                              "http://abc.com:cookie3", 
//                              "http://abc.com:cookie4", 
//                              "http://abc.com:cookie5"]
// Returns a cookie_array like: ["http://abc.com:cookie5", "http://abc.com:cookie2", 
//                               "http://abc.com:cookie3"]
function convert_binary_cookieset_to_cookie_array(binary_cookieset, 
						  suspected_account_cookies_array, 
						  bool_invert) {
    // Need to reverse it due to little endianness.
    binary_cookieset.reverse();
    var cookie_array = [];

    bool_invert = (bool_invert == undefined) ? false : bool_invert;
	
    for (var i = 0; i < binary_cookieset.length; i++) {
	if ((!bool_invert) && (binary_cookieset[i] == 1)) {
	    cookie_array.push(suspected_account_cookies_array[i]);
	}
	else if ((bool_invert) && (binary_cookieset[i] == 0)) {
	    cookie_array.push(suspected_account_cookies_array[i]);
	}
    }
    binary_cookieset.reverse();
    return cookie_array;
}

// Accepts a binary_cookieset like: [1, 1, 0, 0, 1, 0, 1, 0, 1]
// x: number of last x bits to be set to "bit_val"
// bit_val: Either "0" or "1"
// num_dd: First 'y' bits that are not to be disturbed.
// In this case if x = 3 and num_dd = 2 and bit_val = "1", then return value would be:
// [1, 1, 0, 0, 0, 0, 1, 1, 1]
function set_last_X_bits_to_bit_val(x, num_dd, bin_cs, bit_val) {
    var negate_bit_val = (bit_val + 1) % 2;

    if ((x + num_dd) > bin_cs.length) {
	console.log("APPU Error: (x(" + x + ") + num_dd(" + num_dd + ")) exceeds bin_cs.length(" + bin_cs.length + ")");
	//report_fatal_error("");
	return -1;
    }

    for (var i = (bin_cs.length - 1); i >= 0; i--) {
	if (x > 0) {
	    bin_cs[i] = bit_val;
	    x -= 1;
	}
	else if (i >= num_dd) {
	    bin_cs[i] = negate_bit_val;
	}
    }
    return bin_cs
}


// This is like a minusminus operation on a cookieset array.
// Something like if 'a' contains cookieset array, then 'a--' will
//   return previous in the sequence of all cookiesets that contain
//   'x' number of 1's (or 0's depending on 'bit_val')
//
// Accepts a binary cookiesets such as ['0', '1', '0', '1', '0']
//    and 'bit_val = 1', and returns   ['0', '1', '0', '0', '1']
// Accepts a binary cookiesets such as ['0', '0', '1', '1', '0']
//    and 'bit_val = 0', and returns   ['0', '1', '0', '0', '1']
function generate_previous_binary_cookieset_X(curr_bin_cs, bit_val) {
    var negate_bit_val = (bit_val + 1) % 2;
    var tot_bit_val_so_far = 0;

    if (curr_bin_cs.length == 1) {
	if (curr_bin_cs[0] != negate_bit_val) {
	    curr_bin_cs[0] = negate_bit_val;
	    return curr_bin_cs;
	}
    }

    for (var i = (curr_bin_cs.length - 1); i >= 0; i--) {
	if (curr_bin_cs[i] == negate_bit_val &&
	    (i-1) >= 0 &&
	    curr_bin_cs[i-1] == bit_val) {

	    curr_bin_cs[i] = bit_val;
	    curr_bin_cs[i-1] = negate_bit_val;

	    var first_x_bits_not_tobe_disturbed = i;
	    var remaining_bits = (curr_bin_cs.length - 1) - first_x_bits_not_tobe_disturbed;
	    var last_x_bits_to_set_with_negate_bit_val = remaining_bits - tot_bit_val_so_far;

	    var rc = set_last_X_bits_to_bit_val(last_x_bits_to_set_with_negate_bit_val, 
						first_x_bits_not_tobe_disturbed, 
						curr_bin_cs, 
						negate_bit_val);

	    if (rc == -1) {
		return null;
	    }
	    return curr_bin_cs;
	}

	if (curr_bin_cs[i] == bit_val) {
	    tot_bit_val_so_far += 1;
	}
    }
    return null;
}

// This is like a plusplus operation on a cookieset array.
// Something like if 'a' contains cookieset array, then 'a++' will
//   return next in the sequence of all cookiesets that contain
//   'x' number of 1's (or 0's depending on 'bit_val')
//
// Accpets a binary cookieset such as ['0', '1', '0', '0', '1']
//    and 'bit_val = 1', and returns  ['0', '1', '0', '1', '0']
// Accpets a binary cookieset such as ['0', '1', '0', '0', '1']
//    and 'bit_val = 0', and returns  ['0', '0', '1', '1', '0']
function generate_next_binary_cookieset_X(curr_bin_cs, bit_val) {
    // This is Big endian.
    // Most significant digit is stored at array index '0'.
    var negate_bit_val = (bit_val + 1) % 2;
    var tot_bit_val_so_far = 0;

    if (curr_bin_cs.length == 1) {
	if (curr_bin_cs[0] != bit_val) {
	    curr_bin_cs[0] = bit_val;
	    return curr_bin_cs;
	}
    }

    for (var i = (curr_bin_cs.length - 1); i >= 0; i--) {
	if (curr_bin_cs[i] == bit_val &&
	    (i-1) >= 0 &&
	    curr_bin_cs[i-1] == negate_bit_val) {

	    curr_bin_cs[i] = negate_bit_val;
	    curr_bin_cs[i-1] = bit_val;

	    var first_x_bits_not_tobe_disturbed = i;
	    var last_x_bits_to_set_with_bit_val = tot_bit_val_so_far;

	    var rc = set_last_X_bits_to_bit_val(last_x_bits_to_set_with_bit_val, 
						first_x_bits_not_tobe_disturbed, 
						curr_bin_cs, 
						bit_val);
	    if (rc == -1) {
		return null;
	    }
	    return curr_bin_cs;
	}

	if (curr_bin_cs[i] == bit_val) {
	    tot_bit_val_so_far += 1;
	}
    }
    return null;
}

// Return values:
// 0: Means no more cookiesets can be generated for this round. Move to the next state.
// 1: One complete round we could not generate any cookieset.
// -1: Some error.
// ELSE: object with binary and decimal cookiesets
function get_next_binary_cookieset_X(curr_bin_cs, 
				     x, 
				     tot_cookies, 
				     s_a_LLB_decimal_cookiesets,
				     s_na_LLB_decimal_cookiesets,
				     s_a_GUB_decimal_cookiesets,
				     s_na_GUB_decimal_cookiesets,
				     state,
				     cookiesets_optimization_stats,
				     curr_dc_decimal_cs,
				     stop_after_minutes) {
    var complete_round = false;
    var start_time = parseInt(new Date().getTime() / 1000);
    var current_time = undefined;
    var tot_explored_cookiesets = 0;
    var tot_minutes = 0;

    if (state == "expand") {
	var new_s_na_LLB_decimal_cookiesets = [];
	var snldc_disabled_cookiesets = [];

	var new_s_a_GUB_decimal_cookiesets = [];
	var sagdc_disabled_cookiesets = [];

	for (var i = 0; i < s_na_LLB_decimal_cookiesets.length; i++) {
	    new_s_na_LLB_decimal_cookiesets.push(s_na_LLB_decimal_cookiesets[i][1]);
	    snldc_disabled_cookiesets.push(s_na_LLB_decimal_cookiesets[i][0]);
	}

	for (var i = 0; i < s_a_GUB_decimal_cookiesets.length; i++) {
	    new_s_a_GUB_decimal_cookiesets.push(s_a_GUB_decimal_cookiesets[i][1]);
	    sagdc_disabled_cookiesets.push(s_a_GUB_decimal_cookiesets[i][0]);
	}

	s_na_LLB_decimal_cookiesets = new_s_na_LLB_decimal_cookiesets;
	s_a_GUB_decimal_cookiesets = new_s_a_GUB_decimal_cookiesets;
    }

    do {
	tot_explored_cookiesets += 1;
	current_time = parseInt(new Date().getTime() / 1000);

	if ((current_time - start_time) >= 60) {
	    tot_minutes += 1;
	    console.log("APPU DEBUG: (Total minutes = " + tot_minutes + ")Cookiesets explored so far: " + 
			tot_explored_cookiesets);
	    start_time = parseInt(new Date().getTime() / 1000);
	    current_time = parseInt(new Date().getTime() / 1000);
	    if (stop_after_minutes != undefined &&
		tot_minutes > stop_after_minutes) {
		console.log("APPU DEBUG: Time spent(" + tot_minutes + ") exceeds stop_after_minutes(" + 
			    stop_after_minutes + "), so returning");
		var rv = {
		    binary_cookieset: bin_cookieset,
		    decimal_cookieset: dec_cookieset
		};

		console.log("APPU DEBUG: Returning current cookiesets: " + JSON.stringify(rv));
		return rv;
	    }
	}

	if (curr_bin_cs == undefined ||
	    curr_bin_cs == null) {
	    curr_bin_cs = decimal_to_binary_array(0, tot_cookies);
	    var rc = set_last_X_bits_to_bit_val(x, 0, curr_bin_cs, 1);    
	    if (rc == -1) {
		return 1;
	    }
	    complete_round = true;
	}
	else {
	    if (generate_next_binary_cookieset_X(curr_bin_cs, 1) == null) {
		if (complete_round == true) {
		    return 1;
		}
		else {
		    return 0;
		}
	    }
	}

	var dec_cookieset = binary_array_to_decimal(curr_bin_cs);
	var bin_cookieset = curr_bin_cs.slice(0);

	// Only push this set iff 
	//  it is not a superset of already verified account-cookieset OR
	//  it is not a subset of already verified non-account-cookieset 
	rc = is_a_setmember_subset(dec_cookieset, 
				   s_a_LLB_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out anyway.
	    // No point in testing.
	    // 	    console.log("APPU DEBUG: Skipping decimal cookieset(cookieset is subset of account-cookieset): " + 
	    // 			dec_cookieset);
	    if (state == "normal") {
		cookiesets_optimization_stats.num_llb_subset_in_account_cookiesets += 1;
		cookiesets_optimization_stats.tot_page_reloads_naive += 3;
	    }

	    continue;
	}

	// Only push this set iff 
	//  a set-member of verified non-account-cookieset
	//  is not a superset (thus tested already and known to be non-account cookieset) 
	rc = is_a_setmember_superset(dec_cookieset, 
				     s_na_LLB_decimal_cookiesets);
	if (rc) {
	    if (state == "normal") {
		cookiesets_optimization_stats.num_llb_superset_in_non_account_cookiesets += 1;
		cookiesets_optimization_stats.tot_page_reloads_naive += 1;
		// We are returning because of previous results.
		// So set complete_round to false.
		complete_round = false;
		continue;
	    }
	    else {
		var index = which_setmember_is_superset(dec_cookieset, s_na_LLB_decimal_cookiesets);
		if (curr_dc_decimal_cs == snldc_disabled_cookiesets[index]) {
		    console.log("Here here: Continuing as tested before, Delete me");
		    continue;
		}
	    }
	}
	
	rc = is_a_setmember_superset(dec_cookieset, 
				     s_na_GUB_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will not affect a session's logged-in status.
	    // No point in testing.
	    if (state == "normal") {
		cookiesets_optimization_stats.num_llb_superset_in_non_account_super_cookiesets += 1;
		cookiesets_optimization_stats.tot_page_reloads_naive += 1;
	    }

	    continue;
	}

	rc = is_a_setmember_subset(dec_cookieset, 
				   s_a_GUB_decimal_cookiesets);
	if (rc) {
	    if (state == "normal") {
		cookiesets_optimization_stats.num_llb_subset_in_account_super_cookiesets += 1;
		cookiesets_optimization_stats.tot_page_reloads_naive += 3;
		continue;
	    }
	    else {
		var index = which_setmember_is_subset(dec_cookieset, s_a_GUB_decimal_cookiesets);
		if (curr_dc_decimal_cs == sagdc_disabled_cookiesets[index]) {
		    console.log("Here here: Continuing as tested before, Delete me");
		    continue;
		}
	    }
	}

	return {
	    binary_cookieset: bin_cookieset,
		decimal_cookieset: dec_cookieset
		};
    } while(1);
    
    return -1;
}

// Return values:
// 0: Means no more cookiesets can be generated for this round. Move to the next state.
// 1: One complete round we could not generate any cookieset.
// -1: Some error.
// ELSE: object with binary and decimal cookiesets
function get_next_gub_binary_cookieset_X(curr_bin_cs, 
					 x, 
					 tot_cookies, 
					 s_a_LLB_decimal_cookiesets,
					 s_na_LLB_decimal_cookiesets,
					 s_a_GUB_decimal_cookiesets,
					 s_na_GUB_decimal_cookiesets,
					 state,
					 cookiesets_optimization_stats,
					 curr_dc_decimal_cs,
					 stop_after_minutes) {
    var complete_round = false;
    var start_time = parseInt(new Date().getTime() / 1000);
    var current_time = undefined;
    var tot_explored_cookiesets = 0;
    var tot_minutes = 0;

    if (state == "expand") {
	var new_s_na_LLB_decimal_cookiesets = [];
	var snldc_disabled_cookiesets = [];

	var new_s_a_GUB_decimal_cookiesets = [];
	var sagdc_disabled_cookiesets = [];

	for (var i = 0; i < s_na_LLB_decimal_cookiesets.length; i++) {
	    new_s_na_LLB_decimal_cookiesets.push(s_na_LLB_decimal_cookiesets[i][1]);
	    snldc_disabled_cookiesets.push(s_na_LLB_decimal_cookiesets[i][0]);
	}

	for (var i = 0; i < s_a_GUB_decimal_cookiesets.length; i++) {
	    new_s_a_GUB_decimal_cookiesets.push(s_a_GUB_decimal_cookiesets[i][1]);
	    sagdc_disabled_cookiesets.push(s_a_GUB_decimal_cookiesets[i][0]);
	}

	s_na_LLB_decimal_cookiesets = new_s_na_LLB_decimal_cookiesets;
	s_a_GUB_decimal_cookiesets = new_s_a_GUB_decimal_cookiesets;
    }

    do {
	tot_explored_cookiesets += 1;
	current_time = parseInt(new Date().getTime() / 1000);

	if ((current_time - start_time) >= 60) {
	    tot_minutes += 1;
	    console.log("APPU DEBUG: (Total minutes = " + tot_minutes + ")Cookiesets explored so far: " + 
			tot_explored_cookiesets);
	    start_time = parseInt(new Date().getTime() / 1000);
	    current_time = parseInt(new Date().getTime() / 1000);
	    if (stop_after_minutes != undefined &&
		tot_minutes > stop_after_minutes) {
		console.log("APPU DEBUG: Time spent(" + tot_minutes + ") exceeds stop_after_minutes(" + 
			    stop_after_minutes + "), so returning");
		var rv = {
		    binary_cookieset: bin_cookieset,
		    decimal_cookieset: dec_cookieset
		};
		console.log("APPU DEBUG: Returning current cookiesets: " + JSON.stringify(rv));
		return rv;
	    }
	}

	if (curr_bin_cs == undefined ||
	    curr_bin_cs == null) {
	    curr_bin_cs = decimal_to_binary_array(0, tot_cookies);
	    var rc = set_last_X_bits_to_bit_val(x, 0, curr_bin_cs, 0);    
	    if (rc == -1) {
		return 1;
	    }
	    complete_round = true;
	}
	else {
	    if (generate_next_binary_cookieset_X(curr_bin_cs, 0) == null) {
		if (complete_round == true) {
		    return 1;
		}
		else {
		    return 0;
		}
	    }
	}

	var dec_cookieset = binary_array_to_decimal(curr_bin_cs);
	var bin_cookieset = curr_bin_cs.slice(0);

	rc = is_a_setmember_subset(dec_cookieset, 
				   s_a_LLB_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out anyway.
	    // No point in testing.

	    if (state == "normal") {
		cookiesets_optimization_stats.num_gub_subset_in_account_cookiesets += 1;
		cookiesets_optimization_stats.tot_page_reloads_naive += 2;
	    }

	    continue;
	}
	
	rc = is_a_setmember_superset(dec_cookieset, 
				     s_na_GUB_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-in.
	    // No point in testing.
	    if (state == "normal") {
		cookiesets_optimization_stats.num_gub_superset_in_non_account_super_cookiesets += 1;
		cookiesets_optimization_stats.tot_page_reloads_naive += 2;
	    }

	    continue;
	}
	
	rc = is_a_setmember_subset(dec_cookieset, 
				   s_a_GUB_decimal_cookiesets);
	if (rc) {
	    if (state == "normal") {
		cookiesets_optimization_stats.num_llb_subset_in_account_super_cookiesets += 1;
		cookiesets_optimization_stats.tot_page_reloads_naive += 3;
		continue;
	    }
	    else {
		var index = which_setmember_is_subset(dec_cookieset, s_a_GUB_decimal_cookiesets);
		if (curr_dc_decimal_cs == sagdc_disabled_cookiesets[index]) {
		    console.log("Here here: Continuing as tested before, Delete me");
		    continue;
		}
	    }
	}

	rc = is_a_setmember_superset(dec_cookieset, 
				     s_na_LLB_decimal_cookiesets);
	if (rc) {
	    if (state == "normal") {
		cookiesets_optimization_stats.num_llb_superset_in_non_account_cookiesets += 1;
		cookiesets_optimization_stats.tot_page_reloads_naive += 1;
		// We are returning because of previous results.
		// So set complete_round to false.
		complete_round = false;
		continue;
	    }
	    else {
		var index = which_setmember_is_superset(dec_cookieset, s_na_LLB_decimal_cookiesets);
		if (curr_dc_decimal_cs == snldc_disabled_cookiesets[index]) {
		    console.log("Here here: Continuing as tested before, Delete me");
		    continue;
		}
	    }
	}
	
	return {
	    binary_cookieset: bin_cookieset,
		decimal_cookieset: dec_cookieset
		};
    } while(1);
    
    return -1;
}

// Returns binary_cookiesets & decimal_cookiesets which only have specific number of cookies marked.
// For example is 'x' = 2, and tot_cookies = 3, then
// [['0', '1', '1'], ['1', '0', '1'], ['1', '1', '0']] will get returned.
// Marked cookies will be omitted while populating shadow_cookie_store.
// If any of the cookies in the above set is a superset of already verified-account-cookieset OR
//  if they are subset of already verified-non-account-cookiesets 
//  then they will not be included in the array.
//  Real name of the function:
//  generate_binary_cookiesets_X() = generate_binary_cookiesets_with_X_number_of_cookies_to_be_dropped()
function generate_binary_cookiesets_X_efficient(url, 
				      x, 
				      tot_cookies, 
				      s_a_LLB_decimal_cookiesets,
				      s_na_GUB_decimal_cookiesets) {
    var my_binary_cookiesets = [];
    var my_decimal_cookiesets = [];
    var tot_sets_equal_to_x = 0;
    var curr_bin_cs = decimal_to_binary_array(0, tot_cookies);
    var orig_x = x;

    var num_sets = Math.pow(2, tot_cookies);    
    console.log("APPU DEBUG: Going to generate cookiesets(round=" + x + "), total cookiesets: " + num_sets);

    var rc = set_last_X_bits_to_bit_val(x, 0, curr_bin_cs, 1);    
    if (rc == -1) {
	return -1;
    }
    
    my_binary_cookiesets.push(curr_bin_cs.slice(0));
    my_decimal_cookiesets.push(binary_array_to_decimal(curr_bin_cs));
    
    tot_sets_equal_to_x = 1;
    
    while(generate_next_binary_cookieset_X(curr_bin_cs, 1) != null) {
	tot_sets_equal_to_x += 1;
	var dec_cookieset = binary_array_to_decimal(curr_bin_cs);
	var bin_cookieset = curr_bin_cs.slice(0);
	// Only push this set iff 
	//  it is not a superset of already verified account-cookieset OR
	//  it is not a subset of already verified non-account-cookieset 
	
	rc = is_a_setmember_subset(dec_cookieset, 
				   s_a_LLB_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will cause session to be logged-out anyway.
	    // No point in testing.
	    continue;
	}
	
	rc = is_a_setmember_superset(dec_cookieset, 
				     s_na_GUB_decimal_cookiesets);
	if (rc) {
	    // Suppressing these cookies will not affect a session's logged-in status.
	    // No point in testing.
	    continue;
	}
	
	my_binary_cookiesets.push(bin_cookieset);
	my_decimal_cookiesets.push(dec_cookieset);
    }
    
    var rc = check_if_binary_and_decimal_cookiesets_match(my_binary_cookiesets, 
							  my_decimal_cookiesets);
    
    if (rc == -1) {
	console.log("APPU Error: generate_binary_cookiesets_X() binary, decimal cookiesets do not match");
	return -1;
    }
    
    console.log("APPU DEBUG: Total sets where X(=" + orig_x + ") cookies can be dropped: " + tot_sets_equal_to_x);
    console.log("APPU DEBUG: Actual sets where X(=" + orig_x + ") cookies would be dropped: " + my_binary_cookiesets.length);
    
    return {
	binary_cookiesets: my_binary_cookiesets,
	    decimal_cookiesets: my_decimal_cookiesets
	    }
}

// Returns binary_cookiesets & decimal_cookiesets which only have specific number of cookies marked.
// For example is 'x' = 2, and tot_cookies = 3, then
// [['0', '1', '1'], ['1', '0', '1'], ['1', '1', '0']] will get returned.
// Marked cookies will be omitted while populating shadow_cookie_store.
// If any of the cookies in the above set is a superset of already verified-account-cookieset OR
//  if they are subset of already verified-non-account-cookiesets 
//  then they will not be included in the array.
//  Real name of the function:
//  generate_binary_cookiesets_X() = generate_binary_cookiesets_with_X_number_of_cookies_to_be_dropped()
function generate_binary_cookiesets_X(url, 
				      x, 
				      tot_cookies, 
				      s_a_LLB_decimal_cookiesets,
				      s_na_GUB_decimal_cookiesets) {
    var my_binary_cookiesets = [];
    var my_decimal_cookiesets = [];
    var tot_sets_equal_to_x = 0;

    if (tot_cookies > MAX_COOKIE_TEST) {
	var err_str = "APPU Error: Cookie number exceeds(" + tot_cookies + 
	    ") maximum cookies, cannot proceed for: " + url;
	console.log(err_str);
	print_appu_error(err_str);
	return -1;
    }

    var num_sets = Math.pow(2, tot_cookies);

    console.log("APPU DEBUG: Going to generate cookiesets(round=" + x + "), total cookiesets: " + num_sets);
	
    for (var i = 0; i < num_sets; i++) {
	var dec_cookieset = i;
	var bin_cookieset = decimal_to_binary_array(dec_cookieset, tot_cookies);
	    
	var total = 0;
	for (var j = 0; j < bin_cookieset.length; j++) {
	    total += (bin_cookieset[j]);
	}
	    
	if (total == x) {
	    tot_sets_equal_to_x += 1;
	    // Only push this set iff 
	    //  it is not a superset of already verified account-cookieset OR
	    //  it is not a subset of already verified non-account-cookieset 

	    rc = is_a_setmember_subset(dec_cookieset, 
				       s_a_LLB_decimal_cookiesets);
	    if (rc) {
		// Suppressing these cookies will cause session to be logged-out anyway.
		// No point in testing.
		continue;
	    }

	    rc = is_a_setmember_superset(dec_cookieset, 
					 s_na_GUB_decimal_cookiesets);
	    if (rc) {
		// Suppressing these cookies will not affect a session's logged-in status.
		// No point in testing.
		continue;
	    }
	    
	    my_binary_cookiesets.push(bin_cookieset);
	    my_decimal_cookiesets.push(dec_cookieset);
	}
    }

    var rc = check_if_binary_and_decimal_cookiesets_match(my_binary_cookiesets, 
							  my_decimal_cookiesets);
	
    if (rc == -1) {
	console.log("APPU Error: generate_binary_cookiesets_X() binary, decimal cookiesets do not match");
	return -1;
    }

    console.log("APPU DEBUG: Total sets where X(=" + x + ") cookies can be dropped: " + tot_sets_equal_to_x);
    console.log("APPU DEBUG: Actual sets where X(=" + x + ") cookies would be dropped: " + my_binary_cookiesets.length);

    return {
	binary_cookiesets: my_binary_cookiesets,
	    decimal_cookiesets: my_decimal_cookiesets
    }
}


// Accepts decimal number like '6' and
// returns an array [1,1,0]
// Each element of the array is a number and not a string.
function decimal_to_binary_array(dec_num, tot_len) {
	var bin_str = dec_num.toString(2);
	var bin_str_arr = bin_str.split('');
	var bin_arr = [];
	
	if (tot_len == undefined) {
	    tot_len = bin_str_arr.length;
	}

	if (bin_str_arr.length < tot_len) {
	    var insert_zeroes = (tot_len - bin_str_arr.length);
	    for (var k = 0; k < insert_zeroes; k++) {
		bin_str_arr.unshift("0");
	    }
	}
	    
	for (var j = 0; j < bin_str_arr.length; j++) {
	    bin_arr[j] = parseInt(bin_str_arr[j]);
	}
	return bin_arr;
}

// Accepts a binary array like [1, 1, 0]
// returns a decimal number 6
function binary_array_to_decimal(bin_arr) {
    return parseInt(bin_arr.join(''), 2);
}

function check_if_binary_and_decimal_cookiesets_match(binary_cookiesets, decimal_cookiesets) {
    var bool_ok = true;
    if (binary_cookiesets.length != decimal_cookiesets.length) {
// 	console.log("APPU DEBUG: Lengths mismatch, binary-cookieset("+ binary_cookiesets.length 
// 		    +"), decimal-cookieset(" + decimal_cookiesets.length + ")");
	bool_ok = false;
    }

    for(var i = 0; i < binary_cookiesets.length; i++) {
	var dec_num = binary_array_to_decimal(binary_cookiesets[i]);
	if (dec_num != decimal_cookiesets[i]) {
// 	    console.log("APPU DEBUG: Element mismatch at: " + i +
// 			", binary: " + binary_cookiesets[i] + 
// 			", decimal: " + decimal_cookiesets[i]);
	    bool_ok = false;
	}
    }

    if (bool_ok) {
// 	console.log("APPU DEBUG: Binary and Decimal cookiesets match");
	return 0;
    }

    return -1;
}

// Generates cookiesets. If there is a '1' at a specific position in 
// a cookieset, that cookie will be dropped while populating shadow_cookie_store.
// This function just generates all cookiesets exhasutively from (1:2^N).
// Where N: Total number of 'SUSPECTED_ACCOUNT_COOKIES' cookies.
// However, it will sort cookiesets such that all cookiesets with one cookie
// to be dropped are at the start. Then, all cookies with two cookies to be
// dropped and so on.
// This way, if we detect that a particular cookieset is indeed an account 
// cookieset then we need not test all of its supersets and just prune them.
// Returns:
// binary_cookiesets: [
//                      [0,1,1,0],
//                      [1,0,1,0]
//                    ]
// AND
// decimal_cookiesets: [6, 10]
function generate_binary_cookiesets(url, tot_cookies, dontsort) {
    var my_binary_cookiesets = [];
    var my_decimal_cookiesets = [];

    var num_sets = Math.pow(2, tot_cookies);
	
    dontsort = (dontsort == undefined) ? false : dontsort; 

    if (tot_cookies > MAX_COOKIE_TEST) {
	var err_str = "APPU Error: Cookie number exceeds(" + tot_cookies + 
	    ") maximum cookies, cannot proceed for: " + url;
	console.log(err_str);
	print_appu_error(err_str);
	return -1;
    }

    for (var i = 0; i < num_sets; i++) {
	var dec_cookieset = i;
	var bin_cookieset = decimal_to_binary_array(dec_cookieset, tot_cookies);
	    
	var total = 0;
	for (var j = 0; j < bin_cookieset.length; j++) {
	    total += (bin_cookieset[j]);
	}
	    
	if (total != 0 && 
	    total != 1 &&
	    total != tot_cookies) {
	    my_binary_cookiesets.push(bin_cookieset);
	    my_decimal_cookiesets.push(dec_cookieset);
	}
    }
	
    if (!dontsort) {
	my_binary_cookiesets.sort(function(bin_set1, bin_set2) {
		var tot1 = 0, tot2 = 0;
		for (var i = 0; i < tot_cookies; i++) {
		    tot1 += bin_set1[i];
		    tot2 += bin_set2[i];
		}
		if (tot1 < tot2) {
		    return -1;
		}
		else if (tot1 > tot2) {
		    return 1;
		}
		else {
		    return 0;
		}
	    });
	
	my_decimal_cookiesets.sort(function(dec_set1, dec_set2) {
		var tot1 = 0, tot2 = 0;
		var bin_set1 = decimal_to_binary_array(dec_set1, tot_cookies);
		var bin_set2 = decimal_to_binary_array(dec_set2, tot_cookies);
		
		for (var i = 0; i < tot_cookies; i++) {
		    tot1 += bin_set1[i];
		    tot2 += bin_set2[i];
		}
		
		if (tot1 < tot2) {
		    return -1;
		}
		else if (tot1 > tot2) {
		    return 1;
		}
		else {
		    return 0;
		}
	    });
    }

    return {
	binary_cookiesets: my_binary_cookiesets,
	    decimal_cookiesets: my_decimal_cookiesets
	    }
}
    

// Variable verified_cookie_array[] is an array of cookies that is verified to be an account-cookieset.
// Each cookie in the array is of the form: https://abcde.com/my_path:cookie_name
// This will remove all supersets of verified_cookie_array from cookieset
function prune_binary_cookiesets(verified_cookie_array, 
				 suspected_account_cookies_array, 
				 binary_cookiesets) {
    var rc = convert_cookie_array_to_binary_cookieset(verified_cookie_array, suspected_account_cookies_array);
    var verified_binary_cookieset = rc.binary_cookieset;
    var verified_decimal_cookieset = rc.decimal_cookieset;

    var new_binary_cookiesets = [];
    var new_decimal_cookiesets = [];

    for (var i = 0; i < binary_cookiesets.length; i++) {
	var decimal_cookieset = binary_array_to_decimal(binary_cookiesets[i]);
	rc = is_a_superset(decimal_cookieset, verified_decimal_cookieset);

	if (!rc) {
	    // Only add curr_decimal_cookieset if it is not a superset of 
	    // verified_decimal_cookieset. If it is a superset then no point in testing.
	    new_binary_cookiesets.push(binary_cookiesets[i]);			
	    new_decimal_cookiesets.push(decimal_cookieset);			
	}
    }

    return {
	binary_cookiesets: new_binary_cookiesets,
	    decimal_cookiesets: new_decimal_cookiesets,
	    }   
}

// **** END - Cookiesets generation, manipulations functions
