const express = require('express')
const ws = require('ws')
const multer = require('multer')
const env = require('dotenv')
const { RevAiApiClient } = require('revai-node-sdk');

env.config();
const access_token = process.env.access_token;
const callback_url = process.env.callback_url;
const upload = multer({ dest: 'uploads/' })

// Setup the Rev.ai sdk
const revai = new RevAiApiClient(access_token);

const app = express()
const port = 3000

// This middleware has to be called before the routes
app.use(express.json());

/**
 *  Notes: There is currently a 10MB limit on the size of the audio file because 
 * of a limitiation in axios with the maxBodyLength and maxContentLength
 */
app.post('/upload_file', upload.single('media'), async (req, res, next) => {
  console.log(req.file)
  console.log(`callback_url: ${callback_url}`)
  try {
    const job = await revai.submitJobLocalFile(req.file.path, {
      callback_url
    })
    res.json(job);
  } catch(err) {
    console.dir(`Error: ${err.message}`)
    res.status(500).json({error: err.message})
  }
})

app.post('/job_completed', (req, res) => {
  console.log(`callback received: ${req.body}`)
  // broadcast the message to all of the connected clients
  // wss is a server that contains clients which are an array
  // of all of the websocket connections
  if(wss && wss.clients) {
    wss.clients.forEach(client => {
      client.send(JSON.stringify(req.body))
    })
  }
  res.sendStatus(200)
})


app.use(express.static('public'))

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