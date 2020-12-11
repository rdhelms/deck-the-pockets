'use strict';

(function() {
    // Initialize canvas context
    const canvas = document.getElementById('canvas')
    canvas.width = canvas.getBoundingClientRect().width
    canvas.height = canvas.getBoundingClientRect().height
    const ctx = canvas.getContext('2d')

    const socket = io()

    // Tree
    const tree = {
        top: -50,
        bottom: 550,
        left: 420,
        right: 870,
    }
    tree.middle = (tree.right + tree.left) / 2
    tree.leftSlope = ((tree.bottom - tree.top) / (tree.middle - tree.left))
    tree.rightSlope = ((tree.bottom - tree.top) / (tree.right - tree.middle))
    const isDropOnTree = (drop) => {
        return drop.y >= tree.top
            && drop.y <= tree.bottom
            && ((
                drop.x <= tree.middle
                && drop.y >= tree.leftSlope * (tree.middle - drop.x) + tree.top
            ) || (
                drop.x > tree.middle
                && drop.y >= tree.rightSlope * (drop.x - tree.middle) + tree.top
            ))
    }

    // Game
    let game

    class Player {
        id
        score
        name

        get formattedScore () {
            const name = this.name || this.id.slice(0, 7)
            return `${name}: ${this.score}`
        }

        constructor (props) {
            this.id = props.id
            this.score = props.score
            this.name = props.name
        }
    }

    class Ornament {
        id
        image
        type
        color
        x
        y
        width
        height
        moving = false
        isOnTree = false
        owner

        constructor (props) {
            this.id = props.id

            const image = new Image()
            image.src = props.imageUrl
            this.image = image

            this.type = props.type
            this.color = props.color
            this.isOnTree = props.isOnTree

            this.x = props.x || 0
            this.y = props.y || 0

            this.width = props.width || 25
            this.height = props.height || 25
        }

        draw () {
            ctx.beginPath()
            ctx.arc(
                this.x + this.width / 2,            // x
                this.y + this.height / 2,           // y
                (this.width + this.height) / 4, // radius
                0,                                  // startAngle
                2 * Math.PI                         // endAngle
            )
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height)
            ctx.fillStyle = 'white'
            ctx.strokeStyle = this.color
            ctx.lineWidth = 4
            ctx.fill()
            ctx.stroke()
        }
    }

    class Game {
        id
        players = []
        decorations = []
        scoreboard
        stage
        styleBonuses
        huntCountdown = 15
        huntTarget
        huntWinnerId
        winnerId
        endImage

        constructor (gameState) {
            this.id = gameState.id
            this.stage = gameState.stage
            if (gameState.huntCountdown !== undefined) {
                this.huntCountdown = gameState.huntCountdown
            }
            if (gameState.huntTarget) {
                this.huntTarget = gameState.huntTarget
            }
            if (gameState.huntWinnerId) {
                this.huntWinnerId = gameState.huntWinnerId
            }
            if (gameState.winnerId) {
                this.winnerId = gameState.winnerId
            }
            if (gameState.styleBonuses) {
                this.applyStyleBonuses(gameState.styleBonuses)
            }

            const endImage = new Image()
            endImage.src = '/images/success-graphic.png'
            this.endImage = endImage

            const imageUrls = {
                'logo': 'logo.png',
                'IT': '1kS20KPPkH-color.svg',
                'Nursing': '4dTgUX97Dk-color.svg',
                'Nursing School': '9970muCFGV-color.svg',
                'EMS': 'gAlCkoUVLl-color.svg',
                'Finance': 'GVCNrq4ixh-color.svg',
                'Professional': 'k9T5L3kC0U-color.svg',
                'Automotive': 'mO5EIsoZ9H-color.svg',
                'Fitness': 'PusoOu7qGQ-color.svg',
                'Medical': 'tVMt7KCrkQ-color.svg',
                'Behavioral Health': 'uKLwvbsbPV-color.svg',
            }

            gameState.players.forEach(player => {
                const newPlayer = new Player({
                    id: player.id,
                    score: player.score,
                    name: player.name,
                })
                this.players.push(newPlayer)
            })

            gameState.decorations.forEach(decoration => {
                const ornament = new Ornament({
                    id: decoration.id,
                    imageUrl: `/images/${imageUrls[decoration.type]}`,
                    type: decoration.type,
                    color: decoration.color,
                    x: decoration.x,
                    y: decoration.y,
                    isOnTree: decoration.isOnTree,
                })
                this.decorations.push(ornament)
            })

            this.scoreboard = document.getElementById('scoreboard')
        }

        draw () {
            ctx.strokeStyle = 'black'
            ctx.lineWidth = 1
            ctx.strokeRect(0, 0, canvas.width, canvas.height)
            
            // Draw scoreboard
            this.players.forEach((player, index) => {
                ctx.strokeStyle = 'black'
                ctx.lineWidth = 1
                ctx.strokeRect(canvas.width - 200, index * 30, 200, 30)
                ctx.fillStyle = player.id === socket.id ? 'white' : 'black'
                ctx.font = '16px Arial'
                ctx.fillText(player.formattedScore, canvas.width - 200 + 10, index * 30 + 20)
                ctx.fillStyle = player.id === socket.id ? '#1671ff' : 'white'
                ctx.fillRect(canvas.width - 200, index * 30, 200, 30)
            })
            ctx.strokeStyle = 'black'
            ctx.lineWidth = 1
            ctx.strokeRect(canvas.width - 200, 0, 200, canvas.height)
            ctx.fillStyle = 'white'
            ctx.fillRect(canvas.width - 200, 0, 200, canvas.height)

            // Show style bonuses
            if ([ 'style bonuses', 'ready for hunt', 'hunting', 'end' ].includes(this.stage)) {
                ctx.fillStyle = 'black'
                ctx.font = '16px Arial'
                ctx.fillText('Decoration complete!', 20, 30)
                ctx.fillText('Style bonuses:', 20, 60)
                this.players.forEach((player, index) => {
                    ctx.strokeStyle = 'black'
                    ctx.lineWidth = 1
                    ctx.strokeRect(0, index * 30 + 80, 200, 30)
                    ctx.fillStyle = player.id === socket.id ? 'white' : 'black'
                    ctx.font = '16px Arial'
                    const playerName = player.name || player.id.slice(0, 7)
                    const playerBonus = this.styleBonuses && this.styleBonuses[player.id] || '0'
                    ctx.fillText(`${playerName}: ${playerBonus}`, 20, index * 30 + 20 + 80)
                    ctx.fillStyle = player.id === socket.id ? '#1671ff' : 'white'
                    ctx.fillRect(0, index * 30 + 80, 200, 30)
                })
                ctx.lineWidth = 1
                ctx.strokeRect(0, 0, 200, canvas.height)
                ctx.fillStyle = 'white'
                ctx.fillRect(0, 0, 200, canvas.height)
            }

            // Show hunt info
            if ([ 'ready for hunt', 'hunting', 'end' ].includes(this.stage)) {
                ctx.fillStyle = 'black'
                ctx.font = '16px Arial'
                if (this.stage === 'ready for hunt') {
                    ctx.fillText(`Hunt starting in: ${this.huntCountdown}`, 220, 30)
                } else if (this.stage === 'hunting') {
                    ctx.fillText('Hunt has started!', 220, 30)
                } else if (this.stage === 'end') {
                    const huntWinner = this.players.find(p => p.id.slice(0, 7) === this.huntWinnerId)
                    const huntWinnerName = (huntWinner && huntWinner.name) || this.huntWinnerId
                    ctx.fillText(`Hunt winner: ${huntWinnerName}`, 220, 30)
                }
                ctx.fillText('Target (50 pts):', 220, 60)
                ctx.beginPath()
                ctx.lineWidth = 1
                ctx.strokeStyle = 'black'
                ctx.arc(300, 125, 55, 0, 2 * Math.PI)
                ctx.stroke()
                ctx.beginPath()
                ctx.lineWidth = 10
                if (this.stage === 'ready for hunt') {
                    ctx.strokeStyle = 'black'
                    ctx.fillStyle = 'black'
                    ctx.font = '60px Arial'
                    ctx.fillText('?', 283, 145)
                } else if (this.huntTarget) {
                    const targetDecoration = this.decorations.find(d => d.id === this.huntTarget.id)
                    ctx.strokeStyle = targetDecoration.color
                    ctx.drawImage(targetDecoration.image, 250, 75, 100, 100)
                }
                ctx.arc(300, 125, 50, 0, 2 * Math.PI)
                ctx.stroke()
                ctx.strokeStyle = 'black'
                ctx.lineWidth = 1
                ctx.strokeRect(200, 0, 200, 200)
                ctx.fillStyle = 'white'
                ctx.fillRect(200, 0, 200, 200)
            }

            // Show end info
            if (this.stage === 'end') {
                ctx.fillStyle = 'black'
                ctx.font = '16px Arial'
                ctx.fillText('The winner is...', tree.left + 170, tree.top + 130)
                ctx.font = '40px Arial'
                const winningPlayer = this.players.find(p => p.id.slice(0, 7) === this.winnerId)
                const winningName = (winningPlayer && winningPlayer.name) || this.winnerId
                ctx.fillText(`${winningName}!`, tree.left + 150, tree.top + 180)
                ctx.drawImage(
                    this.endImage,
                    tree.left + 20,                 // top left x
                    tree.top + 250,                 // top left y
                    tree.right - tree.left - 50,    // width
                    tree.bottom - tree.top - 300    // height
                )
                ctx.strokeStyle = 'black'
                ctx.lineWidth = 1
                ctx.strokeRect(tree.left, tree.top, tree.right - tree.left, tree.bottom - tree.top)
                ctx.fillStyle = 'white'
                ctx.fillRect(tree.left, tree.top, tree.right - tree.left, tree.bottom - tree.top)
            }

            // Draw decorations
            this.decorations.forEach(d => d.draw())
        }

        updateState (gameState) {
            this.players.forEach(player => {
                if (!gameState.players.find(p => player.id === p.id)) {
                    this.removePlayer(player)
                }
            })
            gameState.players.forEach(player => {
                this.updatePlayer(player)
            })
            gameState.decorations.forEach(decoration => {
                this.updateDecoration(decoration)
            })
        }

        updateDecoration (decoration) {
            const foundDecoration = this.decorations.find(d => d.id === decoration.id)
            foundDecoration.x = decoration.x
            foundDecoration.y = decoration.y
        }

        updatePlayer (player) {
            const foundPlayer = this.players.find(p => p.id === player.id)
            if (foundPlayer) {
                foundPlayer.name = player.name
                foundPlayer.score = player.score
            } else {
                this.addPlayer(player)
            }
        }

        addPlayer (player) {
            const newPlayer = new Player({
                id: player.id,
                score: player.score,
                name: player.name,
            })
            this.players.push(newPlayer)
        }

        removePlayer (player) {
            const playerIndex = this.players.findIndex(p => player.id === p.id)
            this.players.splice(playerIndex, 1)
            const scoreEl = document.querySelector(`.score[data-playerid="${player.id}"]`)
            if (scoreEl) {
                scoreEl.remove()
            }
        }

        applyStyleBonuses (styleBonuses) {
            this.styleBonuses = styleBonuses

            this.players.forEach(player => {
                player.score += (styleBonuses[player.id] || 0)
            })
        }
    }

    // Follow the mouse
    const mouse = {
        x: undefined,
        y: undefined,
    }
    canvas.onmousedown = (event) => {
        if (![ 'decorating', 'hunting' ].includes(game.stage)) {
            return
        }

        // Grab first possible decoration
        const grabbedDecoration = game.decorations.find(decoration => {
            // Check whether grabbing a decoration
            return mouse.x >= decoration.x
                && mouse.x <= (decoration.x + decoration.width)
                && mouse.y >= decoration.y
                && mouse.y <= (decoration.y + decoration.height)
        })

        if (grabbedDecoration) {
            if (game.stage === 'hunting' && grabbedDecoration.id === game.huntTarget.id) {
                socket.emit('score', {
                    playerId: socket.id,
                    scoreChange: 50,
                    event: {
                        type: 'target found',
                    }
                })
            } else {
                grabbedDecoration.moving = true
            }
        }
    }

    canvas.onmouseup = (event) => {
        // Release all decorations
        game.decorations.forEach(decoration => {
            if (decoration.moving) {
                decoration.moving = false
                const dropped = {
                    x: (decoration.x + decoration.width / 2),
                    y: (decoration.y + decoration.height / 2)
                }

                if (isDropOnTree(dropped)) {
                    if (!decoration.isOnTree) {
                        socket.emit('score', {
                            playerId: socket.id,
                            scoreChange: 10,
                            event: {
                                type: 'onTree',
                                decorationId: decoration.id,
                            }
                        })
                    }
                } else {
                    if (decoration.isOnTree) {
                        socket.emit('score', {
                            playerId: socket.id,
                            scoreChange: -10,
                            event: {
                                type: 'offTree',
                                decorationId: decoration.id,
                            }
                        })
                    }
                }
            }
        })
    }
    canvas.onmousemove = (event) => {
        const rect = event.target.getBoundingClientRect()
        mouse.x = event.clientX - rect.left + 1
        mouse.y = event.clientY - rect.top + 1

        // Update any moving decorations
        game.decorations.forEach(decoration => {
            if (decoration.moving) {
                socket.emit('decoration', {
                    id: decoration.id,
                    x: mouse.x - (decoration.width / 2),
                    y: mouse.y - (decoration.height / 2),
                })
            }
        })
    }

    const draw = () => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        ctx.globalCompositeOperation = 'destination-over';

        // Draw decorations
        if (game) {
            game.draw()
        }

        // Draw tree boundary
        // ctx.beginPath()
        // ctx.moveTo(tree.middle, tree.top)
        // ctx.lineTo(tree.right, tree.bottom)
        // ctx.lineTo(tree.left, tree.bottom)
        // ctx.lineTo(tree.middle, tree.top)
        // ctx.stroke()

        window.requestAnimationFrame(draw)
    }
    window.requestAnimationFrame(draw)

    // Handle buttons
    const resetButton = document.getElementById('reset-btn')
    resetButton.onclick = () => {
        socket.emit('reset')
    }

    const nameSubmitBtn = document.getElementById('name-submit-btn')
    nameSubmitBtn.onclick = () => {
        const nameInput = document.getElementById('name')
        if (nameInput.value && !game.players.some(p => (p.name || p.id.slice(0, 7)) === nameInput.value)) {
            socket.emit('update player name', {
                id: socket.id,
                name: nameInput.value,
            })
            nameInput.value = ''
        }
    }

    // Socket events
    socket.on('game', gameState => {
        if (game && game.id === gameState.id) {
            game.updateState(gameState)
        } else {
            game = new Game(gameState)
        }
    })
    socket.on('decoration', decoration => {
        game.updateDecoration(decoration)
    })
    socket.on('new player name', nameChange => {
        const foundPlayer = game.players.find(p => p.id === nameChange.id)
        if (foundPlayer) {
            foundPlayer.name = nameChange.name
        }
    })
    socket.on('player joined', newPlayer => {
        game.addPlayer(newPlayer)
    })
    socket.on('player left', removedPlayer => {
        game.removePlayer(removedPlayer)
    })
    socket.on('score update', scoreUpdate => {
        const foundPlayer = game.players.find(player => player.id === scoreUpdate.playerId)
        if (foundPlayer) {
            game.updatePlayer({
                id: foundPlayer.id,
                score: foundPlayer.score + scoreUpdate.scoreChange,
                name: foundPlayer.name,
            })
        }
        if ([ 'onTree', 'offTree' ].includes(scoreUpdate.event.type)) {
            const foundDecoration = game.decorations.find(d => d.id === scoreUpdate.event.decorationId)
            if (foundDecoration) {
                if (scoreUpdate.event.type === 'onTree') {
                    foundDecoration.owner = scoreUpdate.playerId
                    foundDecoration.isOnTree = true
                } else {
                    foundDecoration.isOnTree = false
                }
            }
        }
    })
    socket.on('end decorating', () => {
        game.stage = 'style bonuses'
    })
    socket.on('style bonuses', styleBonuses => {
        game.applyStyleBonuses(styleBonuses)
    })
    socket.on('ready for hunt', () => {
        game.stage = 'ready for hunt'
    })
    socket.on('hunt countdown', countdown => {
        game.huntCountdown = countdown
    })
    socket.on('start hunt', huntTarget => {
        game.stage = 'hunting'
        game.huntTarget = huntTarget
    })
    socket.on('game over', endInfo => {
        game.huntWinnerId = endInfo.huntWinnerId
        game.winnerId = endInfo.winnerId
        game.stage = 'end'
    })
})()
