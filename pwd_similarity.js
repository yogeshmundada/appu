
function levenshtein_distance(pw1, pw2) {
    if (!pw1.length) return pw2.length;
    if (!pw2.length) return pw1.length;
    return Math.min(
		    levenshtein_distance(pw1.substr(1), pw2) + 1,
		    levenshtein_distance(pw2.substr(1), pw1) + 1,
		    levenshtein_distance(pw1.substr(1), pw2.substr(1)) + (pw1[0] !== pw2[0] ? 1 : 0));
}


function split_passwd_to_ngram(pwd, min, max) {
    var ngrams = [];

    if (min && max) {
	if (pwd.length < max) {
	    return [];
	}
    }
    else {
	min = 1;
	max = pwd.length;
    }

    for(var i = 0; i < pwd.length; i++) {
        for(var j = min; j < max; j++) {
            if(i+j <= pwd.length) {
                var ng = pwd.substr(i, j);
		ngrams.push(ng);
            }
        }
    }
    return ngrams;
}


function pwd_to_shingling(pwd) {
    var ngrams = split_passwd_to_ngram(pwd);
    console.log("Here here: Delete me: ngrams: " + JSON.stringify(ngrams));

    var hashed_ngrams = [];

    for (var i = 0; i < ngrams.length; i++) {
	var k = sjcl.hash.sha256.hash(ngrams[i]);
	var pwd_hash = sjcl.codec.hex.fromBits(k);
	var n = BigNumber(pwd_hash, 16);
	var j = n.mod(1000);
	var salt = pii_vault.salt_table[j];
	
	k = sjcl.hash.sha256.hash(ngrams[i] + ":" + salt);
	pwd_hash = sjcl.codec.hex.fromBits(k);
	
	hashed_ngrams.push(pwd_hash);
    }

    console.log("Here here: Delete me: hashed_ngrams: " + JSON.stringify(hashed_ngrams));
    return hashed_ngrams;
}


function get_min_of_random_permutation(shng, permutation) {
    var min = undefined;

    for (var i = 0; i < shng.length; i++) {
	var w = shng[i] + ":" + permutation;
	var k = sjcl.hash.sha256.hash(w);
	var curr_hash = sjcl.codec.hex.fromBits(k);
	var bn_hash = BigNumber(curr_hash, 16);
	
	if (min == undefined) {
	    min = bn_hash;
	}
	else {
	    if (min.cmp(bn_hash) == 1) {
		min = bn_hash;
	    }
	}
    }

    return min.toString(10);
}


// From: http://stackoverflow.com/questions/1584370/how-to-merge-two-arrays-in-javascript-and-de-duplicate-items
function arrayUnique(array) {
    var a = array.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
}


function get_jaccard_index(set1, set2) {
    var set = arrayUnique(set1.concat(set2));
    var c11 = 0;
    var c01 = 0;
    var c10 = 0;

    for (var i = 0; i < set.length; i++) {
	var w = set[i];
	if (set1.indexOf(w) != -1 &&
	    set2.indexOf(w) != -1) {
	    c11++;
	}
	else {
	    if (set1.indexOf(w) != -1) {
		c10++;
	    }
	    else if (set2.indexOf(w) != -1) {
		c01++;
	    }
	}
    }

    return [c11, (c11+c10+c01)];
}


function get_plaintext_pwd_similarity(pwd1, pwd2) {
    pwd1 = pwd1.toLowerCase();
    pwd2 = pwd2.toLowerCase();

    var max_len = (pwd1.length > pwd2.length) ? pwd1.length: pwd2.length;
    var jis = [];
    var num_no_weight = 0;
    var num_weight = 0;
    var den_no_weight = 0;
    var den_weight = 0;

    for (var i = 1; i < max_len; i++) {
	var ngram1 = split_passwd_to_ngram(pwd1, i, i+1);
	var ngram2 = split_passwd_to_ngram(pwd2, i, i+1);

	var c = get_jaccard_index(ngram1, ngram2);
	jis.push(c);
    }

    for (var i = 0; i < jis.length; i++) {
	console.log("APPU DEBUG: For i(='" + (i+1) + "'), JI: " + (jis[i][0] * 100/jis[i][1]) + "%");
	num_weight += (jis[i][0] * (i+1));
	den_weight += (jis[i][1] * (i+1));

	num_no_weight += (jis[i][0]);
	den_no_weight += (jis[i][1]);
    }

    console.log("APPU DEBUG: Unweighted JI: " + (num_no_weight * 100/den_no_weight) + "%");
    console.log("APPU DEBUG: Weighted JI: " + (num_weight * 100/den_weight) + "%");

}


function get_pwd_similarity(pwd1, pwd2, iters) {
    pwd1 = pwd1.toLowerCase();
    pwd2 = pwd2.toLowerCase();

    if (!iters) {
	iters = 200;
    }

    var shng1 = pwd_to_shingling(pwd1);
    var shng2 = pwd_to_shingling(pwd2);

    var rnds = [];
    for (var i = 0; i < iters; ) {
	var r = Math.floor(Math.random() * 100001);
	if (rnds.indexOf(r) == -1) {
	    rnds.push(r);
	    i++;
	}
    }

    var matching = [];
    for (var i = 0; i < iters; i++) {
	var m1 = get_min_of_random_permutation(shng1, rnds[i]);
	var m2 = get_min_of_random_permutation(shng2, rnds[i]);

	// console.log("Here here: Delete me: i(="+i+"), m1("++"), m2()");
	(m1 == m2) ? matching.push(1) : matching.push(0);
    }

    var tot_matches= matching.reduce(function(previousValue, currentValue, index, array){
	    return previousValue + currentValue;
	});

    console.log("Here here: Delete me: For pwd1(='" + pwd1 + "') and pwd2(='" + pwd2 + "')," +
		" pwd-similarity (iters=" + iters + "): " + (tot_matches * 100/matching.length) + "%");
}
