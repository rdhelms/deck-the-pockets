'use strict';

(function() {
    // Initialize canvas context
    const canvas = document.getElementById('canvas')
    canvas.width = canvas.getBoundingClientRect().width
    canvas.height = canvas.getBoundingClientRect().height
    const ctx = canvas.getContext('2d')

    const socket = io()

    class Player {
        id
        score

        get formattedScore () {
            return `${this.id.slice(0, 7)}: ${this.score}`
        }

        constructor (props) {
            this.id = props.id
            this.score = props.score
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

        constructor (props) {
            this.id = props.id

            const image = new Image()
            image.src = props.imageUrl
            this.image = image

            this.type = props.type
            this.color = props.color

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
                (this.width + this.height) / 4 + 1, // radius
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

        constructor (gameState) {
            this.id = gameState.id

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
                })
                this.decorations.push(ornament)
            })

            this.scoreboard = document.getElementById('scoreboard')
        }

        draw () {
            this.decorations.forEach(d => d.draw())
            
            // Draw scoreboard
            this.players.forEach(player => {
                const existingEl = document.querySelector(`.score[data-playerid="${player.id}"]`)
                if (existingEl) {
                    if (existingEl.textContent !== player.formattedScore) {
                        existingEl.textContent = player.formattedScore
                    }
                } else {
                    const scoreEl = document.createElement('div')
                    scoreEl.className = 'score'
                    scoreEl.dataset.playerid = player.id
                    scoreEl.textContent = player.formattedScore
                    if (player.id === socket.id) {
                        scoreEl.classList.add('self')
                    }
                    this.scoreboard.appendChild(scoreEl)
                }
            })
        }

        updateState (gameState) {
            this.players.filter(player => !gameState.players.find(p => player.id === p.id)).forEach(player => {
                this.removePlayer(player)
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
                foundPlayer.score = player.score
            } else {
                this.addPlayer(player)
            }
        }

        addPlayer (player) {
            const newPlayer = new Player({
                id: player.id,
                score: player.score,
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
    }

    let game
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

    // Follow the mouse
    const mouse = {
        x: undefined,
        y: undefined,
    }
    canvas.onmousedown = (event) => {
        // Grab first possible decoration
        const grabbedDecoration = game.decorations.find(decoration => {
            // Check whether grabbing a decoration
            return mouse.x >= decoration.x
                && mouse.x <= (decoration.x + decoration.width)
                && mouse.y >= decoration.y
                && mouse.y <= (decoration.y + decoration.height)
        })

        if (grabbedDecoration) {
            grabbedDecoration.moving = true
        }
    }
    canvas.onmouseup = (event) => {
        // Release all decorations
        game.decorations.forEach(decoration => decoration.moving = false)
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

        window.requestAnimationFrame(draw)
    }
    window.requestAnimationFrame(draw)

    // Handle buttons
    const resetButton = document.getElementById('reset-btn')
    resetButton.onclick = () => {
        socket.emit('reset')
    }
})()