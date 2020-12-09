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

    constructor (props) {
        this.id = Math.floor(Math.random() * 1e9)
        this.x = props.x
        this.y = props.y
        this.color = props.color
        this.type = props.type
    }
}

class Game {
    players = []
    decorations = []

    constructor () {
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
}

let game = new Game()

io.on('connection', socket => {
    console.log(`${socket.id} connected`)
    game.players.push(socket.id)
    socket.emit('game', game)

    socket.on('decoration', decoration => {
        const foundDecoration = game.decorations.find(d => d.id === decoration.id)
        if (foundDecoration) {
            foundDecoration.x = decoration.x
            foundDecoration.y = decoration.y
            socket.broadcast.emit('game', game)
        }
    })

    socket.on('reset', () => {
        game = new Game()
        io.emit('game', game)
    })

    socket.on('disconnect', () => {
        console.log(`${socket.id} disconnected`)
        const playerIndex = game.players.indexOf(socket.id)
        game.players.splice(playerIndex, 1)
        io.emit('game', game)
    })
})

http.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
