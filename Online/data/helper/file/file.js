class ChatroomFile extends HTMLElement {
    constructor() {
        super();

        const icon = document.createElement('div');
        icon.classList.add('icon');
        icon.innerHTML = (`<i class="fa-solid fa-file-arrow-down"></i>`);

        const name = document.createElement('div');
        name.classList.add('name');
        const name_length = parseInt(this.getAttribute('max')) || 20;
        const name_coverted = this.innerText.length > name_length ? `${this.innerText.substring(0, name_length)}}...${this.innerText.slice((Math.max(0, this.innerText.lastIndexOf(".")) || Infinity) - 5)}` : this.innerText;
        name.innerText = name_coverted;

        this.onclick = () => {
            if(this.getAttribute('src') == null) return;
            window.open(this.getAttribute('src'));
        };

        this.style.color = 'var(--bs2)';
        this.style.display = 'flex';
        this.style.border = '1px solid var(--bs2)';
        this.style.borderRadius = '3px';
        this.style.alignItems = 'center';
        this.style.padding = '3px 7px';
        this.style.cursor = 'pointer';
        icon.style.marginRight = '5px';
        name.style.fontSize = '12px';

        this.innerHTML = '';
        this.appendChild(icon);
        this.appendChild(name);
    }
}

(function() {
    customElements.define("chatroom-file", ChatroomFile);
}());