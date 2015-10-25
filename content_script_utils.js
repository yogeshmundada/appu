
//Readymade from StackOverFlow...
function check_associative_array_size(aa) {
    var size = 0, key;
    for (key in aa) {
        if (aa.hasOwnProperty(key)) size++;
    }
    return size;
}


function get_screen_layout() {
    var se = $(":visible");
    var se_arr = {};

    for (var i = 0; i < se.length; i++) {
	var pos = $(se[i]).offset();
	var t = pos.top;
	var l = pos.left;
	var h = $(se[i]).height();
	var w = $(se[i]).width();
	var m = t + "_" + l + "_" + h + "_" + w;
	if (!(m in se_arr)) {
	    se_arr[m] = 1; 
	}
	else {
	    se_arr[m] += 1; 
	}
    }
    return se_arr;
}

function hide_appu_monitor_icon() {
    $("#appu-monitor-icon").hide();
}


function show_appu_monitor_icon() {
    if (am_i_lottery_member == true) {
	return;
    }

    if (is_appu_active) {
	if ($("#appu-monitor-icon").length == 0) {
	    var appu_img_src = chrome.extension.getURL('images/appu_new19.png');
	    var appu_img = $("<img id='appu-monitor-icon' src='" + appu_img_src + "'></img>");
	    $("body").append(appu_img);
	    $("#appu-monitor-icon").attr("title", "Appu is currently enabled. " + 
					 "You can disable it from Appu-Menu > Disable Appu<br/><br/>" +
					 "You can disable the CAT icon by clicking on it OR " + 
					 "from Appu-Menu > Options > Per-page Appu status indication");
	    $('#appu-monitor-icon').on("click", hide_appu_monitor_icon);
	}
	else {
	    $("#appu-monitor-icon").show();
	}
	    
	$("#appu-monitor-icon").css({
		"position" : "fixed",
		    //I have to use hardcoded value here because if I dynamically calculate
		    //the value using .height(), the element is not rendered and hence
		    //height is zero.
		    "top" : window.innerHeight - 19,
		    "left" : 0, 
		    });
	
	$(function() {
		$("#appu-monitor-icon").tooltip({ 
			    position: { my: "left+15 center-25", at: "right"},
			    tooltipClass : "appu-monitor-icon-tooltip",
			    });
	    });
    }
}


//Case insensitive "contains" .. from stackoverflow with thanks
//http://stackoverflow.com/questions/2196641/how-do-i-make-jquery-contains-case-insensitive-including-jquery-1-8
$.expr[":"].Contains = $.expr.createPseudo(function(arg) {
    return function( elem ) {
        return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
    };
});



var start_focus_time = undefined;

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

function window_focused(eo) {
    last_user_interaction = new Date();
    if (start_focus_time == undefined) {
	start_focus_time = new Date();
	// var message = {};
	// message.type = "i_have_focus";
	// chrome.extension.sendMessage("", message);
    }
}

function window_unfocused(eo) {
    if (start_focus_time != undefined) {
	var stop_focus_time = new Date();
	var total_focus_time = stop_focus_time.getTime() - start_focus_time.getTime();
	start_focus_time = undefined;
	var message = {};
	message.type = "time_spent";
	message.domain = document.domain;
	message.am_i_logged_in = am_i_logged_in;
	message.time_spent = total_focus_time;
	chrome.extension.sendMessage("", message);
    }
}
