import { getInjectedWeb3, getWebSocketWeb3 } from "./web3"
import dipDappDoeAbi from "./dip-dapp-doe.json"
const CONTRACT_ADDRESS = "0x860173E9332273DaC3cE27032C005c70E0551912"

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
