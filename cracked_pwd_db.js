
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
	    "bitpos_inside_byte" : bitpos_inside_byte
	}
    }
    return hash_bitpos;
}

