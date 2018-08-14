// test/TestLibString.sol
pragma solidity ^0.4.24;

import "truffle/Assert.sol";
import "../contracts/LibString.sol";

contract TestLibString {
    function testSaltedHash() public {
        string memory hash1 = LibString.saltedHash(123, "my salt here");
        string memory hash2 = LibString.saltedHash(123, "my salt 2 here");
        string memory hash3 = LibString.saltedHash(234, "my salt here");
        
        Assert.isNotEmpty(hash1, "Salted hash should be a valid string");

        Assert.notEqual(hash1, hash2, "Different salt should produce different hashes");
        Assert.notEqual(hash1, hash3, "Different numbers should produce different hashes");
        Assert.notEqual(hash2, hash3, "Different numbers and salt should produce different hashes");
    }
}
