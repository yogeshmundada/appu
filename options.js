
//Modify options for:
// Blacklisted sites.
// DontBugMe sites.
// Report automatically checkbox.
// Appu is enabled or disabled...if disabled for how many more minutes.
// Reporting time
// website groups


//Too much repetitious code for DNT and DONTBUGME.
//But currently under finishing pressure so copy pasting.
//Convert it to more functional programming style later.

function dnt_site_list_delete_entry() {
    var dnt_entry = $(this).parent().parent().index();
    $(this).parent().parent().remove();
    var message = {};
    message.type = "delete_dnt_site_entry";
    message.dnt_entry = dnt_entry - 1;
    chrome.extension.sendMessage("", message);
}

function dontbugme_site_list_delete_entry() {
    var dontbugme_entry = $(this).parent().parent().index();
    $(this).parent().parent().remove();
    var message = {};
    message.type = "delete_dontbugme_site_entry";
    message.dnt_entry = dontbugme_entry - 1;
    chrome.extension.sendMessage("", message);
}

function add_one_more_dontbugme_entry(r) {
    console.log("APPU DEBUG: In add one more entry: " + r);
    if (r.new_entry != null) {
	var nr = $('<tr class="dontbugme-site-entry"></tr>');
	
	var ntd = $('<td></td>');
	$(ntd).text(r.new_entry);
	$(nr).append(ntd);
	
	ntd = $('<td></td>');
	var nimg_src = '<img class="dontbugme-entry-delete" src="images/cross-mark.png" height="22">';
	var nimg = $(nimg_src);
	$(ntd).append(nimg);
	$(nr).append(ntd);

	if ($("#dontbugme-site-list-table").css('display') == 'none') {
	    $("#no-dontbugme").remove();
	    $("#dontbugme-site-list-table").show();
	}
	
	$("#dontbugme-site-list-table-body").append(nr);
	$("#dontbugme-site-div").scrollTop($("#dontbugme-site-div")[0].scrollHeight);
	$("#new-dontbugme-site").val("");
    }
    else {
	var dialog_msg = '<div id="appu-dontbugme-warning" class="appuwarning" title="Appu: Notification"><p>Site already in the list</p></div>';
	var dialog_element = $(dialog_msg);
	$('body').append(dialog_element);
	
	//This wrapping(at the end) has to be done *ONLY* for dialog boxes. 
	//This is according to comment from their developer blog: 
	//http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4
	$('#appu-dontbugme-warning').dialog({ 
	    modal : true, 
	    zIndex: 200,
	    draggable : false,
	    resizable : false,
	    buttons : [
		{
		    text: "OK",
		    click: function(event) { 
			event.stopPropagation();
			$(this).dialog("close"); 
		    }
		}
	    ]  }).parents('.ui-dialog:eq(0)').wrap('<div class="appuwarning"></div>');
    }
}

function add_one_more_dnt_entry(r) {
    console.log("APPU DEBUG: In add one more entry: " + r);
    if (r.new_entry != null) {
	var nr = $('<tr class="dnt-site-entry"></tr>');
	
	var ntd = $('<td></td>');
	$(ntd).text(r.new_entry);
	$(nr).append(ntd);
	
	ntd = $('<td></td>');
	var nimg_src = '<img class="dnt-entry-delete" src="images/cross-mark.png" height="22">';
	var nimg = $(nimg_src);
	$(ntd).append(nimg);
	$(nr).append(ntd);

	if ($("#dnt-site-list-table").css('display') == 'none') {
	    $("#no-dnt").remove();
	    $("#dnt-site-list-table").show();
	}
	
	$("#dnt-site-list-table-body").append(nr);
	$("#dnt-site-div").scrollTop($("#dnt-site-div")[0].scrollHeight);
	$("#new-dnt-site").val("");
    }
    else {
	var dialog_msg = '<div id="appu-dnt-warning" class="appuwarning" title="Appu: Notification"><p>Site already in the list</p></div>';
	var dialog_element = $(dialog_msg);
	$('body').append(dialog_element);
	
	//This wrapping has to be done *ONLY* for dialog boxes. 
	//This is according to comment from their developer blog: 
	//http://filamentgroup.com/lab/using_multiple_jquery_ui_themes_on_a_single_page/#commentNumber4
	$('#appu-dnt-warning').dialog({ 
	    modal : true, 
	    zIndex: 200,
	    draggable : false,
	    resizable : false,
	    buttons : [
		{
		    text: "OK",
		    click: function(event) { 
			event.stopPropagation();
			$(this).dialog("close"); 
		    }
		}
	    ]  }).parents('.ui-dialog:eq(0)').wrap('<div class="appuwarning"></div>');
    }
}

function populate_dnt_list(r) {
    var dnt_site_list = r.blacklist;

    try {
	if (dnt_site_list.length) {
	    for(var i = 0; i < dnt_site_list.length; i++) {
		var nr = $('<tr class="dnt-site-entry"></tr>');
		
		var ntd = $('<td></td>');
		$(ntd).text(dnt_site_list[i]);
		$(nr).append(ntd);
		
		ntd = $('<td></td>');
		var nimg_src = '<img id="dnt-entry-'+ i +'" class="dnt-entry-delete" src="images/cross-mark.png" height="22">';
		var nimg = $(nimg_src);
		$(ntd).append(nimg);
		$(nr).append(ntd);
		
		$("#dnt-site-list-table-body").append(nr);
	    }
	}
	else {
	    //$("#dnt-site-list-table").remove();
	    $("#dnt-site-list-table").hide();
	    console.log("APPU DEBUG: Setting the display property of #dnt-site-list-table to: " 
			+ $("#dnt-site-list-table").css('display'));
	    $("#dnt-site-div").append($('<p id="no-dnt">Do Not Track list is empty</p>'));
	}
    }
    catch (err) {
	console.log("Error occurred while creating table: " + err);
    }
}


function add_dontbugme_entry() {
    var dontbugme_site = $.trim($("#new-dontbugme-site").val());
    if (dontbugme_site != "") {
	var message = {};
	message.domain = dontbugme_site;
	message.type = "add_to_dontbug_list";
	chrome.extension.sendMessage("", message, add_one_more_dontbugme_entry);
    }
}

function add_dnt_entry() {
    var dnt_site = $.trim($("#new-dnt-site").val());
    if (dnt_site != "") {
	var message = {};
	message.dnt_site = dnt_site;
	message.type = "add_to_blacklist";
	chrome.extension.sendMessage("", message, add_one_more_dnt_entry);
    }
}

function populate_dontbugme_list(r) {
    var dontbugme_site_list = r.dontbugmelist;

    try {
	if (dontbugme_site_list.length) {
	    for(var i = 0; i < dontbugme_site_list.length; i++) {
		var nr = $('<tr class="dontbugme-site-entry"></tr>');
		
		var ntd = $('<td></td>');
		$(ntd).text(dontbugme_site_list[i]);
		$(nr).append(ntd);
		
		ntd = $('<td></td>');
		var nimg_src = '<img id="dontbugme-entry-'+ i +'" class="dontbugme-entry-delete" src="images/cross-mark.png" height="22">';
		var nimg = $(nimg_src);
		$(ntd).append(nimg);
		$(nr).append(ntd);
		
		$("#dontbugme-site-list-table-body").append(nr);
	    }
	}
	else {
	    //$("#dontbugme-site-list-table").remove();
	    $("#dontbugme-site-list-table").hide();
	    console.log("APPU DEBUG: Setting the display property of #dontbugme-site-list-table to: " 
			+ $("#dontbugme-site-list-table").css('display'));
	    $("#dontbugme-site-div").append($('<p id="no-dontbugme">Don\'t bug me list is empty</p>'));
	}
    }
    catch (err) {
	console.log("Error occurred while creating table: " + err);
    }
}

function show_report_settings(r) {
    var report_opts = $('input:radio[name=grp-reporting-options]');
    report_opts.filter('[value='+ r.report_setting +']').attr('checked', true);
}


document.addEventListener('DOMContentLoaded', function () {
    var message = {};
    message.type = "get_blacklist";
    chrome.extension.sendMessage("", message, populate_dnt_list);
    $("#dnt-submit").bind("click", add_dnt_entry);

    $("#dnt-site-list-table").on("click", ".dnt-entry-delete", 
				       dnt_site_list_delete_entry);


    $("#accordion-dnt-site-list").accordion({
	collapsible: true,
	active: false,
	heightStyle: "content"
    });


    var message = {};
    message.type = "get_dontbugme_list";
    chrome.extension.sendMessage("", message, populate_dontbugme_list);
    $("#dontbugme-submit").bind("click", add_dontbugme_entry);

    $("#dontbugme-site-list-table").on("click", ".dontbugme-entry-delete", 
				       dontbugme_site_list_delete_entry);

    $("#accordion-dontbugme-site-list").accordion({
	collapsible: true,
	active: false,
	heightStyle: "content"
    });


    var message = {};
    message.type = "get_report_setting";
    chrome.extension.sendMessage("", message, show_report_settings);

    $("#accordion-report-settings").accordion({
	collapsible: true,
	active: false,
	heightStyle: "content"
    });

    $("input[name=grp-reporting-options]").change(function() {
	var message = {};
	message.type = "set_report_setting";
	message.report_setting = this.value;
	chrome.extension.sendMessage("", message);
    });


});
