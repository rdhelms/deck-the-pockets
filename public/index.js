(function() {
    class Ornament {
        ctx
        image
        x
        y
        width
        height
        moving = false

        constructor (props) {
            this.ctx = props.ctx

            const image = new Image()
            image.src = props.imageUrl
            this.image = image

            this.x = props.x || 0
            this.y = props.y || 0

            this.width = props.width || 25
            this.height = props.height || 25
        }

        draw () {
            this.ctx.beginPath()
            this.ctx.arc(
                this.x + this.width / 2,        // x
                this.y + this.height / 2,       // y
                (this.width + this.height) / 4, // radius
                0,                              // startAngle
                2 * Math.PI                     // endAngle
            )
            this.ctx.fillStyle = 'white'
            this.ctx.lineWidth = 0.5
            this.ctx.fill()
            this.ctx.stroke()
            this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height)
        }
    }

    // Initialize canvas context
    const canvas = document.getElementById('canvas')
    canvas.width = canvas.getBoundingClientRect().width
    canvas.height = canvas.getBoundingClientRect().height
    const ctx = canvas.getContext('2d')

    // Initialize decoration images array
    let decorations = []

    // Follow the mouse
    const mouse = {
        x: undefined,
        y: undefined,
    }
    canvas.onmousedown = (event) => {
        // Grab first possible decoration
        const grabbedDecoration = decorations.find(decoration => {
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
        decorations.forEach(decoration => decoration.moving = false)
    }
    canvas.onmousemove = (event) => {
        const rect = event.target.getBoundingClientRect()
        mouse.x = event.clientX - rect.left + 1
        mouse.y = event.clientY - rect.top + 1

        // Update any moving decorations
        decorations.forEach(decoration => {
            if (decoration.moving) {
                decoration.x = mouse.x - (decoration.width / 2)
                decoration.y = mouse.y - (decoration.height / 2)
            }
        })
    }

    let countdown
    const startGame = () => {
        countdown = 30
        const timer = setInterval(() => {
            if (countdown === 0) {
                clearTimeout(timer)
                countdown = undefined
                return
            }

            countdown--
        }, 1000)
    }

    const draw = () => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw decorations
        decorations.forEach(d => d.draw())

        // If game is playing, show timer
        if (countdown !== undefined) {
            ctx.fillStyle = 'black'
            ctx.font = '30px Arial'
            ctx.fillText(countdown, canvas.width - 100, 50)
        }

        window.requestAnimationFrame(draw)
    }

    const initDecorations = () => {
        decorations = []
        for (let i = 0; i < 5; i++) {
            const imageUrls = [
                'logo.png',
                '1kS20KPPkH-color.svg',
                '4dTgUX97Dk-color.svg',
                '9970muCFGV-color.svg',
                'gAlCkoUVLl-color.svg',
                'GVCNrq4ixh-color.svg',
                'k9T5L3kC0U-color.svg',
                'mO5EIsoZ9H-color.svg',
                'PusoOu7qGQ-color.svg',
                'tVMt7KCrkQ-color.svg',
                'uKLwvbsbPV-color.svg',
            ]
            imageUrls.forEach((imageUrl, index) => {
                const logo = new Ornament({
                    ctx,
                    imageUrl: `/images/${imageUrl}`,
                    x: 25,
                    y: 25 + (50 * index),
                })
                decorations.push(logo)
            })
        }
    }

    let animationRequest
    const init = () => {
        if (animationRequest) {
            window.cancelAnimationFrame(animationRequest)
        }
        initDecorations()
        animationRequest = window.requestAnimationFrame(draw)
    }

    // Handle buttons
    const resetButton = document.getElementById('reset-btn')
    resetButton.onclick = () => {
        init()
    }

    const playButton = document.getElementById('play-btn')
    playButton.onclick = () => {
        startGame()
    }

    init()
})()