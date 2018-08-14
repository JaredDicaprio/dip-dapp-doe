// contracts/DipDappDoe.sol
pragma solidity ^0.4.24;

import "./LibString.sol";

contract DipDappDoe {
    // DATA
    struct Game {
        uint index;   // position in openGames[]
        uint8[9] cells;  // [123 / 456 / 789] containing [0 => nobody, 1 => X, 2 => O]
        
        // 0 => not started, 1 => player 1, 2 => player 2
        // 10 => draw, 11 => player 1 wins, 12 => player 2 wins
        uint8 status;
        
        uint amount;  // amount of money each user has sent
        uint created; // timestamp

        address[2] players;
        string[2] nicks;
        uint[2] lastTransactions; // timestamp => block number
        bool[2] withdrawn;

        string creatorHash;
        uint8 guestRandomNumber;
    }
    uint32[] openGames; // list of @'s for active games
    mapping(uint32 => Game) gamesData; // data containers

    // EVENTS

    event GameCreated(address indexed game);
    event GameAccepted(address indexed game);
    event GameStarted(address indexed game);
    event PositionMarked(address indexed game);
    event GameEnded(address indexed game);

    // CALLABLE

    function getOpenGames() public view returns (uint32[]){
        
    }

    function getGame(address gameId) public view 
    returns (uint8[9] cells, uint8 status, uint amount, uint created, string nick1, string nick2) {
        return (cells, status, amount, created, nick1, nick2);
    }

    // OPERATIONS

    function createGame(string randomNumberHash) public payable returns (address) {
        revert();
    }

    function acceptGame(address gameId, uint8 randomNumber) public payable {
        revert();
    }

    function confirmGame(address gameId, uint8 originalRandomNumber, bytes32 originalSalt) public {
        revert();
    }

    function markPosition(address gameId, uint8 cell) public {
        revert();
    }

    function withdraw(address gameId) public {
        revert();
    }

    // PUBLIC HELPER FUNCTIONS
    function saltedHash(uint8 randomNumber, string salt) public pure returns (string) {
        return LibString.saltedHash(randomNumber, salt);
    }

    // DEFAULT
    
    function () public payable {
        revert();
    }













    // mapping (address => uint) balances;

    // event Transfer(address indexed _from, address indexed _to, uint256 _value);

    // constructor() public {
    //     balances[msg.sender] = 10000;
    // }

    // function sendCoin(address receiver, uint amount) public returns(bool sufficient) {
    //     if (balances[msg.sender] < amount) return false;
    //     balances[msg.sender] -= amount;
    //     balances[receiver] += amount;
    //     emit Transfer(msg.sender, receiver, amount);
    //     return true;
    // }

    // function getBalanceInEth(address addr) public view returns(uint){
    //     return ConvertLib.convert(getBalance(addr),2);
    // }

    // function getBalance(address addr) public view returns(uint) {
    //     return balances[addr];
    // }
}
