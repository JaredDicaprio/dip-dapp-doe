DipDappDoe
---

The following repository belongs to the article published on Medium

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
* Build for release: `run build`
* Run the E2E test: `run test`
    * Bundle the web
    * Start a local blockchain
    * Deploy the contracts to the local blockchain
    * Start a local server
    * Open Chromium (puppeteer)
    * Run the tests locally
