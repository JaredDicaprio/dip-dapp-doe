// test/dipDappDoe.js
const DipDappDoe = artifacts.require("./DipDappDoe.sol");
const LibString = artifacts.require("./LibString.sol");
let gamesInstance, libStringInstance;

contract('DipDappDoe', function (accounts) {
    it("should be deployed", async function () {
        gamesInstance = await DipDappDoe.deployed();
        assert.isOk(gamesInstance, "instance should not be null");
        assert.equal(typeof gamesInstance, "object", "Instance should be an object");

        libStringInstance = await LibString.deployed();
        assert.isOk(libStringInstance, "instance should not be null");
        assert.equal(typeof libStringInstance, "object", "Instance should be an object");
    });

    it("should start with no games at the begining", async function () {
        let gamesIdx = await gamesInstance.getOpenGames.call();
        assert.deepEqual(gamesIdx, [], "Should have zero games at the begining");
    });

    it("should use the saltedHash function from the library", async function () {
        let hash1 = await libStringInstance.saltedHash.call(123, "my salt 1");
        let hashA = await gamesInstance.saltedHash.call(123, "my salt 1");

        let hash2 = await libStringInstance.saltedHash.call(123, "my salt 2");
        let hashB = await gamesInstance.saltedHash.call(123, "my salt 2");

        let hash3 = await libStringInstance.saltedHash.call(234, "my salt 1");
        let hashC = await gamesInstance.saltedHash.call(234, "my salt 1");

        assert.equal(hash1, hashA, "Contract hashes should match the library output");
        assert.equal(hash2, hashB, "Contract hashes should match the library output");
        assert.equal(hash3, hashC, "Contract hashes should match the library output");

        assert.notEqual(hash1, hash2, "Different salt should produce different hashes");
        assert.notEqual(hash1, hash3, "Different numbers should produce different hashes");
        assert.notEqual(hash2, hash3, "Different numbers and salt should produce different hashes");
    });

    it("should create a game with no money", async function () {
        let hash = await libStringInstance.saltedHash.call(123, "my salt 1");

        await gamesInstance.createGame(hash, "John");

        assert.equal(await web3.eth.getBalance(gamesInstance.address).toNumber(), 0, "The contract should have registered a zero amount of ether owed to the players");
        
        let gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.deepEqual(gamesIdx, [0], "Should have one game");

        const gameIdx = gamesIdx[0];

        let [cells, status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board should be empty");
        assert.equal(status.toNumber(), 0, "The game should not be started");
        assert.equal(amount.toNumber(), 0, "The game should have no money");
        assert.equal(nick1, "John", "The player 1 should be John");
        assert.equal(nick2, "", "The player 2 should be empty");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        let [created, lastTransaction1, lastTransaction2, ...rest2] = await gamesInstance.getGameTimestamps(gameIdx);
        assert.isAbove(created.toNumber(), 0, "The creation timestamp should be set");
        assert.isAbove(lastTransaction1.toNumber(), 0, "The last timestamp of player 1 should be set");
        assert.equal(lastTransaction2.toNumber(), 0, "The last timestamp of player 2 should be empty");
        assert.deepEqual(rest2, [], "The response should have 3 elements");

        let [player1, player2, ...rest3] = await gamesInstance.getGamePlayers(gameIdx);
        assert.equal(player1, accounts[0], "The address of player 1 should be set");
        assert.equal(player2, "0x0000000000000000000000000000000000000000", "The address of player 2 should be empty");
        assert.deepEqual(rest3, [], "The response should have 2 elements");
    });

    it("should create a game with money", async function () {
        let hash = await libStringInstance.saltedHash.call(123, "my salt 1");

        await gamesInstance.createGame(hash, "Jane", { value: web3.toWei(0.01, 'ether') });

        let balance = await web3.eth.getBalance(gamesInstance.address);
        assert.equal(balance.comparedTo(web3.toWei(0.01, 'ether')), 0, "The contract should have registered 0.01 ether owed to the players");
        
        let gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.deepEqual(gamesIdx, [0, 1], "Should have two games");

        const gameIdx = gamesIdx[1];

        let [cells, status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board should be empty");
        assert.equal(status.toNumber(), 0, "The game should not be started");
        
        assert.equal(amount.comparedTo(web3.toWei(0.01, 'ether')), 0, "The game should have 0.01 ether");
        assert.equal(nick1, "Jane", "The player 1 should be Jane");
        assert.equal(nick2, "", "The player 2 should be empty");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        let [created, lastTransaction1, lastTransaction2, ...rest2] = await gamesInstance.getGameTimestamps(gameIdx);
        assert.isAbove(created.toNumber(), 0, "The creation timestamp should be set");
        assert.isAbove(lastTransaction1.toNumber(), 0, "The last timestamp of player 1 should be set");
        assert.equal(lastTransaction2.toNumber(), 0, "The last timestamp of player 2 should be empty");
        assert.deepEqual(rest2, [], "The response should have 3 elements");

        let [player1, player2, ...rest3] = await gamesInstance.getGamePlayers(gameIdx);
        assert.equal(player1, accounts[0], "The address of player 1 should be set");
        assert.equal(player2, "0x0000000000000000000000000000000000000000", "The address of player 2 should be empty");
        assert.deepEqual(rest3, [], "The response should have 2 elements");
    });
});
