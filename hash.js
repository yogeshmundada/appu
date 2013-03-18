
importScripts("thirdparty/sjcl.js");

function calculate_hash(pwd, limit) {
    var st, et;
    var rc = {};

    st = new Date();

    for (var i = 0; i < limit; i++) {
	k = sjcl.hash.sha256.hash(pwd);
	pwd = sjcl.codec.hex.fromBits(k);
    }

    et = new Date();

    rc['hashed_pwd'] = pwd;
    rc['count'] = i;
    rc['time'] = (et - st)/1000;
    return rc;
}

self.postMessage("Invoked hashing worker");
self.onmessage = function(event) {
    var msg = event.data;
    if (msg.cmd == "hash") {
	rc = calculate_hash(msg.pwd, msg.limit);
	rc['status'] = 'success';
    }
    else {
	rc['status'] = 'failure';
	rc['reason'] = "Wrong cmd: " + msg.cmd;
    }
    self.postMessage(rc);
    self.close();
};