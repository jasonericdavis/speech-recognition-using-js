const express = require('express')
const { Server } = require('socket.io')
const http = require('http')
const multer = require('multer')
const env = require('dotenv')
const { RevAiApiClient, CaptionType, RevAiStreamingClient, AudioConfig } = require('revai-node-sdk');

const app = express();
const port = 3000;
const server = http.createServer(app);
const io = new Server(server);

env.config();
const access_token = process.env.access_token;
const callback_url = process.env.callback_url;

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
const revai = new RevAiApiClient(access_token);
let revaiStreamingClient;

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
  // if(wss && wss.clients) {
  //   wss.clients.forEach(client => {
  //     client.send(JSON.stringify({id, status, type: 'job_completed'}))
  //   })
  // }
  io.emit(`job_completed`, {id, status})
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

io.on('connection', (socket) => {
  console.log('a connection was made')
  socket.on('disconnect', () => {
    console.log('disconnection detected')
  })

  socket.on('message', (message) => {
    console.log(message)
    io.emit('message', "We received a message")
  })

  socket.on('start_stream', (message) => {
    console.log('Opening the stream')
    revaiStreamingClient = new RevAiStreamingClient(
      access_token, new AudioConfig('audio/x-wav')
    )

    revaiStreamingClient.on('close', (code, reason) => {
      console.log(`Connection closed, ${code}: ${reason}`);
    })

    revaiStreamingClient.on('httpResponse', code => {
      console.log(`Streaming client received http response with code: ${code}`);
    })

    revaiStreamingClient.on('connectFailed', error => {
        console.log(`Connection failed with error: ${error}`);
    })

    revaiStreamingClient.on('connect', connectionMessage => {
        console.log(`Connected with job id: ${connectionMessage.id}`);
    })

    revaiStreamingClient.on('data', data => {
      //console.log(`Recieved Data: ${data}`)
      socket.emit(data)
    })

    revStream = revaiStreamingClient.start()
    revStream.on('data', data => {
      socket.emit('transcript', data)
    })
  })


  socket.on('stream', data => {
    console.log('data received')
    if(revStream) {
      revStream.write(data)
    } else {
      console.log('revStream is null')
    }
  })

  socket.on('end_stream', (message) => {
    console.log('Closing stream')
    revStream = null;
    revaiStreamingClient.end();
    revaiStreamingClient = null;
  })
})

app.use(express.static('public'))

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})