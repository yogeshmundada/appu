
var getEditDistance = function(a, b){
    if(a.length == 0) return b.length; 
    if(b.length == 0) return a.length; 

    var matrix = [];

    // increment along the first column of each row
    var i;
    for(i = 0; i <= b.length; i++){
	matrix[i] = [i];
    }

    // increment each column in the first row
    var j;
    for(j = 0; j <= a.length; j++){
	matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for(i = 1; i <= b.length; i++){
	for(j = 1; j <= a.length; j++){
	    if(b.charAt(i-1) == a.charAt(j-1)){
		matrix[i][j] = matrix[i-1][j-1];
	    } else {
		matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
					Math.min(matrix[i][j-1] + 1, // insertion
						 matrix[i-1][j] + 1)); // deletion
	    }
	}
    }

    return matrix[b.length][a.length];
};


function get_domain(curr_domain) {
    ip_addr_regex = /((?:[0-9]{1,3}\.){3}[0-9]{1,3})/;
    var r = ip_addr_regex.exec(curr_domain);
    if(!r) {
	return tld.getDomain(curr_domain);
    }
    return curr_domain;
}

function print_appu_error(err_str) {
    if (err_str.indexOf("Appu Error: Could not process FPI template for:") == 0) {
	//No need to push that a template is not present again and again
	if (pii_vault.current_report.appu_errors.indexOf(err_str) == -1) {
	    pii_vault.current_report.appu_errors.push(err_str);
	}
    }
    else {
	pii_vault.current_report.appu_errors.push(err_str);
    }

    console.log(err_str);
    flush_selective_entries("current_report", ["appu_errors"]);
}


// Only useful for reading extension specific files
function read_file(filename) {
    var url = chrome.extension.getURL(filename);
    var request = new XMLHttpRequest();
    // false so that request is processed sync and we dont have to do callback BS
    request.open("GET", url, false);
    request.send();
	
    return request.responseText;
}


function read_file_arraybuffer(filename, onload_function) {
    var url = chrome.extension.getURL(filename);
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = 'arraybuffer';

    request.onload = function(req) {
	var r1 = req;
	return onload_function;
    }(request);

    request.onerror = function(oEvent) {
	print_appu_error("Appu Error: Reading file as arraybuffer: " 
			 + filename);
	console.log("APPU DEBUG: Reading file as arraybuffer:" + filename);
    }

    request.send();
}


function write_file(filename, data) {
    var url = chrome.extension.getURL(filename);
    var request = new XMLHttpRequest();
    request.open("PUT", url, true);

    request.onerror = function(oEvent) {
	print_appu_error("Appu Error: Writing file: " 
			 + filename);
	console.log("APPU DEBUG: Writing file:" + filename);
    }

    request.send(data);
}


function generate_random_id() {
    var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	return v.toString(16);
    });
    return guid;
}


//I took the following function from: http://stackoverflow.com/a/11900218/560383
//Might come as handy to report how much on-disk space is consumed by Appu extension.
//By default, at least on chrome, only 5MB is available for an extension.
//WTF: why is by default so low?
function roughSizeOfObject( object ) {

    var objectList = [];
    var stack = [ object ];
    var bytes = 0;

    while ( stack.length ) {
        var value = stack.pop();

        if ( typeof value === 'boolean' ) {
            bytes += 4;
        }
        else if ( typeof value === 'string' ) {
            bytes += value.length * 2;
        }
        else if ( typeof value === 'number' ) {
            bytes += 8;
        }
        else if
	    (
            typeof value === 'object'
            && objectList.indexOf( value ) === -1
	     )
	    {
		objectList.push( value );

		for( i in value ) {
		    stack.push( value[ i ] );
		}
	    }
    }
    return bytes;
}


// Gets all the GUIDs created in this installation
function get_all_guids() {
    var all_guids = {};
    guid_regex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}).*/;
    
    for (var key in localStorage) {
	var r = guid_regex.exec(key);	
	if (r) {
	    all_guids[r[1]] = true;
	}
    }
    return all_guids;
}

function delete_keys_with_prefix(prefix_array) {
    guid_regex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}).*/;
    
    for (key in localStorage) {
	var r = guid_regex.exec(key);	
	for (var i = 0; i < prefix_array.length; i++) {
	    if (key.indexOf(prefix_array[i]) == -1) {
		continue;
	    }
	    if (r && prefix_array.indexOf(r[1]) != -1) {
		delete localStorage[key];
	    }
	}
    }

}

function print_url_params(url) {
    var all_params = url.slice(url.indexOf('?') + 1).split('&');
    console.log("Here here: Domain: " + get_domain(url.split("/")[2]));
    for(var i = 0; i < all_params.length; i++)
	{
	    var p = all_params[i].split('=');
	    console.log(i + ". " + decodeURIComponent(p[0]) + ":" + decodeURIComponent(p[1]));
	}
    return;
}

function get_url_params(url, decode) {
    var params = {};
    var all_params = url.slice(url.indexOf('?') + 1).split('&');
    decode = (decode == undefined) ? false : decode;

    for(var i = 0; i < all_params.length; i++)
	{
	    var p = all_params[i].split('=');
	    if (decode) {
		params[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
	    }
	    else {
		params[p[0]] = p[1];
	    }

	}
    return params;
}


function get_human_readable_size(bytes) {
    var kb = 1024;
    var mb = kb * kb;
    var gb = mb * kb;
    
    var tot_kb = Math.floor(bytes / kb);
    var tot_mb = Math.floor(bytes / mb);
    var tot_gb = Math.floor(bytes / gb);

    var append_text = " (" + bytes + " bytes)";

    if (tot_kb == 0) {
	return bytes + " bytes";
    }
    else if (tot_mb == 0) {
	return tot_kb + " KB" + append_text;
    }
    else if (tot_gb == 0) {
	return tot_mb + " MB" + append_text;
    }
    return tot_gb + " GB" + append_text;
}


//// APIs to process address using Google maps

function parse_address(address_components) {
    var processed_address = {};

    $.each(address_components, function (i, address_component) {
	    if (address_component.types[0] == "street_number"){ 
		processed_address['street_number'] = {
		    'long_name': address_component.long_name.toLowerCase(),
		    'short_name': address_component.short_name.toLowerCase(),
		};
	    } else if (address_component.types[0] == "route"){
		processed_address['street'] = {
		    'long_name': address_component.long_name.toLowerCase(),
		    'short_name': address_component.short_name.toLowerCase(),
		};
	    } else if (address_component.types[0] == "locality"){
		processed_address['city'] = {
		    'long_name': address_component.long_name.toLowerCase(),
		    'short_name': address_component.short_name.toLowerCase(),
		};
	    } else if (address_component.types[0] == "administrative_area_level_1"){ 
		processed_address['state'] = {
		    'long_name': address_component.long_name.toLowerCase(),
		    'short_name': address_component.short_name.toLowerCase(),
		};
	    } else if (address_component.types[0] == "postal_code_prefix"){ 
		processed_address['zipcode'] = {
		    'long_name': address_component.long_name.toLowerCase(),
		    'short_name': address_component.short_name.toLowerCase(),
		};
	    } else if (address_component.types[0] == "postal_code"){ 
		processed_address['zipcode'] = {
		    'long_name': address_component.long_name.toLowerCase(),
		    'short_name': address_component.short_name.toLowerCase(),
		};
	    } else if (address_component.types[0] == "country"){ 
		processed_address['country'] = {
		    'long_name': address_component.long_name.toLowerCase(),
		    'short_name': address_component.short_name.toLowerCase(),
		};
	    }
	});

    return processed_address;
}

var maps_subsystem_callbacks = {};
var maps_subsystem_callback_number = 1;

window.addEventListener("message", receiveMessage, false);
function receiveMessage(event) {
    if (event.data.type == "get-latitude-longitude-result") {
	if (event.data.cb && maps_subsystem_callbacks[event.data.cb]) {
	    maps_subsystem_callbacks[event.data.cb](event.data);
	}
    } else if (event.data.type == "compare-addresses-result") {
	if (event.data.cb && maps_subsystem_callbacks[event.data.cb]) {
	    maps_subsystem_callbacks[event.data.cb](event.data);
	}
    } else if (event.data.type == "get-address-components-result") {
	if (event.data.cb && maps_subsystem_callbacks[event.data.cb]) {
	    maps_subsystem_callbacks[event.data.cb](event.data);
	}
    }
}

function get_latitude_longitude(address, cb) {
    maps_subsystem_callbacks[maps_subsystem_callback_number] = cb;
    $("#google_maps")[0].contentWindow.postMessage({
	    'type': 'get-latitude-longitude',
	    'address': address,
		'chrome-ext': "chrome-extension://" + ext_id,
		'cb' : maps_subsystem_callback_number,
		}, "*");
    maps_subsystem_callback_number += 1;
}

function compare_addresses(a1, a2, cb) {
    maps_subsystem_callbacks[maps_subsystem_callback_number] = cb;

    $("#google_maps")[0].contentWindow.postMessage({
	    'type': 'compare-addresses',
	    'address_one': a1,
	    'address_two': a2,
		'cb': maps_subsystem_callback_number,
		'chrome-ext': "chrome-extension://" + ext_id,
		}, "*");
    maps_subsystem_callback_number += 1;
}

function get_address_components(address, cb) {
    if (cb == undefined || cb == null) {
	cb = function (r) {
	    console.log("APPU INFO: Result: " + JSON.stringify(r));
	}
    }
    maps_subsystem_callbacks[maps_subsystem_callback_number] = cb;
    $("#google_maps")[0].contentWindow.postMessage({
	    'type': 'get-address-components',
	    'address': address,
		'chrome-ext': "chrome-extension://" + ext_id,
		'cb' : maps_subsystem_callback_number,
		}, "*");
    maps_subsystem_callback_number += 1;
}

/// Compare Arrays

// From: http://stackoverflow.com/questions/3036588/comparing-two-array-of-strings-in-javascript
Array.prototype.compare = function(arr) {
    if (this.length != arr.length) return false;
    for (var i = 0; i < arr.length; i++) {
        if (this[i].compare) { 
            if (!this[i].compare(arr[i])) return false;
        }
        if (this[i] !== arr[i]) return false;
    }
    return true;
}


