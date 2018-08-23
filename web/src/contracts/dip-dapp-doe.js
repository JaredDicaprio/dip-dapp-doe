import { getInjectedWeb3, getWebSocketWeb3 } from "./web3"
import dipDappDoeAbi from "./dip-dapp-doe.json"
const CONTRACT_ADDRESS = "0xfCF380b4D6Addd35c53d14DF17D4e75d8f58feE5"

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
