
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var ext_id = chrome.i18n.getMessage('@@extension_id');

var pii_vault = {};
var pending_warnings = {}; 

//If user says remind me later
var report_reminder_interval = 30;

//Report check interval in minutes
var report_check_interval = 2;

//Is user processing report?
var is_report_tab_open = 0;

var template_processing_tabs = {};

function verify_unique_guid(guid) {
    //Contact the server and ask if anyone else has same GUID.
    //Worth the effort?
    var wr = {};
    wr.guid = guid;
    try {
	$.post("http://woodland.gtnoise.net:5005/register_new_user", JSON.stringify(wr));
    }
    catch (e) {
	console.log("Error while registering user");
    }
}

function pii_test_yesterdays_report_time() {
    var curr_time = new Date();
    curr_time.setMinutes( curr_time.getMinutes() - 1440);
    curr_time.setSeconds(0);
    curr_time.setMinutes(0);
    curr_time.setHours(0);
    return curr_time.toString();
}

function pii_next_report_time() {
    var curr_time = new Date();
    if (curr_time.getHours() > 16) {
	//Next day advance
	curr_time.setMinutes( curr_time.getMinutes() + 1440);
    }
    curr_time.setSeconds(0);
    curr_time.setMinutes(0);
    curr_time.setHours(0);
    curr_time.setMinutes( curr_time.getMinutes() + pii_vault.reporting_hour);
    return curr_time.toString();
}

//Initializing each property. 
//TODO: Perhaps a better way is to write a generic function
//that accepts property_name and property initializer for that property.
//It will test if property exists. If not, then call the initializer function on that property.
//It will shorten the code and make it decent.
function vault_init() {
    var vault_modified = false;

    console.log("vault_init(): Initializing missing properties from last release");
    if(!pii_vault.guid) {
	pii_vault.guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	    return v.toString(16);
	});

	setTimeout(verify_unique_guid, 1);
	
	console.log("vault_init(): Updated GUID in vault: " + pii_vault.guid);
	vault_modified = true;
    }

    if(!pii_vault.salt_table) {
	var salt_table = {};
	var current_ip = pii_vault.guid;
	for(var i = 0; i < 1000; i++) {
	    salt_table[i] = CryptoJS.SHA1(current_ip).toString();
	    current_ip = salt_table[i];
	    //console.log("i: " + i);
	    //console.log("salt: " + current_ip);
	}
	pii_vault.salt_table = salt_table;
	
	console.log("vault_init(): Updated SALT TABLE in vault");
	vault_modified = true;
    }

    if(!pii_vault.initialized) {
	pii_vault['initialized'] = true;
	console.log("vault_init(): Updated INITIALIZED in vault");
	vault_modified = true;
    }

    if(!pii_vault.status) {
	pii_vault['status'] = "active";
	console.log("vault_init(): Updated STATUS in vault");
	vault_modified = true;
    }

    if(!pii_vault.disable_period) {
	pii_vault['disable_period'] = -1;
	console.log("vault_init(): Updated DISABLE_PERIOD in vault");
	vault_modified = true;
    }

    if(!pii_vault.report) {
	pii_vault['report'] = [];
	console.log("vault_init(): Updated REPORT in vault");
	vault_modified = true;
    }

    if(!pii_vault.past_reports) {
	pii_vault['past_reports'] = [];
	console.log("vault_init(): Updated PAST_REPORTS in vault");
	vault_modified = true;
    }
    
    if(!pii_vault.blacklist) {
	pii_vault['blacklist'] = [];
	console.log("vault_init(): Updated BLACKLIST in vault");
	vault_modified = true;
    }

    if (!pii_vault.master_profile_list) {
    //List of all sites where user has created a profile.
	pii_vault['master_profile_list'] = [];
	console.log("vault_init(): Updated MASTER_PROFILE_LIST in vault");
	vault_modified = true;
    }

    if(!pii_vault.dontbuglist) {
	pii_vault['dontbuglist'] = [];
	console.log("vault_init(): Updated DONTBUGLIST in vault");
	vault_modified = true;
    }

    if(!pii_vault.reporting_hour) {
	pii_vault['reporting_hour'] = 0;
	//Random time between 5 pm to 8 pm.
	var rand_minutes = 1020 + Math.floor(Math.random() * 1000)%180;
	pii_vault.reporting_hour = rand_minutes;
	console.log("vault_init(): Updated REPORTING_HOUR in vault");
	vault_modified = true;
    }    

    //Three different types of reporting.
    //Manual: If reporting time of the day and if report ready, interrupt user and ask 
    //        him to review, modify and then send report.
    //Auto: Send report automatically when ready.
    //Differential: Interrupt user to manually review report only if current report
    //                   entries are different from what he reviewed in the past.
    //                   (How many past reports should be stored? lets settle on 10 for now?).
    //                   Highlight the different entries with different color background.
    if(!pii_vault.reporting_type) {
	pii_vault['reporting_type'] = "manual";
	console.log("vault_init(): Updated REPORTING_TYPE in vault");
	vault_modified = true;
    }    

    if(!pii_vault.next_reporting_time) {
	var curr_time = new Date();
	//Advance by 24 hours. For the first time, don't want to start bugging immediately.
	curr_time.setMinutes( curr_time.getMinutes() + 1440);
	//Next day's 0:0:0 am
	curr_time.setSeconds(0);
	curr_time.setMinutes(0);
	curr_time.setHours(0);
	curr_time.setMinutes( curr_time.getMinutes() + pii_vault.reporting_hour);
	//Start reporting next day
	pii_vault.next_reporting_time = curr_time.toString();
	
	console.log("Report will be sent everyday at "+ Math.floor(rand_minutes/60) + ":" + (rand_minutes%60));
	console.log("Next scheduled reporting is: " + curr_time);
	console.log("vault_init(): Updated NEXT_REPORTING_TIME in vault");
	vault_modified = true;
    }

    if(!pii_vault.domains) {
	pii_vault.domains = {};
	console.log("vault_init(): Updated DOMAINS in vault");
	vault_modified = true;
    }

    if(!pii_vault.input_fields) {
	pii_vault.input_fields = [];
	console.log("vault_init(): Updated INPUT_FIELDS in vault");
	vault_modified = true;
    }

    if(!("report_reminder_time" in pii_vault)) {
	pii_vault.report_reminder_time = null;
	console.log("vault_init(): Updated REPORT_REMINDER_TIME in vault");
	vault_modified = true;
    }

    if(!("reportid" in pii_vault)) {
	pii_vault.reportid = 1;
	console.log("vault_init(): Updated REPORTID in vault");
	vault_modified = true;
    }

    if(!("report_modified" in pii_vault)) {
	pii_vault.report_modified = "no";
	console.log("vault_init(): Updated REPORT_MODIFIED in vault");
	vault_modified = true;
    }

    if(!("per_site_pi" in pii_vault)) {
	pii_vault.per_site_pi = {};
	console.log("vault_init(): Updated PER_SITE_PI in vault");
	vault_modified = true;
    }

    if(vault_modified) {
	console.log("vault_init(): vault modified, writing to disk");
	vault_write();
    }
}

function vault_read() {
    try {
	pii_vault = JSON.parse(localStorage[ext_id]);
	if (pii_vault) {
	    //console.log("pii_vault: " + pii_vault);
	    for (var g in pii_vault) {
		//console.log("Properties of pii_vault: " + g);
	    }
	    if(pii_vault.guid) {
		console.log("Globally Unique User Id: " + pii_vault.guid);
	    }
	    if("salt_table" in pii_vault) {
		//console.log("salt_table length: " + Object.size(pii_vault.salt_table));
	    }
	}
	else {
	    pii_vault = {};
	}
    }
    catch (e) {
	console.log("Loading extension for the first time. Initializing extension data");
	pii_vault = {};
    }
}

//Since this function is getting called async from many different points,
//ideally it should have a lock to avoid race conditions (and possibly corruption).
//However, apparently JS is threadless and JS engine takes care of this issue
//under the hood. So we are safe.
//Currently just writing everything .. in future, only write values that
//are modified.
function vault_write() {
    localStorage[ext_id] = JSON.stringify(pii_vault);
}

function vault_update_domain_passwd(message) {
    try {
	var r = Math.floor((Math.random() * 1000)) % 1000;
	var rand_salt = pii_vault.salt_table[r];
	// Honestly ":" is not required to separate salt and password.
	// Just adding it so that it will be easier in case of debugging
	// and want to print salted_pwd on console for debugging.
	var salted_pwd = rand_salt + ":" + message.passwd;
	var pwd_sha1sum = CryptoJS.SHA1(salted_pwd).toString();

	pii_vault.domains[message.domain] = pwd_sha1sum;
	vault_write();
    }
    catch (e) {
	console.log("Got an exception: " + e.message);
    }
}

function start_time_loop() {
    var curr_time = new Date();
    if ((curr_time - (new Date(pii_vault.disable_start))) > (60 * 1000 * pii_vault['disable_period'])) {
	clearInterval(pii_vault['enable_timer']);
	pii_vault['status'] = "active";
	pii_vault['disable_period'] = -1;
	chrome.browserAction.setIcon({path:'images/appu_new19.png'});
	console.log((new Date()) + ": Enabling Appu");
	vault_write();
    } 
}


/// Template processing code START
// Creates a dictionary that has all PI fields mentioned in this template with
// information such as which one of them can be null and which ones are mendatory.
// Returns a tree of created template nodes.
function traverse_template_create_tree(fd, curr_node, site_pi_fields) {
    var all_kids = $(fd).children('div');
    var last_kid = null;

    curr_node.children = [];
    curr_node.xml_node = fd;
    curr_node.name = $(fd).attr('name');

    if (all_kids.length == 0) {
	//This is the child node
	var name = $(fd).attr('name');
	var can_be_a_null = $(fd).attr('can_be_a_null');
	site_pi_fields[name] = {};
	if (can_be_a_null != undefined) {
	    site_pi_fields[name]['can_be_a_null'] = (can_be_a_null == 'no') ? false : true;
	}
	else {
	    site_pi_fields[name]['can_be_a_null'] = true;
	}
	site_pi_fields[name]['filled'] = false;
	site_pi_fields[name]['processed'] = false;
	site_pi_fields[name]['value'] = [];
    }
    else {
	for(var i = 0; i < all_kids.length; i++) {
	    var new_node = {};
	    new_node.parent = curr_node;
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

    console.log("Here here: WAIT_ON_SIBLING_PROCESSING_TO_FINISH(), event: " + event_name + " sleeping on: " + 
		$(curr_node.parent.child_processing_div).attr('id') + ", my-name: " + curr_node.name);

    $('#' + $(curr_node.parent.child_processing_div).attr('id'))
	.on(event_name, { en : event_namespace} , function(event) {
	    console.log("Here here: HOHOHOHOHOHOHOHOHOHOHOHOH");
	if (event.currentTarget.id == event.target.id) {
	    event.stopPropagation();
	    var event_namespace = event.data.en;
	    if (curr_node.parent.process_next_kid == true) {
		console.log("Here here: WAIT_ON_SIBLING_PROCESSING_TO_FINISH(), woken up on: " + 
			    $(curr_node.parent.child_processing_div).attr('id') + ", my-name: " + curr_node.name);
		
		$('#' + $(curr_node.parent.child_processing_div).attr('id')).off("sibling-is-done" + 
										 event_namespace);

		curr_node.parent.process_next_kid = false;
		curr_node.process_next_kid = true;
		process_action(curr_node, $(curr_node.xml_node).children('action'), 
			       site_pi_fields, my_slave_tab, level);
	    }
	    else {
		console.log("Here here: WAIT_ON_SIBLING_PROCESSING_TO_FINISH(), Again sleeping on: " + 
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
	console.log("Here here: Creating root process_div");
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

	console.log("Here here: TRAVERSE_AND_FILL(), curr_node: " + curr_node.name + ", PROCEEDING (ROOT)");
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
	    console.log("Here here: TRAVERSE_AND_FILL(), curr_node: " + curr_node.name + ", PROCEEDING");
	    process_action(curr_node, $(curr_node.xml_node).children('action'), 
			   site_pi_fields, my_slave_tab, level);
	}
	else {
	    curr_node.process_next_kid = false;
	    console.log("Here here: TRAVERSE_AND_FILL(), curr_node: " + curr_node.name + ", SLEEPING");
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
	console.log("Here here: In SIMULATE-CLICK, selector: " + curr_node.css_selector 
		    + ", filter: " + curr_node.css_filter);
	
	// Send first child node action as well to detect the change in the web page.
	var child_node_action = $(curr_node.children[0].xml_node).children('action');
	var child_node_action_css = $.trim($(child_node_action).text());

	chrome.tabs.sendMessage(my_slave_tab.tabid, {
	    type: "simulate-click", 
	    css_selector : curr_node.css_selector,
	    css_filter : curr_node.css_filter,
	    detect_change_css : child_node_action_css
	});

	template_processing_tabs[my_slave_tab.tabid] = "dummy-url";
    }
    else {
	console.log("Appu Error: Unknow action for slave tab: " + action_type);
    }

    // console.log("Here here: ZZZ tabid: " + my_slave_tab.tabid + ", value: " + 
    // 		template_processing_tabs[my_slave_tab.tabid]);


    //Now the tricky part. We want to know that the tab we just sent message to
    //has the document ready. For this, wait on a custom event on a dummy <div>.
    var dummy_tab_id = sprintf('tab-%s', my_slave_tab.tabid);
    
    $('#' + dummy_tab_id).on("page-is-loaded", function() {
	console.log("Here here: Requesting for page-html");
	$('#' + dummy_tab_id).off("page-is-loaded");
	chrome.tabs.sendMessage(my_slave_tab.tabid, {
	    type: "get-html"
	}, function process_fetched_html(html_data) {
	    my_slave_tab.in_use = false;
	    
	    $('#wait-queue-tab-' + my_slave_tab.tabid).trigger("waiting_queue");
	    var fp = document.implementation.createHTMLDocument("fp");
	    
	    fp.documentElement.innerHTML = html_data;
	    curr_node.fp = fp;

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
	    console.log("Here here: woken up from SLAVE-TAB waiting queue");
	    if (my_slave_tab.in_use == true) {
		console.log("Here here: Woken up from wait queue but tab is in use");
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

function process_action(curr_node, action, site_pi_fields, my_slave_tab, level) {
    //console.log("Here here, Name: " + curr_node.name + ", action: " + $(action).attr('type'));

    if ($(action).attr('type') == 'fetch-url') {
	var fetch_url = $.trim($(action).text());
	//console.log('Here here: Fetching :' + fetch_url);
	make_slavetab_do_work("fetch-url", curr_node, site_pi_fields, fetch_url, my_slave_tab, level);
    }
    else if ($(action).attr('type') == 'fetch-href') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var fetch_url = $.trim($(css_selector, pfp).attr('href'));
	console.log("Here here: Got fetch-href: " + fetch_url);
	make_slavetab_do_work("fetch-url", curr_node, site_pi_fields, fetch_url, my_slave_tab, level);
    }
    else if ($(action).attr('type') == 'simulate-click') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var css_filter = $.trim($(action).attr('filter'));
	curr_node.css_selector = css_selector;
	curr_node.css_filter = css_filter;
	make_slavetab_do_work('simulate-click', curr_node, site_pi_fields, undefined, my_slave_tab, level);
    }
    else if ($(action).attr('type') == 'fetch-dom-element') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var css_filter = $.trim($(action).attr('filter'));

	curr_node.fp = apply_css_filter(apply_css_selector(pfp, css_selector), css_filter);
	process_kids(curr_node, site_pi_fields, my_slave_tab, level)
    }
    else if ($(action).attr('type') == 'store') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var store_data = [];
	var element;
	var css_filter = $.trim($(action).attr('filter'));
	
	var result = [];

	console.log("Here here: In store");

	if (curr_node.parent.type && 
	    curr_node.parent.type == 'vector') {
	    $.each(pfp, function(index, e) {
		r = apply_css_filter(apply_css_selector(e, css_selector), css_filter);
		result.push(r);
	    });
	}
	else {
	    r = apply_css_filter(apply_css_selector(pfp, css_selector), css_filter);
	    result.push(r);
	}

	for(var i = 0; i < result.length; i++) {
	    store_data.push($(result[i]).text());
	}

	if (store_data.length > 0) {
	    console.log('Here here: Storing data :' + JSON.stringify(store_data));
	    curr_node.result = store_data;
	    
	    site_pi_fields[curr_node.name].value = site_pi_fields[curr_node.name].value.concat(store_data);
	    site_pi_fields[curr_node.name].filled = true;
	    site_pi_fields[curr_node.name].processed = true;
	}

	inform_parent(curr_node);
    }
    else if ($(action).attr('type') == 'combine-n-store') {
	var pfp = curr_node.parent.fp;
	var css_selector = $.trim($(action).text());
	var store_data = [];
	var element;
	var css_filter = $.trim($(action).attr('filter'));
	
	var result = [];

	if (curr_node.parent.type && 
	    curr_node.parent.type == 'vector') {
	    $.each(pfp, function(index, e) {
		r = apply_css_filter(apply_css_selector(e, css_selector), css_filter);
		result.push(r);
	    });
	}
	else {
	    r = apply_css_filter(apply_css_selector(pfp, css_selector), css_filter);
	    result.push(r);
	}

	for(var i = 0; i < result.length; i++) {
	    var combined_value = "";

	    if ($(result[i]).length > 1) {
		$.each(result[i], function(index, value) { combined_value += $(value).text() + ", " });
		combined_value = combined_value.substring(0, combined_value.length - 2);
	    }
	    else {
		combined_value = $(result[i]).text();
	    }

	    store_data.push(combined_value);
	}

	if (store_data.length > 0) {
	    console.log('Here here: Storing data :' + JSON.stringify(store_data));
	    curr_node.result = store_data;
	    
	    site_pi_fields[curr_node.name].value = site_pi_fields[curr_node.name].value.concat(store_data);
	    site_pi_fields[curr_node.name].filled = true;
	    site_pi_fields[curr_node.name].processed = true;
	}

	inform_parent(curr_node);
    }
    else {
	console.log("Appu Error: Unknow action in FPI template: " + $(action).attr('type'));
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
		console.log("Appu Error: FPI failed due to PI: " + pi_name + ", domain: " + domain);
		successfully_processed = false;
		break;
	    }
	}
    }
    
    if (successfully_processed) {
	console.log("Here here: SUCCESSFUL:: Identified all kids: " + 
		    JSON.stringify(site_pi_fields));

	store_per_site_pi_data(domain, site_pi_fields);
    }
    else {
	console.log("Appu Error: Could not process FPI template for: " + domain);
    }
    
    if (shut_timer != undefined) {
	window.clearTimeout(shut_timer);
    }

    $(main_tab).remove();
    $(wait_queue_tab).remove();
    $(child_processing_tab).remove();
    chrome.tabs.remove(tabid);
}

function inform_parent(leaf_node) {
    leaf_node.completely_processed = true;
    var curr_node = leaf_node;
    var all_processed = true;
    console.log("Here here: INFORM_PARENT(), setting done for: " + curr_node.name);
    while(all_processed && curr_node.parent != null) {
	all_processed = are_all_kids_processed(curr_node.parent);
	if (all_processed) {
	    curr_node.parent.completely_processed = true;
	    curr_node = curr_node.parent;
	}
    }

    console.log("Here here: INFORM_PARENT(), all_siblings_processed: " + all_processed + ", parent null?: " + 
		(curr_node.parent == null));

    if (all_processed && (curr_node.parent == null)) {
	//Satisfying above condition means that all nodes in FPI are processed and
	//curr node is ROOT.
	//So it will have all the attributes set at the beginning of process_template()
	console.log("Here here: ROOT node is processed, time to close tab");
	fpi_processing_complete(curr_node.my_slave_tab.tabid,  curr_node.site_pi_fields, 
				curr_node.domain, curr_node.shut_timer);
    }
    else {
	//All of my subtree is processed...give a chance to sibling subtrees.
	curr_node.parent.process_next_kid = true;
	console.log("Here here: INFORM_PARENT(), triggering sibling-is-done for: " + 
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

function apply_css_selector(elements, css_selector) {
    if (css_selector && css_selector != "") {
	return $(css_selector, elements);
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
    	console.log("Here Here: In forceful shutdown for FPI of domain: " + domain);
	fpi_processing_complete(template_tree.my_slave_tab.tabid,  template_tree.site_pi_fields, 
				template_tree.domain, undefined);
    }, 300 * 1000);

    template_tree.shut_timer = shut_tab_forcefully;
    template_tree.parent = null;
    template_tree.name = 'root';
    template_tree.completely_processed = false;
    template_tree.domain = domain;
    template_tree.site_pi_fields = site_pi_fields;

    template_tree.my_slave_tab = my_slave_tab;

    level = 0;
    console.log("Here here: PROCESS_TEMPLATE called");
    traverse_template_create_tree($(fd).children(), template_tree, site_pi_fields);

    traverse_and_fill(template_tree, site_pi_fields, my_slave_tab, level);
}

/// Template processing code END

function check_if_pi_fetch_required(domain) {
    if (domain in pii_vault.per_site_pi) {
	var curr_time = new Date();
	var last_update = pii_vault.per_site_pi[domain].update_time;
	var td = curr_time.getTime() - (new Date(last_update)).getTime();
	//Check if 10 days have passed since last update.
	if (td < (60 * 60 * 24 * 10 * 1000)) {
	    console.log("Here here: Recently updated the PI, no need to update it for: " + domain);
	    return;
	}
    }

    wr = {};
    wr.command = 'get_template';
    wr.domain = domain;
    try {
	$.post("http://woodland.gtnoise.net:5005/get_template", JSON.stringify(wr), function(data) {
	    if (data.toString() != 'No template present') {
		console.log("Here here: Got the template");
		
		var process_template_tabid = undefined;
		//Just some link so that appu content script runs on it.
		var default_url = 'http://google.com';
		
		//Create a new tab. Once its ready, send message to process the template.
		chrome.tabs.create({ url: default_url, active: false }, function(tab) {
		    process_template_tabid = tab.id;
		    var my_slave_tab = { tabid: process_template_tabid, 'in_use': true}
		    template_processing_tabs[process_template_tabid] = default_url;
		    //console.log("Here here: XXX tabid: " + tab.id + ", value: " + template_processing_tabs[tab.id]);
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
	    else {
		console.log("Appu Error: FPI Template for domain(" + domain + ") not present on the server");
	    }
	});
    }
    catch (e) {
	console.log("Error: while fetching template("+domain+") from server");
    }
    return;
}

function get_all_pi_data() {
    var r = {};
    for (var site in pii_vault.per_site_pi) {
	for(var field in pii_vault.per_site_pi[site]) {
	    if (field == 'update_time') {
		continue;
	    }
	    var values = pii_vault.per_site_pi[site][field];
	    if (!(field in r)) {
		r[field] = {};
	    }
	    for (var v = 0; v < values.length; v++) {
		if (!(values[v] in r[field])) {
		    r[field][values[v]] = "";
		}
		r[field][values[v]] += site + ", ";  
	    }
	}
    }
    return r;
}

function store_per_site_pi_data(domain, site_pi_fields) {
    
    //Make it blank first.
    pii_vault.per_site_pi[domain] = {};
    for (var field in site_pi_fields) {
	add_field_to_per_site_pi(domain, field, site_pi_fields[field].value);
    }

    pii_vault.per_site_pi[domain].update_time = new Date();
    console.log("Here here: Current site pi: " + JSON.stringify(pii_vault.per_site_pi));
    vault_write();
}

function sanitize_phone(phones) {
    var ph_regex = /\(([0-9]{3})\) ([0-9]{3})-([0-9]{4})/;

    for (var i = 0; i < phones.length; i++) {
	if (ph_regex.exec(phones[i]) != null) {
	    phones[i] = phones[i].replace(ph_regex, "$1-$2-$3");
	}
    }
}

function sanitize_ccn(ccns) {
    var ccn_regex = /\*\*\*\*\*\*\*\*\*\*\*\*([0-9]{4})/;

    for (var i = 0; i < ccns.length; i++) {
	if (ccn_regex.exec(ccns[i]) != null) {
	    ccns[i] = ccns[i].replace(ccn_regex, "XXXX-XXXX-XXXX-$1");
	}
    }
}

function add_field_to_per_site_pi(domain, pi_name, pi_value) {
    pi_name = pi_name.toLowerCase();

    console.log("Here here: adding to per_site_pi, domain: " + domain + ", name:" + pi_name + ", value:" + pi_value);

    if (pi_name == "phone") {
	sanitize_phone(pi_value);
    }
    if (pi_name == "ccn") {
	sanitize_ccn(pi_value);
    }

    if (!(domain in pii_vault.per_site_pi)) {
	pii_vault.per_site_pi[domain] = {};
    }

    //Nullify the previously existing value in case of
    //refetch after 'X' number of days.
    pii_vault.per_site_pi[domain][pi_name] = [];

    var domain_pi = pii_vault.per_site_pi[domain];
    //pi_value could be an array in case of a vector
    var new_arr = domain_pi[pi_name].concat(pi_value);

    //eliminate duplicates.
    //e.g. over time, if we fetch pi from same site,
    //(for additions like addresses/ccns) then 
    //remove duplicates.
    unique_new_arr = new_arr.filter(function(elem, pos) {
	return new_arr.indexOf(elem) == pos;
    })

    console.log("Here here: Adding this data: " + unique_new_arr);
    domain_pi[pi_name] = unique_new_arr;
    
    //delete empty entries.
    if(domain_pi[pi_name].length == 0) {
	delete domain_pi[pi_name];
    } 
}

function open_reports_tab() {
    var report_url = chrome.extension.getURL('report.html');
    chrome.tabs.create({ url: report_url });
    close_report_reminder_message();
}

function close_report_reminder_message() {
    chrome.tabs.query({}, function(all_tabs) {
	for(var i = 0; i < all_tabs.length; i++) {
	    chrome.tabs.sendMessage(all_tabs[i].id, {type: "close-report-reminder"});
	}
    });
}

function report_reminder_later(message) {
    var curr_time = new Date();
    curr_time.setMinutes(curr_time.getMinutes() + report_reminder_interval);
    pii_vault.report_reminder_time = curr_time.toString();

    console.log(sprintf("[%s]: Report Reminder time postponed for: %dm", new Date(), report_reminder_interval));

    chrome.tabs.query({}, function(all_tabs) {
	for(var i = 0; i < all_tabs.length; i++) {
	    chrome.tabs.sendMessage(all_tabs[i].id, {type: "close-report-reminder"});
	}
    });
    vault_write();
}

function check_report_time() {
    var curr_time = new Date();
    var is_report_different = false;

    //Find out if any entries from current report differ from past reports
    if (pii_vault.reporting_type == "differential") {
	if(curr_time.getTime() > (new Date(pii_vault.next_reporting_time)).getTime()) {

	    for (var i = 0; i < pii_vault.report.length; i++) {
		var rc = pii_check_if_entry_exists_in_past_pwd_reports(pii_vault.report[i]);
		if (rc == false) {
		    is_report_different = true;
		    break;
		}
	    }

	    if (!is_report_different) {
		for (var i = 0; i < pii_vault.master_profile_list.length; i++) {
		    var rc = pii_check_if_entry_exists_in_past_profile_list(pii_vault.master_profile_list[i]);
		    if (rc == false) {
			is_report_different = true;
			break;
		    }
		}
	    }
	}
    }

    //Make all the following checks only if reporting type is "manual"
    if (pii_vault.reporting_type == "manual" || 
	(pii_vault.reporting_type == "differential" && is_report_different)) {
	if (pii_vault.report_reminder_time == null) {
	    //Don't want to annoy user with reporting dialog if we are disabled OR
	    //if user already has a review report window open (presumably working on it).
	    if (pii_vault.status == "active" && is_report_tab_open == 0) {
		if((pii_vault.report.length > 0) && 
		   (curr_time.getTime() > (new Date(pii_vault.next_reporting_time)).getTime())) {
		    //Send message to all the tabs that report is ready for review and sending
		    chrome.tabs.query({}, function(all_tabs) {
			for(var i = 0; i < all_tabs.length; i++) {
			    chrome.tabs.sendMessage(all_tabs[i].id, {type: "report-reminder"});
			}
		    });
		}
		else if ((pii_vault.report.length == 0) && 
			 (curr_time.getTime() > (new Date(pii_vault.next_reporting_time)).getTime())) {
		    pii_vault.next_reporting_time = pii_next_report_time();
		    console.log("Report is empty. No report sent. Next scheduled report check time: " + pii_vault.next_reporting_time);
		    vault_write();
		}
	    }
	}
	else if (curr_time.getTime() > (new Date(pii_vault.report_reminder_time)).getTime()) {
	    console.log(sprintf("[%s]: Enabling Report Reminder", new Date()));
	    pii_vault.report_reminder_time = null;
	    vault_write();
	}
    }
    else if (pii_vault.reporting_type == "auto" || 
	     (pii_vault.reporting_type == "differential" && !is_report_different)) {
	if((pii_vault.report.length > 0) && 
	   (curr_time.getTime() > (new Date(pii_vault.next_reporting_time)).getTime())) {
	    pii_send_report();
	}
    }
}

function pii_log_user_input_type(message) {
    var domain_input_elements = [new Date(), message.domain, message.attr_list];
    console.log("Appending to input_fields list: " + JSON.stringify(domain_input_elements));
    pii_vault.input_fields.push(domain_input_elements);
    vault_write();
}

function pii_add_dontbug_list(message) {
    var domain = message.domain;
    var r = {};
    if(pii_vault.dontbuglist.indexOf(domain) == -1) {
	pii_vault.dontbuglist.push(domain);
	r.new_entry = domain;
    }
    else {
	r.new_entry = null;
    }

    console.log("New dontbugme list: " + pii_vault.dontbuglist);
    vault_write();
    return r;
}

function pii_add_blacklisted_sites(message) {
    var dnt_site = message.dnt_site;
    var r = {};
    if (pii_vault.blacklist.indexOf(dnt_site) == -1) {
	pii_vault.blacklist.push(dnt_site);
	r.new_entry = dnt_site;
    }
    else {
	r.new_entry = null;
    }
    console.log("New blacklist: " + pii_vault.blacklist);
    vault_write();
    return r;
}

function pii_check_blacklisted_sites(message) {
    var r = {};
    r.blacklisted = "no";
    //console.log("Checking blacklist for site: " + message.domain);
    for (var i = 0; i < pii_vault.blacklist.length; i++) {
	var protocol_matched = "yes";
	var port_matched = "yes";
	var bl_url = pii_vault.blacklist[i];
	//Split URLs, simplifying assumption that protocol is only HTTP.
	var url_parts = bl_url.split('/');
	var bl_hostname = "";
	var bl_protocol = "";
	var bl_port = "";

	bl_hostname = ((url_parts[0].toLowerCase() == 'http:' || 
			url_parts[0].toLowerCase() == 'https:')) ? url_parts[2] : url_parts[0];
	bl_protocol = ((url_parts[0].toLowerCase() == 'http:' || 
			url_parts[0].toLowerCase() == 'https:')) ? url_parts[0].toLowerCase() : undefined;
	bl_port = (bl_hostname.split(':')[1] == undefined) ? undefined : bl_hostname.split(':')[1];

	var curr_url_parts = message.domain.split('/');
	var curr_hostname = "";
	var curr_protocol = "";
	var curr_port = "";

	curr_hostname = ((curr_url_parts[0].toLowerCase() == 'http:' || 
			  curr_url_parts[0].toLowerCase() == 'https:')) ? curr_url_parts[2] : curr_url_parts[0];
	curr_protocol = ((curr_url_parts[0].toLowerCase() == 'http:' || 
			  curr_url_parts[0].toLowerCase() == 'https:')) ? curr_url_parts[0].toLowerCase() : '';

	curr_port = (curr_hostname.split(':')[1] == undefined) ? '' : curr_hostname.split(':')[1];

	rev_bl_hostname = bl_hostname.split("").reverse().join("");
	rev_curr_hostname = curr_hostname.split("").reverse().join("");

	if (bl_protocol && (curr_protocol != bl_protocol)) {
	    protocol_matched = "no";
	} 

	if (bl_port && (curr_port != bl_port)) {
	    port_matched = "no";
	} 

	//First part of IF checks if the current URL under check is a 
	//subdomain of blacklist domain.
	if ((rev_curr_hostname.indexOf(rev_bl_hostname) == 0) && 
	    protocol_matched == "yes" && port_matched == "yes") {
	    r.blacklisted = "yes";
	    console.log("Site is blacklisted: " + message.domain);
	    break;
	}
    }
    return r;
}

function pii_send_input_fields() {
    var wr = {};
    wr.guid = pii_vault.guid;
    wr.input_fields = pii_vault.input_fields;
    try {
	$.post("http://woodland.gtnoise.net:5005/post_user_input_elements", JSON.stringify(wr));
    }
    catch (e) {
	console.log("Error while posting 'input_fields' to server");
    }

    pii_vault.input_fields = [];
    console.log("Input fields send");
    vault_write();
}

function pii_check_if_stats_server_up() {
    var stats_server_url = "http://woodland.gtnoise.net:5005/"
    try {
	$.get(stats_server_url,
	      function(data, textStatus, jqxhr) {
		  var is_up = false;
		  stats_message = /Hey ((?:[0-9]{1,3}\.){3}[0-9]{1,3}), Appu Stats Server is UP!/;
		  is_up = (stats_message.exec(data) != null);
		  console.log("Here here: Appu stats server is up: "+ is_up);
	      })
	    .error(function () {console.log("Appu: Could not check if server is up: " + stats_server_url);} );
    }
    catch (e) {
	console.log("Error while checking if stats server is up");
    }
}

function pii_send_report() {
    var wr = {};
    wr.type = "reuse_warnings";
    wr.guid = pii_vault.guid;
    wr.reportid = pii_vault.reportid;
    wr.report = pii_vault.report;
    wr.master_profile_list = pii_vault.master_profile_list;
    wr.report_modified = pii_vault.report_modified;
    wr.report_setting = pii_vault.reporting_type;
    pii_vault.reportid += 1;

    try {
	$.post("http://woodland.gtnoise.net:5005/post_daily_report", JSON.stringify(wr));
    }
    catch (e) {
	console.log("Error while posting 'reuse_warnings' to server");
    }

    var current_report = {};
    current_report.pwd_reuse_report = pii_vault.report;
    current_report.master_profile_list = $.extend(true, {}, pii_vault.master_profile_list);
    current_report.guid = wr.guid;
    current_report.reportid = wr.reportid;
    current_report.report_modified = wr.report_modified;
    current_report.report_setting = wr.report_setting;

    pii_vault.past_reports.unshift(current_report);
    if (pii_vault.past_reports.length > 10) {
	pii_vault.past_reports.pop();
    }

    pii_vault.report_modified = "no";
    pii_vault.report = [];
    pii_vault.next_reporting_time = pii_next_report_time();
    console.log("Report sent. Next scheduled time: " + pii_vault.next_reporting_time);
    vault_write();
}

function pii_delete_report_entry(message) {
    pii_vault.report.splice(message.report_entry, 1);
    pii_vault.report_modified = "yes";
    vault_write();
}

function pii_delete_dnt_list_entry(message) {
    pii_vault.blacklist.splice(message.dnt_entry, 1);
    vault_write();
}

function pii_delete_dontbugme_list_entry(message) {
    pii_vault.dontbuglist.splice(message.dnt_entry, 1);
    vault_write();
}

function pii_delete_master_profile_list_entry(message) {
    pii_vault.master_profile_list.splice(message.report_entry, 1);
    pii_vault.report_modified = "yes";
    vault_write();
}

function pii_get_differential_report(message) {
    var r = {};
    r.pwd_reuse_report = [];
    r.master_profile_list = [];
    r.scheduled_report_time = pii_vault.next_reporting_time;

    for (var i = 0; i < pii_vault.report.length; i++) {
	// Call to jQuery extend makes a deep copy. So even if reporting page f'ks up with
	// the objects, original is safe.
	var copied_entry = $.extend(true, {}, pii_vault.report[i]);

	if(!pii_check_if_entry_exists_in_past_pwd_reports(copied_entry)) {
	    copied_entry.index = i;
	    r.pwd_reuse_report.push(copied_entry);
	}
    }

    for (var i = 0; i < pii_vault.master_profile_list.length; i++) {
	var copied_entry = {};
	copied_entry.site_name = pii_vault.master_profile_list[i];

	if (!pii_check_if_entry_exists_in_past_profile_list(pii_vault.master_profile_list[i])) {
	    copied_entry.index = i;
	    r.master_profile_list.push(copied_entry);
	}
    }

    return r;
}

function pii_get_report(message) {
    var r = {};
    var search_phrase = message.search_phrase;
    r.pwd_reuse_report = [];
    r.master_profile_list = [];
    r.scheduled_report_time = pii_vault.next_reporting_time;

    for (var i = 0; i < pii_vault.report.length; i++) {
	// Call to jQuery extend makes a deep copy. So even if reporting page f'ks up with
	// the objects, original is safe.
	var copied_entry = $.extend(true, {}, pii_vault.report[i]);

	if (typeof search_phrase === 'undefined' || search_phrase == null) {
	    copied_entry.index = i;
	    r.pwd_reuse_report.push(copied_entry);
	}
	else {
	    var record = JSON.stringify(copied_entry);
	    if (record.indexOf(search_phrase) != -1) {
		copied_entry.index = i;
		r.pwd_reuse_report.push(copied_entry);
	    }
	}
    }

    for (var i = 0; i < pii_vault.master_profile_list.length; i++) {
	var copied_entry = {};
	copied_entry.site_name = pii_vault.master_profile_list[i];

	if (typeof search_phrase === 'undefined' || search_phrase == null) {
	    copied_entry.index = i;
	    r.master_profile_list.push(copied_entry);
	}
	else {
	    var record = JSON.stringify(copied_entry);
	    if (record.indexOf(search_phrase) != -1) {
		copied_entry.index = i;
		r.master_profile_list.push(copied_entry);
	    }
	}
    }

    return r;
}

function pii_get_blacklisted_sites(message) {
    var r = [];
    for (var i = 0; i < pii_vault.blacklist.length; i++) {
	r.push(pii_vault.blacklist[i]);
    }
    return r;
}

function pii_get_dontbugme_list(message) {
    var r = [];
    for (var i = 0; i < pii_vault.dontbuglist.length; i++) {
	r.push(pii_vault.dontbuglist[i]);
    }
    return r;
}

function pii_modify_status(message) {
    if (message.status == "enable") {
	pii_vault['status'] = "active";
	pii_vault['disable_period'] = -1;
	chrome.browserAction.setIcon({path:'images/appu_new19.png'});
    }
    else if (message.status == "disable") {
	pii_vault['status'] = "disabled";
	pii_vault['disable_period'] = message.minutes;
	pii_vault['disable_start'] = (new Date()).toString();
	pii_vault['enable_timer'] = setInterval(start_time_loop, 1000);
	chrome.browserAction.setIcon({path:'images/appu_new19_offline.png'});
	console.log((new Date()) + ": Disabling Appu for " + message.minutes + " minutes");
    }
    vault_write();
}

function pii_check_pending_warning(message, sender) {
    var r = {};
    r.pending = "no";
    if( pending_warnings[sender.tab.id] != undefined) {
	r.warnings = pending_warnings[sender.tab.id];
	pending_warnings[sender.tab.id] = undefined;
	r.pending = "yes";
    }
    return r;
}

function pii_check_if_entry_exists_in_past_profile_list(curr_entry) {
    for(var i=0; i < pii_vault.past_reports.length; i++) {
	var past_master_profile_list = pii_vault.past_reports[i].master_profile_list;
	for(var j = 0; j < past_master_profile_list.length; j++) {
	    if (past_master_profile_list[j] == curr_entry) {
		return true;
	    }
	}
    }
    return false;
}

function pii_check_if_entry_exists_in_past_pwd_reports(curr_entry) {
    var ce = {};
    var ce_str = "";
    ce.site = curr_entry.site;
    ce.other_sites = curr_entry.other_sites;

    ce.other_sites.sort();
    ce_str = JSON.stringify(ce);

    for(var i=0; i < pii_vault.past_reports.length; i++) {
	var past_report = pii_vault.past_reports[i].pwd_reuse_report;
	for(var j = 0; j < past_report.length; j++) {
	    var past_report_entry = {};
	    var pre_str = "";
	    past_report_entry.site = past_report[j].site;
	    past_report_entry.other_sites = past_report[j].other_sites;
	    past_report_entry.other_sites.sort();
	    pre_str = JSON.stringify(past_report_entry);
	    if (pre_str == ce_str) {
		return true;
	    }
	}
    }
    return false;
}

function pii_check_passwd_reuse(message, sender) {
    var r = {};
    var os = [];
    var vault_dirty = false;
    r.is_password_reused = "no";
    r.sites = [];

    // Doing active check for the case that content script has already
    // hooked up with password input and then user disables Appu.
    if(pii_vault.status == "active") {
	for(var i = 0; i < 1000; i++) {
	    var salted_pwd = pii_vault.salt_table[i] + ":" + message.passwd;
	    //console.log("Checking for salted pwd: " + salted_pwd);
	    var pwd_sha1sum = CryptoJS.SHA1(salted_pwd).toString();
	    //console.log("salted pwd checksum: " + pwd_sha1sum);
	    for(var d in pii_vault.domains) {
		if (d != message.domain && pii_vault.domains[d] == pwd_sha1sum) {
		    r.is_password_reused = "yes";
		    r.dontbugme = "no";
		    r.sites.push(d);
		    os.push(d);
		    break;
		}
	    }
	}

	if (r.is_password_reused == "yes") {
	    for(var dbl in pii_vault.dontbuglist) {
		//console.log("DONTBUGME: Checking: "+ pii_vault.dontbuglist[dbl] +" against: " + message.domain);
		if (pii_vault.dontbuglist[dbl] == message.domain || message.warn_later) {
		    var pw = {};
		    pw = $.extend(true, {}, r);
		    pending_warnings[sender.tab.id] = pw;
		    console.log("Site in dontbuglist: " + message.domain);
		    r.dontbugme = "yes";
		    break;
		}
	    }
	}
    }

    if(r.is_password_reused == "no") {
	var user_log = sprintf("[%s]: Checked password for '%s', NO match was found", new Date(), message.domain);
	console.log(user_log);
    }
    else {
	var user_log = sprintf("[%s]: Checked password for '%s', MATCH was found: ", new Date(), message.domain);
	user_log += "{ " + os + " }";
	console.log(user_log);
    }

    if(r.is_password_reused == "yes") {
	var wr = {};
	wr.now = new Date();
	wr.site = message.domain;
	wr.other_sites = os;
	pii_vault.report.push(wr);
	vault_dirty = true;
    }

    if ($.inArray(message.domain, pii_vault.master_profile_list) == -1) {
	pii_vault.master_profile_list.push(message.domain);
	vault_dirty = true;
    }

    // Flush
    if (vault_dirty) {
	vault_write();
    }

    //Wait for 5 seconds, so that login process is complete 
    //(assume correct password, what if incorrect pwd or service is down??)
    //then check if Appu needs to download user's PI.
    //Idea is that the user would have logged in successfully by then.
    //Need a fullproof way of checking that user has indeed logged in.
    setTimeout(function () {
	console.log("Here here: domain: " + message.domain + ", tab-id: " + sender.tab.id);
    	check_if_pi_fetch_required(message.domain);
    }, 5 * 1000);

    return r;
}

vault_read();

//DELETE FOLLOWING
//Testing code.
//pii_vault.next_reporting_time = pii_test_yesterdays_report_time();
//console.log("Here here: next reporting time: " + pii_vault.next_reporting_time);
//DELETE FOLLOWING END

setInterval(check_report_time, 1000 * report_check_interval * 60);

//Call init. This will set properties that are newly added from release to release.
//Eventually, after the vault properties stabilise, call it only if vault property
//"initialized" is not set to true.
vault_init();

//DELETE FOLLOWING
pii_check_if_stats_server_up();
//test_check_if_pi_fetch_required("accounts.google.com");
//test_check_if_pi_fetch_required("www.amazon.com");
//test_check_if_pi_fetch_required("www.facebook.com");

//delete pii_vault.per_site_pi['www.facebook.com'];
//delete pii_vault.per_site_pi['accounts.google.com'];
//delete pii_vault.per_site_pi['www.amazon.com'];
//vault_write();

function test_check_if_pi_fetch_required(domain) {
    wr = {};
    wr.command = 'get_template';
    wr.domain = domain;
    try {
	$.post("http://woodland.gtnoise.net:5005/get_template", JSON.stringify(wr), function(data) {
	    if (data.toString() != 'No template present') {
		console.log("Here here: Got the template");
		
		var process_template_tabid = undefined;
		//Just some link so that appu content script runs on it.
		var default_url = 'http://google.com';
		
		//Create a new tab. Once its ready, send message to process the template.
		chrome.tabs.create({ url: default_url, active: false }, function(tab) {
		    process_template_tabid = tab.id;
		    var my_slave_tab = { tabid: process_template_tabid, 'in_use': true}
		    template_processing_tabs[process_template_tabid] = default_url;
		    console.log("Here here: XXX tabid: " + tab.id + ", value: " + template_processing_tabs[tab.id]);
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
	    else {
		console.log("Appu Error: FPI Template for domain(" + domain + ") not present on the server");
	    }
	});
    }
    catch (e) {
	console.log("Error: while fetching template("+domain+") from server");
    }
    return;
}

//pii_vault.per_site_pi = {};
//vault_write();

//DELETE FOLLOWING END

// //DELETE FOLLOWING
// pii_test_send_report();
// pii_test_send_input_fields();

// function pii_test_send_input_fields() {
//     var wr = {};
//     wr.guid = pii_vault.guid;
//     wr.input_fields = pii_vault.input_fields;
//     try {
// 	$.post("http://woodland.gtnoise.net:5005/post_user_input_elements", JSON.stringify(wr));
//     }
//     catch (e) {
// 	console.log("Error while posting 'input_fields' to server");
//     }
//     console.log("Here here: sent the input elements");
// }

// function pii_test_send_report() {
//     var wr = {};
//     wr.type = "reuse_warnings";
//     wr.guid = pii_vault.guid;
//     wr.reportid = pii_vault.reportid;
//     wr.report = pii_vault.report;
//     wr.master_profile_list = pii_vault.master_profile_list;
//     wr.report_modified = pii_vault.report_modified;
//     wr.report_setting = pii_vault.reporting_type;
//     pii_vault.reportid += 1;

//     try {
// 	$.post("http://woodland.gtnoise.net:5005/post_daily_report", JSON.stringify(wr));
//     }
//     catch (e) {
// 	console.log("Error while posting 'reuse_warnings' to server");
//     }
//     console.log("Here here: sent the TEST report");
// }
// //DELETE FOLLOWING END

//Check if appu was disabled in the last run. If yes, then check if disable period is over yet.
if (pii_vault.status == "disabled") {
    if (((new Date()) - (new Date(pii_vault.disable_start))) > (60 * 1000 * pii_vault['disable_period'])) {
	pii_vault['status'] = "active";
	pii_vault['disable_period'] = -1;
	chrome.browserAction.setIcon({path:'images/appu_new19.png'});
	console.log((new Date()) + ": Enabling Appu");
	vault_write();
    }
    else {
	console.log("Appu disabled at '" + pii_vault.disable_start + "' for " 
		    + pii_vault['disable_period'] + " minutes");
	
	pii_vault['enable_timer'] = setInterval(start_time_loop, 1000);
	chrome.browserAction.setIcon({path:'images/appu_new19_offline.png'});
	vault_write();
    }
}

//Generic channel listener. Catch messages from contents-scripts in various tabs.
//Also catch messages from popup.html, report.html and options.html
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type == "user_input" && pii_vault.status == "active") {
	r = pii_log_user_input_type(message);
    }
    else if (message.type == "check_pending_warning"  && pii_vault.status == "active") {
	r = pii_check_pending_warning(message, sender);
	r.id = sender.tab.id;
	sendResponse(r);
    }
    else if (message.type == "check_passwd_reuse"  && pii_vault.status == "active") {
	r = pii_check_passwd_reuse(message, sender);
	sendResponse(r);
	vault_update_domain_passwd(message);
    }
    else if (message.type == "status_change") {
	pii_modify_status(message);
    }
    else if (message.type == "query_status") {
//	console.log("Here here: tabid: "+sender.tab.id+", In query status: " + template_processing_tabs[sender.tab.id]);
	r = {};
	r.status = pii_vault.status;
	if (sender.tab.id in template_processing_tabs) {
	    if (template_processing_tabs[sender.tab.id] != "") { 
//		console.log(sprintf("Here here: Tab %s was sent a go-to url earlier", sender.tab.id));
		var dummy_tab_id = sprintf('tab-%s', sender.tab.id);
		template_processing_tabs[sender.tab.id] = "";
		//console.log("Here here: YYY tabid: " + sender.tab.id + ", value: " + template_processing_tabs[sender.tab.id]);
		r.status = "process_template";
		sendResponse(r);

		$('#' + dummy_tab_id).trigger("page-is-loaded");
	    }
	    else {
		r.status = "process_template";
		sendResponse(r);
	    }
	}
	else {
	    sendResponse(r);
	}
    }
    else if (message.type == "simulate_click_done") {
	console.log("Here here: tabid: " + sender.tab.id + ", In simulate click: " + template_processing_tabs[sender.tab.id]);
	if (sender.tab.id in template_processing_tabs) {
	    if (template_processing_tabs[sender.tab.id] != "") { 
		console.log(sprintf("Here here: Tab %s was sent a go-to url earlier", sender.tab.id));
		var dummy_tab_id = sprintf('tab-%s', sender.tab.id);
		template_processing_tabs[sender.tab.id] = "";
		console.log("Here here: YYY tabid: " + sender.tab.id + ", value: " + template_processing_tabs[sender.tab.id]);
		$('#' + dummy_tab_id).trigger("page-is-loaded");
	    }
	}
    }
    else if (message.type == "add_to_blacklist") {
	r = pii_add_blacklisted_sites(message);
	sendResponse(r);
    }
    else if (message.type == "get_blacklist") {
	var r = {};
	r.blacklist = pii_get_blacklisted_sites(message);
	sendResponse(r);
    }
    else if (message.type == "get_dontbugme_list") {
	var r = {};
	r.dontbugmelist = pii_get_dontbugme_list(message);
	sendResponse(r);
    }
    else if (message.type == "check_blacklist") {
	r = pii_check_blacklisted_sites(message);
	sendResponse(r);
    }
    else if (message.type == "get_report") {
	r = pii_get_report(message);
	sendResponse(r);
    }
    else if (message.type == "get_differential_report") {
	r = pii_get_differential_report(message);
	sendResponse(r);
    }
    else if (message.type == "send_report") {
	r = pii_send_report();
	r = pii_send_input_fields();
    }
    else if (message.type == "add_to_dontbug_list") {
	r = pii_add_dontbug_list(message);
	sendResponse(r);
    }
    else if (message.type == "delete_password_reuse_report_entry") {
	r = pii_delete_report_entry(message);
    }
    else if (message.type == "delete_master_profile_list_entry") {
	r = pii_delete_master_profile_list_entry(message);
    }
    else if (message.type == "delete_dnt_site_entry") {
	r = pii_delete_dnt_list_entry(message);
    }
    else if (message.type == "delete_dontbugme_site_entry") {
	r = pii_delete_dontbugme_list_entry(message);
    }
    else if (message.type == "remind_report_later") {
	report_reminder_later(report_reminder_interval);
    }
    else if (message.type == "close_report_reminder") {
	close_report_reminder_message();
    }
    else if (message.type == "review_and_send_report") {
	open_reports_tab();
    }
    else if (message.type == "report_tab_closed") {
	is_report_tab_open -= 1;
    }
    else if (message.type == "report_tab_opened") {
	is_report_tab_open += 1;
    }
    else if (message.type == "get_report_setting") {
	r = {};
	r.report_setting = pii_vault.reporting_type;
	sendResponse(r);
    }
    else if (message.type == "set_report_setting") {
	pii_vault.reporting_type = message.report_setting;
    }
    else if (message.type == "downloaded_pi_data") {
	store_per_site_pi_data(message.domain, message.site_pi_fields);
    }
    else if (message.type == "get_per_site_pi") {
	r = get_all_pi_data();
	sendResponse(r);
    }
});

