const assert = require("chai")
const puppeteer = require("puppeteer")
const dappeteer = require("dappeteer")
const fs = require('fs')
const path = require('path')

let browser, metamask

describe("DipDappDoe frontend", async function () {
    // INIT
    before(async function () {
        this.timeout(1000 * 60)

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
    it("should create games", async function () {
        this.timeout(1000 * 60)

        // open localhost
        const dipDappDoe = await browser.newPage()
        await dipDappDoe.goto("http://localhost:1234")

        await new Promise(resolve => setTimeout(resolve, 5000))

        // TODO: add specs below
    })
})
