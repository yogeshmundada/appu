
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

// Should return currently present FPIs and
// their versions.

// Following 2 functions are from: http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
// I modified them to use Uint8Array instead of Uint16Array
// Because of Uint8, these will work probably only for ASCII strings 
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
		var fzipped_data = rc[file_key];

		unzipArrayBuffer(zipbuf, (function(file_key, file_data) {
			    return function(uz_file_arrbuf) {
				var uz_file_arrbuf_view8 = new Uint8Array(uz_file_arrbuf);
				var uz_file_data = CryptoJS.enc.Latin1.parse(download_ab2str(uz_file_arrbuf_view8));
			    
				var cksum = CryptoJS.SHA1(uz_file_data).toString();
				
				if (file_data["file_sha1sum"] == cksum) {
				    console.log("APPU DEBUG: Checksums MATCH for: '"+ file_key +"'");
				    write_to_local_storage(file_data);
				}
				else {
				    var err_str = "APPU Error: Checksums DO NOT match: '"+ file_key +"'"; 
				    console.log(err_str);
				    print_appu_error(err_str);
				    return;
				}
			    }
			})(file_key, file_data));
	    }
	    
	    
	    if (rc != undefined) {
		if (dname == undefined) {
		    console.log("APPU DEBUG: " + rc[file_key]);
		}
		else {
		    zip.createReader(new zip.BlobReader(rc[file_key]), function(reader) {
			    // get all entries from the zip
			    reader.getEntries(function(entries) {
				    if (entries.length) {

					// get first entry content as text
					entries[0].getData(new zip.TextWriter(), function(text) {
						// text contains the entry data as a String
						console.log(text);

						// close the zip reader
						reader.close(function() {
							// onclose callback
						    });

					    }, function(current, total) {
						// onprogress callback
					    });
				    }
				});
			}, function(error) {
			    // onerror callback
			    console.log("Here here: " + JSON.stringify(error));
			});

// 		    var k = unzip(rc[file_key]);
// 		    console.log("APPU DEBUG: " + k);
		}
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
    return ab2str(vab);
}

// Download file
function download_file(fname, ftype, dname) {
    var file_fetch_url = "http://192.168.56.101:59000/";
    var file_params = {
	    "filename" : fname,
	    "filetype" : ftype,
	};

    if (dname != undefined) {
	file_params["dirname"] = dname;
    }

    file_params = JSON.stringify(file_params);

    $.post(file_fetch_url + "get_file", 
	   file_params,
	   function(data) {
	       var response = /^(OK\n)(.*)/.exec(data);
	       var file_key = "Downloads:" + ftype;
	       if (dname != undefined) {
		   file_key = file_key + ":" + dname + ":" + fname;
	       }
	       else {
		   file_key = file_key + ":" + fname;
	       }
	       
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

		   file_data["file_sha1sum"] = match[2];
		   file_data[file_key] = match[3];
		   var fdata = file_data[file_key];

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

		   // Unzip the array buffer using zip.js library.
		   unzipArrayBuffer(zipbuf, (function(file_key, file_data) {
			       return function(uz_file_arrbuf) {
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
				       write_to_local_storage(file_data);
				   }
				   else {
				       var err_str = "APPU Error: Checksums DO NOT match: '"+ file_key +"'"; 
				       console.log(err_str);
				       print_appu_error(err_str);
				       return;
				   }
			       }
			   })(file_key, file_data));
	       }
	   });
}


// Delete
function delete_downloaded_file(fname, ftype) {
    var file_key = "Downloads:" + ftype + ":" + fname;
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

function print_bits(arrayBuffer) {
    var data = download_ab2str(arrayBuffer);
    var bits = data.split("<bits>")[1].split("</bits>\n")[0];
    var ab = new ArrayBuffer(bits.length);
    for (var i = 0; i < ab.length; i++) {
	ab[i] = bits[i];
    }
    
    var bit_set_array = [
			 128,
			 64,
			 32,
			 16,
			 8,
			 4,
			 2,
			 1,
			 ];
    
    var abv = new Uint8Array(ab);
    for (var i = 0; i < abv.length; i++) {
	if (abv[i] == 0) {
	    continue;
	}
	else {
	    console.log("Found something");
	    for (var j = 0; j < 8; j++) {
		if (bit_set_array[j] & abv[i]) {
		    console.log("Here here: Bit " + j + " is set at byte " + i);
		}
	    }
	}
    }
    console.log("Here here");
}
