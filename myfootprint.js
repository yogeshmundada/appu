// Amazon
// Google
// Facebook


//My Personal Footprint
// Name
// Address
// Email
// CCN
// SSN
// Phone (Home/Work)
// Occupation
// Employment
// Education
// Birthday
// Gender
// Relationship

function toggle_fpi_expand() {
    if($("#expand-fpi-checkbox").is(':checked')) {
	$(".appuaccordion").accordion("option", "active", 0);
    }
    else {
	$(".appuaccordion").accordion("option", "active", false);
    }
}

function create_accordion(pi_field, append_accord_child) {
    pi_field = pi_field.toLowerCase();
    debugger;
    var accord_id = sprintf("accordion-site-list-with-%s", pi_field);
    var accord_div = sprintf('<div id="accordion-site-list-with-%s" class="appuwarning appuaccordion"></div>', 
			     pi_field);
    var accord_header = sprintf('<h3>%s</h3>', pi_field);
    var accord_para = undefined;

    if (append_accord_child != undefined) {
	accord_para = append_accord_child;
    }
    else {
	accord_para = sprintf('<p>%s: XYZ</p>', pi_field);
    }

    var accord = $(accord_div).append(accord_header).append(accord_para);
    $("#appu-myfootprint").append(accord);

    $("#" + accord_id).accordion({
	collapsible: true,
	active: false,
	heightStyle: "content"
    });
}

function populate_footprint(fp) {
    try {

	for(var pi_field in fp) {
	    pi_field = pi_field.toLowerCase();
	    var accordion_id = "accordion-site-list-with-" + pi_field;

	    var table_str = sprintf('<table id="%s-pi-field-table"></table>', pi_field);
	    var table_body_str = sprintf('<tbody id="%s-pi-field-table-body"></tbody>', pi_field);

	    var table = $(table_str).addClass('pi-table');
	    var table_body = $(table_body_str);

	    for (var pi_value in fp[pi_field]) {
		var table_row_str = sprintf('<tr><td>%s</td><td>%s</td></tr>', 
					     pi_value, fp[pi_field][pi_value]);
		var table_row = $(table_row_str);
		table_body.append(table_row);
	    }
	    
	    $(table).append(table_body);
	    
	    create_accordion(pi_field, table);
	}
    }
    catch (err) {
	console.log("Error occurred while creating table: " + err);
    }
}

var start_focus_time = undefined;

function window_focused(eo) {
    last_user_interaction = new Date();
    if (start_focus_time == undefined) {
	start_focus_time = new Date();
    }
}

function window_unfocused(eo) {
    if (start_focus_time != undefined) {
	var stop_focus_time = new Date();
	var total_focus_time = stop_focus_time.getTime() - start_focus_time.getTime();
	start_focus_time = undefined;
	var message = {};
	message.type = "myfootprint_time_spent";
	message.time_spent = total_focus_time;
	chrome.extension.sendMessage("", message);
    }
}

function focus_check() {
    if (start_focus_time != undefined) {
	var curr_time = new Date();
	//Lets just put it for 4.5 minutes
	if((curr_time.getTime() - last_user_interaction.getTime()) > (270 * 1000)) {
	    //No interaction in this tab for last 5 minutes. Probably idle.
	    window_unfocused();
	}
    }
}

$(window).on("focus", window_focused);
$(window).on("blur", window_unfocused);

setInterval(focus_check, 300 * 1000);

$(window).on("unload", function() {
    window_unfocused();
    var message = {};
    message.type = "myfootprint_tab_closed";
    chrome.extension.sendMessage("", message);
});

document.addEventListener('DOMContentLoaded', function () {
    
    var message = {};
    message.type = "get_per_site_pi";
    chrome.extension.sendMessage("", message, populate_footprint);

    $("#expand-fpi-checkbox").prop("checked", false);
    $("#expand-fpi-checkbox").on("change", toggle_fpi_expand);


    var message = {};
    message.type = "myfootprint_tab_opened";
    chrome.extension.sendMessage("", message);

});