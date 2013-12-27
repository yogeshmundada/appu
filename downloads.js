
// File to manage all downloads from the server.
// Download file types expected to be managed:
//   1. fpi.json: Will contain versions of each FPI file.
//   2. FPI files: FPI for each account. Also contains version.
//   3. Password Bloomfilter: 1KB Bloomfilter for each password.


// Should return currently present FPIs and
// their versions.
function get_fpi_list() {

}

// Should return currently present password
// bloomfilters and their versions. 
function get_pwdbf_list() {

}

// Download file
function download_file(fname, ftype) {
    var fdownload_path = "";
    if (ftype == "fpi") {
	fdownload_path = "fpi/" + fname;
    }
    else if (ftype == "password_bloomfilter") {
	fdownload_path = "password_bloomfilter/" + fname;
    }

    var file_params = JSON.stringify({
	    "filename" : fname,
	    "filetype" : ftype,
	});

    var options = {
	url: "http://192.168.56.101:59000/get_file",
	filename: fdownload_path,
	conflictAction: "overwrite",
	saveAs: false,
	method: "POST",
	body: file_params,
    };

    chrome.downloads.download(options, function(downloadID) {
	    if (downloadID != undefined) {
		console.log("APPU DEBUG: DownloadID is: " + downloadID);
		console.log("APPU DEBUG: DownloadID path is: " + fdownload_path);
	    }
	    else {
		console.log("APPU Error: Error occurred during downloading("+ fname +", "+ ftype +"): " + 
			    JSON.stringify(chrome.runtime.lastError));
	    }
	})
}

// Delete a file entry from the cahce.
function discard_cache() {

}

// Reads a file on disk and adds it to the
// cache.
function read_file() {

}


