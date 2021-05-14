var socket = io();
socket.emit('message', 'Hello Everyone')
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

const recordButton = document.getElementById('recordBtn')
recordButton.addEventListener('click', event => {
    navigator.mediaDevices.getUserMedia({audio: true, video: true})
    .then(stream => {

        const videoPlayer = document.getElementById("vPlayer")
        videoPlayer.srcObject = stream
        videoPlayer.play()

        const audioChunks = [];
        const context = new AudioContext();
        // const audioSourceNode = context.createMediaStreamSource(stream);
        // //const processor = context.createScriptProcessor(1024,1,1);
        // const processor = new AudioWorkletNode(context, 'microphone')

        // audioSourceNode.connect(processor);
        // processor.connect(context.destination);

        //const destination = context.createMediaStreamDestination()
        const mediaRecorder = new MediaRecorder(stream, {MimeType : 'audio/wav'})

        mediaRecorder.addEventListener("dataavailable", event => {
            console.log(event.data)
            audioChunks.push(event.data)
            socket.send(event.data)
        })

        mediaRecorder.addEventListener("stop", () => {
            const audioBlob = new Blob(audioChunks);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
        });

        mediaRecorder.start(1000);

        setTimeout(() => {
            mediaRecorder.stop();
            stream.getTracks().reduce( track => track.stop())
            video.srcObject = null;
        }, 10000)


    })
})


