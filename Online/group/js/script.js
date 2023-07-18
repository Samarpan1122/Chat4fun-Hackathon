import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { getDatabase, ref, set, remove, get } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-database.js";
import { firebaseConfig } from '../../data/js/config.js';
import { getID } from "/Online/data/js/authState.js";
(() => {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getDatabase(app);
    userLocale.onData.load(app);

    let lang;

    let currentID = null;
    let joinned = false;

    const container = document.querySelector('.container');

    const urlParam = new URLSearchParams(window.location.search);
    let urlResult = urlParam.get('gid') || 'gagal';
    const getURL = () => {
        if(urlResult == 'gagal') {
            container.innerHTML = lang.something_wrong;
        } else {
            getGroupID(urlResult);
        }
    }

    const getGroupID = async (id) => {      // Get user data
        let data = null;
        await get(ref(db, 'guild')).then((g) => {
            g.forEach((list) => {
                if(list.key == id) data = list;
            });
        })

        if(data == null) return container.innerHTML = lang.group_not_found;
        await get(ref(db, `guild/${id}/member/${currentID}`)).then((g) => {     // Check if user is joinned
            if(g.exists()) {
                joinned = true;
            }
        });

        let isOwner = false;        // Check if user is owner
        await get(ref(db, `guild/${id}`)).then((g) => {
            if(g.val().owner == currentID) isOwner = true;
        });

        if(isOwner === true) return window.location.href = `${window.location.origin}/Online/group/setting/?gid=${id}`;

        createElement.init(data);
    }

    const createElement = {     
        header() {

            const element = document.createElement('h1');
            element.innerHTML = (`
                <button id="back-dashboard"><i class="fa-solid fa-arrow-left"></i></button>
                ${lang.group_detail}
            `);
            container.appendChild(element);

            const back = element.querySelector('#back-dashboard');
            back.onclick = () => window.location.href = window.location.origin + '/Online/dashboard/';
        },
        main(data) {
            const id = urlResult;
            const element = document.createElement('div');
            element.classList.add('form');
            element.innerHTML = (`
                <p class="c-yellow" id="group-id">ID: 11223344</p>
                <div class="Group-name">
                    <h2 id="group-name">Group Name</h2>
                </div>
                <div class="Group-picture"></div>
                <div class="buttons">Loading</div>
            `);

            const groupID = element.querySelector(`p#group-id`);
            groupID.innerText = `ID: ${data.key}`;
            const groupName = element.querySelector(`h2#group-name`);
            groupName.innerText = (data.val().username);
            const groupPhoto = element.querySelector(`.Group-picture`);
            groupPhoto.style.backgroundImage = (`url(${data.val().photoURL || '../data/img/group.jpg'})`);

            const btnList = element.querySelector(`.buttons`);

            let chatBtn;
            if(joinned == true) {
                btnList.innerHTML = (`<button class="action" id="leave-group"><i class="fa-duotone fa-person-from-portal"></i> ${lang.leave}</button>
                <button class="action" id="chat-group"><i class="fa-duotone fa-comments"></i> ${lang.chat}</button>`);
                chatBtn = btnList.querySelector(`#chat-group`);

                let leaveBtn = btnList.querySelector(`#leave-group`);
                leaveBtn.onclick = () => leaveGroup();
            } else {
                btnList.classList.add('one');
                btnList.innerHTML = (`<button class="action" id="join-group"><i class="fa-duotone fa-comments"></i> ${lang.join}</button>`);
                chatBtn = btnList.querySelector(`#join-group`);
            }

            const leaveGroup = () => {  // Leave group action function
                popup.confirm({
                    msg: lang.leave_this,
                    type: 'danger',
                    onyes: () => {
                        remove(ref(db, `guild/${id}/member/${currentID}`));
                        popup.alert({msg: lang.left_success, onyes: () => {
                            window.location.href = `${window.location.origin}/Online/dashboard/`;
                        }});
                    }
                });
            }

            chatBtn.onclick = () => {   // Chat button action
                set(ref(db, `guild/${id}/member/${currentID}`), {member: true});
                window.location.href = `${window.location.origin}/Online/chat/?r=group&gid=${id}`;
            };

            container.appendChild(element);

        },
        init(data) {
            container.innerHTML = '';
            this.header();
            this.main(data);
        }
    }

    const langCheker = async() => {
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
        
        lang = getLang[currentLang].Group;
    }
    langCheker();

    onAuthStateChanged(auth, (user) => {    // Check user login state
        if(user) {
            getID(user).then((res) => {
                currentID = res;
                getURL();
            });
        } else {
            window.location.href = `${window.location.origin}/Online/loginOn.html`;
        }
    })

})();