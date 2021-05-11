const socket = new WebSocket(`ws://${location.host}/socket`)

socket.onopen = function(e) {
    console.log(`websocket connection has been established`)
}

socket.onmessage = function(e) {
    console.log(e.data)
    const greeting = document.getElementById('greeting')
    greeting.innerHTML = e.data
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
    .then((res) => console.log(res))
    .catch((err) => console.log(err))

    console.log(`Form Submitted`);
}

const form = document.getElementById("form");
form.addEventListener("submit", submitForm)


