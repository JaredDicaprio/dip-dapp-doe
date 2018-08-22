var DipDappDoe

export function init(dipDappDoeInstance) {
    DipDappDoe = dipDappDoeInstance
}

export function fetchOpenGames() {
    if (!DipDappDoe) throw new Error("The contract instance has not been set")

    return (dispatch, getState) => {
        DipDappDoe.methods.getOpenGames().call().then(games => {
            return Promise.all(games.map(game => {
                return DipDappDoe.methods.getGameInfo(game).call()
            })).then(games => {
                dispatch({ type: "SET", openGames: games })
            })
        })
    }
}
