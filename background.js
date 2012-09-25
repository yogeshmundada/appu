
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var ext_id = chrome.i18n.getMessage('@@extension_id');
//console.log("In the background page: " + ext_id);

var pii_vault = {};

function vault_init() {
    pii_vault.guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	return v.toString(16);
    });

    console.log("GUID: " + pii_vault.guid);
    var salt_table = {};
    var current_ip = pii_vault.guid;
    for(var i = 0; i < 1000; i++) {
	salt_table[i] = CryptoJS.SHA1(current_ip).toString();
	current_ip = salt_table[i];
	//console.log("i: " + i);
	//console.log("salt: " + current_ip);
    }
    pii_vault.salt_table = salt_table;
    pii_vault['initialized'] = true;
    pii_vault.domains = {};
    vault_write();
}

function vault_read() {
    try {
	pii_vault = JSON.parse(localStorage[ext_id]);
	if (pii_vault) {
	    //console.log("pii_vault: " + pii_vault);
	    for (var g in pii_vault) {
		console.log("Properties of pii_vault: " + g);
	    }
	    if("guid" in pii_vault) {
		console.log("guid: " + pii_vault.guid);
	    }
	    if("salt_table" in pii_vault) {
		console.log("salt_table length: " + Object.size(pii_vault.salt_table));
	    }
	}
	else {
	    pii_vault = {};
	}
    }
    catch (e) {
	console.log("Loading extension for the first time. Initializing extension data");
	pii_vault = {};
    }
}

function vault_write() {
    //console.log("Result of stringify: " + JSON.stringify(pii_vault));
    localStorage[ext_id] = JSON.stringify(pii_vault);
}

function vault_update_domain_passwd(message) {
    try {
	var r = Math.floor((Math.random() * 1000)) % 1000;
	//console.log("Storing passwd, random: " + r);
	var rand_salt = pii_vault.salt_table[r];
	var salted_pwd = rand_salt + ":" + message.passwd;
	//console.log("Storing passwd, salted_passwd: " + salted_pwd);
	var pwd_sha1sum = CryptoJS.SHA1(salted_pwd).toString();
	//console.log("Converted passwd: " + pwd_sha1sum);
	pii_vault.domains[message.domain] = pwd_sha1sum;
	vault_write();
    }
    catch (e) {
	console.log("Got an exception: " + e.message);
    }
}

function pii_check_for_reuse(message) {
    var r = {};
    var os = "";
    r.is_password_reused = "no";
    r.sites = [];

    for(var i = 0; i < 1000; i++) {
	var salted_pwd = pii_vault.salt_table[i] + ":" + message.passwd;
	//console.log("Checking for salted pwd: " + salted_pwd);
	var pwd_sha1sum = CryptoJS.SHA1(salted_pwd).toString();
	//console.log("salted pwd checksum: " + pwd_sha1sum);
	for(var d in pii_vault.domains) {
	    if (d != message.domain && pii_vault.domains[d] == pwd_sha1sum) {
		r.is_password_reused = "yes";
		r.sites.push(d);
		os += d + ","; 
	    }
	}
    }

    if(r.is_password_reused == "no") {
	var user_log = sprintf("Checked password for '%s', NO match was found", message.domain);
	console.log(user_log);
    }
    else {
	var user_log = sprintf("Checked password for '%s', MATCH was found: ", message.domain);
	user_log += "{ " + os + " }";
	console.log(user_log);
    }

    var wr = {};
    wr.guid = pii_vault.guid;
    wr.now = new Date();
    wr.site = message.domain;
    wr.other_sites = os;
    try {
	jQuery.post("http://143.215.129.52:5005/methods", wr);
    }
    catch (e) {
	console.log("Error while posting log to server");
    }

    return r;
}

vault_read();

if(!('initialized' in pii_vault)) {
    vault_init();
}

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    //console.log("Got a message: " + message);
    //console.log("Sender: " + sender);
    //console.log("type: " + message.type);
    //console.log("domain: " + message.domain);

    if (message.type == "check") {
	r = pii_check_for_reuse(message);
	sendResponse(r);
	vault_update_domain_passwd(message);
    }
});