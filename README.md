DipDappDoe
---

The following repository relates to the series of articles published on Hackernoon: [Dip Dapp Doe — Anatomy of an Ethereum distributed fair game](https://hackernoon.com/dip-dapp-doe-anatomy-of-an-ethereum-distributed-fair-game-part-1-5ee78980e360)

The project is divided into the `blockchain` files (smart contracts) and the `web` project (React, Redux and Parcel).

# Getting started

DipDappDoe makes use of `runner-cli` as the task runner:

    npm i -g runner-cli

The tasks are declared in `blockchain/taskfile` and `web/taskfile`, which are shell scripts on steroids.

To see the available commands, simply invoke:

    run

To invoke a command:

    run build

Or:

    ./taskfile build

## Blockchain

* Install the dependencies: `run init`
* Run the test suite (for TDD): `run test`
* Compile the contracts: `run build`
* Deploy the contract to the blockchain: `run deploy`

## Web

* Develop with live reload: `run dev`
    * Start a local blockchain (Ganache)
    * Deploy the contracts to the local blockchain
    * Open Chromium with MetaMask pointing to ganache
    * Bundle the web and serve it with live reload
* Develop with live reload: `run dev ropsten`
    * Start a dev server with live reload
    * The ropsten test network will be used
* Build for release: `run build`
    * Bundle the static web assets to `./build`
* Run the E2E test: `run test`
    * Start a local blockchain
    * Deploy the contracts to the local blockchain
    * Bundle the web
    * Start a local server
    * Open Chromium (puppeteer)
    * Run the tests locally

# Dependencies

To work with DipDappDoe you need:

	[sudo] npm i -g truffle parcel-bundler solc ganache-cli

* ParcelJS (HTML/JS/CSS bundler)
* Truffle (Solidity development tools)
* Solc (Solidity compiler)
* Ganache (local blockchain)

# Typical workflow

    [sudo] npm i -g runner-cli

## Development
Blockchain:

    cd blockchain
    run init
    # do your changes
    run test
    # repeat...

Frontend:

    cd web
    run init
    run test
    run dev  # or "run dev ropsten"
    # do your changes and live reload

## Deployment
Blockchain:

    cd blockchain
    run deploy  # implies "run build"

Frontend:

    cd web
    run build
    ls ./build  # your dist files are here

