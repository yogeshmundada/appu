
//Following function is from: http://stackoverflow.com/questions/6491463/accessing-nested-javascript-objects-with-string-key
//Usage: Object.byString(someObj, 'part3[0].name');

Object.byString = function(o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s = s.replace(/^\./, '');           // strip a leading dot
    var a = s.split('.');
    while (a.length) {
        var n = a.shift();
        if (n in o) {
            o = o[n];
        } else {
            return;
        }
    }
    return o;
}

// Online disk storage data structures and the presentation data structures (Data Table rows)
// are different. This function converts one into another.
// This function essentially flattens associative arrays, nested structure into a flat row.
function create_datatable_consumable_records(report, vo, keys, arr_function) {
    var records = [];
    for (var k in report[vo]) {
	if (report[vo].hasOwnProperty(k)) {
	    var rec_object = report[vo][k];
	    var rec_entry = [];
	    rec_entry.push(k);
	    if (keys.length > 0) {
		for (var i = 0; i < keys.length; i++) {
		    var value = Object.byString(rec_object, keys[i]);
		    //var value = rec_object[keys[i]];
		    if (value instanceof Array) {
			if (arr_function == undefined) {
			    rec_entry.push(value.join(", "));
			}
			else {
			    all_vals = value.map(arr_function);
			    rec_entry.push(all_vals.join(", "));
			}
		    }
		    else {
			rec_entry.push(value);
		    }
		}
		records.push(rec_entry);
	    }
	    else {
		var value = rec_object;
		if (value instanceof Array) {
		    //Exception condition
		    if (vo == "common_fields") {
			rec_entry.push(value.length);
		    }
		    rec_entry.push(value.join(", "));
		}
		else {
		    rec_entry.push(value);
		}
		records.push(rec_entry);
	    }
	}
    }
    return records;
}

function get_report_duration(report) {
    var start_date = new Date(report.initialize_time);
    var end_date = null;
    
    if (report.user_approved != false) {
	end_date = new Date(report.user_approved);
    }
    else {
	end_date = new Date();
    }
    var diff = end_date - start_date;
    return get_duration(diff, "no");
}

function get_duration(total_time_diff_ms, tag_it) {
    var total_seconds = Math.floor(total_time_diff_ms / 1000);
    var days = Math.floor(total_seconds / 86400);
    var hours = Math.floor((total_seconds % 86400)/ 3600);
    var minutes = Math.floor(((total_seconds % 86400) % 3600) / 60);
    var ret_val = "";

    if (days == 0 && hours == 0) {
	ret_val = minutes + " min";
    }
    else if (days == 0) {
	ret_val = hours + " hours, " + minutes + " min";
    }
    else {
	ret_val = days + " days, " + hours + " hr";
    }
    
    if (tag_it != undefined) {
	return ret_val;
    }

    ret_val = "<span class='report-time-1'>" + ret_val + "</span>";
    return ret_val;
}

function format_display_time(milliseconds, tag_it) {
    var total_seconds = Math.floor(milliseconds / 1000);
    var hours = Math.floor(total_seconds / 3600);
    var minutes = Math.floor((total_seconds % 3600) / 60);
    var seconds = Math.floor((total_seconds % 3600) % 60);
    var ret_val = "";

    if (milliseconds == 0) {
	ret_val = "0 sec";
    }
    if (hours == 0 && minutes == 0) {
	ret_val = seconds + " sec";
    }
    else if (hours == 0) {
	ret_val = minutes + " min, " + seconds + " sec";
    }
    else {
	ret_val = hours + " hr, " + minutes + " min";
    }

    if (tag_it != undefined) {
	return ret_val;
    }

    ret_val = "<span class='report-time-1'>" + ret_val + "</span>";
    return ret_val;
}

function pad(d) {
    return (d < 10) ? '0' + d.toString() : d.toString();
}

function format_display_date(epoch_time, add_additional_info) {
    var date_info = "";
    var today = new Date();
    var date = new Date(epoch_time);
    var date_plus_one = new Date(epoch_time + 24 * 60 * 60 * 1000);
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();

    var today_year = today.getFullYear();
    var today_month = (today.getMonth() + 1);
    var today_day = today.getDate();
    var hour = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();

    if (epoch_time == 0) {
	return "None";
    }

    if (year == today_year && month == today_month && day == today_day) {
	date_info = "Today<br/>" + 
	    "<span class='report-time'>" + pad(hour) + "h:" + pad(minutes) + "m</span>";
    }
    else if (date_plus_one.getFullYear() == today_year && 
	     (date_plus_one.getMonth() + 1) == today_month && 
	     date_plus_one.getDate() == today_day) {
	date_info = "Yesterday<br/>"
	    + "<span class='report-time'>" + pad(hour) + "h:" + pad(minutes) + "m</span>";
    }
    else {
	if (today > date) {
	date_diff = Math.ceil((today - date)/(24 * 60 * 60 * 1000));
	date_info = year + "-" + pad(month) + "-" + pad(day);
	date_info += "<br/>";
	if (date_diff < 100 && add_additional_info) {
	    date_info += ("<span class='report-time-add-info'>(" + date_diff + " days ago) </span>");
	}
	date_info += "<span class='report-time'>" + pad(hour) + "h:" +
	    pad(minutes) + "m</span>";
	}
	else {
	    date_diff = Math.ceil((date - today)/(24 * 60 * 60 * 1000));
	    date_info = year + "-" + pad(month) + "-" + pad(day);
	    date_info += "<br/>";
	    if (date_diff < 100 && add_additional_info) {
		date_info += ("<span class='report-time-add-info'>(" + date_diff + " days after) </span>");
	    }
	    date_info += "<span class='report-time'>" + pad(hour) + "h:" +
		pad(minutes) + "m</span>";
	}
    }
    return  date_info ;
}

//Why the heck JS does not have reduce?
function cumulative_value(obj, property_name) {
    var cumu_val = 0;
    for (var k in obj) {
	if (obj.hasOwnProperty(k)) {
	    cumu_val += obj[k][property_name];
	}
    }
    return cumu_val;
}
