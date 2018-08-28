import { getInjectedWeb3, getWebSocketWeb3 } from "./web3"
import dipDappDoeAbi from "./dip-dapp-doe.json"
const CONTRACT_ADDRESS = "0xf42F14d2cE796fec7Cd8a2D575dDCe402F2f3F8F"

export default function (useBrowserWeb3 = false) {
    let web3
    if (useBrowserWeb3) {
        web3 = getInjectedWeb3()
    }
    else {
        web3 = getWebSocketWeb3()
    }
    return new web3.eth.Contract(dipDappDoeAbi, CONTRACT_ADDRESS)
}
