let streamingAudio;

const socket = io();

socket.on('connect', () => {console.log(`sockedt connected (${socket.id})`)})

socket.on('disconnect', () => {console.log('socket disconnected')} )

socket.on('job', (message) => displayMedia(message))

socket.on('transcript', data => displayStreamingTranscription(data))

document.getElementById("form")
.addEventListener("submit", (event) => uploadMedia())

document.getElementById('startBtn')
.addEventListener('click', async (event) => beginStreaming())

document.getElementById('stopBtn')
.addEventListener('click', async (event) => endStreaming())

const beginStreaming = async () => {
    fetch('/stream/start', {method: 'post'})
    .then( response => {
        streamAudio()
    })
}

const endStreaming = async () => {
    await fetch('/stream/end', {method: 'post'})
    .then( response => {
        streamingAudio.stopRecording();

        const videoPlayer = document.getElementById("media_player")
        videoPlayer.srcObject = null
        console.log("Recording ended")
    })
}

const streamAudio = () => {
    navigator.mediaDevices.getUserMedia({audio: true, video: false})
    .then(stream => {

        const videoPlayer = document.getElementById("media_player")
        videoPlayer.srcObject = stream
        videoPlayer.play()

        streamingAudio = RecordRTC(stream, {
            type: 'audio',
            mimeType: 'audio/wav',
            timeSlice: 500,

            ondataavailable: (blob) => {
                socket.emit('stream', blob)
            }
        })

        streamingAudio.startRecording();
    })
}

const displayStreamingTranscription = (data) => {
    console.log(`transcript: ${JSON.stringify(data)}`)
    const transcriptionEl = document.getElementById('transcription');
    const output = data.elements.reduce((acc, val) => {
        acc = `${acc} ${val.value}`
        return acc
    }, "")
    transcriptionEl.innerHTML = `${output}`
}

const uploadMedia = event => {
    event.preventDefault();
    const formData = new FormData();
    const mediaFile = document.getElementsByName("mediaFile")[0].files[0]
    formData.append("mediaFile", mediaFile)

    fetch("/media", {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data  => {
        console.dir(data)
    })
    .catch(err => console.log(err))
    console.log(`Form Submitted`);
}

const displayMedia = message => {
    // get the radio button value. Default to transcription
    const output_type  = 
        Array.from(document.getElementsByName('output-type'))
        ?.filter(item => item.checked)[0]?.value || 'transcription'

    clearDisplays()
    
    if(output_type.toLowerCase() == 'caption') {
        displayCaption(message)
    } else {
        displayTranscription(message)
    }
    loadMedia(message.media_url)
}

const clearDisplays = () => {
    const transcriptionEl = document.getElementById('transcription')
    transcriptionEl.innerHTML = ""

    const captionEl = document.querySelector("#caption")
    captionEl.mode = "hidden";
    captionEl.src = null;
}

const displayCaption = ({id}) => {
    const url = `/caption/${id}`
    fetch(url)
    .then(res => res.text())
    .then(data => {

        const captionBlob = new Blob([data], {
            type:"text/vtt;charset=utf-8"
        });
        const caption = URL.createObjectURL(captionBlob);
        const captionEl = document.querySelector("#caption")
        captionEl.mode = "showing";
        captionEl.src = caption;
    })
    .catch(err => console.log(err))
}

const displayTranscription = ({id, media_url}) => {
    const url = `/transcription/${id}/text`
    fetch(url)
    .then(res => res.text())
    .then(data => {
        const transcriptionEl = document.getElementById('transcription')
        transcriptionEl.innerHTML = data

        const videoPlayer = document.getElementById("media_player")
        videoPlayer.src = media_url
        videoPlayer.play()
    })
    .catch(err => console.log(err))
}

const loadMedia = (url) => {
    const videoPlayer = document.getElementById("media_player")
        videoPlayer.src = url
        videoPlayer.play()
}