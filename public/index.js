const socket = new WebSocket(`ws://${location.host}/socket`)

socket.onopen = function(e) {
    console.log(`websocket connection has been established`)
}

socket.onmessage = function(e) {
    console.log(e.data)

    const message = JSON.parse(e.data)

    if(message.type && message.type.toLowerCase() === 'job_completed') {
        fetch(`/transcript/${message.id}/text`)
        .then(res => res.text())
        .then(data => {
            const greeting = document.getElementById('greeting')
            greeting.innerHTML = data
        })
        .catch(err => console.log(err))
    }
    
}

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


