import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-database.js";
import { firebaseConfig } from '../../data/js/config.js';
import { getID } from "/Online/data/js/authState.js";

(() => {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getDatabase(app);
    userLocale.onData.load();
    let lang;

    let currentID = null;
    const container = document.querySelector('.container');

    const urlParam = new URLSearchParams(window.location.search);
    let urlResult = urlParam.get('gid') || 'none'; // Get URL Params

    const getURL = () => {
        if(urlResult == 'none') {      // If no params
            container.innerHTML = lang.something_wrong;  // Show error
        } else { 
            getUserID(urlResult);   // else get user id
        }
    }

    const getUserID = (id) => { 
        if(id == currentID) return window.location.href = window.location.origin + '/user/setting/';

        get(ref(db, 'users/' + id)).then((data) => { // Get user data
            try {                                       
                createElement.init(data.val(), data.key);  // Create element with data and key (id)
            } catch {
                container.innerHTML = lang.user_not_found;
            }
        })
    }

    const createElement = { // Create element with data and key (id) 
        header() {

            const element = document.createElement('h1');
            element.innerHTML = (`
                <button id="back-dashboard"><i class="fa-solid fa-arrow-left"></i></button>
                ${lang.user_detail}
            `);
            container.appendChild(element);

            const back = element.querySelector('#back-dashboard');
            back.onclick = () => window.location.href = window.location.origin + '/dashboard/';
        },
        main(s, id) {

            const element = document.createElement('div');
            element.classList.add('form');
            element.innerHTML = (`
                <div class="User-name">
                    <h2 data-user="username">Loading</h2>
                    <p data-user="gid">Loading</p>
                </div>
                <div class="User-picture" data-user="picture"></div>
            `);

            let uname = s.username || s.displayName;
            let upict = s.pictureURL || s.photoURL;

            const profileUsername = element.querySelector(`[data-user="username"]`);
            const profileGlobalID = element.querySelector(`[data-user="gid"]`);
            const profilePicture = element.querySelector(`[data-user="picture"]`);
            
            profileUsername.innerText = uname;
            profileGlobalID.innerText = `Global ID: ${id}`;
            profilePicture.style.backgroundImage = `url(${upict})`;


            const chatBtn = element.querySelector(`[data-key="${id}"]`);
            chatBtn.onclick = () => window.location.href = `${window.location.origin}/chat/?r=user&gid=${id}`;

        },
        init(s, id) {
            container.innerHTML = '';
            this.header();
            this.main(s, id);
        }
    }

    const langCheker = async() => { // Check language
        let getLang;
        await fetch('../data/js/language.json').then((data) => data.json()).then((res) => {
            getLang = res;
        });

        let currentLang;
        if(userLocale.state.last_lang == 'english') {
            currentLang = 'english'
        } else {
            currentLang = 'english';
        }
        
        lang = getLang[currentLang].User;
    }

    onAuthStateChanged(auth, (user) =>{ // Check if user is logged in
        if(user) {
            langCheker();
            getID(user).then((res) => {
                currentID = res
                getURL();
            });
        } else {
            window.location.href = window.location.origin + '/Online/loginOn.html';
        }
    })

})();