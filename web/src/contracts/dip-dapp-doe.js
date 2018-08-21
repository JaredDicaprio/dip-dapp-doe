import dipDappDoeAbi from "./dip-dapp-doe.json"
const CONTRACT_ADDRESS = "0x860173E9332273DaC3cE27032C005c70E0551912"

export default function (web3) {
    return new web3.eth.Contract(dipDappDoeAbi, CONTRACT_ADDRESS)
}
