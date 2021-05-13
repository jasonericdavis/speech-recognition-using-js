const express = require('express')
const ws = require('ws')
const multer = require('multer')
const env = require('dotenv')
const { RevAiApiClient, CaptionType } = require('revai-node-sdk');

env.config();
const access_token = process.env.access_token;
const callback_url = process.env.callback_url;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `public/media/`)
  },

  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
})
const upload = multer({storage})

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
  console.log(`upload_file: ${req.file}`)
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
  console.dir(`webhook received: ${JSON.stringify(req.body)}`)

  // broadcast the message to all of the connected clients
  const {id, status} = req.body.job
  if(wss && wss.clients) {
    wss.clients.forEach(client => {
      client.send(JSON.stringify({id, status, type: 'job_completed'}))
    })
  }
  res.sendStatus(200)
})

app.get('/transcript/:jobId/:format', async (req, res) => {
  try {
    const {jobId, format} = req.params
    console.dir({jobId, format})

    if(format.toLowerCase() === 'json') {
      const transcript = await revai.getTranscriptObject(jobId)
      res.json(transcript)
      return
    }

    if(format.toLowerCase() === 'text') {
      const transcript = await revai.getTranscriptText(jobId)
      res.send(transcript)
      return
    }
    res.statusCode(500).send(`Invalid format ${format}`)
  } catch(err) {
    console.err(err.message)
    res.sendStatus(500)
  }
})

app.get('/caption/:jobId', async (req, res) => {
  try {
    const {jobId} = req.params
    console.dir(jobId)
    let output = '';
    const caption = await revai.getCaptions(jobId, CaptionType.VTT)
    .then(response => {
      const stream = response
      stream.on('data', chunk => {
        output += chunk
      })

      stream.on('end', () => {
        console.log(output);
        res.send(output)
      })
    })
  } catch(err) {
    console.error(err.message)
    res.sendStatus(500)
  }
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
    ws.send(JSON.stringify({type: 'message' , data: 'Hi there, I am a WebSocket server'}));
});