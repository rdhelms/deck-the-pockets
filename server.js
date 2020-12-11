'use strict';
const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const port = process.env.PORT || 3000

app.use(express.static('public'))

class Ornament {
    id
    x
    y
    color
    type
    isOnTree = false
    owner

    constructor (props) {
        this.id = Math.floor(Math.random() * 1e9)
        this.x = props.x
        this.y = props.y
        this.color = props.color
        this.type = props.type
    }
}

class Game {
    id
    players = []
    decorations = []
    stage = 'decorating'
    styleBonuses
    huntInterval
    huntCountdown = 15
    huntTarget
    huntWinnerId
    winnerId

    constructor (props) {
        this.id = Math.floor(Math.random() * 1e9)

        if (props && props.players) {
            this.players = props.players
        }

        const decorationTypes = [
            'logo',
            'IT',
            'Nursing',
            'Nursing School',
            'EMS',
            'Finance',
            'Professional',
            'Automotive',
            'Fitness',
            'Medical',
            'Behavioral Health',
        ]
        const decorationColors = [ 'red', 'orange', 'yellow', 'green', 'blue', 'purple' ]
        decorationTypes.forEach((type, index) => {
            decorationColors.forEach(color => {
                const decoration = new Ornament({
                    type,
                    color,
                    x: 25,
                    y: 25 + (50 * index),
                })
                this.decorations.push(decoration)
            })
        })
    }

    startHuntCountdown () {
        this.stage = 'ready for hunt'
        io.emit('ready for hunt')
        this.huntCountdown = 15
        io.emit('hunt countdown', this.huntCountdown)
        this.huntInterval = setInterval(() => {
            this.huntCountdown--
            io.emit('hunt countdown', this.huntCountdown)
            if (this.huntCountdown === 0) {
                this.startHunt()
                clearInterval(this.huntInterval)
            }
        }, 1000)
    }

    startHunt () {
        const randomIndex = Math.floor(Math.random() * this.decorations.length)
        this.huntTarget = this.decorations[randomIndex]
        this.stage = 'hunting'
        io.emit('start hunt', this.huntTarget)
    }
}

let game = new Game()

io.on('connection', socket => {
    console.log(`${socket.id} connected`)
    const newPlayer = {
        id: socket.id,
        score: 0,
    }
    game.players.push(newPlayer)
    socket.emit('game', game)
    socket.broadcast.emit('player joined', newPlayer)

    socket.on('update player name', nameChange => {
        const foundPlayer = game.players.find(p => p.id === nameChange.id)
        if (foundPlayer) {
            foundPlayer.name = nameChange.name
            io.emit('new player name', nameChange)
        }
    })

    socket.on('decoration', decoration => {
        const foundDecoration = game.decorations.find(d => d.id === decoration.id)
        if (foundDecoration) {
            foundDecoration.x = decoration.x
            foundDecoration.y = decoration.y
            io.emit('decoration', decoration)
        }
    })

    socket.on('score', scoreUpdate => {
        const foundPlayer = game.players.find(player => player.id === scoreUpdate.playerId)
        if (foundPlayer) {
            if (scoreUpdate.event.type === 'onTree' || scoreUpdate.event.type === 'offTree') {
                const foundDecoration = game.decorations.find(d => d.id === scoreUpdate.event.decorationId)
                if (foundDecoration && scoreUpdate.event.type === 'onTree') {
                    foundDecoration.owner = foundPlayer.id
                    foundDecoration.isOnTree = true
                } else {
                    foundDecoration.isOnTree = false
                }
            }
            foundPlayer.score += scoreUpdate.scoreChange
            io.emit('score update', scoreUpdate)
            const isDecoratingDone = game.decorations.every(d => d.isOnTree)
            if (game.stage === 'decorating' && isDecoratingDone) {
                game.stage = 'style bonuses'
                io.emit('end decorating')
                game.styleBonuses = {}
                game.players.forEach(player => {
                    let styleBonus = 0
                    const ownDecorations = game.decorations.filter(d => d.owner === player.id)
                    const totalPos = ownDecorations.reduce((acc, d) => {
                        acc.x += d.x
                        acc.y += d.y
                        return acc
                    }, { x: 0, y: 0 })
                    const averagePos = {
                        x: totalPos.x / ownDecorations.length,
                        y: totalPos.y / ownDecorations.length,
                    }
                    ownDecorations.forEach(d => {
                        const xBonus = Math.abs(d.x - averagePos.x)
                        const yBonus = Math.abs(d.y - averagePos.y)
                        styleBonus += (xBonus + yBonus)
                    })
                    game.styleBonuses[player.id] = Math.floor(styleBonus / 20)
                })
                io.emit('style bonuses', game.styleBonuses)
                game.startHuntCountdown()
            } else if (game.stage === 'hunting' && scoreUpdate.event.type === 'target found') {
                game.huntWinnerId = foundPlayer.id.slice(0, 7)
                const winner = game.players.sort((a, b) => b.score - a.score)[0]
                game.winnerId = winner.id.slice(0, 7)
                game.stage = 'end'
                io.emit('game over', {
                    huntWinnerId: game.huntWinnerId,
                    winnerId: game.winnerId,
                })
            }
        }
    })

    socket.on('reset', () => {
        if (game.huntInterval) {
            clearInterval(game.huntInterval)
        }
        game = new Game({
            players: game.players.map(p => ({ id: p.id, score: 0, name: p.name }))
        })
        io.emit('game', game)
    })

    socket.on('disconnect', () => {
        console.log(`${socket.id} disconnected`)
        const playerIndex = game.players.findIndex(player => player.id === socket.id)
        if (playerIndex !== -1) {
            const removedPlayer = game.players.splice(playerIndex, 1)[0]
            io.emit('player left', removedPlayer)
        }
    })
})

http.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
