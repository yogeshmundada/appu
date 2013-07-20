
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


//Only useful for reading extension specific files
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