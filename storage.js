
// Storage to local unlimited storage.
// None of the sensitive data is stored here.

function cb_print(msg) {
    if (msg == undefined) {
	msg = "APPU DEBUG: (localStorage callback)";
    }
    return function (rc) {
        if (rc != undefined) {
            msg += JSON.stringify(rc)
		}
        console.log(msg);
    }
}

function print_storage_size() {
    get_storage_size(cb_print("APPU DEBUG: (localStorage callback) Local Storage Size: "));
}

function get_storage_size(cb) {
    return chrome.storage.local.getBytesInUse(null, cb);
}

function expunge_local_storage(cb) {
    if (cb == undefined) {
	cb = cb_print("APPU DEBUG: Deleting everything from local storage: ")
    }

    chrome.storage.local.clear(cb);
}

function write_to_local_storage(data) {
    chrome.storage.local.set(data);
}

function read_from_local_storage(key, cb) {
    chrome.storage.local.get(key, cb);
}

function delete_from_local_storage(key) {
    chrome.storage.local.remove(key);
}
