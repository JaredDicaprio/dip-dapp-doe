const { expect } = require("chai")
const puppeteer = require("puppeteer")
const dappeteer = require("dappeteer")
const fs = require('fs')
const path = require('path')

let browser, metamask
const DAPP_URL = "http://localhost:1234"
const DEFAULT_METAMASK_OPTIONS = { gasLimit: 6654755 }

describe("DipDappDoe frontend", async function () {
    // INIT

    before(async function () {
        this.timeout(1000 * 30)

        browser = await dappeteer.launch(puppeteer)
        metamask = await dappeteer.getMetamask(browser)

        // import MetaMask account, same as ganache
        const mnemonic = fs.readFileSync(path.resolve(__dirname, "..", "dev", "mnemonic.txt")).toString()
        await metamask.importAccount(mnemonic)

        // switch to localhost:8545
        await metamask.switchNetwork('localhost 8545') // ganache
    })

    // CLEAN UP
    
    after(() => {
        if (browser) return browser.close()
    })

    // TEST CASES
    
    it("should create a new game", async function () {
        this.timeout(1000 * 30)

        // open localhost
        const page = await browser.newPage()
        await page.goto(DAPP_URL)

        // The game list should be empty
        await page.waitForSelector('#main #list')
        let handle = await page.$$('#list > *')
        expect(handle.length).to.equal(1)

        handle = await page.$('#list');
        expect(await handle.$eval('p', node => node.innerText)).to.equal("There are no open games at the moment. You can create one!")

        await page.type('input[name="nick"]', "Jack")
        await page.type('input[name="number"]', "234")
        await page.type('input[name="salt"]', "My salt here")
        await page.type('input[name="value"]', "1")

        await page.click('#start')
        await delay(200)
        await metamask.confirmTransaction(DEFAULT_METAMASK_OPTIONS)

        
        // wait for tx to start
        await page.bringToFront()
        await page.waitForSelector('#game')
        await delay(2000)

        // // wait for tx to be mined
        // await page.waitFor(
        //     () => document.querySelector('.TxStatusText') == null,
        //     {
        //         timeout: 180000
        //     }
        // )

    })
})

const delay = async interval => new Promise(resolve => setTimeout(resolve, interval))
