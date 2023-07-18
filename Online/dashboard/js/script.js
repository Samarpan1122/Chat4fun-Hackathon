import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { getDatabase, ref, set, remove, update, get, child, query, limitToLast } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-database.js";
import { getStorage, ref as sref, deleteObject } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js";
import { firebaseConfig } from '../../data/js/config.js';
import { getID } from "../../data/js/authState.js";

(() => {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getDatabase(app);
    const storage = getStorage(app);
    
    let lang;

    let currentID = null;
    const container = document.querySelector('.container');
    let prevMain = null;
    let prevFooter = null;
    let prevButton = null;

    const createElement = () => {
        const header = document.createElement('header');
        header.innerHTML = (`
            <div class="title-bar">
                <h1>Chat4fun</h1>
                <div class="buttons">

                    <button class="action" id="icon-setting"><i class="fa-solid fa-gear"></i></button>
                </div>
            </div>
            <div class="menu-bar">
                <button id="changeGroup"><i class="fa-duotone fa-users"></i> ${lang.groups}</button>
            </div>
        `);

        
        const btnGroup = header.querySelector('#changeGroup');
        

        const icSetting = header.querySelector('#icon-setting');



        
        btnGroup.onclick = () => { // change page to setting
            if(btnGroup.getAttribute('class') == 'enabled') return;
            changePage(prevMain, prevFooter, groupPage, btnGroup);
        }

        icSetting.onclick = () => window.location.href = window.location.origin + '/Online/user/setting/';
        

        container.innerHTML = '';
        container.appendChild(header);

        const lastState = userLocale.state.last_page;
        
        if(lastState == 'dashboard_groups') {
            btnGroup.click();
        }
    }





    const groupPage = () => {
        prevMain = document.createElement('main');
        prevMain.innerHTML = (`
            <div class="card-list list_guild">
                <div class="nomore-group" style="text-align: center;" id="group-loader">
                    ${lang.loading}
                </div>
            </div>
        `);


        get(ref(db, 'guild')).then((list) => { // get all group list
            const nomore = document.createElement('div');
            nomore.classList.add('nomore-group');
            nomore.style.textAlign = 'center';

            const loadNomore = () => {
                if(prevMain.querySelector('#group-loader')) prevMain.querySelector('#group-loader').remove();
                nomore.innerHTML = `<i class="c-yellow">${lang.nomore}</i>`;
                if(prevMain.querySelector('.nomore-group')) prevMain.querySelector('.nomore-group').remove();
                if(!prevMain.querySelector('.nomore-group')) {
                    if(prevMain.querySelector('.card-list.list_guild')) prevMain.querySelector('.card-list.list_guild').appendChild(nomore);
                }
            }

            if(list.exists()) {     // if group exist in database 
                if(prevMain.querySelector(`.list_group`)) return;
                list.forEach((d) => {
                    get(ref(db, `guild/${d.key}/member/${currentID}`)).then((w) => {
                        if(w.exists()) {
                            const accEl = document.createElement('div');
                            accEl.classList.add('card', 'chat', 'list_group');
                            accEl.innerHTML = (`
                                <div class="name">
                                    <img src="../data/img/group.jpg" alt="name"/>
                                    <p class="username">Loading</p>
                                </div>
                                <div class="status">
                                    <p>Loading</p>
                                </div>
                            `);

                            accEl.onclick = () => {
                                window.location.href = `${window.location.origin}/Online/chat/?r=group&gid=${d.key}`;
                            }

                            accEl.querySelector(`.name p.username`).innerText = d.val().username;
                            accEl.querySelector(`.name img`).setAttribute('src', d.val().photoURL || '../data/img/group.jpg');

                            get(ref(db, `guild/${d.key}/member`)).then((mem) => {
                                if(mem.exists()) {
                                    accEl.querySelector(`.status p`).innerText = `${lang.members}: ${mem.size}`;
                                }
                            })

                            if(prevMain.querySelector('.card-list.list_guild')) prevMain.querySelector('.card-list.list_guild').appendChild(accEl);

                            accEl.querySelector(`.name img`).onload = () => loadNomore();
                        } else {
                            loadNomore();
                        }
                    });
                })
            } else {
                loadNomore();
            }
        })

        prevFooter = document.createElement('footer');
        prevFooter.innerHTML = (`
            <button class="action" id="icon-join_group">${lang.join_group}</button>
            <button class="action" id="icon-create_group">${lang.create_group}</button>
            
        `);

        userLocale.action.changePage('dashboard_groups');
        
        container.appendChild(prevMain);
        container.appendChild(prevFooter);

        prevFooter.querySelector('#icon-create_group').onclick = () => window.location.href = window.location.origin + '/Online/group/create/';

        prevFooter.querySelector('#icon-join_group').onclick = () => popup.prompt({
            msg: 'Group ID:',
            onyes: (res) => searchGroup(res)
        });
        
            
        const searchGroup = async (id) => {     // Search group function

            let isGroupExist = false;
            await get(ref(db, `guild/${id}`)).then((g) => {
                if(g.exists()) {
                    isGroupExist = true;
                }
            });
            
            if(isGroupExist === false) return popup.alert(lang.id_doesnt_match);

            window.location.href = `${window.location.origin}/Online/group/?gid=${id}`;
        }
    }

    const changePage = (prevMain, prevFooter, next, activate, res = null) => { // Change page  function
        if(prevMain == null || prevFooter == null || prevButton == null) {
            activate.classList.add('enabled');
            prevButton = activate;
            next(res);
            return;
        }

        prevMain.classList.add('deleted');
        prevFooter.classList.add('deleted');
        prevButton.classList.remove('enabled');
        activate.classList.add('enabled');
        prevButton = activate;
        setTimeout(() => {      // Wait for animation
            const mainall = container.querySelector('main');
            const footerall = container.querySelector('footer');

            if(mainall) mainall.remove();
            if(footerall) footerall.remove();

            prevMain.remove();
            prevFooter.remove();
            next(res);
        }, 300);
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
        
        lang = getLang[currentLang].Dashboard;
    }
    langCheker();

    onAuthStateChanged(auth, (user) => {    // Check if user is logged in
        container.innerHTML = `${lang.preparing}`;
        if(user) {
            getID(user).then((res) => {
                currentID = res;
                if(res === null) window.location.reload();
                createElement();
            });
        } else {
            window.location.href = window.location.origin + '/Online/loginOn.html';
        }
    })
})();