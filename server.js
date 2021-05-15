
const env = require('dotenv')
const express = require('express')
const http = require('http')
const multer = require('multer')
const { RevAiApiClient, CaptionType, RevAiStreamingClient, AudioConfig } = require('revai-node-sdk');
const { Server } = require('socket.io')

const app = express();
const port = 3000;
const server = http.createServer(app);
const io = new Server(server);

env.config();
const access_token = process.env.access_token;
const webhook_url = process.env.webhook_url;

// setup multer to get file uploads
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
const asyncClient = new RevAiApiClient(access_token);
let streamingClient;

// This middleware has to be called before the routes
app.use(express.json());

/**
 *  Notes: There is currently a 10MB limit on the size of the audio file because 
 * of a limitiation in axios with the maxBodyLength and maxContentLength
 */
app.post('/media', upload.single('mediaFile'), async (req, res, next) => {
  console.log(`filename: ${req.file}`)
  console.log(`callback_url: ${webhook_url}`)
  try {
    const job = await asyncClient.submitJobLocalFile(req.file.path, {
      callback_url: webhook_url
    })
    res.json(job);
  } catch(err) {
    console.dir(`Error: ${err.message}`)
    res.status(500).json({error: err.message})
  }
})

app.post('/job', (req, res) => {
  console.dir(`webhook received: ${JSON.stringify(req.body)}`)
  const {id, status} = req.body.job
  io.emit(`job`, {id, status})
  res.sendStatus(200)
})

app.get('/transcription/:jobId/:format', async (req, res) => {
  try {
    const {jobId, format} = req.params
    console.dir({jobId, format})

    if(format.toLowerCase() === 'json') {
      const transcript = await asyncClient.getTranscriptObject(jobId)
      res.json(transcript)
      return
    }

    if(format.toLowerCase() === 'text') {
      const transcript = await asyncClient.getTranscriptText(jobId)
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
    const caption = await asyncClient.getCaptions(jobId, CaptionType.VTT)
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

app.post('/stream/start', (req, res) => {
  console.log('Opening the stream')
    streamingClient = new RevAiStreamingClient(
      access_token, new AudioConfig('audio/x-wav')
    )

    streamingClient.on('close', (code, reason) => {
      console.log(`Connection closed, ${code}: ${reason}`);
    })

    streamingClient.on('httpResponse', code => {
      console.log(`Streaming client received http response with code: ${code}`);
    })

    streamingClient.on('connectFailed', error => {
        console.log(`Connection failed with error: ${error}`);
    })

    streamingClient.on('connect', connectionMessage => {
        console.log(`Connected with job id: ${connectionMessage.id}`);
    })

    revStream = streamingClient.start()
    revStream.on('data', data => {
      io.emit('transcript', data)
    })
    
    res.sendStatus(200)
})

app.post('/stream/end', (req, res) => {
  console.log('Closing stream')
  revStream = null;
  streamingClient.end();
  streamingClient = null;
  res.sendStatus(200)
})

io.on('connection', (socket) => {
  console.log('a connection was made')
  socket.on('disconnect', () => {
    console.log('disconnection detected')
  })

  socket.on('message', (message) => {
    console.log(`Message recieved: ${message}`)
    io.emit('message', message)
  })

  socket.on('stream', data => {
    console.log('data received')
    revStream && revStream.write(data)
  })
})

app.use(express.static('public'))

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})