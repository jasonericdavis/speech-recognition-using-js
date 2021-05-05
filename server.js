const express = require('express')
const ws = require('ws')


const app = express()
const port = 3000
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const server = app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

//add the WebSocket to the server
const wss = new ws.Server({ server });

wss.on('connection', (ws) => {
    //connection is up, let's add a simple simple event
    ws.on('message', (message) => {
        //log the received message and send it back to the client
        console.log('received: %s', message);
        ws.send(JSON.stringify(message));
    });

    //send immediately a feedback to the incoming connection    
    ws.send('Hi there, I am a WebSocket server');
});