let streamingAudio;

const socket = io();

socket.on('message', (message) => {
    console.log(`Recieved message: ${message}`)
})

socket.on('job_completed', (message) => {
    fetch(`/transcript/${message.id}/text`)
    .then(res => res.text())
    .then(data => {
        const greeting = document.getElementById('greeting')
        greeting.innerHTML = data
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

const submitForm = event => {
    event.preventDefault();
    const formData = new FormData();
    const mediaFile = document.getElementsByName("media")[0].files[0]
    formData.append("media", mediaFile)

    fetch("/upload_file", {
        method: 'POST',
        body: formData
    })
    .then(res => res.json)
    .then(data  => console.log(data))
    .catch(err => console.log(err))

    console.log(`Form Submitted`);
}

const sendMessage = (type, message) => {
    socket.connected && socket.emit(type, message)
}

const form = document.getElementById("form");
form.addEventListener("submit", submitForm)

const captionBtn = document.getElementById("captionBtn")
captionBtn.addEventListener('click', event => {
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

document.getElementById('startBtn').addEventListener('click', event => {
    sendMessage('start_stream')
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
})


document.getElementById('stopBtn').addEventListener('click', event => {
    sendMessage('end_stream')
    streamingAudio.stopRecording();

    const videoPlayer = document.getElementById("vPlayer")
    //videoPlayer.stopRecording()
    videoPlayer.srcObject = null
    console.log("Recording ended")
})

