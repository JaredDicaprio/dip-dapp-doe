const assert = require("chai")
const puppeteer = require("puppeteer")
const dappeteer = require("dappeteer")

let browser

describe("DipDappDoe frontend", async function () {
    after(() => {
        if (browser) return browser.close()
    })

    it("should create games", async function () {
        this.timeout(1000 * 60)

        browser = await dappeteer.launch(puppeteer)
        const metamask = await dappeteer.getMetamask(browser)

        // import MetaMask account
        await metamask.importAccount(
            'patrol gold chunk ship chalk tenant addict critic crop furnace laugh frozen'
        )

        // switch to localhost:8545
        await metamask.switchNetwork('localhost 8545') // ganache

        // open localhost
        const dipDappDoe = await browser.newPage()
        await dipDappDoe.goto("http://localhost:8080")

        await new Promise(resolve => setTimeout(resolve, 10000))

        // TODO: add specs below
    })
})
