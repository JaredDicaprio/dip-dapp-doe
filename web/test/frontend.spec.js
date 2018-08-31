const { expect } = require("chai")
const puppeteer = require("puppeteer")
const dappeteer = require("dappeteer")
const fs = require('fs')
const path = require('path')
const Web3 = require("web3")
const HDWalletProvider = require("truffle-hdwallet-provider")

var browser, metamask, web3
var player2
var DipDappDoe
const DAPP_URL = "http://localhost:1234"
const DEFAULT_METAMASK_OPTIONS = { gasLimit: 6654755 }

describe("DipDappDoe frontend", async function () {
    // INIT

    before(async function () {
        this.timeout(1000 * 30)

        // Browser init
        browser = await dappeteer.launch(puppeteer)
        metamask = await dappeteer.getMetamask(browser)

        // import MetaMask account, same as ganache
        const mnemonic = fs.readFileSync(path.resolve(__dirname, "..", "dev", "mnemonic.txt")).toString()
        await metamask.importAccount(mnemonic)
        await metamask.switchNetwork('localhost 8545') // ganache

        // Local init
        const provider = new HDWalletProvider(mnemonic, "http://localhost:8545", 1)
        web3 = new Web3(provider)

        let accounts = await web3.eth.getAccounts()
        player2 = accounts[0]

        const testEnv = fs.readFileSync(path.resolve(__dirname, "..", ".env.test.local")).toString()
        const address = testEnv.match(/CONTRACT_ADDRESS=([^\n]+)/)[1]

        const dipDappDoeAbi = fs.readFileSync(path.resolve(__dirname, "..", "src", "contracts", "dip-dapp-doe.json")).toString()
        DipDappDoe = new web3.eth.Contract(JSON.parse(dipDappDoeAbi), address)
    })

    // CLEAN UP

    after(() => {
        if (browser) return browser.close()
    })

    // TEST CASES

    it("should create and play a game ending in draw", async function () {
        this.timeout(1000 * 50)

        // open localhost
        const page = await browser.newPage()
        await page.goto(DAPP_URL)

        // The game list should be empty
        await page.waitForSelector('#main #list')
        let handle = await page.$$('#list > *')
        expect(handle.length).to.equal(1)

        handle = await page.$('#list')
        expect(await handle.$eval('p', node => node.innerText)).to.equal("There are no open games at the moment. You can create one!")

        // CREATE A GAME

        await page.type('input[name="nick"]', "Jack")
        await page.type('input[name="number"]', "234")
        await page.type('input[name="salt"]', "My salt here")
        await page.type('input[name="value"]', "1")

        await page.click('#start')
        await delay(200)
        await metamask.confirmTransaction(DEFAULT_METAMASK_OPTIONS)

        // wait for tx
        await page.bringToFront()
        await page.waitFor(
            () => document.querySelector('#start') == null,
            { timeout: 30 * 1000 }
        )

        await page.waitForSelector('#game')
        await delay(500)

        // NOTIFICATION

        await page.waitForSelector('.ant-notification-notice-with-icon')
        handle = await page.$('.ant-notification-notice-with-icon')
        expect(await handle.$eval('.ant-notification-notice-description', node => node.innerText)).to.equal("Your game has been created. Waiting for another user to accept it.")

        // ACCEPT THE GAME (player 2)

        let hash = await page.evaluate(() => {
            return document.location.hash
        })
        expect(hash).to.match(/^#\/games\/[0-9]+$/)
        let gameIdx = hash.match(/#\/games\/([0-9]+)/)
        gameIdx = gameIdx[1]
        expect(gameIdx).to.equal("0")

        let tx = await DipDappDoe.methods.acceptGame(Number(gameIdx), 78, "James").send({ from: player2, value: web3.utils.toWei("1", "ether") })
        expect(tx.events.GameAccepted.returnValues.gameIdx).to.equal(gameIdx)

        // NOTIFICATION

        await delay(1500)

        await page.waitForSelector('.ant-notification-notice-with-icon')
        handle = await page.$$('.ant-notification-notice-with-icon')
        let value = await handle[1].$eval(".ant-notification-notice-description", node => node.innerText)
        expect(value).to.equal("James has accepted the game!")

        // SHOULD BE CONFIRMING THE GAME

        await delay(1500)

        await page.waitForSelector('#game .loading-spinner')
        value = await page.$eval("#game .loading-spinner", node => node.innerText)
        expect(value).to.equal("Waiting ")

        await delay(200)
        await metamask.confirmTransaction(DEFAULT_METAMASK_OPTIONS)

        // wait for tx
        await page.bringToFront()
        await delay(500)

        // SHOULD BE CONFIRMED

        await page.waitForSelector('.ant-notification-notice-description')
        value = await page.$eval(".ant-notification-notice-description", node => node.innerText)
        expect(value).to.equal("The game is on. Good luck!")

        await page.waitForSelector('#status')
        value = await page.$eval("#status", node => node.innerText)
        expect(value).to.equal("It's your turn")

        value = await page.$eval("#timer", node => node.innerText)
        expect(value).to.match(/Remaining time: [0-9]+ minutes before James can claim the game/)

        value = await page.$eval("#bet", node => node.innerText)
        expect(value).to.equal("Game bet: 1 Ξ")

        // CHECK STATUS

        expect(await page.$eval("#cell-0", node => node.className)).to.equal("cell")
        expect(await page.$eval("#cell-1", node => node.className)).to.equal("cell")
        expect(await page.$eval("#cell-2", node => node.className)).to.equal("cell")
        expect(await page.$eval("#cell-3", node => node.className)).to.equal("cell")
        expect(await page.$eval("#cell-4", node => node.className)).to.equal("cell")
        expect(await page.$eval("#cell-5", node => node.className)).to.equal("cell")
        expect(await page.$eval("#cell-6", node => node.className)).to.equal("cell")
        expect(await page.$eval("#cell-7", node => node.className)).to.equal("cell")
        expect(await page.$eval("#cell-8", node => node.className)).to.equal("cell")

        // MARK CELLS

        await markBrowserPosition(0, "James", page, metamask)
        await markPosition(gameIdx, 2, "James", page)
        await markBrowserPosition(4, "James", page, metamask)
        await markPosition(gameIdx, 8, "James", page)
        await markBrowserPosition(5, "James", page, metamask)
        await markPosition(gameIdx, 3, "James", page)
        await markBrowserPosition(6, "James", page, metamask)

        // THE OPPONENT MARKS HIS LAST POSITION

        tx = await DipDappDoe.methods.markPosition(Number(gameIdx), 1).send({ from: player2 })
        expect(tx.events.PositionMarked.returnValues.gameIdx).to.equal(gameIdx)
        await delay(200)

        await page.waitForSelector('#game .loading-spinner')
        value = await page.$eval("#game .loading-spinner", node => node.innerText)
        expect(value).to.equal("Waiting ")

        // CONFIRM THE AUTO ENDING MOVEMENT

        await metamask.confirmTransaction(DEFAULT_METAMASK_OPTIONS)
        await page.bringToFront()

        await page.waitForSelector('#status')
        value = await page.$eval("#status", node => node.innerText)
        expect(value).to.equal("The game ended in draw")
    })
})


// HELPERS

const delay = async interval => new Promise(resolve => setTimeout(resolve, interval))

async function markBrowserPosition(cell, opponent, page, metamask) {
    await page.click(`#cell-${cell}`)
    await delay(100)
    await metamask.confirmTransaction(DEFAULT_METAMASK_OPTIONS)
    await page.bringToFront()
    await page.waitFor(
        cell => document.querySelector(`#cell-${cell}.cell.cell-x`) != null,
        { timeout: 3 * 1000 },
        cell
    )
    await delay(100)

    await page.waitForSelector('#status')
    let value = await page.$eval("#status", node => node.innerText)
    expect(value).to.equal(`Waiting for ${opponent}`)

    value = await page.$eval("#timer", node => node.innerText)
    expect(value).to.match(/Remaining time: [0-9]+ minutes before You can claim the game/)

    value = await page.$eval("#bet", node => node.innerText)
    expect(value).to.match(/Game bet: [0-9\.]+ Ξ/)
}

async function markPosition(gameIdx, cell, oponnent, page) {
    let tx = await DipDappDoe.methods.markPosition(Number(gameIdx), cell).send({ from: player2 })
    expect(tx.events.PositionMarked.returnValues.gameIdx).to.equal(gameIdx)

    await delay(200)

    await page.waitForSelector('#status')
    let value = await page.$eval("#status", node => node.innerText)
    expect(value).to.equal("It's your turn")

    value = await page.$eval("#timer", node => node.innerText)
    expect(value).to.match(new RegExp(`Remaining time: [0-9]+ minutes before ${oponnent} can claim the game`))

    value = await page.$eval("#bet", node => node.innerText)
    expect(value).to.match(/Game bet: [0-9\.]+ Ξ/)

    await page.waitFor(
        cell => document.querySelector(`#cell-${cell}.cell.cell-o`) != null,
        { timeout: 3 * 1000 },
        cell
    )
    await delay(100)
}
