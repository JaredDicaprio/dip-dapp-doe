// test/TestDipDappDoe.sol
pragma solidity ^0.4.24;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/DipDappDoe.sol";

contract TestDipDappDoe2 {
    DipDappDoe gamesInstance;

    constructor() public {
        gamesInstance = DipDappDoe(DeployedAddresses.DipDappDoe());
    }

    function testGameCreation() public {
        uint8[9] memory cells;
        uint8 status;
        uint amount;
        string memory nick1;
        string memory nick2;
        uint created;
        uint lastTransaction1;
        uint lastTransaction2;

        string memory hash = gamesInstance.saltedHash(123, "my salt goes here");
        uint32 gameIdx = gamesInstance.createGame(hash, "John");
        Assert.equal(uint(gameIdx), 0, "The first game should have index 0");

        uint32[] memory openGames = gamesInstance.getOpenGames();
        Assert.equal(openGames.length, 1, "One game should have been created");
        Assert.equal(uint(openGames[0]), 0, "The first game should have index 0");

        (cells, status, amount, nick1, nick2) = gamesInstance.getGameInfo(gameIdx);
        Assert.equal(uint(cells[0]), 0, "The board should be empty");
        Assert.equal(uint(cells[1]), 0, "The board should be empty");
        Assert.equal(uint(cells[2]), 0, "The board should be empty");
        Assert.equal(uint(cells[3]), 0, "The board should be empty");
        Assert.equal(uint(cells[4]), 0, "The board should be empty");
        Assert.equal(uint(cells[5]), 0, "The board should be empty");
        Assert.equal(uint(cells[6]), 0, "The board should be empty");
        Assert.equal(uint(cells[7]), 0, "The board should be empty");
        Assert.equal(uint(cells[8]), 0, "The board should be empty");
        Assert.equal(uint(status), 0, "The game should not be started");
        Assert.equal(amount, 0, "The initial amount should be zero");
        Assert.equal(nick1, "John", "The nick should be John");
        Assert.isEmpty(nick2, "Nick2 should be empty");

        (created, lastTransaction1, lastTransaction2) = gamesInstance.getGameTimestamps(gameIdx);
        Assert.isAbove(created, 0, "Creation date should be set");
        Assert.isAbove(lastTransaction1, 0, "The first player's transaction timestamp should be set");
        Assert.equal(lastTransaction2, 0, "The second player's transaction timestamp should be empty");
    }

    function testGameAccepted() public {
        uint8[9] memory cells;
        uint8 status;
        uint amount;
        string memory nick1;
        string memory nick2;
        uint created;
        uint lastTransaction1;
        uint lastTransaction2;

        uint32[] memory openGames = gamesInstance.getOpenGames();
        Assert.equal(openGames.length, 1, "One game should be available");

        gamesInstance.acceptGame(openGames[0], 234, "Mary");

        openGames = gamesInstance.getOpenGames();
        Assert.equal(openGames.length, 1, "One game should still exist");
        Assert.equal(uint(openGames[0]), 0, "The game should still have index 0");

        (cells, status, amount, nick1, nick2) = gamesInstance.getGameInfo(openGames[0]);
        Assert.equal(uint(cells[0]), 0, "The board should be empty");
        Assert.equal(uint(cells[1]), 0, "The board should be empty");
        Assert.equal(uint(cells[2]), 0, "The board should be empty");
        Assert.equal(uint(cells[3]), 0, "The board should be empty");
        Assert.equal(uint(cells[4]), 0, "The board should be empty");
        Assert.equal(uint(cells[5]), 0, "The board should be empty");
        Assert.equal(uint(cells[6]), 0, "The board should be empty");
        Assert.equal(uint(cells[7]), 0, "The board should be empty");
        Assert.equal(uint(cells[8]), 0, "The board should be empty");
        Assert.equal(uint(status), 0, "The game should not be started");
        Assert.equal(amount, 0, "The initial amount should be zero");
        Assert.equal(nick1, "John", "The nick should be John");
        Assert.equal(nick2, "Mary", "The nick should be Mary");

        (created, lastTransaction1, lastTransaction2) = gamesInstance.getGameTimestamps(openGames[0]);
        Assert.isAbove(created, 0, "Creation date should be set");
        Assert.isAbove(lastTransaction1, 0, "The first player's transaction timestamp should be set");
        Assert.isAbove(lastTransaction2, 0, "The second player's transaction timestamp should be set");
    }

    function testGameConfirmed() public {
        uint8[9] memory cells;
        uint8 status;
        uint amount;
        string memory nick1;
        string memory nick2;
        uint created;
        uint lastTransaction1pre;
        uint lastTransaction1post;
        uint lastTransaction2;

        string memory hash = gamesInstance.saltedHash(123, "my salt goes here");
        uint32 gameIdx = gamesInstance.createGame(hash, "John");
        gamesInstance.acceptGame(gameIdx, 234, "Mary");

        (created, lastTransaction1pre, lastTransaction2) = gamesInstance.getGameTimestamps(gameIdx);

        gamesInstance.confirmGame(gameIdx, 123, "my salt goes here");

        // 123 ^ 234 is odd: player 2 should start
        (cells, status, amount, nick1, nick2) = gamesInstance.getGameInfo(gameIdx);
        Assert.equal(uint(cells[0]), 0, "The board should be empty");
        Assert.equal(uint(cells[1]), 0, "The board should be empty");
        Assert.equal(uint(cells[2]), 0, "The board should be empty");
        Assert.equal(uint(cells[3]), 0, "The board should be empty");
        Assert.equal(uint(cells[4]), 0, "The board should be empty");
        Assert.equal(uint(cells[5]), 0, "The board should be empty");
        Assert.equal(uint(cells[6]), 0, "The board should be empty");
        Assert.equal(uint(cells[7]), 0, "The board should be empty");
        Assert.equal(uint(cells[8]), 0, "The board should be empty");
        Assert.equal(uint(status), 2, "The game should be started at player 2");
        Assert.equal(amount, 0, "The initial amount should be zero");
        Assert.equal(nick1, "John", "The nick should be John");
        Assert.equal(nick2, "Mary", "The nick should be Mary");

        (created, lastTransaction1post, lastTransaction2) = gamesInstance.getGameTimestamps(gameIdx);
        Assert.isAbove(created, 0, "Creation date should be set");
        Assert.isAbove(lastTransaction1post, lastTransaction1pre, "The first player's transaction timestamp should be newer");
        Assert.isAbove(lastTransaction2, 0, "The second player's transaction timestamp should be set");
    }
}
