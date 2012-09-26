
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

function verify_unique_guid(guid) {

}

function vault_init() {
    pii_vault.guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	return v.toString(16);
    });

    setTimeout(verify_unique_guid, 1);

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
    pii_vault['status'] = "active";
    pii_vault['disable_period'] = -1;
    pii_vault['report'] = [];
    pii_vault['blacklist'] = [];
    pii_vault.domains = {};
    vault_write();
}

function vault_read() {
    try {
	pii_vault = JSON.parse(localStorage[ext_id]);
	if (pii_vault) {
	    //console.log("pii_vault: " + pii_vault);
	    for (var g in pii_vault) {
		//console.log("Properties of pii_vault: " + g);
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
    localStorage[ext_id] = JSON.stringify(pii_vault);
}

function vault_update_domain_passwd(message) {
    try {
	var r = Math.floor((Math.random() * 1000)) % 1000;
	var rand_salt = pii_vault.salt_table[r];
	var salted_pwd = rand_salt + ":" + message.passwd;
	var pwd_sha1sum = CryptoJS.SHA1(salted_pwd).toString();

	pii_vault.domains[message.domain] = pwd_sha1sum;
	vault_write();
    }
    catch (e) {
	console.log("Got an exception: " + e.message);
    }
}

function start_time_loop() {
    var curr_time = new Date();
    if ((curr_time - (new Date(pii_vault.disable_start))) > (60 * 1000 * pii_vault['disable_period'])) {
	clearInterval(pii_vault['enable_timer']);
	pii_vault['status'] = "active";
	pii_vault['disable_period'] = -1;
	chrome.browserAction.setIcon({path:'images/appu19.png'});
	console.log((new Date()) + ": Enabling Appu");
	vault_write();
    } 
}

function validateURL(textval) {
    var urlregex = new RegExp(
        "^([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$");
    return urlregex.test(textval);
}

function pii_add_blacklisted_sites(message) {
    var sites = message.sites;
    pii_vault.blacklist = [];
    for(var i = 0; i < sites.length; i++) {
	var curr_url = sites[i]; 
	if (/\S/.test(curr_url)) {
	    curr_url = $.trim(curr_url);
	    if(validateURL(curr_url)) {
		console.log("Pushing :" + curr_url);
		pii_vault.blacklist.push(curr_url);
	    }
	    else {
		console.log("Invalid URL: " + curr_url);
	    }
	}
    }
    console.log("New blacklist: " + pii_vault.blacklist);
    vault_write();
}

function pii_check_blacklisted_sites(message) {
    var r = {};
    r.blacklisted = "no";
    console.log("Checking blacklist for site: " + message.domain);
    for (var i = 0; i < pii_vault.blacklist.length; i++) {
	if (message.domain == pii_vault.blacklist[i]) {
	    r.blacklisted = "yes";
	}
    }
    return r;
}

function pii_send_report(message) {
    var wr = {};
    wr.guid = pii_vault.guid;
    wr.report = message.report;
    try {
	$.post("http://143.215.129.52:5005/methods", wr);
    }
    catch (e) {
	console.log("Error while posting log to server");
    }

    pii_vault.report = [];
    vault_write();
}

function pii_get_report(message) {
    var r = [];
    for (var i = 0; i < pii_vault.report.length; i++) {
	r.push(pii_vault.report[i]);
    }
    return r;
}

function pii_get_blacklisted_sites(message) {
    var r = [];
    for (var i = 0; i < pii_vault.blacklist.length; i++) {
	r.push(pii_vault.blacklist[i]);
    }
    return r;
}

function pii_modify_status(message) {
    if (message.status == "enable") {
	pii_vault['status'] = "active";
	pii_vault['disable_period'] = -1;
	chrome.browserAction.setIcon({path:'images/appu19.png'});
    }
    else if (message.status == "disable") {
	pii_vault['status'] = "disabled";
	pii_vault['disable_period'] = message.minutes;
	pii_vault['disable_start'] = (new Date()).toString();
	pii_vault['enable_timer'] = setInterval(start_time_loop, 1000);
	chrome.browserAction.setIcon({path:'images/appu19_offline.png'});
	console.log((new Date()) + ": Disabling Appu for " + message.minutes + " minutes");
    }
    vault_write();
}

function pii_check_for_reuse(message) {
    var r = {};
    var os = "";
    r.is_password_reused = "no";
    r.sites = [];

    if(pii_vault.status == "active") {
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
    }

    if(r.is_password_reused == "no") {
	var user_log = sprintf("[%s]: Checked password for '%s', NO match was found", new Date(), message.domain);
	console.log(user_log);
    }
    else {
	var user_log = sprintf("[%s]: Checked password for '%s', MATCH was found: ", new Date(), message.domain);
	user_log += "{ " + os + " }";
	console.log(user_log);
    }

    if(r.is_password_reused == "yes") {
	var wr = {};
	wr.now = new Date();
	wr.site = message.domain;
	wr.other_sites = os;
	pii_vault.report.push(wr.now + ":" + wr.site + ":" + wr.other_sites);
	vault_write();
    }
    return r;
}

vault_read();

if(!('initialized' in pii_vault)) {
    vault_init();
}
else {
    if (pii_vault.status == "disabled") {
	if (((new Date()) - (new Date(pii_vault.disable_start))) > (60 * 1000 * pii_vault['disable_period'])) {
	    pii_vault['status'] = "active";
	    pii_vault['disable_period'] = -1;
	    chrome.browserAction.setIcon({path:'images/appu19.png'});
	    console.log((new Date()) + ": Enabling Appu");
	}
	else {
	    console.log("Appu disabled at '" + pii_vault.disable_start + "' for " 
			+ pii_vault['disable_period'] + " minutes");

	    pii_vault['enable_timer'] = setInterval(start_time_loop, 1000);
	    chrome.browserAction.setIcon({path:'images/appu19_offline.png'});
	}
    }
    vault_write();
}

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type == "check") {
	r = pii_check_for_reuse(message);
	sendResponse(r);
	vault_update_domain_passwd(message);
    }
    else if (message.type == "statuschange") {
	pii_modify_status(message);
    }
    else if (message.type == "querystatus") {
	r = {};
	r.status = pii_vault.status;
	sendResponse(r);
    }
    else if (message.type == "modify_blacklist") {
	pii_add_blacklisted_sites(message);
    }
    else if (message.type == "get_blacklist") {
	r = pii_get_blacklisted_sites(message);
	sendResponse(r);
    }
    else if (message.type == "check_blacklist") {
	r = pii_check_blacklisted_sites(message);
	sendResponse(r);
    }
    else if (message.type == "get_report") {
	r = pii_get_report(message);
	sendResponse(r);
    }
    else if (message.type == "send_report") {
	r = pii_send_report(message);
    }
});