let streamingAudio;

const socket = io();

socket.on('message', (message) => {
    console.log(`Recieved message: ${message}`)
})

socket.on('job', (message) => {
    fetch(`/transcription/${message.id}/text`)
    .then(res => res.text())
    .then(data => {
        const transcriptionEl = document.getElementById('transcription')
        transcriptionEl.innerHTML = data
    })
    .catch(err => console.log(err))
})

socket.on('transcript', data => {
    console.log(`transcript: ${JSON.stringify(data)}`)
    const messageEl = document.getElementById('message');
    const output = data.elements.reduce((acc, val) => {
        acc = `${acc} ${val.value}`
        return acc
    }, "")
    messageEl.innerHTML = `${output}`
})

const streamAudio = () => {
    navigator.mediaDevices.getUserMedia({audio: true, video: false})
    .then(stream => {

        const videoPlayer = document.getElementById("vPlayer")
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

document.getElementById("form").addEventListener("submit", uploadMedia)

document.getElementById("captionBtn")
.addEventListener('click', event => {
    fetch(`/caption?job_id=x7Y0izuCGWRR`)
    .then(res => res.text())
    .then(data => {
        const captionBlob = new Blob([data], {
            type:"text/vtt;charset=utf-8"
          });
          const caption = URL.createObjectURL(captionBlob);
          const captionEl = document.querySelector("#caption")
          captionEl.mode = "showing";
          captionEl.src = caption;

          captionEl.oncuechange = (event) => {
            console.dir(event.target.track.activeCues[0].text);
          };
    })
    .catch(err => console.log(err))
})

document.getElementById('startBtn').addEventListener('click', async (event) => {
    fetch('/stream/start', {method: 'post'})
    .then( response => {
        streamAudio()
    })
})

document.getElementById('stopBtn').addEventListener('click', async (event) => {
    await fetch('/stream/end', {method: 'post'})
    .then( response => {
        streamingAudio.stopRecording();

        const videoPlayer = document.getElementById("vPlayer")
        videoPlayer.srcObject = null
        console.log("Recording ended")
    })
})

