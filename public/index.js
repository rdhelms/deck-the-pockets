'use strict';

(function() {
    // Initialize canvas context
    const canvas = document.getElementById('canvas')
    canvas.width = canvas.getBoundingClientRect().width
    canvas.height = canvas.getBoundingClientRect().height
    const ctx = canvas.getContext('2d')

    const socket = io()

    class Game {
        players = []
        decorations = []

        constructor (gameState) {
            this.players = gameState.players

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
        }

        updateState (gameState) {
            this.players = gameState.players
            gameState.decorations.forEach(decoration => {
                const foundDecoration = this.decorations.find(d => d.id === decoration.id)
                foundDecoration.x = decoration.x
                foundDecoration.y = decoration.y
            })
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
                this.x + this.width / 2,        // x
                this.y + this.height / 2,       // y
                (this.width + this.height) / 4, // radius
                0,                              // startAngle
                2 * Math.PI                     // endAngle
            )
            ctx.fillStyle = 'white'
            ctx.lineWidth = 0.5
            ctx.fill()
            ctx.stroke()
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height)
        }
    }

    let game
    socket.on('game', gameState => {
        if (!game) {
            game = new Game(gameState)
        } else {
            game.updateState(gameState)
        }
        console.log(game)
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
                decoration.x = mouse.x - (decoration.width / 2)
                decoration.y = mouse.y - (decoration.height / 2)
                socket.emit('decoration', {
                    id: decoration.id,
                    x: decoration.x,
                    y: decoration.y,
                })
            }
        })
    }

    const draw = () => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw decorations
        if (game) {
            game.decorations.forEach(d => d.draw())
        }

        window.requestAnimationFrame(draw)
    }
    window.requestAnimationFrame(draw)

    // Handle buttons
    const resetButton = document.getElementById('reset-btn')
    resetButton.onclick = () => {
        // TODO: Tell server to reset the game
    }

    const playButton = document.getElementById('play-btn')
    playButton.onclick = () => {
        // TODO: Tell server to start the hunt
    }
})()