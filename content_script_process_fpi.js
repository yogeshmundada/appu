

function test_if_simulate_click_worked(mutations, observer, simulate_done_timer, css_selector) {
    if ($(css_selector).length > 0) {
	console.log("APPU DEBUG: Simulate click was successful");
	observer.disconnect();
	window.clearTimeout(simulate_done_timer);
	var message = {};
	message.type = "simulate_click_done";
	chrome.extension.sendMessage("", message);
    }
}


function execute_simulate_click(message, sender, send_response) {
    var element_to_click = apply_css_filter(apply_css_selector($(document), message.css_selector), 
					    message.css_filter);
    
    var detect_change_css = message.detect_change_css;  
    
    //Hard timeout
    //Wait for 60 seconds before sending event that click cannot be 
    //completed.
    var simulate_done_timer = window.setTimeout(function() {
	    var message = {};
	    message.type = "simulate_click_done";
	    chrome.extension.sendMessage("", message);
	}, 30 * 1000);
    
    
    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    
    var observer = new MutationObserver(function(mutations, observer) {
	    test_if_simulate_click_worked(mutations, observer, simulate_done_timer, detect_change_css);
	});
    
    //var config = { attributes: true, childList: true, characterData: true }
    var config = { subtree: true, characterData: true, childList: true, attributes: true };
    observer.observe(document, config);
    
    //Now do the actual click
    try {
	//Commenting following as thats not foolproof
	//$(element_to_click).trigger("click");
	//Instead using following, thanks to SO: http://goo.gl/9zCJiu
	//jsFiddle: http://jsfiddle.net/UtzND/26/
	var evt = document.createEvent("MouseEvents");
	evt.initMouseEvent('click', true, true, window, 
			   0, 0, 0, 0, 0, false, false, 
			   false, false, 0, null);
	$(element_to_click)[0].dispatchEvent(evt);
    }
    catch(e) {
	console.log("Here here: " + JSON.stringify(e));
    }
    
    test_if_simulate_click_worked(undefined, observer, simulate_done_timer, detect_change_css);
}


function get_current_page_html(message, sender, send_response) {
    window.setTimeout(function() {
	    //To give each element unique-id
	    $(function() { $('*').each(function(i) { $(this).attr('appu_uid', i);}); });
	    //To make each element visible or hidden
	    $(function() { 
		    $('*').each(function(i) { 
			    if ($(this).is(":visible")) {
				$(this).attr('appu_rendering', "visible");
			    }
			    else {
				$(this).attr('appu_rendering', "hidden");
			    }
			}); 
		});
	    var all_vals = {};
	    var all_input_elements = $(":input[type='text'], " +
				       ":input[type='tel'], " + 
				       ":input[type='email'], " + 
				       "select");
	    for (var i = 0; i < all_input_elements.length; i++) {
		var uid = $(all_input_elements[i]).attr("appu_uid");
		var val = $('[appu_uid='+ uid +']').val();
		all_vals[uid] = val;
	    }
	    
	    var html_data = $("html").html();
	    send_response({
		    'html_data' : html_data,
			'all_vals'  :  all_vals
			});
	}, 2000);
}