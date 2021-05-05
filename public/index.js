window.onload = () => {

    const socket = new WebSocket(`ws://${location.host}/socket`)

    socket.onopen = function(e) {
        console.log(`websocket connection has been established`)
    }

    socket.onmessage = function(e) {
        console.log(e.data)
        const greeting = document.getElementById('greeting')
        greeting.innerHTML = e.data
    }
}
