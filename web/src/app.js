import React, { Component } from "react"
import { Route, Switch, Redirect } from 'react-router-dom'
import { connect } from "react-redux"
import Web3 from "web3"

import getDipDappDoeInstance from "./contracts/dip-dapp-doe"

const MainView = () => <div>Main View</div>
const NewGameView = () => <div>New Game View</div>
const GameView = () => <div>Game View</div>

const LoadingView = () => <div>Loading View</div>
const MessageView = props => <div>{props.message || ""}</div>

class App extends Component {
    componentDidMount() {
        if (window.web3 && window.web3.currentProvider) {
            window.web3 = new Web3(window.web3.currentProvider)

            this.DipDappDoe = getDipDappDoeInstance(window.web3)

            web3.eth.net.getNetworkType().then(id => {
                this.props.dispatch({ type: "SET_NETWORK_ID", networkId: id })

                return web3.eth.getAccounts()
            }).then(accounts => {
                this.props.dispatch({ type: "SET", accounts })
                
                this.addListeners()
                this.props.dispatch({ type: "SET_CONNECTED" })
            })
        }
        else {
            this.props.dispatch({ type: "SET_UNSUPPORTED" })
        }
    }

    addListeners(){
        this.DipDappDoe.events.GameCreated().subscribe(this.onGameCreated)
        this.DipDappDoe.events.GameAccepted().subscribe(this.onGameAccepted)
        this.DipDappDoe.events.GameStarted().subscribe(this.onGameStarted)
        this.DipDappDoe.events.PositionMarked().subscribe(this.onPositionMarked)
        this.DipDappDoe.events.GameEnded().subscribe(this.onGameEnded)
    }

    onGameCreated(error, result){
        
    }
    onGameAccepted(error, result){
        
    }
    onGameStarted(error, result){
        
    }
    onPositionMarked(error, result){
        
    }
    onGameEnded(error, result){
        
    }

    render() {
        if (this.props.status.loading) return <LoadingView />
        else if (this.props.status.unsupported) return <MessageView message="Please, install Metamask for Chrome or Firefox" />
        else if (this.props.status.networkId != "ropsten") return <MessageView message="Please, switch to the Ropsten network" />
        else if (!this.props.status.connected) return <MessageView message="Your connection seems to be down" />
        else if (!this.props.accounts || !this.props.accounts.length) return <MessageView message="Please, unlock your wallet or create an account" />

        return <div>
            <Switch>
                <Route path="/" exact component={MainView} />
                <Route path="/new" exact component={NewGameView} />
                <Route path="/games/:id" exact component={GameView} />
                <Redirect to="/" />
            </Switch>
        </div>
    }
}

export default connect(({ accounts, status }) => ({ accounts, status }))(App)
