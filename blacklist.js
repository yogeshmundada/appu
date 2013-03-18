


function pii_add_blacklisted_sites(message) {
    var dnt_site = message.dnt_site;
    var r = {};
    if (pii_vault.options.blacklist.indexOf(dnt_site) == -1) {
	pii_vault.options.blacklist.push(dnt_site);
	r.new_entry = dnt_site;
    }
    else {
	r.new_entry = null;
    }
    console.log("New blacklist: " + pii_vault.options.blacklist);
    vault_write("options:blacklist", pii_vault.options.blacklist);
    return r;
}


function pii_check_blacklisted_sites(message) {
    var r = {};
    r.blacklisted = "no";
    //console.log("Checking blacklist for site: " + message.domain);
    for (var i = 0; i < pii_vault.options.blacklist.length; i++) {
	var protocol_matched = "yes";
	var port_matched = "yes";
	var bl_url = pii_vault.options.blacklist[i];
	//Split URLs, simplifying assumption that protocol is only HTTP.
	var url_parts = bl_url.split('/');
	var bl_hostname = "";
	var bl_protocol = "";
	var bl_port = "";

	bl_hostname = ((url_parts[0].toLowerCase() == 'http:' || 
			url_parts[0].toLowerCase() == 'https:')) ? url_parts[2] : url_parts[0];
	bl_protocol = ((url_parts[0].toLowerCase() == 'http:' || 
			url_parts[0].toLowerCase() == 'https:')) ? url_parts[0].toLowerCase() : undefined;
	bl_port = (bl_hostname.split(':')[1] == undefined) ? undefined : bl_hostname.split(':')[1];

	var curr_url_parts = message.domain.split('/');
	var curr_hostname = "";
	var curr_protocol = "";
	var curr_port = "";

	curr_hostname = ((curr_url_parts[0].toLowerCase() == 'http:' || 
			  curr_url_parts[0].toLowerCase() == 'https:')) ? curr_url_parts[2] : curr_url_parts[0];
	curr_protocol = ((curr_url_parts[0].toLowerCase() == 'http:' || 
			  curr_url_parts[0].toLowerCase() == 'https:')) ? curr_url_parts[0].toLowerCase() : '';

	curr_port = (curr_hostname.split(':')[1] == undefined) ? '' : curr_hostname.split(':')[1];

	rev_bl_hostname = bl_hostname.split("").reverse().join("");
	rev_curr_hostname = curr_hostname.split("").reverse().join("");

	if (bl_protocol && (curr_protocol != bl_protocol)) {
	    protocol_matched = "no";
	} 

	if (bl_port && (curr_port != bl_port)) {
	    port_matched = "no";
	} 

	//First part of IF checks if the current URL under check is a 
	//subdomain of blacklist domain.
	if ((rev_curr_hostname.indexOf(rev_bl_hostname) == 0) && 
	    protocol_matched == "yes" && port_matched == "yes") {
	    r.blacklisted = "yes";
	    console.log("Site is blacklisted: " + message.domain);
	    break;
	}
    }
    return r;
}


function pii_get_blacklisted_sites(message) {
    var r = [];
    for (var i = 0; i < pii_vault.options.blacklist.length; i++) {
	r.push(pii_vault.options.blacklist[i]);
    }
    return r;
}


function pii_delete_dnt_list_entry(message) {
    pii_vault.options.blacklist.splice(message.dnt_entry, 1);
    vault_write("options:blacklist", pii_vault.options.blacklist);
}

