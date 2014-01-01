
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
	       var response = /^(Success\n)(.*)/.exec(data);

	       if (response == null) {
		   console.log("APPU Error: Error for: " + fname);
		   console.log("APPU Error: Error message: " + data);
	       }
	       else {
		   console.log("APPU DEBUG: Success for: " + fname);
		   var file_key = "Downloads:" + ftype;
		   if (dname != undefined) {
		       file_key = file_key + ":" + dname + ":" + fname;
		   }
		   else {
		       file_key = file_key + ":" + fname;
		   }

		   var file_data = {};
		   file_data[file_key] = data.split("Success\n")[1];
		   write_to_local_storage(file_data);
		   var f = file_data[file_key];
		   var w = CryptoJS.enc.Base64.parse(f);
		   //var bd = atob(w.toString(CryptoJS.enc.Base64));
		   var bd = w.toString(CryptoJS.enc.Latin1);
		   //console.log("Here here: bd(" + bd.length + "): " + sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(bd)));

		   var buf1 = new ArrayBuffer(w.words.length * 4);
		   var buf1view = new DataView(buf1);

		   for (var k = 0; k < w.words.length; k++) {
		       //buf1view[k] = w.words[k];
		       buf1view.setInt32(k * 4, w.words[k], false);
		   }

		   var zip_buf = new ArrayBuffer(w.sigBytes);
		   var zip_buf_view = new Uint8Array(zip_buf);
		   var buf1view8 = new Uint8Array(buf1);
		   var dtv = new DataView(buf1);

		   for (var k = 0; k < w.sigBytes; k++) {
		       zip_buf_view[k] = buf1view8[k];
		   }

		   console.log("zip_buf_view: ");
		   console.log(zip_buf_view);
		   var array_buf = str2ab(bd);

		   var nv = new Uint8Array(zip_buf);
		   var av = "";
		   for (var k = 0; k < nv.length; k++) {
		       var ap = "";
		       if (nv[k] < 16) {
			   ap = "0" + nv[k].toString(16);
		       }
		       else {
			   ap = nv[k].toString(16);
		       }
		       av += ("," + ap);
		   }
		   console.log("NV: " + av);

		   //var bb = new Blob([array_buf]);
		   //var bb = new Blob([zip_buf], {type: 'application/octet-binary'});
		   var bb = new Blob([zip_buf], {type: 'application/zip'});
		   logBlobText(bb);
		   unzipArrayBuffer(zip_buf, function(unzippedArrayBuffer) {
			   logArrayBufferText(unzippedArrayBuffer);
		       });
// 		   unzipBlob(bb, function(unzippedBlob) {
// 			   logBlobTextChecksum(unzippedBlob);
// 		       });

// 		   unzipArrayBuffer(array_buf, function(data) {
// 			   logArrayBufferText(data);
// 		       });
	       }
	   });
}

// function zipBlob(blob, callback) {
//     zip.createWriter(new zip.BlobWriter("application/zip"), function(zipWriter) {
// 	    zipWriter.add(FILENAME, new zip.BlobReader(blob), function() {
// 		    zipWriter.close(callback);
//                 });
//         }, onerror);
// }

// function zipBlob(blob, function(zippedBlob) {
// 	logBlobText(zippedBlob);
//     });



// function unzipBlob(blob, callback) {
//     zip.createReader(new zip.BlobReader(blob), function(zipReader) {
// 	    zipReader.getEntries(function(entries) {
// 		    entries[0].getData(new zip.BlobWriter(zip.getMimeType(entries[0].filename)), function(data) {
// 			    zipReader.close();
// 			    callback(data);
//                         });
//                 });
// 	}, onerror);
// }

// function logBlobText(blob) {
//     var reader = new FileReader();
//     reader.onload = function(e) {
// 	console.log(e.target.result);
// 	console.log("--------------");
//     };
//     reader.readAsBinaryString(blob);
// }


// function unzipArrayBuffer(arrayBuffer, callback) {
//     zip.createReader(new zip.ArrayBufferReader(arrayBuffer), function(zipReader) {
// 	    zipReader.getEntries(function(entries) {
// 		    entries[0].getData(new zip.ArrayBufferWriter(), function(data) {
// 			    zipReader.close();
// 			    callback(data);
// 			});
// 		});
// 	}, onerror);
// }

// function logArrayBufferText(arrayBuffer) {
//     var array = new Uint8Array(arrayBuffer);
//     var str = "";
//     Array.prototype.forEach.call(array, function(code) {
// 	    str += String.fromCharCode(code);
//         });
//     console.log(str);
// }


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

function test_zip() {
zip.createWriter(new zip.BlobWriter(), function(writer) {

	// use a TextReader to read the String to add
	var rd = new zip.TextReader("test!");
	writer.add("filename.txt", rd, function() {
		// onsuccess callback
		console.log("here here");
		// close the zip writer
		writer.close(function(blob) {
			// blob contains the zip file as a Blob object

		    });
	    }, function(currentIndex, totalIndex) {
		// onprogress callback
		console.log("here here");
	    });
    }, function(error) {
	// onerror callback
	console.log("here here");
    });
}

// var blob = new Blob([ "Lorem ipsum dolor sit amet, consectetuer adipiscing elit..." ], {
// 	type : "text/plain"
//     });
// // creates a zip storing the file "lorem.txt" with blob as data
// // the zip will be stored into a Blob object (zippedBlob)
// zipBlob("lorem.txt", blob, function(zippedBlob) {
// 	logBlobTextBase64(zippedBlob);
// 	// unzip the first file from zipped data stored in zippedBlob
// 	unzipBlob(zippedBlob, function(unzippedBlob) {
// 		// logs the uncompressed Blob
// 		// console.log(unzippedBlob);
// 		logBlobText(unzippedBlob);
// 	    });
//     });

function logBlobText(blob) {
    var reader = new FileReader();
    reader.onloadend = function() {
	var data = reader.result;
	console.log(sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(data)));
	var dv = new Uint8Array(data);
	var nv = dv;
// 	var av = "";
// 	for (var k = 0; k < nv.length; k++) {
// 	    var ap = "";
// 	    if (nv[k] < 16) {
// 		ap = "0" + nv[k].toString(16);
// 	    }
// 	    else {
// 		ap = nv[k].toString(16);
// 	    }
// 	    av += ("," + ap);
// 	}
// 	console.log("NV: " + av);
	
	console.log(dv);
	console.log(dv.length);
    };
    //reader.readAsBinaryString(blob);
    reader.readAsArrayBuffer(blob);
}

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

function logArrayBufferText(arrayBuffer) {
    var array = new Uint8Array(arrayBuffer);

    var binary_data_str = CryptoJS.enc.Latin1.parse(ab2str(array));
    var cksum = CryptoJS.SHA1(binary_data_str).toString();
    console.log("APPU DEBUG: Unzipped data sha1 checksum: " + cksum);

    var zzz = "";
    for (var i = 0; i < array.length; i++) {
	zzz += array[i].toString(16);
    }
	
    console.log("--------------");

    var str = "";
    Array.prototype.forEach.call(array, function(code) {
	    str += String.fromCharCode(code);
        });
    console.log(str);
}

function print_bits(arrayBuffer) {
    var data = ab2str(arrayBuffer);
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


function logBlobTextChecksum(blob) {
    var reader = new FileReader();
    reader.onload = function(e) {
	console.log(sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(e.target.result)));
	console.log(e.target.result);
	console.log("--------------");
	var data = e.target.result;
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
    };
    reader.readAsBinaryString(blob);
}


function logBlobTextBase64(blob) {
    var reader = new FileReader();
    reader.onload = function(e) {
	var w = CryptoJS.enc.Latin1.parse(e.target.result);
	console.log(w.toString(CryptoJS.enc.Base64));
	console.log("--------------");
    };
    reader.readAsBinaryString(blob);
}

function zipBlob(filename, blob, callback) {
    // use a zip.BlobWriter object to write zipped data into a Blob object
    zip.createWriter(new zip.BlobWriter("application/zip"), function(zipWriter) {
	    // use a BlobReader object to read the data stored into blob variable
	    zipWriter.add(filename, new zip.BlobReader(blob), function() {
		    // close the writer and calls callback function
		    zipWriter.close(callback);
		});
	}, onerror);
}

function unzipBlob(blob, callback) {
    // use a zip.BlobReader object to read zipped data stored into blob variable
    zip.createReader(new zip.BlobReader(blob), function(zipReader) {
	    // get entries from the zip file
	    zipReader.getEntries(function(entries) {
		    // get data from the first file
		    entries[0].getData(new zip.BlobWriter("text/plain"), function(data) {
			    // close the reader and calls callback function with uncompressed data as parameter
			    zipReader.close();
			    callback(data);
			});
		});
	}, onerror);
}

function onerror(message) {
    console.error(message);
}

