import React, { Component } from "react"
import { connect } from "react-redux"
import { Row, Col, Divider, Button, Spin, Icon, message, notification } from "antd"

import Media from "react-media"
import getDipDappDoeInstance from "../contracts/dip-dapp-doe"
import { getWebSocketWeb3, getInjectedWeb3 } from "../contracts/web3"
import LoadingView from "../views/loading"
import MessageView from "../views/message"

const CONTRACT_TIMEOUT = 1000 * 60 * 10 // 10 minutes by default

class GameView extends Component {
    constructor(props) {
        super(props)

        this.state = {
            loadingGameInfo: true,
            confirmLoading: false,
            markLoading: false,
            game: null
        }
    }

    componentDidMount() {
        this.setState({ loadingGameInfo: true })

        this.fetchGameStatus().then(game => {
            this.setState({ game, loadingGameInfo: false })

            // Check if we need to confirm the game
            return this.checkConfirmGame(game)
        }).then(() => {
            return this.checkLastPositionLeft(this.state.game)
        }).catch(err => {
            this.setState({ loadingGameInfo: false })
        })

        const DipDappDoe = getDipDappDoeInstance()

        this.acceptedEvent = DipDappDoe.events.GameAccepted({
            filter: { opponent: this.props.accounts && this.props.accounts[0] },
            fromBlock: this.props.status.startingBlock || 0
        })
            .on('data', event => this.onGameAccepted(event))
            .on('error', err => message.error(err && err.message || err))

        this.startedEvent = DipDappDoe.events.GameStarted({
            filter: { opponent: this.props.accounts && this.props.accounts[0] },
            fromBlock: this.props.status.startingBlock || 0
        })
            .on('data', event => this.onGameStarted(event))
            .on('error', err => message.error(err && err.message || err))

        this.positionMarkedEvent = DipDappDoe.events.PositionMarked({
            filter: { opponent: this.props.accounts && this.props.accounts[0] },
            fromBlock: this.props.status.startingBlock || 0
        })
            .on('data', event => this.onPositionMarked(event))
            .on('error', err => message.error(err && err.message || err))

        this.endedEvent = DipDappDoe.events.GameEnded({
            filter: { opponent: this.props.accounts && this.props.accounts[0] },
            fromBlock: this.props.status.startingBlock || 0
        })
            .on('data', event => this.onGameEnded(event))
            .on('error', err => message.error(err && err.message || err))
    }

    componentWillUnmount() {
        this.acceptedEvent.unsubscribe()
        this.startedEvent.unsubscribe()
        this.positionMarkedEvent.unsubscribe()
        this.endedEvent.unsubscribe()
    }

    // Events originated by the opponent

    onGameAccepted() {
        return this.fetchGameStatus().then(game => {
            this.setState({ game, loadingGameInfo: false })

            notification.success({
                message: 'Game accepted',
                description: `${game.nick2} has accepted the game!`
            })
            return this.checkConfirmGame(game)
        })
    }

    onGameStarted() {
        return this.fetchGameStatus().then(game => {
            this.setState({ game, loadingGameInfo: false })

            notification.success({
                message: 'Game confirmed',
                description: `${game.nick1} has confirmed the game!`
            })
        })
    }

    onPositionMarked() {
        return this.fetchGameStatus().then(game => {
            this.setState({ game, loadingGameInfo: false })

            message.info(`${game.nick1} has marked a cell`)

            return this.checkLastPositionLeft(game)
        })
    }

    onGameEnded() {
        return this.fetchGameStatus().then(game => {
            this.setState({ game, loadingGameInfo: false })

            let type = 'info', message = "Game ended", description = ""

            if (game.player1 == this.props.accounts[0]) {
                if (game.status == "10") {
                    description = "The game has ended in draw"
                    if (game.amount != "0") description += ". You can withdraw your initial bet."
                }
                else if (game.status == "11") {
                    type = "success"
                    description = "You have won the game!"
                    if (game.amount != "0") description += " You can withdraw the full amount."
                }
                else if (game.status == "12") {
                    type = "warning"
                    description = `${game.nick2} has won the game`
                }
                else return
            }
            else if (game.player2 == this.props.accounts[0]) {
                if (game.status == "10") {
                    description = "The game has ended in draw"
                    if (game.amount != "0") description += ". You can withdraw your initial bet."
                }
                else if (game.status == "11") {
                    type = "warning"
                    description = `${game.nick1} has won the game`
                }
                else if (game.status == "12") {
                    type = "success"
                    description = "You have won the game!"
                    if (game.amount != "0") description += " You can withdraw the full amount."
                }
                else if (game.status == "11") {
                    type = "warning"
                    description = `${game.nick1} has won the game`
                }
                else return
            }
            else {
                if (game.status == "10") {
                    description = "The game has ended in draw"
                }
                else if (game.status == "11") {
                    description = `${game.nick1} has won the game`
                }
                else if (game.status == "12") {
                    description = `${game.nick2} has won the game`
                }
                else return
            }

            notification[type]({
                message,
                description
            })
        })
    }

    // Call helper

    fetchGameStatus() {
        const DipDappDoe = getDipDappDoeInstance()

        const result = {}

        return DipDappDoe.methods.getGameInfo(this.props.match.params.id).call().then(gameInfo => {
            result.amount = gameInfo.amount
            result.cells = gameInfo.cells
            result.nick1 = gameInfo.nick1
            result.nick2 = gameInfo.nick2
            result.status = gameInfo.status

            return DipDappDoe.methods.getGamePlayers(this.props.match.params.id).call()
        }).then(players => {
            result.player1 = players.player1
            result.player2 = players.player2

            return DipDappDoe.methods.getGameTimestamp(this.props.match.params.id).call()
        }).then(timestamp => {
            result.lastTransaction = timestamp * 1000

            return result
        })
    }

    // Transactions

    checkConfirmGame(game) {
        if (game.status != "0" || game.player2.match(/^0x0+$/) || game.player1 != this.props.accounts[0]) {
            return
        }

        let DipDappDoe = getDipDappDoeInstance(true)

        let data = this.props.status.createdGames[this.props.match.params.id]
        if (!data) {
            return notification.error({
                message: 'Failed to confirm the game',
                description: 'The random number and the salt can\'t be found'
            })
        }

        this.setState({ confirmLoading: true })

        return DipDappDoe.methods.confirmGame(this.props.match.params.id, data.number, data.salt)
            .send({ from: this.props.accounts[0] })
            .then(tx => {
                this.setState({ confirmLoading: false })

                if (!tx.events.GameStarted || !tx.events.GameStarted.returnValues) {
                    throw new Error("The transaction failed")
                }

                notification.success({
                    message: 'Game confirmed',
                    description: 'The game is on. Good luck!',
                })
                this.props.dispatch({ type: "REMOVE_CREATED_GAME", id: game.id })

                return this.fetchGameStatus().then(game => {
                    this.setState({ game })
                })
            })
            .catch(err => {
                this.setState({ confirmLoading: false })

                let msg = err.message.replace(/\.$/, "").replace(/Returned error: Error: MetaMask Tx Signature: /, "")
                notification.error({
                    message: 'Unable to confirm the game',
                    description: msg
                })
            })
    }

    checkLastPositionLeft(game) {
        // Automatically mark a cell if only one position is left

        if ((game.status != "1" && game.status != "2") ||
            (game.status == "1" && game.player1 != this.props.accounts[0]) ||
            (game.status == "2" && game.player2 != this.props.accounts[0])) {
            return
        }
        let empty = game.cells.reduce((prev, cur) => {
            if (cur == "0") return prev + 1
            return prev
        }, 0)
        if (empty != 1) {
            return
        }

        let cell = game.cells.findIndex(c => c == "0")

        let DipDappDoe = getDipDappDoeInstance(true)

        this.setState({ markLoading: true })

        return DipDappDoe.methods.markPosition(this.props.match.params.id, cell)
            .send({ from: this.props.accounts[0] })
            .then(tx => {
                this.setState({ markLoading: false })

                if (!tx.events.PositionMarked || !tx.events.PositionMarked.returnValues) {
                    throw new Error("The transaction failed")
                }

                message.success("The position has been marked")

                return this.fetchGameStatus().then(game => {
                    this.setState({ game, loadingGameInfo: false })
                })
            })
            .catch(err => {
                this.setState({ markLoading: false })

                let msg = err.message.replace(/\.$/, "").replace(/Returned error: Error: MetaMask Tx Signature: /, "")
                notification.error({
                    message: 'Unable to mark the cell',
                    description: msg
                })
            })
    }

    markPosition(cell) {
        if ((this.state.game.status == "1" && this.state.game.player1 != this.props.accounts[0]) ||
            (this.state.game.status == "2" && this.state.game.player2 != this.props.accounts[0])) {
            return
        }
        else if (["0", "10", "11", "12"].includes(this.state.game.status)) {
            return
        }
        if (this.state.game.cells[cell] != 0) {
            return message.error("The cell is already taken")
        }

        let DipDappDoe = getDipDappDoeInstance(true)

        this.setState({ markLoading: true })

        return DipDappDoe.methods.markPosition(this.props.match.params.id, cell)
            .send({ from: this.props.accounts[0] })
            .then(tx => {
                this.setState({ markLoading: false })

                if (!tx.events.PositionMarked || !tx.events.PositionMarked.returnValues) {
                    throw new Error("The transaction failed")
                }

                message.success("The position has been marked")

                return this.fetchGameStatus().then(game => {
                    this.setState({ game, loadingGameInfo: false })

                    // only makes sense if you play against yourself
                    if (game.player1 == game.player2) {
                        return this.checkLastPositionLeft(game)
                    }
                })
            })
            .catch(err => {
                this.setState({ markLoading: false })

                let msg = err.message.replace(/\.$/, "").replace(/Returned error: Error: MetaMask Tx Signature: /, "")
                notification.error({
                    message: 'Unable to mark the cell',
                    description: msg
                })
            })
    }

    // Render helpers

    getStatus() {
        if (!this.state.game || !this.props.accounts) return ""
        else if (this.state.game.status == "0") {
            if (this.state.game.player2.match(/^0x0+$/)) {
                return "Waiting for an opponent to accept the game"
            }
            else {
                if (this.state.game.player1 == this.props.accounts[0]) {
                    return "You need to confirm the game..."
                }
                else {
                    return `Waiting for ${this.state.game.nick1} to confirm the game`
                }
            }
        }
        else if (this.state.game.status == "1") {
            if (this.state.game.player1 == this.props.accounts[0]) {
                return "It's your turn"
            }
            else {
                return `Waiting for ${this.state.game.nick1}`
            }
        }
        else if (this.state.game.status == "2") {
            if (this.state.game.player2 == this.props.accounts[0]) {
                return "It's your turn"
            }
            else {
                return `Waiting for ${this.state.game.nick2}`
            }
        }
        else if (this.state.game.status == "10") {
            return "The game ended in draw"
        }
        else if (this.state.game.status == "11") {
            if (this.state.game.player1 == this.props.accounts[0]) {
                return "Congratulations! You are the winner"
            }
            else {
                return `${this.state.game.nick2} is the winner of this game`
            }
        }
        else if (this.state.game.status == "12") {
            if (this.state.game.player2 == this.props.accounts[0]) {
                return "Congratulations! You are the winner"
            }
            else {
                return `${this.state.game.nick1} is the winner of this game`
            }
        }
    }

    getTimeStatus() {
        let diff = 0, action = "", subject = "", message = ""

        if (!this.state.game || !this.props.accounts) return "-"
        else if (this.state.game.status == "0") {
            if (this.state.game.player2.match(/^0x0+$/)) {
                diff = (this.state.game.lastTransaction + CONTRACT_TIMEOUT) - Date.now()
                subject = (this.state.game.player1 == this.props.accounts[0]) ? "You" : this.state.game.nick1
                action = "cancel the game"
            }
            else {
                diff = (this.state.game.lastTransaction + CONTRACT_TIMEOUT) - Date.now()
                subject = (this.state.game.player2 == this.props.accounts[0]) ? "You" : this.state.game.nick2
                action = "claim the game"
            }
        }
        else if (this.state.game.status == "1") {
            diff = (this.state.game.lastTransaction + CONTRACT_TIMEOUT) - Date.now()
            action = "claim the game"

            if (this.state.game.player2 == this.props.accounts[0]) {
                subject = "You"
            }
            else {
                subject = this.state.game.nick2
            }
        }
        else if (this.state.game.status == "2") {
            diff = (this.state.game.lastTransaction + CONTRACT_TIMEOUT) - Date.now()
            action = "claim the game"

            if (this.state.game.player1 == this.props.accounts[0]) {
                subject = "You"
            }
            else {
                subject = this.state.game.nick1
            }
        }
        else {
            return "" // { diff: 0, action: null, subject: null }
        }

        diff /= 1000 // in seconds

        if (diff >= 120) {
            return `Remaining time: ${Math.round(diff / 60)} minutes before ${subject} can ${action}`
        }
        else if (diff >= 60) {
            return `Remaining time: About one minute before ${subject} can ${action}`
        }
        else if (diff >= 0) {
            return `Remaining time: ${Math.round(diff)} seconds before ${subject} can ${action}`
        }
        else {
            return `Out of time: ${subject} could ${action}`
        }
    }

    getCellClass(idx) {
        if (!this.state.game || !this.state.game.cells) return "cell"
        switch (this.state.game.cells[idx]) {
            case "1": return "cell cell-x"
            case "2": return "cell cell-o"
            default: return "cell"
        }
    }

    renderMobile() {
        return <Row>
            <Col md={24}>
                <div className="card">
                    <h1 className="light">Current game</h1>
                    <p className="light">{this.state.status}</p>

                    <Divider />

                    <table id="board">
                        <tbody>
                            <tr>
                                <td><div className="cell" onClick={() => this.markPosition(0)} className={this.getCellClass(0)} /></td>
                                <td className="line" />
                                <td><div className="cell" onClick={() => this.markPosition(1)} className={this.getCellClass(1)} /></td>
                                <td className="line" />
                                <td><div className="cell" onClick={() => this.markPosition(2)} className={this.getCellClass(2)} /></td>
                            </tr>
                            <tr className="line">
                                <td colSpan={5} className="line" />
                            </tr>
                            <tr>
                                <td><div className="cell" onClick={() => this.markPosition(3)} className={this.getCellClass(3)} /></td>
                                <td className="line" />
                                <td><div className="cell" onClick={() => this.markPosition(4)} className={this.getCellClass(4)} /></td>
                                <td className="line" />
                                <td><div className="cell" onClick={() => this.markPosition(5)} className={this.getCellClass(5)} /></td>
                            </tr>
                            <tr className="line">
                                <td colSpan={5} className="line" />
                            </tr>
                            <tr>
                                <td><div className="cell" onClick={() => this.markPosition(6)} className={this.getCellClass(6)} /></td>
                                <td className="line" />
                                <td><div className="cell" onClick={() => this.markPosition(7)} className={this.getCellClass(7)} /></td>
                                <td className="line" />
                                <td><div className="cell" onClick={() => this.markPosition(8)} className={this.getCellClass(8)} /></td>
                            </tr>
                        </tbody>
                    </table>

                </div>
            </Col>
        </Row>
    }

    renderDesktop() {
        // this.state.gameId
        let web3 = getWebSocketWeb3()

        return <Row gutter={48}>
            <Col md={12}>
                <div className="card">
                    <h1 className="light">Current game</h1>

                    <Divider />

                    <table id="board">
                        <tbody>
                            <tr>
                                <td><div className="cell" onClick={() => this.markPosition(0)} className={this.getCellClass(0)} /></td>
                                <td className="line" />
                                <td><div className="cell" onClick={() => this.markPosition(1)} className={this.getCellClass(1)} /></td>
                                <td className="line" />
                                <td><div className="cell" onClick={() => this.markPosition(2)} className={this.getCellClass(2)} /></td>
                            </tr>
                            <tr className="line">
                                <td colSpan={5} className="line" />
                            </tr>
                            <tr>
                                <td><div className="cell" onClick={() => this.markPosition(3)} className={this.getCellClass(3)} /></td>
                                <td className="line" />
                                <td><div className="cell" onClick={() => this.markPosition(4)} className={this.getCellClass(4)} /></td>
                                <td className="line" />
                                <td><div className="cell" onClick={() => this.markPosition(5)} className={this.getCellClass(5)} /></td>
                            </tr>
                            <tr className="line">
                                <td colSpan={5} className="line" />
                            </tr>
                            <tr>
                                <td><div className="cell" onClick={() => this.markPosition(6)} className={this.getCellClass(6)} /></td>
                                <td className="line" />
                                <td><div className="cell" onClick={() => this.markPosition(7)} className={this.getCellClass(7)} /></td>
                                <td className="line" />
                                <td><div className="cell" onClick={() => this.markPosition(8)} className={this.getCellClass(8)} /></td>
                            </tr>
                        </tbody>
                    </table>

                    <Media query="(max-width: 767px)" render={() => [
                        <Divider />,
                        <Button type="primary" className="width-100"
                            onClick={() => this.setState({ showCreateGame: !this.state.showCreateGame })}>Start a new  game</Button>
                    ]} />
                </div>
            </Col>
            <Col md={12}>
                <div className="card">
                    <h1 className="light">Game status</h1>

                    <Divider />

                    {
                        (this.state.loadingGameInfo || this.state.confirmLoading || this.state.markLoading) ?
                            <div>Waiting  <Spin indicator={<Icon type="loading" style={{ fontSize: 14 }} spin />} /> </div> :
                            <div>
                                <p className="light">{this.getStatus()}</p>
                                <p className="light">{this.getTimeStatus()}</p>
                                {
                                    this.state.game ? <p className="light">Game bet: {web3.utils.fromWei(this.state.game.amount)} Ξ</p> : null
                                }

                                <Media query="(max-width: 767px)" render={() => [
                                    <Divider />,
                                    <Button type="primary" className="width-100"
                                        onClick={() => this.setState({ showCreateGame: !this.state.showCreateGame })}>Start a new  game</Button>
                                ]} />
                            </div>
                    }

                </div>
            </Col>
        </Row>
    }

    render() {
        if (this.state.loadingGameInfo) {
            return <LoadingView />
        }
        else if (!this.state.game || !this.state.game.player1 || this.state.game.player1.match(/^0x0+$/)) {
            return <MessageView message="It looks like the game does not exist" />
        }

        return <div id="game">
            <Media query="(max-width: 767px)">
                {
                    matches => matches ? this.renderMobile() : this.renderDesktop()
                }
            </Media>
        </div>
    }
}

export default connect(({ accounts, status }) => ({ accounts, status }))(GameView)
