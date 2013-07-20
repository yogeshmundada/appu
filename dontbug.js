
function pii_add_dontbug_list(message) {
    var domain = get_domain(message.domain);
    var r = {};
    if(pii_vault.options.dontbuglist.indexOf(domain) == -1) {
	pii_vault.options.dontbuglist.push(domain);
	vault_write("options:dontbuglist", pii_vault.options.dontbuglist);
	r.new_entry = domain;
	pii_vault.current_report.dontbuglist.push(domain);
	flush_selective_entries("current_report", ["dontbuglist"]);
    }
    else {
	r.new_entry = null;
    }

    console.log("New dontbugme list: " + pii_vault.options.dontbuglist);
    return r;
}


function pii_delete_dontbugme_list_entry(message) {
    pii_vault.options.dontbuglist.splice(message.dnt_entry, 1);
    vault_write("options:dontbuglist", pii_vault.options.dontbuglist);
}


function pii_get_dontbugme_list(message) {
    var r = [];
    for (var i = 0; i < pii_vault.options.dontbuglist.length; i++) {
	r.push(pii_vault.options.dontbuglist[i]);
    }
    return r;
}
