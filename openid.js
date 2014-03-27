
// This code detects attempts to login using OpenID/oAuth


var my_openid_requests = [];
function openid_before_request_cb(details) {
    console.log("Here here: BEFORE REQUEST: " + JSON.stringify(details));
    print_url_params(details.url);
    if (details.requestBody != undefined) {
	console.log("Here here: REQUEST BODY: " + JSON.stringify(details.requestBody));
    }

//     if (JSON.stringify(details).toLowerCase().indexOf("openid") != -1 ||
// 	my_openid_requests.indexOf(details.requestId) != -1) {
// 	my_openid_requests.push(details.requestId);
// 	console.log("Here here: BEFORE REQUEST: " + JSON.stringify(details));
// 	print_url_params(details.url);
// 	if (details.requestBody != undefined) {
// 	    if (details.requestBody.raw != undefined) {
// 		for (var i = 0; i < details.requestBody.raw.length; i++) {
// 		    var bdy = download_ab2str(details.requestBody.raw[i].bytes);
// 		    console.log("Here here: REQUEST BODY("+i+"): " + bdy);
// 		}
// 	    }
// 	}
//     }
}

function openid_before_send_headers_cb(details) {    
    if (my_openid_requests.indexOf(details.requestId) != -1 ||
	my_openid_requests.indexOf(details.requestId) != -1) {
	console.log("Here here: BEFORE SEND HEADERS: " + JSON.stringify(details));
	print_url_params(details.url);
    }
}

// chrome.webRequest.onBeforeRequest.addListener(openid_before_request_cb, 
// 						  {
// 							  "urls": ["<all_urls>"],
// 							  },
// 					      ["blocking", "requestBody"]);

// chrome.webRequest.onBeforeSendHeaders.addListener(openid_before_send_headers_cb, 
// 						  {
// 							  "urls": ["<all_urls>"],
// 							  },
// 						  ["blocking", "requestHeaders"]);
