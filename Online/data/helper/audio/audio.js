class ChatroomAudio extends HTMLElement{
    constructor() {
        let isPlayed = false;
        let isPaused = false;
        super();
        const aud = new Audio();
        aud.src = this.getAttribute("src");

        const playDiv = document.createElement("div");
        playDiv.classList.add("play");

        const pauseDiv = document.createElement("div");
        pauseDiv.classList.add("pause");


        const durationDiv = document.createElement("div");
        durationDiv.classList.add("duration");

        const duRange = document.createElement("input");
        duRange.setAttribute("type", "range");
        duRange.setAttribute("max", "100");
        duRange.setAttribute("min", "0");
        duRange.setAttribute("step", "0");
        duRange.setAttribute("value", "0");

        const duText = document.createElement("div");
        duText.classList.add("time");
        duText.innerHTML = (`--:--/--:--`);

        durationDiv.appendChild(duRange);
        durationDiv.appendChild(duText);

        aud.ontimeupdate = () => {
            let one = Math.floor(aud.duration / 60);
            let two = Math.floor(aud.duration - one * 60);
            let three = Math.floor(aud.currentTime / 60);
            let four = Math.floor(aud.currentTime - three * 60);

            let customone = "00:00";
            let customtwo = "00:00";
            let customthree = "00:00";
            let customfour = "00:00";

            one < 10 ? customone = `0${one}` : customone = one;
            two < 10 ? customtwo = `0${two}` : customtwo = two;
            three < 10 ? customthree = `0${three}` : customthree = three;
            four < 10 ? customfour = `0${four}` : customfour = four;
            duText.innerHTML = `${customthree}:${customfour}/${customone}:${customtwo}`;

            let duration = Math.floor(aud.currentTime / aud.duration * 100);
            if(isPaused === false) {
                duRange.value = duration;
            }
        }
        
        duRange.onmousedown = () => {
            isPaused = true;
        }
        duRange.onmouseup = () => {
            let duration  = Math.floor(duRange.value * aud.duration / 100);
            aud.currentTime = duration;
            isPaused = false;
            if(isPlayed === true) aud.play();
        }

        aud.onended = () => {
            isPlayed = false;
            aud.currentTime = 0;
            playDiv.classList.remove("active");
        }

        playDiv.onclick = () => {
            if(isPlayed === false) {
                isPlayed = true;
                aud.play();
                playDiv.classList.add("active");
            } else {
                isPlayed = false;
                aud.pause();
                playDiv.classList.remove("active");
            }
        }

        pauseDiv.onclick = () => {
            isPlayed = false;
            aud.pause();
            aud.currentTime = 0;
            playDiv.setAttribute("class", "play");
        }



        this.appendChild(playDiv);
        this.appendChild(durationDiv);
        this.appendChild(pauseDiv);
    }
}

(function() {
    customElements.define("chatroom-audio", ChatroomAudio);
}());
