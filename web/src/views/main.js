import React, { Component } from "react"
import { connect } from "react-redux"
import { Row, Col, Divider, Button, Input, InputNumber, message } from "antd"
import Media from "react-media"
import getDipDappDoeInstance from "../contracts/dip-dapp-doe"
import { getWebSocketWeb3 } from "../contracts/web3";

class MainView extends Component {
    constructor(props) {
        super(props)

        this.state = {
            showCreateGame: false,
            creationLoading: false
        }
    }

    handleValue(ev) {
        if (!ev.target || !ev.target.name) return
        this.setState({ [ev.target.name]: ev.target.value })
    }

    startGame() {
        if (!this.state.nick) return message.error("Please, choose a nick")
        else if (this.state.nick.length < 2) return message.error("Please, choose a longer nick")
        else if (typeof this.state.number == "undefined") return message.error("Please, choose a random number")
        else if (!this.state.salt) return message.error("Please, type a random string")

        const DipDappDoe = getDipDappDoeInstance(window.web3)

        return DipDappDoe.methods.saltedHash(this.state.number, this.state.salt).call()
            .then(hash => {
                let web3 = getWebSocketWeb3()
                let value = 0
                if (this.state.value) {
                    value = web3.utils.toWei(String(this.state.value), "ether")
                }

                this.setState({ creationLoading: true })
                return DipDappDoe.methods.createGame(hash, this.state.nick).send({ value, from: this.props.accounts[0] })
            }).then(tx => {
                this.setState({ creationLoading: false })
                if (!tx.events.GameCreated || !tx.events.GameCreated.returnValues) {
                    throw new Error("The transaction failed")
                }

                this.props.dispatch({
                    type: "ADD_CREATED_GAME",
                    id: tx.events.GameCreated.returnValues.gameIdx,
                    number: this.state.number,
                    salt: this.state.salt
                })

                this.props.history.push(`/games/${tx.events.GameCreated.returnValues.gameIdx}`)
                message.info("Your game has been created. Waiting for another user to accept it.")
            }).catch(err => {
                this.setState({ creationLoading: false })

                let msg = err.message.replace(/\.$/, "").replace(/Returned error: Error: MetaMask Tx Signature: /, "")
                message.error(msg)
            })
    }

    acceptGame() {
        // Work in progress
    }

    renderOpenGameRow(game, idx) {
        let web3 = getWebSocketWeb3()
        return <Row key={idx} type="flex" justify="space-around" align="middle" className="open-game-row">
            <Col xs={2} sm={3}>
                <img src={idx % 2 ? require("../media/cross.png") : require("../media/circle.png")} />
            </Col>
            <Col xs={12} sm={15} style={{ marginTop: 0, fontSize: 16 }}>
                {game.nick1} {game.amount && game.amount != "0" ? <small>({web3.utils.fromWei(game.amount)} Ξ)</small> : null}
            </Col>
            <Col xs={9} sm={6}>
                <Button type="primary" className="width-100">Accept</Button>
            </Col>
        </Row>
    }

    renderGameList() {
        return <div className="card">
            <h1 className="light">Dip Dapp Doe</h1>
            <p className="light">Dip Dapp Doe is an Ethereum distributed app. Select a game to join or create a new one.</p>

            <Divider />

            <div>
                {this.props.openGames.map((game, idx) => this.renderOpenGameRow(game, idx))}
            </div>

            <Media query="(max-width: 767px)" render={() => [
                <Divider />,
                <Button type="primary" className="width-100"
                    onClick={() => this.setState({ showCreateGame: !this.state.showCreateGame })}>Start a new  game</Button>
            ]} />
        </div>
    }

    renderNewGame() {
        return <div className="card">
            <h1 className="light">New Game</h1>
            <p className="light">Enter your nick name, type a random number and some text.</p>

            <Divider />

            <Row gutter={16}>
                <Col>
                    <Input className="margin-bottom" placeholder="Nick name" name="nick" onChange={ev => this.handleValue(ev)} />
                </Col>
                <Col span={12}>
                    <InputNumber className="width-100" placeholder="Random number" name="number" onChange={value => this.setState({ number: (value % 256) })} />
                </Col>
                <Col span={12}>
                    <Input placeholder="Type some text" name="salt" onChange={ev => this.handleValue(ev)} />
                </Col>
                <Col>
                    <p className="light"><small>This will be used to randomly decide who starts the game</small></p>
                </Col>
                <Col>
                    <br />
                    <p className="light">Do you want to bet some ether?</p>
                </Col>
                <Col>
                    <InputNumber className="margin-bottom width-100" placeholder="0.00 (optional)" name="value" onChange={value => this.setState({ value })} />
                </Col>
                <Col>
                    <Media query="(max-width: 767px)" render={() => [
                        <Button type="primary" className="margin-bottom width-100"
                            onClick={() => this.setState({ showCreateGame: !this.state.showCreateGame })}>Cancel</Button>
                    ]} />

                    {
                        this.state.creationLoading ?
                            <span>Please, wait...</span> :
                            <Button type="primary" className="width-100" onClick={() => this.startGame()}>Start new game</Button>
                    }
                </Col>
            </Row>
        </div>
    }

    renderMobile() {
        return <Row>
            <Col md={24}>
                {
                    this.state.showCreateGame ? this.renderNewGame() : this.renderGameList()
                }
            </Col>
        </Row>
    }

    renderDesktop() {
        return <Row gutter={48}>
            <Col md={12}>
                {this.renderGameList()}
            </Col>
            <Col md={12}>
                {this.renderNewGame()}
            </Col>
        </Row>
    }

    render() {
        return <div id="main">
            <Media query="(max-width: 767px)">
                {
                    matches => matches ? this.renderMobile() : this.renderDesktop()
                }
            </Media>
        </div>
    }
}

export default connect(({ accounts, openGames }) => ({ accounts, openGames }))(MainView)
