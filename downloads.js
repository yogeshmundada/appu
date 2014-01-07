
// File to manage all downloads from the server.
// Download file types expected to be managed:
//   1. fpi.json: Will contain versions of each FPI file.
//   2. FPI files: FPI for each account. Also contains version.
//   3. Password Bloomfilter: 1KB Bloomfilter for each password.

// All files stored should have a prefix: "Downloads:"
// Which FPI files are present in the local-storage can be 
// decided using fpi.json.
// Which bloomfilter files are present in local-storage has
// to be decided from some structure in pii_vault.

var download_attempt = {};

// This function will go over all the downloaded files everyday.
// It will check their versions and ask server for the versions.
// If a newer version is present then it will download that 
// version.
function get_latest_version() {

}

function add_to_download_attempt(file_key) {

}

function check_dowonload_attempt(file_key) {

}

function delete_from_download_attempt(file_key) {

}

function purge_download_attempt() {

}

// This will go over all failed attempts and try to redownload them again.
function retry_download_attempt() {

}

// Following 2 functions are from: http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
// I modified them to use Uint8Array instead of Uint16Array
// Because of Uint8, these will work probably only for ASCII strings 

// Maintains which file was attempted to be downloaded in last 8 hour but was not successful.
// If the attempt is tried again in that window then it will not actually download it.
function download_ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function download_str2ab(str) {
    var buf = new ArrayBuffer(str.length); 
    var bufView = new Uint8Array(buf);

    for (var i=0, strLen=str.length; i<strLen; i++) {
	bufView[i] = str.charCodeAt(i);
    }

    return buf;
}


// ftype is either "fpi" or "pwdbf"
function print_downloaded_file(fname, ftype, dname) {
    var file_key = "Downloads:" + ftype;

    if (dname != undefined) {
	file_key = file_key + ":" + dname + ":" + fname;
    }
    else {
	file_key = file_key + ":" + fname;
    }

    read_from_local_storage(file_key, function(rc) {
	    if (rc != undefined) {
		var file = rc;
		var file_data = file[file_key];

		if (file_data["version"] == "0.0.0") {
		    cb(undefined, "0.0.0");
		    console.log("APPU DEBUG: File is at version 0.0.0: " + file_key);
		    return;
		}

		var zipbuf = get_binary_from_base64(file_data["file_zipped_base64"]);

		unzipArrayBuffer(zipbuf, (function(file_key, file) {
			    return function(uz_file_arrbuf) {
				var uz_file_arrbuf_view8 = new Uint8Array(uz_file_arrbuf);
				var uz_file_data = CryptoJS.enc.Latin1.parse(download_ab2str(uz_file_arrbuf_view8));
				var cksum = CryptoJS.SHA1(uz_file_data).toString();
				
				if (file_data["file_sha1sum"] == cksum) {
				    if (file_data["file_type"] == "pwdbf") {
					var version = file_data["version"];
					var setbits = file_data["setbits"];
					var rc = search_in_arrayBuffer("<bits>", uz_file_arrbuf);
					var start_bf_bits = rc[1];
					var rc = search_in_arrayBuffer("</bits>", uz_file_arrbuf);
					var end_bf_bits = rc[0];
					console.log("APPU DEBUG: Bloom filter length: " + (end_bf_bits - start_bf_bits));
					var bf_bits = uz_file_arrbuf.slice(start_bf_bits, end_bf_bits);
					print_bits(bf_bits);
				    }
				}
				else {
				    var err_str = "APPU Error: Checksums DO NOT match: '"+ file_key +"'"; 
				    console.log(err_str);
				    return;
				}
			    }
			})(file_key, file));
	    }
	});
}


function get_downloaded_file(fname, ftype, dname, cb) {
    var file_key = "Downloads:" + ftype;

    if (dname != undefined) {
	file_key = file_key + ":" + dname + ":" + fname;
    }
    else {
	file_key = file_key + ":" + fname;
    }

    read_from_local_storage(file_key, function(rc) {
	    if (rc != undefined) {
		var file = rc;
		var file_data = file[file_key];

		if (file_data["version"] == "0.0.0") {
		    cb(undefined, "0.0.0");
		    return;
		}
    
		var zipbuf = get_binary_from_base64(file_data["file_zipped_base64"]);

		unzipArrayBuffer(zipbuf, (function(file_key, file) {
			    return function(uz_file_arrbuf) {
				var uz_file_arrbuf_view8 = new Uint8Array(uz_file_arrbuf);
				var uz_file_data = CryptoJS.enc.Latin1.parse(download_ab2str(uz_file_arrbuf_view8));
				var cksum = CryptoJS.SHA1(uz_file_data).toString();
				
				if (file_data["file_sha1sum"] == cksum) {
				    if (file_data["file_type"] == "pwdbf") {
					if (cb != undefined) { 
					    cb(uz_file_arrbuf, file_data["version"]);
					}
				    }
				}
				else {
				    cb(undefined, undefined);
				    var err_str = "APPU Error: Checksums DO NOT match: '"+ file_key +"'"; 
				    console.log(err_str);
				}
			    }
			})(file_key, file));
	    }
	});
}


function get_fpi_list() {

}


// Should return currently present password
// bloomfilters and their versions. 
function get_pwdbf_list() {

}


// Accepts a string and searches for it in the Uint8Array of an arrabuffer.
// Once found, returns the starting location
function search_in_arrayBuffer(srchstr, ab_view) {
    var ab_view8 = new Uint8Array(ab_view);
    var srchstr_view8 = new Uint8Array(download_str2ab(srchstr));

    for (var i = 0; i < ab_view8.byteLength; i++) {
	if (ab_view8[i] == srchstr_view8[0]) {
	    for (var j = 0; j < srchstr_view8.byteLength; j++) {
		if (ab_view8[i + j] == srchstr_view8[j]) {
		    if (j == (srchstr_view8.byteLength - 1)) {
			return [i, i + srchstr_view8.byteLength];
		    }
		}
		else {
		    break;
		}
	    }
	}
    }
    return null;
}

// Accepts and tag and gets a string value for it in an arrayBuffer
function extract_tag(tag, unzip_buf) {
    var tag_start = "<" + tag + ">";
    var tag_end = "</" + tag + ">";
    var unzip_buf_view8 = new Uint8Array(unzip_buf);
    var rc = search_in_arrayBuffer(tag_start, unzip_buf);
    var start = rc[1];
    var rc = search_in_arrayBuffer(tag_end, unzip_buf);
    var end = rc[0];
    var len = end - start;
    var vab = new ArrayBuffer(len);
    var vab_view8 = new Uint8Array(vab);

    for (var i = 0; i < len; i++) {
	vab_view8[i] = unzip_buf_view8[start + i];
    }
    return download_ab2str(vab);
}

// Converts a base64 to binary first (Using CryptoJS than atob() because that
// is more robust.
// Then takes care of copying exact number of bytes (words are always multiple of 4).
// Returns the zipped file data.
function get_binary_from_base64(fdata) {
    // Convert Base64 to binary words array
    var fdata_words = CryptoJS.enc.Base64.parse(fdata);
    
    // Convert binary basearray to arrayBuffer
    var fbuf = new ArrayBuffer(fdata_words.words.length * 4);
    var fbuf_view = new DataView(fbuf);
    
    for (var k = 0; k < fdata_words.words.length; k++) {
	// Taking care of little endianness
	fbuf_view.setInt32(k * 4, fdata_words.words[k], false);
    }

    // Since all words are aligned at the boundary of 4
    // need to create a new buffer to copy only filesize
    var zipbuf = new ArrayBuffer(fdata_words.sigBytes);
    var zipbuf_view = new Uint8Array(zipbuf);
    // Create 8-bits view on original words buffer
    var fbuf_view8 = new Uint8Array(fbuf);
    
    // Copy only filesize to zipbif
    for (var k = 0; k < fdata_words.sigBytes; k++) {
	zipbuf_view[k] = fbuf_view8[k];
    }
    return zipbuf;
}


// Download file
function download_file(fname, ftype, dname, cb, check_if_downloaded) {
    var file_fetch_url = "http://192.168.56.101:59000/";
    var file_params = {
	    "filename" : fname,
	    "filetype" : ftype,
	};

    if (dname != undefined) {
	file_params["dirname"] = dname;
    }

    file_params = JSON.stringify(file_params);

    var file_key = "Downloads:" + ftype;
    if (dname != undefined) {
	file_key = file_key + ":" + dname + ":" + fname;
    }
    else {
	file_key = file_key + ":" + fname;
    }

    if (check_if_downloaded != undefined &&
	check_if_downloaded == true &&
	storage_meta["storage_meta"].indexOf(file_key) != -1) {
	console.log("APPU DEBUG: File ("+ file_key +") is already present");
	get_downloaded_file(fname, ftype, dname, cb);
    }
    else {
	$.post(file_fetch_url + "get_file", 
	       file_params,
	       function(data) {
		   var response = /^(OK\n)(.*)/.exec(data);
		   
		   if (response == null) {
		       var err_str = "APPU Error: Error downloading '"+ file_key +"', message: " + data; 
		       console.log(err_str);
		       print_appu_error(err_str);
		   }
		   else {
		       console.log("APPU DEBUG: Downloaded successfully: '"+ file_key +"'");
		       
		       var data_wo_ok = data.split("OK\n")[1];
		       var match = /^(Sha1sum: (.*)\n)?(.*)/.exec(data_wo_ok);
		       
		       if (match == undefined ||
			   match[1] == undefined ||
			   match[2] == undefined) {
			   var err_str = "APPU Error: No sha1sum, corrupted data for: '"+ file_key +"'"; 
			   console.log(err_str);
			   print_appu_error(err_str);
		       }
		       
		       var file_data = {};
		       var file = {};
		       file[file_key] = file_data;
		       file_data["file_type"] = ftype;
		       file_data["file_sha1sum"] = match[2];
		       file_data["file_zipped_base64"] = match[3];
		       var zipbuf = get_binary_from_base64(file_data["file_zipped_base64"]);
		       
		       // Unzip the array buffer using zip.js library.
		       unzipArrayBuffer(zipbuf, (function(file_key, file, cb) {
				   return function(uz_file_arrbuf) {
				       var file_data = file[file_key];
				       
				       var uz_file_arrbuf_view8 = new Uint8Array(uz_file_arrbuf);
				       var uz_file_data = CryptoJS.enc.Latin1.parse(download_ab2str(uz_file_arrbuf_view8));
				       
				       var version = extract_tag("version", uz_file_arrbuf);
				       console.log("APPU DEBUG: Extracted version is: " + version);
				       
				       var num_setbits = extract_tag("setbits", uz_file_arrbuf);
				       console.log("APPU DEBUG: Number of set bits: " + num_setbits);
				       
				       var cksum = CryptoJS.SHA1(uz_file_data).toString();
				       
				       if (file_data["file_sha1sum"] == cksum) {
					   console.log("APPU DEBUG: Checksums MATCH for: '"+ file_key +"'");
					   file_data["version"] = version;
					   file_data["setbits"] = num_setbits;

					   if (version == "0.0.0") {
					       delete file_data["file_zipped_base64"];
					   }

					   write_to_local_storage(file);
					   if (cb != undefined) {
					       cb(uz_file_arrbuf, version);
					   }
				       }
				       else {
					   var err_str = "APPU Error: Checksums DO NOT match: '"+ file_key +"'"; 
					   console.log(err_str);
					   print_appu_error(err_str);
					   return;
				       }
				   }
			       })(file_key, file, cb));
		   }
	       })	
	    .error(function(cb) {
		    cb(undefined, undefined);
		} (cb));;
    }
}


// Delete
function delete_downloaded_file(fname, ftype, dname) {
    var file_key = "Downloads:" + ftype;

    if (dname != undefined) {
	file_key = file_key + ":" + dname + ":" + fname;
    }
    else {
	file_key = file_key + ":" + fname;
    }

    delete_from_local_storage(file_key);
}


// Delete a file entry from the cahce.
function discard_cache() {

}


// Reads a file on disk and adds it to the
// cache.
function read_file() {

}

// Following function is copied as it is from zip.js test files.
function unzipArrayBuffer(arrayBuffer, callback) {
    zip.createReader(new zip.ArrayBufferReader(arrayBuffer), function(zipReader) {
	    zipReader.getEntries(function(entries) {
		    entries[0].getData(new zip.ArrayBufferWriter(), function(data) {
			    zipReader.close();
			    callback(data);
			});
		});
	}, onerror);
}

function print_bits(bf_bits) {
    var bf_bits_view8 = new Uint8Array(bf_bits);
    for (var i = 0; i < bf_bits_view8.byteLength; i++) {
	if (bf_bits_view8[i] == 0) {
	    continue;
	}
	else {
	    for (var j = 0; j < 8; j++) {
		if (bit_set_array[j] & bf_bits_view8[i]) {
		    console.log("APPU DEBUG: Bit " + j + " is set at byte " + i);
		}
	    }
	}
    }
}
