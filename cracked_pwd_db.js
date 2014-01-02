
// To check bloom filter.

// 50GB at the server
var BLOOMFILTER_SIZE = Math.pow(2, 30) * 50;

// Total bloomfilter bits in those 50GB
var TOTAL_BITS = (BLOOMFILTER_SIZE * 8);

// File size in bytes (10K)
var FILE_SIZE = Math.pow(2, 10) * 10;

// Bloomfilter bits in each file
var BITS_PER_FILE = FILE_SIZE * 8;

// Total files in each directory
var FILES_PER_DIR = 5120;

// Total directories
var TOT_DIR = 1024;

var BF_SUBDIR = "bloomfilters";

var bit_set_array = [
		     128,
		     64,
		     32,
		     16,
		     8,
		     4,
		     2,
		     1,
		     ];

// Returns 10 hash values from 10 hash-functions
// Check: http://www.eecs.harvard.edu/~kirsch/pubs/bbbf/rsa.pdf   
function get_hashed_value(pwd) {
    var h1 = CryptoJS.SHA1(pwd).toString();
    var h2 = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(pwd));
    var hashes = [];

    for (var i = 0; i < 10; i++) {
	var curr_hash = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(h1 + i + h2));
	hashes.push(curr_hash);
    }
    return hashes;
}

function get_bit_positions(hashes) {
    var hash_bitpos = {};

    for (var i = 0; i < 10; i++) {
	var hbn = BigNumber(hashes[i], 16);
	var hbn_mod = hbn.mod(TOTAL_BITS);
	var bit_number = parseInt(hbn_mod.valueOf());
	var file_number = Math.ceil((bit_number + 1.0) / BITS_PER_FILE) - 1;
	var bit_position = bit_number % BITS_PER_FILE;
	var dir_number = Math.ceil((file_number + 1.0) / FILES_PER_DIR) - 1;

	var byte_number = Math.ceil((bit_position + 1.0)/ 8) - 1;
	var bitpos_inside_byte = bit_position % 8;

	hash_bitpos[hashes[i]] = {
            "fname": file_number.toString(),
            "dname": dir_number.toString(),
            "bitpos": bit_position,
	    "byte_number" : byte_number,
	    "bitpos_inside_byte" : bitpos_inside_byte,
	    "checked" : false,
	    "present" : false
	}
    }
    return hash_bitpos;
}

function is_bit_set(bytenum, bitinbyte, arrbuf) {
    var arrbuf_view8 = new Uint8Array(arrbuf);

    var rc = search_in_arrayBuffer("<bits>", arrbuf);
    var databyte = arrbuf_view8[bytenum + rc[1]];
    if ((bit_set_array[bitinbyte] & databyte) != 0) {
	return true;
    }
    return false;
}

function check_if_pwd_in_cracked_pwd_db(pwd) {
    var hashes = get_hashed_value(pwd);
    var bitpos = get_bit_positions(hashes);
    for (var i = 0; i < hashes.length; i++) {
	bitpos[hashes[i]]["is_downloaded"] = false;
	download_file(bitpos[hashes[i]]["fname"] + ".base64", "pwdbf", 
		      bitpos[hashes[i]]["dname"], (function(hash_index, bitpos, hashes, pwd) {
			      return function(unzip_buf, version) {
				  var are_all_downloaded = true;
				  bitpos[hashes[hash_index]]["is_downloaded"] = true;
				  bitpos[hashes[hash_index]]["unzip"] = unzip_buf;
				  bitpos[hashes[hash_index]]["version"] = version;
				  for (var j = 0; j < hashes.length; j++) {
				      if (bitpos[hashes[j]]["is_downloaded"] == undefined ||
					  bitpos[hashes[j]]["is_downloaded"] == false) {
					  are_all_downloaded = false;
					  break;
				      }
				  }
				  if (are_all_downloaded == true) {
				      var are_all_bits_set = true;
				      for (var j = 0; j < hashes.length; j++) {
					  if (bitpos[hashes[j]]["version"] == undefined &&
					      bitpos[hashes[j]]["unzip"] == undefined) {
					      are_all_bits_set = false;
					      break;
					  }
					  if (bitpos[hashes[j]]["version"] == "0.0.0") {
					      are_all_bits_set = false;
					      break;
					  }

					  var rc = is_bit_set(bitpos[hashes[j]]["byte_number"], 
							      bitpos[hashes[j]]["bitpos_inside_byte"], 
							      bitpos[hashes[j]]["unzip"]);
					  
					  if (rc == false) {
					      are_all_bits_set = false;
					      break;
					  }
				      }
				      if (are_all_bits_set == true) {
					  console.log("APPU DEBUG: Password IS cracked: " + pwd);
				      }
				      else {
					  console.log("APPU DEBUG: Password is NOT cracked: " + pwd);
				      }
				  }
			      }
			  }(i, bitpos, hashes, pwd)), true);
    }
}