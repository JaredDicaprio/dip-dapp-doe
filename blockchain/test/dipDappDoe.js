// test/dipDappDoe.js
const DipDappDoe = artifacts.require("./DipDappDoe.sol");
const LibString = artifacts.require("./LibString.sol");
let gamesInstance, libStringInstance;

contract('DipDappDoe', function (accounts) {
    it("should be deployed", async function () {
        gamesInstance = await DipDappDoe.deployed();
        assert.isOk(gamesInstance, "instance should not be null");
        assert.equal(typeof gamesInstance, "object", "Instance should be an object");

        const timeout = await gamesInstance.timeout.call();
        assert.equal(timeout.toNumber(), 2, "The base timeout to test should be set to 2");

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

    // DipDappDoe.createGame

    it("should create a game with no money", async function () {
        var eventWatcher = gamesInstance.GameCreated();
        let hash = await libStringInstance.saltedHash.call(123, "my salt 1");

        await gamesInstance.createGame(hash, "John");

        assert.equal(await web3.eth.getBalance(gamesInstance.address).toNumber(), 0, "The contract should have registered a zero amount of ether owed to the players");

        let gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.deepEqual(gamesIdx, [0], "Should have one game");

        const emittedEvents = await eventWatcher.get();
        assert.isOk(emittedEvents, "Events should be an array");
        assert.equal(emittedEvents.length, 1, "There should be one event");
        assert.isOk(emittedEvents[0], "There should be one event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), 0, "The game should have index zero");

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
        var eventWatcher = gamesInstance.GameCreated();
        let hash = await libStringInstance.saltedHash.call(123, "my salt 1");

        await gamesInstance.createGame(hash, "Jane", { value: web3.toWei(0.01, 'ether') });

        let balance = await web3.eth.getBalance(gamesInstance.address);
        assert.equal(balance.comparedTo(web3.toWei(0.01, 'ether')), 0, "The contract should have registered 0.01 ether owed to the players");

        let gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.deepEqual(gamesIdx, [0, 1], "Should have two games");

        const emittedEvents = await eventWatcher.get();
        assert.isOk(emittedEvents, "Events should be an array");
        assert.equal(emittedEvents.length, 1, "There should be one event");
        assert.isOk(emittedEvents[0], "There should be one event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), 1, "The game should have index zero");

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

    // DipDappDoe.acceptGame

    it("should reject accepting a non-existing game", async function () {
        try {
            await gamesInstance.acceptGame(1234, 0, "Mary");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should reject accepting games with a different amount of money than expected", async function () {
        let hash = await libStringInstance.saltedHash.call(123, "my salt 1");
        await gamesInstance.createGame(hash, "Johny", { value: web3.toWei(0.02, 'ether') });

        let balance = await web3.eth.getBalance(gamesInstance.address);
        assert.equal(balance.comparedTo(web3.toWei(0.03, 'ether')), 0, "The contract should have registered 0.02 ether owed to the players");

        let gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.deepEqual(gamesIdx, [0, 1, 2], "Should have two games");

        const gameIdx = gamesIdx[2];

        let [cells, status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board should be empty");
        assert.equal(status.toNumber(), 0, "The game should not be started");

        assert.equal(amount.comparedTo(web3.toWei(0.02, 'ether')), 0, "The game should have 0.02 ether");
        assert.equal(nick1, "Johny", "The player 1 should be Johny");
        assert.equal(nick2, "", "The player 2 should be empty");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        try {
            await gamesInstance.acceptGame(gameIdx, 0, "Kathy");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should accept an available game", async function () {
        var eventWatcher = gamesInstance.GameAccepted();
        let hash = await libStringInstance.saltedHash.call(123, "my salt 1");

        // create game
        await gamesInstance.createGame(hash, "James", { value: web3.toWei(0.005, 'ether') });

        let balance = await web3.eth.getBalance(gamesInstance.address);
        assert.equal(balance.comparedTo(web3.toWei(0.035, 'ether')), 0, "The contract should have registered 0.005 ether owed to the players");

        let gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.deepEqual(gamesIdx, [0, 1, 2, 3], "Should have three games");

        const gameIdx = gamesIdx[gamesIdx.length - 1];

        let [cells, status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board should be empty");
        assert.equal(status.toNumber(), 0, "The game should not be started");

        assert.equal(amount.comparedTo(web3.toWei(0.005, 'ether')), 0, "The game should have 0.005 ether");
        assert.equal(nick1, "James", "The player 1 should be James");
        assert.equal(nick2, "", "The player 2 should be still empty");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        // accept game
        await gamesInstance.acceptGame(gameIdx, 0, "Kathy", { value: web3.toWei(0.005, 'ether'), from: accounts[1] });

        balance = await web3.eth.getBalance(gamesInstance.address);
        assert.equal(balance.comparedTo(web3.toWei(0.04, 'ether')), 0, "The contract should have registered 0.005 more ether owed to the players");

        gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.deepEqual(gamesIdx, [0, 1, 2, 3], "Should have three games");

        const emittedEvents = await eventWatcher.get();
        assert.isOk(emittedEvents, "Events should be an array");
        assert.equal(emittedEvents.length, 1, "There should be one accepted game event");
        assert.isOk(emittedEvents[0], "There should be one accepted game event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The game should have the last gameIdx");

        [cells, status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board should be empty");
        assert.equal(status.toNumber(), 0, "The game should not be started yet");

        assert.equal(amount.comparedTo(web3.toWei(0.005, 'ether')), 0, "The game should have 0.005 ether");
        assert.equal(nick1, "James", "The player 1 should be James");
        assert.equal(nick2, "Kathy", "The player 2 should be Kathy");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        [created, lastTransaction1, lastTransaction2, ...rest2] = await gamesInstance.getGameTimestamps(gameIdx);
        assert.isAbove(created.toNumber(), 0, "The creation timestamp should be set");
        assert.isAbove(lastTransaction1.toNumber(), 0, "The last timestamp of player 1 should be set");
        assert.isAbove(lastTransaction2.toNumber(), 0, "The last timestamp of player 2 should be set");
        assert.deepEqual(rest2, [], "The response should have 3 elements");

        [player1, player2, ...rest3] = await gamesInstance.getGamePlayers(gameIdx);
        assert.equal(player1, accounts[0], "The address of player 1 should be set");
        assert.equal(player2, accounts[1], "The address of player 2 should be set");
        assert.deepEqual(rest3, [], "The response should have 2 elements");
    });

    it("should reject accepting an already started game", async function () {
        var eventWatcher = gamesInstance.GameAccepted();

        let hash = await libStringInstance.saltedHash.call(123, "my salt 1");
        await gamesInstance.createGame(hash, "Jim");

        gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.deepEqual(gamesIdx, [0, 1, 2, 3, 4], "Should have four games");

        const gameIdx = gamesIdx[gamesIdx.length - 1];
        await gamesInstance.acceptGame(gameIdx, 0, "Dana", { from: accounts[1] });

        const emittedEvents = await eventWatcher.get();
        assert.isOk(emittedEvents, "Events should be an array");
        assert.equal(emittedEvents.length, 1, "There should be one accepted game event");
        assert.isOk(emittedEvents[0], "There should be one accepted game event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The game should have the last gameIdx");

        try {
            await gamesInstance.acceptGame(gameIdx, 0, "Dana", { from: accounts[2] });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.acceptGame(gameIdx, 1, "Donna", { from: accounts[1] });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.acceptGame(gameIdx, 1, "Dolly");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should remove the game from the list of available games", async function(){
        assert.fail("Untested");
    });

    // DipDappDoe.confirmGame

    it("should reject confirming a non existing game", async function () {
        try {
            await gamesInstance.confirmGame(12345687, 100, "some salt");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.confirmGame(23456789, 200, "some more salt");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should reject confirming a game that has not been accepted yet", async function () {
        var eventWatcher = gamesInstance.GameCreated();

        let hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: accounts[0]});

        const emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        try {
            await gamesInstance.confirmGame(gameIdx, 123, "some salt");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.confirmGame(gameIdx, 200, "some more salt");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should give the game for the second user if the hash does not match with the revealed values", async function () {
        var eventWatcher = gamesInstance.GameCreated();

        let hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: accounts[0]});

        const emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        await gamesInstance.acceptGame(gameIdx, 234, "Dana", {from: accounts[1]});
        
        await gamesInstance.confirmGame(gameIdx, 124, "initial salt", {from: accounts[0]});
        
        // 123 != 124 => player 2 should be the winner
        let [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board should be empty");
        assert.equal(status.toNumber(), 12, "Player 2 should be the winner");
    });

    it("should confirm a valid game for player 1", async function () {
        var creationWatcher = gamesInstance.GameCreated();
        var startingWatcher = gamesInstance.GameStarted();

        let hash = await libStringInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: accounts[0]});

        const creationEvents = await creationWatcher.get();
        let gameIdx = creationEvents[0].args.gameIdx.toNumber();

        await gamesInstance.acceptGame(gameIdx, 200, "Dana", {from: accounts[1]});

        let [created, lastTransaction1pre, lastTransaction2, ...rest2] = await gamesInstance.getGameTimestamps(gameIdx);
        assert.isAbove(created.toNumber(), 0, "The creation timestamp should be set");
        assert.isAbove(lastTransaction1pre.toNumber(), 0, "The last timestamp of player 1 should be set");
        assert.isAbove(lastTransaction2.toNumber(), 0, "The last timestamp of player 2 should be set");
        assert.deepEqual(rest2, [], "The response should have 3 elements");

        await new Promise(resolve => setTimeout(resolve, 1000));
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: accounts[0]});
        
        const startingEvents = await startingWatcher.get();
        gameIdx = startingEvents[0].args.gameIdx.toNumber();

        assert.isOk(startingEvents, "Events should be an array");
        assert.equal(startingEvents.length, 1, "There should be one started game event");
        assert.isOk(startingEvents[0], "There should be one started game event");
        assert.equal(startingEvents[0].args.gameIdx.toNumber(), gameIdx, "The game should have the last gameIdx");

        // 100 ^ 200 is even => player 1 should start
        let [cells, status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board should be empty");
        assert.equal(status.toNumber(), 1, "Player 1 should be able to start");

        assert.equal(amount.comparedTo(0), 0, "The game should have 0 ether");
        assert.equal(nick1, "Jim", "The player 1 should be Jim");
        assert.equal(nick2, "Dana", "The player 2 should be Dana");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        let lastTransaction1post;
        [created, lastTransaction1post, lastTransaction2, ...rest2] = await gamesInstance.getGameTimestamps(gameIdx);
        assert.isAbove(created.toNumber(), 0, "The creation timestamp should be set");
        assert.isAbove(lastTransaction1post.toNumber(), lastTransaction1pre.toNumber(), "The last timestamp of player 1 should be newer");
        assert.isAbove(lastTransaction2.toNumber(), 0, "The last timestamp of player 2 should be set");
        assert.deepEqual(rest2, [], "The response should have 3 elements");

        const [player1, player2, ...rest3] = await gamesInstance.getGamePlayers(gameIdx);
        assert.equal(player1, accounts[0], "The address of player 1 should still be set");
        assert.equal(player2, accounts[1], "The address of player 2 should still be set");
        assert.deepEqual(rest3, [], "The response should have 2 elements");
    });
    
    it("should confirm a valid game for player 2", async function () {
        var creationWatcher = gamesInstance.GameCreated();
        var startingWatcher = gamesInstance.GameStarted();

        let hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: accounts[0]});

        const creationEvents = await creationWatcher.get();
        let gameIdx = creationEvents[0].args.gameIdx.toNumber();

        await gamesInstance.acceptGame(gameIdx, 200, "Dana", {from: accounts[1]});

        let [created, lastTransaction1pre, lastTransaction2, ...rest2] = await gamesInstance.getGameTimestamps(gameIdx);
        assert.isAbove(created.toNumber(), 0, "The creation timestamp should be set");
        assert.isAbove(lastTransaction1pre.toNumber(), 0, "The last timestamp of player 1 should be set");
        assert.isAbove(lastTransaction2.toNumber(), 0, "The last timestamp of player 2 should be set");
        assert.deepEqual(rest2, [], "The response should have 3 elements");

        await new Promise(resolve => setTimeout(resolve, 1000));
        await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: accounts[0]});
        
        const startingEvents = await startingWatcher.get();
        gameIdx = startingEvents[0].args.gameIdx.toNumber();

        assert.isOk(startingEvents, "Events should be an array");
        assert.equal(startingEvents.length, 1, "There should be one started game event");
        assert.isOk(startingEvents[0], "There should be one started game event");
        assert.equal(startingEvents[0].args.gameIdx.toNumber(), gameIdx, "The game should have the last gameIdx");

        // 123 ^ 200 is odd => player 2 should start
        let [cells, status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board should be empty");
        assert.equal(status.toNumber(), 2, "Player 2 should be able to start");

        assert.equal(amount.comparedTo(0), 0, "The game should have 0 ether");
        assert.equal(nick1, "Jim", "The player 1 should be Jim");
        assert.equal(nick2, "Dana", "The player 2 should be Dana");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        let lastTransaction1post;
        [created, lastTransaction1post, lastTransaction2, ...rest2] = await gamesInstance.getGameTimestamps(gameIdx);
        assert.isAbove(created.toNumber(), 0, "The creation timestamp should be set");
        assert.isAbove(lastTransaction1post.toNumber(), lastTransaction1pre.toNumber(), "The last timestamp of player 1 should be newer");
        assert.isAbove(lastTransaction2.toNumber(), 0, "The last timestamp of player 2 should be set");
        assert.deepEqual(rest2, [], "The response should have 3 elements");

        const [player1, player2, ...rest3] = await gamesInstance.getGamePlayers(gameIdx);
        assert.equal(player1, accounts[0], "The address of player 1 should still be set");
        assert.equal(player2, accounts[1], "The address of player 2 should still be set");
        assert.deepEqual(rest3, [], "The response should have 2 elements");
    });
    
    it("should reject confirming a game if it is already started", async function () {
        var eventWatcher = gamesInstance.GameCreated();

        let hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: accounts[0]});

        const emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        await gamesInstance.acceptGame(gameIdx, 200, "Dana", {from: accounts[1]});
        await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: accounts[0]});
        
        try {
            await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: accounts[0]});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should have been reverted. Instead, the error was: " + err.message);
        }
    });

    it("should reject game confirmations from users other than the creator", async function () {
        var eventWatcher = gamesInstance.GameCreated();

        let hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: accounts[0]});

        const emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        await gamesInstance.acceptGame(gameIdx, 200, "Dana", {from: accounts[1]});
        
        try {
            await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: accounts[2]});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should reject confirming a game if it has already ended", async function () {
        var eventWatcher = gamesInstance.GameCreated();
        
        let hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: accounts[0]});
        
        const emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Dana", {from: accounts[1]});
        
        // now the player 2 will win, and the game will end
        await gamesInstance.confirmGame(gameIdx, 124, "initial salt", {from: accounts[0]});
        
        try {
            await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: accounts[0]});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    // DipDappDoe.markPosition

    it("should register a user's valid move, emit an event and change the turn", async function(){
        const createEventWatcher = gamesInstance.GameCreated();
        const markEventWatcher = gamesInstance.PositionMarked();
        const player1 = accounts[0];
        const player2 = accounts[1];
        
        let hash = await libStringInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        let emittedEvents = await createEventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});
        
        // ------ GAME 1 ------

        // 1 0 0
        // 0 0 0
        // 0 0 0
        await gamesInstance.markPosition(gameIdx, 0, {from: player1});
        
        let [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // 1 0 2
        // 0 0 0
        // 0 0 0
        await gamesInstance.markPosition(gameIdx, 2, {from: player2});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // 1 0 2
        // 1 0 0
        // 0 0 0
        await gamesInstance.markPosition(gameIdx, 3, {from: player1});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 1, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // 1 0 2
        // 1 0 2
        // 0 0 0
        await gamesInstance.markPosition(gameIdx, 5, {from: player2});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 1, 0, 2, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // 1 0 2
        // 1 0 2
        // 1 0 0
        await gamesInstance.markPosition(gameIdx, 6, {from: player1});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 1, 0, 2, 1, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 11, "The game should be won by player 1");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // ------------------------------

        hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        emittedEvents = await createEventWatcher.get();
        gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: player1});
        
        // ------ GAME 2 ------

        // 2 0 0
        // 0 0 0
        // 0 0 0
        await gamesInstance.markPosition(gameIdx, 0, {from: player2});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [2, 0, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // 2 0 1
        // 0 0 0
        // 0 0 0
        await gamesInstance.markPosition(gameIdx, 2, {from: player1});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [2, 0, 1, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // 2 0 1
        // 0 2 0
        // 0 0 0
        await gamesInstance.markPosition(gameIdx, 4, {from: player2});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [2, 0, 1, 0, 2, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // 2 0 1
        // 0 2 1
        // 0 0 0
        await gamesInstance.markPosition(gameIdx, 5, {from: player1});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [2, 0, 1, 0, 2, 1, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // 2 0 1
        // 0 2 1
        // 0 0 2
        await gamesInstance.markPosition(gameIdx, 8, {from: player2});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [2, 0, 1, 0, 2, 1, 0, 0, 2], "The board does not match");
        assert.equal(status.toNumber(), 12, "The game should be won by player 2");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // ------------------------------

        hash = await libStringInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        emittedEvents = await createEventWatcher.get();
        gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});

        // ------ GAME 3 ------

        // 0 1 0
        // 0 0 0
        // 0 0 0
        await gamesInstance.markPosition(gameIdx, 1, {from: player1});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 1, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // 0 1 2
        // 0 0 0
        // 0 0 0
        await gamesInstance.markPosition(gameIdx, 2, {from: player2});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 1, 2, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // 0 1 2
        // 0 1 0
        // 0 0 0
        await gamesInstance.markPosition(gameIdx, 4, {from: player1});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 1, 2, 0, 1, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // 0 1 2
        // 0 1 2
        // 0 0 0
        await gamesInstance.markPosition(gameIdx, 5, {from: player2});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 1, 2, 0, 1, 2, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
        
        // 0 1 2
        // 0 1 2
        // 0 1 0
        await gamesInstance.markPosition(gameIdx, 7, {from: player1});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 1, 2, 0, 1, 2, 0, 1, 0], "The board does not match");
        assert.equal(status.toNumber(), 11, "The game should be won by player 1");

        emittedEvents = await markEventWatcher.get();
        assert.equal(emittedEvents.length, 1, "There should be a new marked event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The marked game should match");
    });
    
    it("should reject marks beyond the board's range", async function(){
        var eventWatcher = gamesInstance.GameCreated();
        const player1 = accounts[0];
        const player2 = accounts[1];
        
        let hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        const emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: player1});
        
        try {
            await gamesInstance.markPosition(gameIdx, 9, {from: player2}); // invalid move
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        let [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        await gamesInstance.markPosition(gameIdx, 8, {from: player2}); // valid move

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 2], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        try {
            await gamesInstance.markPosition(gameIdx, 100, {from: player1}); // invalid move
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 2], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        try {
            await gamesInstance.markPosition(gameIdx, 500, {from: player1}); // invalid move
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 2], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");
    });
    
    it("should reject marks on non existing, not started or already ended games", async function(){
        const eventWatcher = gamesInstance.GameCreated();
        const player1 = accounts[0];
        const player2 = accounts[1];
        
        // Non existing
        try {
            await gamesInstance.markPosition(12345678, 9, {from: player1}); // invalid move
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        let [cells, status] = await gamesInstance.getGameInfo(12345678);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 0, "The game should not be started");

        // NOT ACCEPTED
        let hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: player1});
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        try {
            await gamesInstance.markPosition(gameIdx, 5, {from: player1}); // invalid move
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 0, "The game should not be started");

        // NOT CONFIRMED
        hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: player1});
        
        emittedEvents = await eventWatcher.get();
        gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Dana", {from: player2});

        try {
            await gamesInstance.markPosition(gameIdx, 5, {from: player1}); // invalid move
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 0, "The game should not be started");

        // ENDED
        hash = await libStringInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: player1});
        
        emittedEvents = await eventWatcher.get();
        gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Dana", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});
        
        await gamesInstance.markPosition(gameIdx, 0, {from: player1});
        await gamesInstance.markPosition(gameIdx, 1, {from: player2});
        await gamesInstance.markPosition(gameIdx, 3, {from: player1});
        await gamesInstance.markPosition(gameIdx, 4, {from: player2});
        await gamesInstance.markPosition(gameIdx, 6, {from: player1});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 2, 0, 1, 2, 0, 1, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 11, "The game should be won by player 1");

        try {
            await gamesInstance.markPosition(gameIdx, 7, {from: player2});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.markPosition(gameIdx, 8, {from: player2});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        
    });
    
    it("should reject marks from someone other than the expected player", async function(){
        const eventWatcher = gamesInstance.GameCreated();
        const player1 = accounts[0];
        const player2 = accounts[1];
        const randomUser = accounts[5];
        
        let hash = await libStringInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});
        
        // game is on player 1
        
        try {
            await gamesInstance.markPosition(gameIdx, 0, {from: player2});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.markPosition(gameIdx, 0, {from: randomUser});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        let [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        await gamesInstance.markPosition(gameIdx, 0, {from: player1}); // valid
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        // game is on player 2
        
        try {
            await gamesInstance.markPosition(gameIdx, 5, {from: player1});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.markPosition(gameIdx, 5, {from: randomUser});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        await gamesInstance.markPosition(gameIdx, 2, {from: player2});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        // game is on player 1
        
        try {
            await gamesInstance.markPosition(gameIdx, 0, {from: player2});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.markPosition(gameIdx, 0, {from: randomUser});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        await gamesInstance.markPosition(gameIdx, 3, {from: player1});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 1, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        // game is on player 2
        
        try {
            await gamesInstance.markPosition(gameIdx, 5, {from: player1});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.markPosition(gameIdx, 5, {from: randomUser});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 1, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        await gamesInstance.markPosition(gameIdx, 5, {from: player2});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 1, 0, 2, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        // game is on player 1
        
        try {
            await gamesInstance.markPosition(gameIdx, 0, {from: player2});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.markPosition(gameIdx, 0, {from: randomUser});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 1, 0, 2, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");
        
        await gamesInstance.markPosition(gameIdx, 6, {from: player1});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 1, 0, 2, 1, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 11, "The game should be won by player 1");

    });
    
    it("should reject marking already marked positions", async function(){
        const eventWatcher = gamesInstance.GameCreated();
        const player1 = accounts[0];
        const player2 = accounts[1];
        
        let hash = await libStringInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});
        
        let [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        // Test on:

        // 1 1 2
        // 2 1 1
        // 2 0 0

        await gamesInstance.markPosition(gameIdx, 0, {from: player1});
        await gamesInstance.markPosition(gameIdx, 2, {from: player2});
        await gamesInstance.markPosition(gameIdx, 1, {from: player1});
        await gamesInstance.markPosition(gameIdx, 3, {from: player2});
        await gamesInstance.markPosition(gameIdx, 4, {from: player1});
        await gamesInstance.markPosition(gameIdx, 6, {from: player2});
        await gamesInstance.markPosition(gameIdx, 5, {from: player1});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 1, 2, 2, 1, 1, 2, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        try {
            await gamesInstance.markPosition(gameIdx, 0, {from: player2});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 1, {from: player2});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 2, {from: player2});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 3, {from: player2});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 4, {from: player2});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 5, {from: player2});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 6, {from: player2});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 1, 2, 2, 1, 1, 2, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 2, "The game should be for player 2");

        // Now mark [7]

        // 1 1 2
        // 2 1 1
        // 2 2 0

        await gamesInstance.markPosition(gameIdx, 7, {from: player2});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 1, 2, 2, 1, 1, 2, 2, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        try {
            await gamesInstance.markPosition(gameIdx, 0, {from: player1});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 1, {from: player1});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 2, {from: player1});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 3, {from: player1});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 4, {from: player1});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 5, {from: player1});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 6, {from: player1});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }

        try {
            await gamesInstance.markPosition(gameIdx, 7, {from: player1});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) { assert.include(err.message, "revert", "The transaction should be reverted"); }
    });

    it("should detect that the game ends in draw", async function (){
        const eventWatcher = gamesInstance.GameCreated();
        const player1 = accounts[0];
        const player2 = accounts[1];
        
        let hash = await libStringInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});
        
        let [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        // 122
        // 211
        // 112

        await gamesInstance.markPosition(gameIdx, 0, {from: player1});
        await gamesInstance.markPosition(gameIdx, 2, {from: player2});
        await gamesInstance.markPosition(gameIdx, 4, {from: player1});
        await gamesInstance.markPosition(gameIdx, 8, {from: player2});
        await gamesInstance.markPosition(gameIdx, 5, {from: player1});
        await gamesInstance.markPosition(gameIdx, 3, {from: player2});
        await gamesInstance.markPosition(gameIdx, 7, {from: player1});
        await gamesInstance.markPosition(gameIdx, 1, {from: player2});
        await gamesInstance.markPosition(gameIdx, 6, {from: player1});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 2, 2, 2, 1, 1, 1, 1, 2], "The board does not match");
        assert.equal(status.toNumber(), 10, "The game should end in draw");

        // --------------------------

        hash = await libStringInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        emittedEvents = await eventWatcher.get();
        gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});
        
        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 0, 0, 0, 0, 0, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 1, "The game should be for player 1");

        // 112
        // 211
        // 122

        await gamesInstance.markPosition(gameIdx, 0, {from: player1});
        await gamesInstance.markPosition(gameIdx, 2, {from: player2});
        await gamesInstance.markPosition(gameIdx, 4, {from: player1});
        await gamesInstance.markPosition(gameIdx, 8, {from: player2});
        await gamesInstance.markPosition(gameIdx, 5, {from: player1});
        await gamesInstance.markPosition(gameIdx, 3, {from: player2});
        await gamesInstance.markPosition(gameIdx, 1, {from: player1});
        await gamesInstance.markPosition(gameIdx, 7, {from: player2});
        await gamesInstance.markPosition(gameIdx, 6, {from: player1});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 1, 2, 2, 1, 1, 1, 2, 2], "The board does not match");
        assert.equal(status.toNumber(), 10, "The game should end in draw");

    });
    
    it("should detect that a user wins the game", async function (){
        const eventWatcher = gamesInstance.GameCreated();
        const player1 = accounts[0];
        const player2 = accounts[1];
        
        let hash = await libStringInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});
        
        // 102
        // 120
        // 100

        await gamesInstance.markPosition(gameIdx, 0, {from: player1});
        await gamesInstance.markPosition(gameIdx, 2, {from: player2});
        await gamesInstance.markPosition(gameIdx, 3, {from: player1});
        await gamesInstance.markPosition(gameIdx, 4, {from: player2});
        await gamesInstance.markPosition(gameIdx, 6, {from: player1});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 1, 2, 0, 1, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 11, "The game should be won by player 1");

        // --------------------------

        hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        emittedEvents = await eventWatcher.get();
        gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: player1});
        
        // 222
        // 000
        // 110

        await gamesInstance.markPosition(gameIdx, 2, {from: player2});
        await gamesInstance.markPosition(gameIdx, 6, {from: player1});
        await gamesInstance.markPosition(gameIdx, 1, {from: player2});
        await gamesInstance.markPosition(gameIdx, 7, {from: player1});
        await gamesInstance.markPosition(gameIdx, 0, {from: player2});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [2, 2, 2, 0, 0, 0, 1, 1, 0], "The board does not match");
        assert.equal(status.toNumber(), 12, "The game should be won by player 2");

        // --------------------------

        hash = await libStringInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        emittedEvents = await eventWatcher.get();
        gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});
        
        // 201
        // 201
        // 001

        await gamesInstance.markPosition(gameIdx, 2, {from: player1});
        await gamesInstance.markPosition(gameIdx, 0, {from: player2});
        await gamesInstance.markPosition(gameIdx, 5, {from: player1});
        await gamesInstance.markPosition(gameIdx, 3, {from: player2});
        await gamesInstance.markPosition(gameIdx, 8, {from: player1});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [2, 0, 1, 2, 0, 1, 0, 0, 1], "The board does not match");
        assert.equal(status.toNumber(), 11, "The game should be won by player 1");

        // --------------------------

        hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        emittedEvents = await eventWatcher.get();
        gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: player1});
        
        // 110
        // 000
        // 222

        await gamesInstance.markPosition(gameIdx, 6, {from: player2});
        await gamesInstance.markPosition(gameIdx, 0, {from: player1});
        await gamesInstance.markPosition(gameIdx, 7, {from: player2});
        await gamesInstance.markPosition(gameIdx, 1, {from: player1});
        await gamesInstance.markPosition(gameIdx, 8, {from: player2});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 1, 0, 0, 0, 0, 2, 2, 2], "The board does not match");
        assert.equal(status.toNumber(), 12, "The game should be won by player 2");

        // --------------------------

        hash = await libStringInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        emittedEvents = await eventWatcher.get();
        gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});
        
        // 102
        // 012
        // 001

        await gamesInstance.markPosition(gameIdx, 0, {from: player1});
        await gamesInstance.markPosition(gameIdx, 2, {from: player2});
        await gamesInstance.markPosition(gameIdx, 4, {from: player1});
        await gamesInstance.markPosition(gameIdx, 5, {from: player2});
        await gamesInstance.markPosition(gameIdx, 8, {from: player1});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 0, 1, 2, 0, 0, 1], "The board does not match");
        assert.equal(status.toNumber(), 11, "The game should be won by player 1");

        // --------------------------

        hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        emittedEvents = await eventWatcher.get();
        gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: player1});
        
        // 102
        // 120
        // 200

        await gamesInstance.markPosition(gameIdx, 2, {from: player2});
        await gamesInstance.markPosition(gameIdx, 0, {from: player1});
        await gamesInstance.markPosition(gameIdx, 4, {from: player2});
        await gamesInstance.markPosition(gameIdx, 3, {from: player1});
        await gamesInstance.markPosition(gameIdx, 6, {from: player2});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [1, 0, 2, 1, 2, 0, 2, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 12, "The game should be won by player 2");

        // --------------------------

        hash = await libStringInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        emittedEvents = await eventWatcher.get();
        gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});
        
        // 220
        // 111
        // 000

        await gamesInstance.markPosition(gameIdx, 3, {from: player1});
        await gamesInstance.markPosition(gameIdx, 0, {from: player2});
        await gamesInstance.markPosition(gameIdx, 4, {from: player1});
        await gamesInstance.markPosition(gameIdx, 1, {from: player2});
        await gamesInstance.markPosition(gameIdx, 5, {from: player1});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [2, 2, 0, 1, 1, 1, 0, 0, 0], "The board does not match");
        assert.equal(status.toNumber(), 11, "The game should be won by player 1");

        // --------------------------

        hash = await libStringInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "James", {from: player1});
        
        emittedEvents = await eventWatcher.get();
        gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: player1});
        
        // 021
        // 021
        // 020

        await gamesInstance.markPosition(gameIdx, 1, {from: player2});
        await gamesInstance.markPosition(gameIdx, 2, {from: player1});
        await gamesInstance.markPosition(gameIdx, 4, {from: player2});
        await gamesInstance.markPosition(gameIdx, 5, {from: player1});
        await gamesInstance.markPosition(gameIdx, 7, {from: player2});

        [cells, status] = await gamesInstance.getGameInfo(gameIdx);
        cells = cells.map(n => n.toNumber());
        assert.deepEqual(cells, [0, 2, 1, 0, 2, 1, 0, 2, 0], "The board does not match");
        assert.equal(status.toNumber(), 12, "The game should be won by player 2");

    });

    // DipDappDoe.withdraw

    it("should reject withdrawals from a non existing game");
    it("should reject withdrawals from an unstarted game");
    it("should reject withdrawals from an extraneous user");
    it("should reject withdrawals from an active game and recent transactions");
    it("should reject withdrawals from a game with no money");
    it("should reject withdrawals from the game loser");
    
    it("should accept the withdrawal from both users in case of draw");
    it("should accept the withdrawal from the game winner");
    
    it("should accept only one legitimate withdrawal and reject the rest");
    it("should allow to withdraw and end the game if the opponent didn't play after a while");

});
