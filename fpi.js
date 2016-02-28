

function fpi_metadata_read() {
    var fname = "fpi/fpi.json";
    var buff = read_file(fname);
    fpi_metadata = JSON.parse(buff);
}

/// Template processing code START
// Creates a dictionary that has all PI fields mentioned in this template with
// information such as which one of them can be null and which ones are mandatory.
// Returns a tree of created template nodes.
function traverse_template_create_tree(fd, curr_node, site_pi_fields) {
    var all_kids = $(fd).children('div');
    var last_kid = null;

    curr_node.children = [];
    curr_node.xml_node = fd;
    curr_node.name = $(fd).attr('name');

    if (all_kids.length == 0) {
	//This is a leaf node .. represents actual value to be downloaded from the site
	var name = $(fd).attr('name');

	var can_be_a_null = $(fd).attr('can_be_a_null');
	site_pi_fields[name] = {};
	if (can_be_a_null != undefined) {
	    site_pi_fields[name].can_be_a_null = (can_be_a_null == 'no') ? false : true;
	}
	else {
	    site_pi_fields[name].can_be_a_null = true;
	}

	site_pi_fields[name].filled = false;
	site_pi_fields[name].processed = false;
	site_pi_fields[name].value = [];
    }
    else {
	for(var i = 0; i < all_kids.length; i++) {
	    var new_node = {};
	    new_node.parent = curr_node;
	    new_node.root = curr_node.root;
	    new_node.sibling_num = i;
	    new_node.completely_processed = false;
	    
	    if (last_kid != null) {
		new_node.left_sibling = last_kid;
		last_kid.right_sibling = new_node;
		new_node.right_sibling = null;
		last_kid = new_node;
	    }
	    else {
		new_node.left_sibling = null;
		new_node.right_sibling = null;
		last_kid = new_node;
	    }

	    curr_node.children.push(new_node);
	    if ($(all_kids[i]).attr('type')) {
		new_node.type = $(all_kids[i]).attr('type');
	    }

	    traverse_template_create_tree(all_kids[i], new_node, site_pi_fields);
	}
    }
}

function wait_on_sibling_processing_to_finish(curr_node, site_pi_fields, my_slave_tab, level) {
    var event_namespace = sprintf('.%s-%s-%s', my_slave_tab.tabid, level, curr_node.sibling_num);
    var event_name = "sibling-is-done" + event_namespace;

    console.log("APPU DEBUG: WAIT_ON_SIBLING_PROCESSING_TO_FINISH(), event: " + event_name + " sleeping on: " + 
		$(curr_node.parent.child_processing_div).attr('id') + ", my-name: " + curr_node.name);

    $('#' + $(curr_node.parent.child_processing_div).attr('id'))
	.on(event_name, { en : event_namespace} , function(event) {
	if (event.currentTarget.id == event.target.id) {
	    event.stopPropagation();
	    var event_namespace = event.data.en;
	    if (curr_node.parent.process_next_kid == true) {
		console.log("APPU DEBUG: WAIT_ON_SIBLING_PROCESSING_TO_FINISH(), woken up on: " + 
			    $(curr_node.parent.child_processing_div).attr('id') + ", my-name: " + curr_node.name);
		
		$('#' + $(curr_node.parent.child_processing_div).attr('id')).off("sibling-is-done" + 
										 event_namespace);

		curr_node.parent.process_next_kid = false;
		curr_node.process_next_kid = true;
		process_action(curr_node, $(curr_node.xml_node).children('action'), 
			       site_pi_fields, my_slave_tab, level);
	    }
	    else {
		console.log("APPU DEBUG: WAIT_ON_SIBLING_PROCESSING_TO_FINISH(), Again sleeping on: " + 
			    $(curr_node.parent.child_processing_div).attr('id') + ", my-name: " + curr_node.name);
	    }
	}
    });
}


//Instead of doing direct recursion, one has to do indirect one
//as JS has all the calls such as fetch URLs async.(to not annoy users waiting and blocking)
//and also because slave-tab is a resource that multiple nodes will want to use
//to fetch their URLs.
//This async business is making me insane...because of soooo much indirection.
//Can't wait to have "yield" in ECMAScript 6.
function traverse_and_fill(curr_node, site_pi_fields, my_slave_tab, level) {
    if (curr_node.parent == null) {
	console.log("APPU DEBUG: Creating root process_div");
	//This is the root node. So we should be good to process next kid.
	curr_node.process_next_kid = true;

	//Also create a <div> element and attach it to main body.
	//This will be used to indicate that the current child has been
	//processed upto its leaf node.
	//Current level(which will be 0) and since this node is root, child number = 0;
	var dummy_tab_id = sprintf('child-processing-complete-%s-%s-%s', my_slave_tab.tabid, level, "0");
	var dummy_div_str = sprintf('<div id="%s"></div>', dummy_tab_id);
	var dummy_div = $(dummy_div_str);
	$('body').append(dummy_div);
	curr_node.child_processing_div = dummy_div;

	console.log("APPU DEBUG: TRAVERSE_AND_FILL(), curr_node: " + curr_node.name + ", PROCEEDING (ROOT)");
	process_action(curr_node, $(curr_node.xml_node).children('action'), 
		       site_pi_fields, my_slave_tab, level);
    }
    else {
	//We are not root node.
	var dummy_tab_id = sprintf('child-processing-complete-%s-%s-%s',  my_slave_tab.tabid, 
				   level, curr_node.sibling_num);
	var dummy_div_str = sprintf('<div id="%s"></div>', dummy_tab_id);
	var dummy_div = $(dummy_div_str);
	$($(curr_node.parent.child_processing_div)).append(dummy_div);
	curr_node.child_processing_div = dummy_div;

	if (curr_node.parent.process_next_kid == true) {
	    curr_node.parent.process_next_kid = false;
	    curr_node.process_next_kid = true;
	    console.log("APPU DEBUG: TRAVERSE_AND_FILL(), curr_node: " + curr_node.name + ", PROCEEDING");
	    process_action(curr_node, $(curr_node.xml_node).children('action'), 
			   site_pi_fields, my_slave_tab, level);
	}
	else {
	    curr_node.process_next_kid = false;
	    console.log("APPU DEBUG: TRAVERSE_AND_FILL(), curr_node: " + curr_node.name + ", SLEEPING");
	    wait_on_sibling_processing_to_finish(curr_node, site_pi_fields, my_slave_tab, level);
	}
    }
}

function process_kids(curr_node, site_pi_fields, my_slave_tab, level) {
    for(var i = 0; i < curr_node.children.length; i++) {
	traverse_and_fill(curr_node.children[i], site_pi_fields, my_slave_tab, level+1);
    }
}

function send_cmd_to_tab(action_type, curr_node, site_pi_fields, fetch_url, my_slave_tab, level) {
    //Send message to my dedicated tab slave to fetch the url for me and
    //send back the HTML document.
    if (action_type == "fetch-url") {
	chrome.tabs.sendMessage(my_slave_tab.tabid, {
	    type: "goto-url", 
	    url: fetch_url
	}); 
	template_processing_tabs[my_slave_tab.tabid] = fetch_url;
    }
    else if (action_type == "simulate-click") {
	console.log("APPU DEBUG: In SIMULATE-CLICK, selector: " + curr_node.css_selector 
		    + ", filter: " + curr_node.css_filter);

	var change_css = $(curr_node.xml_node).children('action').attr('data');

	chrome.tabs.sendMessage(my_slave_tab.tabid, {
	    type: "simulate-click", 
	    css_selector : curr_node.css_selector,
	    css_filter : curr_node.css_filter,
	    detect_change_css : change_css
	});

	template_processing_tabs[my_slave_tab.tabid] = "dummy-url";
    }
    else {
	print_appu_error("Appu Error: Unknow action for slave tab: " + action_type);
    }

    // console.log("APPU DEBUG: ZZZ tabid: " + my_slave_tab.tabid + ", value: " + 
    // 		template_processing_tabs[my_slave_tab.tabid]);


    //Now the tricky part. We want to know that the tab we just sent message to
    //has the document ready. For this, wait on a custom event on a dummy <div>.
    var dummy_tab_id = sprintf('tab-%s', my_slave_tab.tabid);
    
    $('#' + dummy_tab_id).on("page-is-loaded", function() {
	console.log("APPU DEBUG: Requesting for page-html");
	$('#' + dummy_tab_id).off("page-is-loaded");
	chrome.tabs.sendMessage(my_slave_tab.tabid, {
	    type: "get-html"
		    }, function process_fetched_html(result) {
		var html_data = result['html_data'];
		var all_vals = result['all_vals'];

		my_slave_tab.in_use = false;
		
		$('#wait-queue-tab-' + my_slave_tab.tabid).trigger("waiting_queue");
		var fp = document.implementation.createHTMLDocument("fp");
		
		fp.documentElement.innerHTML = html_data;
		curr_node.fp = fp;
		
		for (var uid in all_vals) {
		    $("[appu_uid="+uid+"]",fp).val(all_vals[uid]);
		}

		process_kids(curr_node, site_pi_fields, my_slave_tab, level);
	}); 
    });
}


//Simulate a waiting queue. When someone calls to fetch url and if their slave tab is busy 
//fetching another url, then put that node on waiting queue.
//Waiting on the slave tab occurs in a situation where parent-node's link has been fetched
//and all children now want to fetch their links.
function make_slavetab_do_work(action_type, curr_node, site_pi_fields, fetch_url, my_slave_tab, level) {
    if (!('gatekeeper_initialized' in my_slave_tab)) {
	my_slave_tab.gatekeeper_initialized = true;
	my_slave_tab.wait_queue = [];
	var event_name = "waiting_queue";
	var wait_dummy_tab_id = sprintf('wait-queue-tab-%s', my_slave_tab.tabid);
	$('#' + wait_dummy_tab_id).on(event_name, function() {
	    console.log("APPU DEBUG: woken up from SLAVE-TAB waiting queue");
	    if (my_slave_tab.in_use == true) {
		console.log("APPU DEBUG: Woken up from wait queue but tab is in use");
	    }
	    else {
		if (my_slave_tab.wait_queue.length > 0) {
		    var t = my_slave_tab.wait_queue.pop();
		    my_slave_tab.in_use = true;
		    send_cmd_to_tab(t.action_type, t.curr_node, t.site_pi_fields, 
				       t.fetch_url, my_slave_tab, t.level);
		}
	    }
	});
    }

    if (my_slave_tab.in_use == true) {
	var t = {
	    'action_type' : action_type,
	    'curr_node' : curr_node,
	    'site_pi_fields' : site_pi_fields,
	    'fetch_url' : fetch_url,
	    'level' : level
	};
	my_slave_tab.wait_queue.push(t);
    }
    else {
	my_slave_tab.in_use = true;
	send_cmd_to_tab(action_type, curr_node, site_pi_fields, fetch_url, my_slave_tab, level);
    }
}

// Copies current FPI tree node to a new node and attaches it to the given parent 
// It will also take care of children nodes by recursively calling itself
// with parent set to the new node.
function copy_fpi_node(node, parent) {
    var copied_node = {};
    var properties_array = [
			    "type",
			    "root",
			    "sibling_num",
			    "completely_processed",
			    "xml_node",
			    "name",
			    ];

    copied_node.parent = parent;

    $.map(properties_array, function(property, i) {
	    if (node[property] != undefined) {
		copied_node[property] = node[property];
	    }
	});

    copied_node.children = [];
    var last_kid = null;

    for (var i = 0; i < node.children.length; i++) {
	var n = copy_fpi_node(node.children[i], copied_node);
	    
	if (last_kid != null) {
	    n.left_sibling = last_kid;
	    last_kid.right_sibling = n;
	    n.right_sibling = null;
	    last_kid = n;
	}
	else {
	    n.left_sibling = null;
	    n.right_sibling = null;
	    last_kid = n;
	}
	copied_node.children.push(n);
    }
    return copied_node;
}

// This will copy the same subtree under different parents.
// This is useful for the case when there are multiple elements selected
// on which action "simulate-click" is to be performed.

// This does not need to return anything since newly created subtree
// copies will be attached to the parents anyway.
function get_subtree_copies(subtree, parents) {
    for (var i = 0; i < parents.length; i++) {
	var n = copy_fpi_node(subtree, parents[i]);
	parents[i].children.push(n);
    }
}


// Dynamically create new nodes in the FPI template tree.
// Tricky part is generating xml_node. For this, caller has
// to send the correct xml_text which MUST have at least one "action" element in it.
function create_empty_node(name, sibling_num, parent, xml_text) {
    var fd = $(xml_text);
    var curr_node = {};

    curr_node.children = [];
    curr_node.xml_node = fd;
    curr_node.name = name;
    curr_node.sibling_num = sibling_num;
    curr_node.completely_processed = false;
    curr_node.parent = parent;
    curr_node.root = parent.root;
    curr_node.left_sibling = null;
    curr_node.right_sibling = null;

    return curr_node;
}


function create_dummy_fetch_url_children(curr_node, curr_page_url, pfp) {
    var new_children = [];
    var last_kid = null;
    for(var i = 0; i < pfp.length; i++) {
	var name = "dummy-multiple-fetch-url-"+ i;
	var xml_text = '<div name="'+ name +'">' +
	    '<action type="fetch-url">' + curr_page_url + '</action></div>';

	var n = create_empty_node(name, i, curr_node, xml_text);
	if (last_kid != null) {
	    n.left_sibling = last_kid;
	    last_kid.right_sibling = n;
	    n.right_sibling = null;
	    last_kid = n;
	}
	else {
	    n.left_sibling = null;
	    n.right_sibling = null;
	    last_kid = n;
	}

	new_children.push(n);
    }

    return new_children;
}

function process_action(curr_node, action, site_pi_fields, my_slave_tab, level) {
    //console.log("APPU DEBUG, Name: " + curr_node.name + ", action: " + $(action).attr('type'));
    if ($(action).attr('type') == 'fetch-url') {
	var fetch_url = $.trim($(action).text());
	console.log('APPU DEBUG: Got fetch-url:' + fetch_url);
	curr_node.fetched_url = fetch_url;
	make_slavetab_do_work("fetch-url", curr_node, site_pi_fields, fetch_url, my_slave_tab, level);
    }
    else if ($(action).attr('type') == 'fetch-href') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var jquery_filter = $.trim($(action).attr('jquery_filter'));
	var elem = apply_css_selector(pfp, css_selector, jquery_filter);

	//var fetch_url = $.trim($(css_selector, pfp).attr('href'));
	var fetch_url = $.trim($(elem).attr('href'));

	console.log("APPU DEBUG: Got fetch-href: " + fetch_url);
	curr_node.fetched_url = fetch_url;
	make_slavetab_do_work("fetch-url", curr_node, site_pi_fields, fetch_url, my_slave_tab, level);
    }
    else if ($(action).attr('type') == 'simulate-click') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var css_filter = $.trim($(action).attr('filter'));
	var jquery_filter = $.trim($(action).attr('jquery_filter'));

	if (pfp.length == 1 || pfp.length == undefined) {
	    var tmp_fp = apply_css_filter(apply_css_selector(pfp, css_selector, jquery_filter), css_filter);
	    var appu_uid = $(tmp_fp).attr("appu_uid");
	    curr_node.css_selector = "[appu_uid='" + appu_uid + "']";
	    curr_node.css_filter = "";
	    make_slavetab_do_work('simulate-click', curr_node, site_pi_fields, undefined, my_slave_tab, level);
	}
	else {
	    //get the current page url: fetch-url OR fetch-href
	    var curr_page_url = '';
	    curr_ancestor = curr_node.parent;
	    
	    while (curr_ancestor != undefined) {
		var curr_ancestor_action = $(curr_ancestor.xml_node).children("action").attr('type');
		if (curr_ancestor_action == "fetch-url" || 
		    curr_ancestor_action == "fetch-href" ) {
		    curr_page_url = curr_ancestor.fetched_url;
		    break;
		}
		curr_ancestor = curr_ancestor.parent;
	    }
	    
	    if (curr_page_url == '') {
		print_appu_error("Appu Error: Could not find curr_page_url for domain: " + 
				 curr_node.root.domain);
		// Terminate processing of subtree here.
		inform_parent(curr_node);
		return;
	    }
	    
	    var parent_action = $(curr_node.parent.xml_node).children("action").attr("type");
	    if (parent_action != "fetch-dom-element") {
		print_appu_error("Appu Error: For mulitple-select, parent-action is not" + 
				 " fetch-dom-element, domain: " + curr_node.root.domain);
		// Terminate processing of subtree here.
		inform_parent(curr_node);
		return;
	    }
	    
	    var old_children = curr_node.children;
	    // First create new children with fetch-url for the curr_node
	    // This will bring us back to the current-url after each simulate-click
	    var new_children = create_dummy_fetch_url_children(curr_node, curr_page_url, pfp);
	    
	    // Following with select specific element on the current page to 
	    // simulate click on. Thus using "select_index" we segregate each
	    // element to simulate click on under a different subtree and we 
	    // also have a fetch-url as a parent, effectively nullifying previous
	    // simulate-click effects.
	    var action_element = {};
	    $.extend(true, action_element, $(curr_node.parent.xml_node).children("action"));
	    
	    var new_grand_children = [];
	    var last_kid = null;
	    
	    for(var i = 0; i < new_children.length; i++) {
		$(action_element).attr("select_index", i);
		var action_element_xml = $('<div>').append(action_element).html();
		
		var name = "dummy-multiple-fetch-dom-element-"+ i;
		var xml_text = '<div name="'+ name +'">' + action_element_xml + '</div>';
		
		var n = create_empty_node(name, i, new_children[i], xml_text);
		new_grand_children.push(n);
		new_children[i].children.push(n);
	    }

	    for (var k = 0; k < old_children.length; k++) {
		//get_subtree_copies(old_children[k], new_children);
		get_subtree_copies(curr_node, new_grand_children);
	    }

	    curr_node.children = new_children;
	    process_kids(curr_node, site_pi_fields, my_slave_tab, level);
	}
    }
    else if ($(action).attr('type') == 'fetch-dom-element') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var css_filter = $.trim($(action).attr('filter'));
	var select_index = $.trim($(action).attr('select_index'));
	var jquery_filter = $.trim($(action).attr('jquery_filter'));

	curr_node.fp = apply_css_filter(apply_css_selector(pfp, css_selector, jquery_filter), css_filter);

	if (select_index) {
	    curr_node.fp = $(curr_node.fp[select_index]);
	}

	process_kids(curr_node, site_pi_fields, my_slave_tab, level)
    }
    else if ($(action).attr('type') == 'fetch-prev-dom-element') {
	// I think I coded this because there is no way to goto previous in current CSS std.
	// I believe in future same thing can be done by using "!".
	// Everything in this condition is same as above EXCEPT .prev() applied when generating "fp"
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var css_filter = $.trim($(action).attr('filter'));
	var jquery_filter = $.trim($(action).attr('jquery_filter'));

	curr_node.fp = $(apply_css_filter(apply_css_selector(pfp, css_selector, jquery_filter), 
					  css_filter)).prev();
	process_kids(curr_node, site_pi_fields, my_slave_tab, level)
    }
    else if ($(action).attr('type') == 'store') {
	var pfp = curr_node.parent.fp;

	if (!pfp) {
	    // Return, some error 
	    inform_parent(curr_node);
	    return;
	}

	var css_selector = $.trim($(action).text());
	var store_data = [];
	var element;
	var css_filter = $.trim($(action).attr('filter'));
	var ignore_default = $.trim($(action).attr('ignore_default'));
	if (!ignore_default) {
	    ignore_default = '';
	}
	else {
	    var t = ignore_default.split(',');
	    ignore_default = t.map(function(s){ return $.trim(s);});
	}

	var jquery_filter = $.trim($(action).attr('jquery_filter'));
	var result = [];

	var data_filter = $.trim($(action).attr('data_filter'));

 	var is_editable = $(action).attr('field_type');
 	if (is_editable != undefined) {
 		is_editable = (is_editable == 'editable') ? true : false;
 	} else{
 		is_editable = false;
 	}

	console.log("APPU DEBUG: In store");

	if (curr_node.parent.type && 
	    curr_node.parent.type == 'vector') {
	    $.each(pfp, function(index, e) {
		    r = apply_css_filter(apply_css_selector(e, css_selector, jquery_filter), css_filter);
		    result.push(r);
	    });
	}
	else {
	    r = apply_css_filter(apply_css_selector(pfp, css_selector, jquery_filter), css_filter);
	    result.push(r);
	}

	for(var i = 0; i < result.length; i++) {
	    var field_value = "";
 	    if(is_editable){
		field_value = $.trim($(result[i]).val());
 	    } 
	    else {
		field_value = $.trim($(result[i]).text());
 	    }

	    if (data_filter) {
		field_value = apply_data_filter(field_value, data_filter);
	    }

	    if (field_value != "" && ignore_default.indexOf(field_value) == -1) {
		store_data.push(field_value.toLowerCase());
	    }
	}

	if (store_data.length > 0) {
	    console.log('APPU DEBUG: Storing data :' + JSON.stringify(store_data));
	    curr_node.result = store_data;
	    
	    site_pi_fields[curr_node.name].value = site_pi_fields[curr_node.name].value.concat(store_data);
	    site_pi_fields[curr_node.name].filled = true;
	    site_pi_fields[curr_node.name].processed = true;
	} else {
	}

	inform_parent(curr_node);
    }
    else if ($(action).attr('type') == 'combine-n-store') {
	var pfp = curr_node.parent.fp;

	if (!pfp) {
	    // Return, some error 
	    inform_parent(curr_node);
	    return;
	}

	var css_selector = $.trim($(action).text());
	var store_data = [];
	var element;
	var css_filter = $.trim($(action).attr('filter'));
	var ignore_default = $.trim($(action).attr('ignore_default'));
	var combine_operator = $.trim($(action).attr('combine_operator'));
	if (!ignore_default) {
	    ignore_default = '';
	}
	else {
	    var t = ignore_default.split(',');
	    ignore_default = t.map(function(s){ return $.trim(s)});
	}

	if (!combine_operator) {
	    combine_operator = ', ';
	}

	var jquery_filter = $.trim($(action).attr('jquery_filter'));

	var result = [];

	var data_filter = $.trim($(action).attr('data_filter'));

	console.log("APPU DEBUG: In combine-n-store");

 	var is_editable = $(action).attr('field_type');
 	if (is_editable != undefined) {
 		is_editable = (is_editable == 'editable') ? true : false;
 	} else{
 		is_editable = false;
 	}

	if (curr_node.parent.type && 
	    curr_node.parent.type == 'vector') {
	    $.each(pfp, function(index, e) {
		    r = apply_css_filter(apply_css_selector(e, css_selector, jquery_filter), css_filter);
		    result.push(r);
	    });
	}
	else {
	    r = apply_css_filter(apply_css_selector(pfp, css_selector, jquery_filter), css_filter);
	    result.push(r);
	}

	for(var i = 0; i < result.length; i++) {
	    var combined_value = "";

	    if ($(result[i]).length > 1) {
		$.each(result[i], function(index, value) { 
		    var field_value = "";
 		    if(is_editable){
			field_value = $.trim($(value).val());
 		    } 
		    else {
			field_value = $.trim($(value).text());
 		    }

		    if (field_value != "" && ignore_default.indexOf(field_value) == -1) {
			combined_value += field_value + combine_operator;
		    }
		});
		
		if (combined_value.length >= combine_operator.length && 
		    (combined_value.substring(combined_value.length - combine_operator.length) == combine_operator)) {
		    combined_value = combined_value.substring(0, combined_value.length - combine_operator.length);
		}
	    }
	    else {
		var field_value = "";
 		if(is_editable) {
		    field_value = $.trim($(result[i]).val());
 		} 
		else {
		    field_value = $.trim($(result[i]).text());
 		}

		if (field_value != "" && ignore_default.indexOf(field_value) == -1) {
		    combined_value = field_value;
		}
	    }

	    if (combined_value != "") {
		store_data.push(combined_value.toLowerCase());
	    }
	}

	if (store_data.length > 0) {
	    console.log('APPU DEBUG: Storing data :' + JSON.stringify(store_data));
	    curr_node.result = store_data;
	    
	    site_pi_fields[curr_node.name].value = site_pi_fields[curr_node.name].value.concat(store_data);
	    site_pi_fields[curr_node.name].filled = true;
	    site_pi_fields[curr_node.name].processed = true;
	} else {
	}

	inform_parent(curr_node);
    }
    else if ($(action).attr('type') == 'explore') {
	console.log("APPU DEBUG: In action type: EXPLORE");
	inform_parent(curr_node);
    }
    else {
	print_appu_error("Appu Error: Unknown action in FPI template: " + $(action).attr('type'));
    }
}

function are_all_kids_processed(node) {
    var all_processed = true;
    for(var i = 0; i < node.children.length; i++) {
	if (node.children[i].completely_processed == false) {
	    all_processed = false;
	    break;
	}
    }
    return all_processed;
}

function fpi_processing_complete(tabid, site_pi_fields, domain, shut_timer) {
    var main_tab = sprintf("#tab-%s", tabid);
    var wait_queue_tab = sprintf("#wait-queue-tab-%s", tabid);
    var child_processing_tab = sprintf("#child-processing-complete-%s-0-0", tabid);
    var successfully_processed = true;
	
    for(var pi_name in site_pi_fields) {
	if (!site_pi_fields[pi_name].can_be_a_null) {
	    if (site_pi_fields[pi_name].value.length == 0) {
		print_appu_error("Appu Error: FPI failed due to PI: " + pi_name + ", domain: " + domain);
		successfully_processed = false;
		break;
	    }
	}
    }
    
    if (successfully_processed) {
	console.log("APPU DEBUG: SUCCESSFUL:: Identified all kids: " + 
		    JSON.stringify(site_pi_fields));

	sanitize_and_store_downloaded_fpi_data(domain, site_pi_fields, "fpi");
    }
    else {
	print_appu_error("Appu Error: Could not process FPI template for: " + domain);
    }
    
    if (shut_timer != undefined) {
	window.clearTimeout(shut_timer);
    }

    $(main_tab).remove();
    $(wait_queue_tab).remove();
    $(child_processing_tab).remove();
    delete template_processing_tabs[tabid];

    console.log("APPU DEBUG: This should close the FPI downloaded tab");
    chrome.tabs.remove(tabid);

    if (tabid in initial_pi_fetch_tabs) {
	delete initial_pi_fetch_tabs[tabid];
    }
}

function inform_parent(leaf_node) {
    leaf_node.completely_processed = true;
    var curr_node = leaf_node;
    var all_processed = true;
    console.log("APPU DEBUG: INFORM_PARENT(), setting done for: " + curr_node.name);
    while(all_processed && curr_node.parent != null) {
	all_processed = are_all_kids_processed(curr_node.parent);
	if (all_processed) {
	    curr_node.parent.completely_processed = true;
	    curr_node = curr_node.parent;
	}
    }

    console.log("APPU DEBUG: INFORM_PARENT(), all_siblings_processed: " + all_processed + ", parent null?: " + 
		(curr_node.parent == null));

    if (all_processed && (curr_node.parent == null)) {
	//Satisfying above condition means that all nodes in FPI are processed and
	//curr node is ROOT.
	//So it will have all the attributes set at the beginning of process_template()
	console.log("APPU DEBUG: ROOT node is processed, time to close tab");
	fpi_processing_complete(curr_node.my_slave_tab.tabid,  curr_node.site_pi_fields, 
				curr_node.domain, curr_node.shut_timer);
    }
    else {
	//All of my subtree is processed...give a chance to sibling subtrees.
	curr_node.parent.process_next_kid = true;
	console.log("APPU DEBUG: INFORM_PARENT(), triggering sibling-is-done for: " + 
		    $(curr_node.parent.child_processing_div).attr('id') + ", my-name: " + curr_node.name);

	$('#' + $(curr_node.parent.child_processing_div).attr('id')).trigger("sibling-is-done");
    }
}

function apply_css_filter(elements, css_filter) {
    if (css_filter && css_filter != "") {
	return $(elements).filter(css_filter);
    }
    return elements;
}


function apply_data_filter(field_value, data_filter) {
    var patterns = [
		    /(delete)-'(.*)'/,
		    ];

    for (var p = 0; p < patterns.length; p++) {
	var r = patterns[p].exec(data_filter);
	if(!r) {
	    continue;
	}
	if (r[1] == "delete") {
	    var fv = field_value.replace(r[2], "");
	    return fv;
	}
    }
    return field_value;
}

function apply_jquery_filter(element, jquery_filter, css_selector) {
    var patterns = [
		    /(ancestor)-([0-9]+)/,
		    /(remove-children)/,
		    /(is_visible)/,
		    /(find_deepest)/,
		    /(omit-string:)(.*)/,
		    ];

    for (var p = 0; p < patterns.length; p++) {
	var r = patterns[p].exec(jquery_filter);
	if(!r) {
	    continue;
	}
	if (r[1] == "ancestor") {
	    var rc = $(element).parents().eq(r[2]);
	    return rc;
	}
	else if (r[1] == "omit-string:") {
	    var t = $(element).text();
	    t = t.replace(r[2], '');
	    $(element).text(t);
	    return $(element);
	}
	else if (r[1] == "remove-children") {
	    var rc = $(element).children().remove().end();
	    return rc;
	}
	else if (r[1] == "is_visible") {
	    if ($(element).attr("appu_rendering") == "visible") {
		return $(element);
	    }
	} else if (r[1] == "find_deepest") {
	    var result = $(css_selector, element);
	    if (result.length != 0) {
		return undefined;
	    }
	    return $(element);
	}
    }
    return undefined;
}

function apply_css_selector(elements, css_selector, jquery_filter) {
    if (css_selector && css_selector != "") {
	var result = $(css_selector, elements);
	if (jquery_filter && jquery_filter != "") {
	    var jqf_result = undefined;
	    for (var z = 0; z < result.length; z++) {
		var rc = apply_jquery_filter(result[z], jquery_filter, css_selector);
		if (rc != undefined) {
		    if (!jqf_result || jqf_result.length == 0) {
			jqf_result = rc;
		    }
		    else {
			jqf_result = jqf_result.add(rc);
		    }
		}
	    }
	    result = jqf_result;
	}
	return result;
    }
    return elements;
}


function process_template(domain, data, my_slave_tab) {
    var fd = $.parseXML(data);
    var template_tree = {};
    var site_pi_fields = {};

    //Hard timeout..
    //Stop processing after 300 seconds.
    var shut_tab_forcefully = window.setTimeout(function() {
    	console.log("APPU DEBUG: In forceful shutdown for FPI of domain: " + domain);
	fpi_processing_complete(template_tree.my_slave_tab.tabid,  template_tree.site_pi_fields, 
				template_tree.domain, undefined);
    }, 300 * 1000);

    template_tree.shut_timer = shut_tab_forcefully;
    template_tree.parent = null;
    template_tree.name = 'root';
    template_tree.completely_processed = false;
    template_tree.domain = domain;
    template_tree.root = template_tree;
    template_tree.site_pi_fields = site_pi_fields;

    template_tree.my_slave_tab = my_slave_tab;

    level = 0;
    console.log("APPU DEBUG: PROCESS_TEMPLATE called");
    traverse_template_create_tree($(fd).children(), template_tree, site_pi_fields);

    traverse_and_fill(template_tree, site_pi_fields, my_slave_tab, level);
}


function open_tab_inconspicuously(domain, data, sender_tab, initial_fetch) {
    var sender_tab_windowId = sender_tab.windowId;
    var all_windows = undefined;
    var last_focused_window = undefined;

    function get_all_windows(windows) {
	all_windows = windows
	chrome.windows.getLastFocused({}, get_last_focused_window);
    }

    function get_last_focused_window(window) {
	last_focused_window = window;
	var chosen_windowId = undefined;

	for (var i = 0; i < all_windows.length; i++) {
	    console.log("APPU DEBUG: ----------- --------- -------- ---------- ");
	    console.log("APPU DEBUG: Window ID: " + all_windows[i].id);
	    console.log("APPU DEBUG: Window INCOGNITO: " + all_windows[i].incognito);
	    console.log("APPU DEBUG: Window TYPE: " + all_windows[i].type);
	    console.log("APPU DEBUG: Window STATE: " + all_windows[i].state);
	    console.log("APPU DEBUG: Window TOTAL TABS: " + all_windows[i].tabs.length);
	}
	console.log("APPU DEBUG: ----------- --------- -------- ---------- ");
	console.log("APPU DEBUG: Last focused Window ID: " + last_focused_window.id);

	for (var i = 0; i < all_windows.length; i++) {
	    if (all_windows[i].incognito == true) {
		continue;
	    }

	    if (all_windows[i].type != 'normal') {
		continue;
	    }

	    if (all_windows[i].id == sender_tab_windowId && all_windows[i].tabs.length < 5) {
		continue;
	    }

	    chosen_windowId = all_windows[i].id;
	    
	    if (chosen_windowId != sender_tab_windowId) {
		console.log("APPU DEBUG: Index of the window is: " + i);
		break;
	    }
	}

	if (chosen_windowId == undefined) {
	    delete pii_vault.aggregate_data.per_site_pi[domain].attempted_download_time;
	    flush_selective_entries("aggregate_data", ["per_site_pi"]);
	}
	else {
	    open_slave_tab(domain, data, chosen_windowId, 0, initial_fetch);
	}
    }

    chrome.windows.getAll({
	    populate: true,
		}, get_all_windows);

}


function open_slave_tab(domain, data, window_id, tab_index, initial_fetch) {
    var process_template_tabid = undefined;
    //Just some link so that appu content script runs on it.
    var default_url = 'http://google.com';
   
    create_properties = { 
	url: default_url, 
	active: false 
    };

    if (window_id != undefined) {
	create_properties.windowId = window_id;
    }

    if (tab_index != undefined) {
	create_properties.index = tab_index;
    }

    //Create a new tab. Once its ready, send message to process the template.
    chrome.tabs.create(create_properties, function slave_tab_callback(tab) {
	    process_template_tabid = tab.id;
	    var my_slave_tab = { tabid: process_template_tabid, 'in_use': true}
	    template_processing_tabs[process_template_tabid] = default_url;
	    //console.log("APPU DEBUG: XXX tabid: " + tab.id + ", value: " + 
	    // template_processing_tabs[tab.id]);

	    if (initial_fetch == true) {
		initial_pi_fetch_tabs[tab.id] = true;
	    }
    
	    //Dummy element to wait for HTML fetch
	    var dummy_tab_id = sprintf('tab-%s', process_template_tabid);
	    var dummy_div_str = sprintf('<div id="%s"></div>', dummy_tab_id);
	    var dummy_div = $(dummy_div_str);
	    $('body').append(dummy_div);
    
	    //Dummy element to wait for SLAVE tab to become free.
	    var wait_dummy_tab_id = sprintf('wait-queue-tab-%s', process_template_tabid);
	    var wait_dummy_div_str = sprintf('<div id="%s"></div>', wait_dummy_tab_id);
	    var wait_dummy_div = $(wait_dummy_div_str);
	    $('body').append(wait_dummy_div);
    
	    $('#' + dummy_tab_id).on("page-is-loaded", function() {
		    my_slave_tab.in_use = false;
		    $('#' + dummy_tab_id).off("page-is-loaded");
		    process_template(domain, data, my_slave_tab);    
		});
	});
}


/// Template processing code END

function start_pi_download_process(domain, data, sender_tab, initial_fetch) {
    if (sender_tab == undefined) {
	open_slave_tab(domain, data, undefined, undefined, initial_fetch);
    }
    else {
	// Following will check if user has another minimized/unfocused window open.
	// if so, it will open a tab in that window.
	// Otherwise, it will check if user has more than 5 tabs in the current window.
	// If so then it will create a new tab at index 0
	// Otherwise, it will delete "attempted_download_time" and will not download PI this time.
	open_tab_inconspicuously(domain, data, sender_tab, initial_fetch);
    }
}

function check_if_pi_fetch_required(domain, sender_tab_id, sender_tab, initial_fetch) {
    if (!(domain in pii_vault.aggregate_data.per_site_pi)) {
	pii_vault.aggregate_data.per_site_pi[domain] = {};
	flush_selective_entries("aggregate_data", ["per_site_pi"]);
    }

    var curr_time = new Date();
    
    if ('download_time' in pii_vault.aggregate_data.per_site_pi[domain] && initial_fetch != true) {
	var last_update = new Date(pii_vault.aggregate_data.per_site_pi[domain].download_time);
	var td = curr_time.getTime() - last_update.getTime();
	if (td < (60 * 60 * 24 * 10 * 1000)) {
	    //This means that the PI was downloaded just 10 days ago.
	    //No need to download it just yet.
	    console.log("APPU DEBUG: Recently updated the PI, no need to update it for: " + domain);
	    return;
	}
    }
    
    //Following is a throttle on download attempts in a single day.
    if ('attempted_download_time' in pii_vault.aggregate_data.per_site_pi[domain]) {
	var last_download_attempt = new Date(pii_vault.aggregate_data.per_site_pi[domain]
					     .attempted_download_time);
	var td = curr_time.getTime() - last_download_attempt.getTime();
	//Check if its been 1 day since last download attempt
	if (td < (60 * 60 * 24 * 1 * 1000) && !(sender_tab_id in initial_login_tabs)) {
	    console.log("APPU DEBUG: Not attempting PI download. Just attempted so in last 24-hours: " + domain);
	    return;
	}
    }

    if ('user_approved' in pii_vault.aggregate_data.per_site_pi[domain]) {
	if (pii_vault.aggregate_data.per_site_pi[domain].user_approved == 'never') {
	    //Why go through all the pain of downloading FPI?
	    return;
	}
    }
    
    pii_vault.aggregate_data.per_site_pi[domain].attempted_download_time = new Date();
    flush_selective_entries("aggregate_data", ["per_site_pi"]);


    if ((domain in fpi_metadata) && 
	(fpi_metadata[domain]["fpi"] != "not-present")) {
	get_permission_and_fetch_pi(domain, sender_tab_id, sender_tab, initial_fetch);
    }
    else {
	print_appu_error("Appu Error: FPI Template for domain(" + domain 
			 + ") is not present in the FPI list");
    }
    
    return;
}

function get_permission_and_fetch_pi(domain, sender_tab_id, sender_tab, initial_fetch) {
    var data = read_file("fpi/" + fpi_metadata[domain]["fpi"]);
    console.log("APPU DEBUG: Read the template for: " + domain);

    if (pii_vault.options.lottery_setting == "participating") {
	pii_vault.aggregate_data.per_site_pi[domain].user_approved = 'always';
	flush_selective_entries("aggregate_data", ["per_site_pi"]);
	start_pi_download_process(domain, data, sender_tab, initial_fetch);
	return;
    }

    if (sender_tab_id in initial_login_tabs) {
	pii_vault.aggregate_data.per_site_pi[domain].user_approved = 'just-this-time';
	flush_selective_entries("aggregate_data", ["per_site_pi"]);
	start_pi_download_process(domain, data, undefined, initial_fetch);
	return;
    }

    // We are here that means template is present.
    // Attempt to fetch the PI if user has already approved it.
    if ('user_approved' in pii_vault.aggregate_data.per_site_pi[domain]) {
	if (pii_vault.aggregate_data.per_site_pi[domain].user_approved == 'always') {
	    //We are here, that means user has given PI download approval for this site
	    start_pi_download_process(domain, data, undefined, initial_fetch);
	    return;
	}
	else if (pii_vault.aggregate_data.per_site_pi[domain].user_approved == 'never') {
	    console.log("APPU DEBUG: User has already set NEVER for PI on this domain: " + domain);
	    return;
	}
    }
    else {
    //We are here, that means that we have to seek permission from user to download PI for
    //this site.
    chrome.tabs.sendMessage(sender_tab_id, {
	    'type' : "get-permission-to-fetch-pi",
		'site' : domain,
		}, function(response) {
	    if (response.fetch_pi_permission == "always") {
		pii_vault.aggregate_data.per_site_pi[domain].user_approved = 'always';
		flush_selective_entries("aggregate_data", ["per_site_pi"]);
		start_pi_download_process(domain, data, undefined, initial_fetch);
	    }
	    else if (response.fetch_pi_permission == "just-this-time") {
		pii_vault.aggregate_data.per_site_pi[domain].user_approved = 'seek-permission';
		flush_selective_entries("aggregate_data", ["per_site_pi"]);
		start_pi_download_process(domain, data, undefined, initial_fetch);
	    }
	    else if (response.fetch_pi_permission == "never") {
		pii_vault.aggregate_data.per_site_pi[domain].user_approved = 'never';
		flush_selective_entries("aggregate_data", ["per_site_pi"]);
		console.log("APPU DEBUG: User set NEVER for PI on this domain: " + domain);
	    }
	});
    }
}





