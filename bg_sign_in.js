

function create_account(sender_tab_id, username, password) {
    var new_guid = generate_random_id();
    var wr = { 
	'guid': new_guid, 
	'username': CryptoJS.SHA1(username).toString(), 
	'password' : CryptoJS.SHA1(password).toString(),
	'version' : pii_vault.config.current_version 
    }

    $.post("http://woodland.gtnoise.net:5005/create_new_account", 
	   JSON.stringify(wr),
	   function(data) {
	       if (data == 'Success') {
		   chrome.tabs.sendMessage(sender_tab_id, {
		       type: "account-success", 
		       desc: "Account was created successfully. You are now logged-in"
		   }); 

		   //Reset pii_vault.
		   pii_vault = { "options" : {}, "config": {}};
		   pii_vault.guid = new_guid;
		   console.log("create_account(): Updated GUID in vault: " + pii_vault.guid);
		   vault_write("guid", pii_vault.guid);
		   
		   current_user = username;
		   pii_vault.current_user = username;
		   vault_write("current_user", pii_vault.current_user);

		   sign_in_status = 'signed-in';
		   pii_vault.sign_in_status =  'signed-in';
		   vault_write("sign_in_status", pii_vault.sign_in_status);
		   //GUID has changed, call init() to create new fields. Otherwise it
		   //will not do anything.
		   vault_init();
		   console.log("APPU DEBUG: Account creation was success");
		   //Just to report our status
		   pii_check_if_stats_server_up();
	       }
	       else if (data.split(' ')[0] == 'Failed') {
		   var temp = data.split(' ');
		   temp.shift();
		   reason = temp.join(' ');
		   chrome.tabs.sendMessage(sender_tab_id, {
		       type: "account-failure", 
		       desc: reason
		   }); 
		   console.log("APPU DEBUG: Account creation was failure: " + reason);
	       }
	       else {
		   chrome.tabs.sendMessage(sender_tab_id, {
		       type: "account-failure", 
		       desc: "Account creation failed for unknown reasons"
		   }); 
		   console.log("APPU DEBUG: Account creation was failure: Unknown Reason");
	       }
	   })	
	.error(function(sender_tab_id) {
		return function(data, status) {
		    print_appu_error("Appu Error: Account creation failed at the server: " 
				     + status.toString() + " @ " + (new Date()));
		    chrome.tabs.sendMessage(sender_tab_id, { 
			    type: "account-failure", 
				desc: "Account creation failed, service possibly down"
				}); 
		    console.log("APPU DEBUG: Account creation was failure: Unknown Reason");
		}
	    } (sender_tab_id));
}

function sign_in(sender_tab_id, username, password) {
    //zero out pii_vault first if guid is differnt
    var wr = { 
	'guid': pii_vault.guid, 
	'username': CryptoJS.SHA1(username).toString(), 
	'password' : CryptoJS.SHA1(password).toString(),
	'version' : pii_vault.config.current_version
    }

    $.post("http://woodland.gtnoise.net:5005/sign_in_account", 
	   JSON.stringify(wr),
	   function(data) {
	       if (data.split(' ')[0] == 'Success') {
		   chrome.tabs.sendMessage(sender_tab_id, {
		       type: "login-success", 
		       desc: "You have logged-in successfully"
		   }); 
		   current_user = username;
		   pii_vault.current_user = username;
		   vault_write("current_user", pii_vault.current_user);

		   sign_in_status = 'signed-in';
		   pii_vault.sign_in_status =  'signed-in';
		   vault_write("sign_in_status", pii_vault.sign_in_status);

		   var new_guid = data.split(' ')[1];
		   if (pii_vault.guid != new_guid) {
		       //Reset pii_vault.
		       pii_vault = { "options" : {}, "config": {}};
		       pii_vault.guid = new_guid;
		       console.log("sign_in(): Updated GUID in vault: " + pii_vault.guid);
		       vault_write("guid", pii_vault.guid);

		       current_user = username;
		       pii_vault.current_user = username;
		       vault_write("current_user", pii_vault.current_user);

		       sign_in_status = 'signed-in';
		       pii_vault.sign_in_status =  'signed-in';
		       vault_write("sign_in_status", pii_vault.sign_in_status);
		   }
		   //In case GUID has changed, call init() to create new fields. Otherwise it
		   //will not do anything.
		   vault_read();
		   vault_init();
		   console.log("APPU DEBUG: Account sign-in was success, new_guid: " + new_guid);
		   //Just to report our status
		   pii_check_if_stats_server_up();
	       }
	       else if (data.split(' ')[0] == 'Failed') {
		   chrome.tabs.sendMessage(sender_tab_id, {
		       type: "login-failure", 
		       desc: 'Failed to sign-in (Possibly username or password is wrong)'
		   }); 
		   console.log("APPU DEBUG: Account sign-in was failure");
	       }
	       else {
		   chrome.tabs.sendMessage(sender_tab_id, {
		       type: "login-failure", 
		       desc: "Account sign-in failure for unknown reasons"
		   }); 
		   console.log("APPU DEBUG: Account sign-in was failure, Unknown reason");
	       }
	   })
	.error(function(sender_tab_id) {
		return function(data, status) {
		    print_appu_error("Appu Error: Account sign-in failed at the server: " 
				     + status.toString() + " @ " + (new Date()));
		    chrome.tabs.sendMessage(sender_tab_id, {
			    type: "login-failure", 
				desc: "Account sign-in failed, possibly service is down"
				}); 
		   console.log("APPU DEBUG: Account creation was failure: Unknown Reason");
		}
	    } (sender_tab_id));
}

function sign_out() {
    //First close all old tabs for current user
    for (var i = 0; i < report_tab_ids.length; i++) {
	chrome.tabs.remove(report_tab_ids[i]);
    }
    for (var i = 0; i < myfootprint_tab_ids.length; i++) {
	chrome.tabs.remove(myfootprint_tab_ids[i]);
    }

    //Reset pii_vault.
    pii_vault = { "options" : {}, "config": {}};
    current_user = "default";
    pii_vault.guid = default_user_guid;
    sign_in_status = 'not-signed-in';

    console.log("sign_out(): Updated GUID in vault: " + pii_vault.guid);
    vault_write("guid", pii_vault.guid);

    pii_vault.current_user = current_user;
    console.log("sign_out(): Updated CURRENT_USER in vault: " + pii_vault.current_user);
    vault_write("current_user", pii_vault.current_user);

    pii_vault.sign_in_status =  sign_in_status;
    console.log("sign_out(): Updated SIGN_IN_STATUS in vault: " + pii_vault.sign_in_status);
    vault_write("sign_in_status", pii_vault.sign_in_status);

    //This is a default user, read default values and initialize those that dont exist
    vault_read();
    vault_init();
}
