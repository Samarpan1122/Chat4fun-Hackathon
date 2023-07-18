import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { getDatabase, ref, update, get } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-database.js";
import { getStorage, ref as sref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js";
import { firebaseConfig } from '../../../data/js/config.js';
import { getID } from "../../../data/js/authState.js";

(() => {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getDatabase(app);
    const storage = getStorage(app);
    userLocale.onData.load();
    
    let lang;

    let currentID = null;
    const container = document.querySelector('.container');

    const Setting = {
        actionBar() {
            const element = document.createElement('h1');
            element.classList.add('page-title');
            element.innerHTML = (`<button id="back-dashboard"><i class="fa-solid fa-arrow-left"></i></button>${lang.setting}`);
            container.appendChild(element);

            element.querySelector('#back-dashboard').onclick = () => window.location.href = window.location.origin + '/Online/dashboard/';
        },
        accountSect(user) {    // Account Section 
            const element = document.createElement('section');
            element.classList.add('account-section');
            element.setAttribute('data-setting', 'account');
            element.innerHTML = (`
                <h2>${lang.account}</h2>
                <div class="profile-picture" data-account="profile-picture">
                    <i class="fa-regular fa-edit b-font"></i>
                </div>
                <div class="box" data-edit="username">
                    <i>${lang.username}:</i>
                    <b class="jarak" data-account="profile-username">Loading</b>
                    
                    <button class="bottom" id="edit-username">
                        <i class="fa-solid fa-edit"></i>
                        ${lang.edit_username}
                    </button>
                </div>
                <div class="br"></div>
            `);

            

            const profilePicture = element.querySelector(`[data-account="profile-picture"]`);
            const profileUsername = element.querySelector(`[data-account="profile-username"]`);
            


            const editUsername = element.querySelector(`#edit-username`);
            
            profilePicture.onclick = () => editPhoto();

            get(ref(db, 'users/' + currentID)).then((data) => {
                let s = data.val();
                profilePicture.style.backgroundImage = `url(${s.pictureURL || s.photoURL})`;
                profileUsername.innerText = s.username ? `@${s.username}` : s.displayName;
                

                editUsername.onclick = () => popup.prompt({     // Edit Username Popup Prompt 
                    msg: lang.new_username,
                    max: 20,
                    nowrap: true,
                    val: s.username || s.displayName,
                    placeholder: lang.who_are_you,
                    onyes: (res) => {
                        if(res.length < 4) return popup.alert(lang.failed_4);
                        if(res.length > 20) return popup.alert(lang.failed_20);
                        profileUsername.innerText = `@${res}`;
                        update(ref(db, 'users/' + currentID), {
                            username: res.replace(/ /g, '')
                        });
                    }
                });
            });

            const editPhoto = () => {
                const element = document.createElement('input');
                element.setAttribute('type', 'file');
                element.setAttribute('accept', 'image/*')
                element.click();

                element.onchange = () => {  // Check File Extension and Size before Upload Photo

                    const ext = element.value.slice((Math.max(0, element.value.lastIndexOf(".")) || Infinity) + 1);
                    const valid = ["jpg", "jpeg", "png", "webp"];
                    const file = element.files[0];
                    const ukuran = file.size / 1053818;
                    const bulat = Math.ceil(ukuran * Math.pow(10, 2)) / Math.pow(10, 2);

                    if(!valid.includes(ext.toLowerCase())) return popup.alert(lang.failed_format);
                    if(file.size > 2102394) return popup.alert(`${lang.failed_size_1} ${bulat} ${lang.failed_size_2}`);

                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => popup.confirm({
                        msg: `${lang.continue_with}<br><img src="${reader.result}" alt="${element.value}" />`,
                        type: 'info',
                        onyes: () => {
                            uploadPhoto(file, ext);
                            element.remove();
                        },
                        onno: () => element.remove(),
                        no: lang.cancel,
                        yes: lang.ok
                    });
                }
            }
            
            const uploadPhoto = (file, ext) => {  // Upload Photo Profile to Firebase Storage
                const path = `image/${auth.currentUser.uid}/profile.${ext}`;
                const photoUp = uploadBytesResumable(sref(storage, path), file);

                const uploadElement = document.createElement("div");
                uploadElement.classList.add("Uploader");
                uploadElement.innerHTML = (`<h1>${lang.uploading}</h1>`);

                container.appendChild(uploadElement);

                photoUp.on('state_changed', (snapshot) => {
                    let progress = Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100);

                    if(progress == 100) {
                        uploadElement.innerHTML = (`<h1>${lang.uploading}</h1><h2>100%</h2>`);
                        setTimeout(() => {
                            uploadElement.innerHTML = (`<h1>${lang.uploading}</h1><h2>${lang.processing}</h2>`);
                        }, 250);
                    } else {
                        uploadElement.innerHTML = (`<h1>${lang.uploading}</h1><h2>${progress}%</h2>`);
                    }

                }, (err) => {
                    return popup.alert(err);
                }, () => {
                    getDownloadURL(photoUp.snapshot.ref).then((imgURL) => {
                        update(ref(db, 'users/' + currentID), {
                            pictureURL: imgURL
                        });
                        profilePicture.style.backgroundImage = `url(${imgURL})`;
                        uploadElement.remove();
                    });
                });
            }
            container.appendChild(element);
        },
        optionSect(user) {   // Option Section
            const element = document.createElement('section');
            element.classList.add('option-section');
            element.setAttribute('data-setting', 'option');

            
            container.appendChild(element);
        },
        logoutSect() { // Logout Section
            const element = document.createElement('section');
            element.classList.add('logout-section');
            element.setAttribute('data-setting', 'logout');
            element.innerHTML = (`
                
                <div class="grouping">
                    <button class="logout action" id="logout">${lang.logout}</button>
                </div>
            `);

            const logout = element.querySelector('#logout');
            logout.onclick = () => popup.confirm({
                msg: lang.are_you_1,
                type: 'danger',
                onyes: () => signOut(auth).then(() => {
                    window.location.href = `${window.location.origin}/Online/loginOn.html`;
                }),
                yes: lang.ok,
                no: lang.cancel
            });


            container.appendChild(element);
        },
        init(user) {
            container.innerHTML = '';
            this.actionBar();
            this.accountSect(user);
            this.optionSect(user);
            this.logoutSect(user);
        }
    };

    const langCheker = async() => {
        let getLang;
        await fetch('../../data/js/language.json').then((data) => data.json()).then((res) => {
            getLang = res;
        });
        let currentLang;
        if(userLocale.state.last_lang == 'indonesia') {
            currentLang = 'indonesia'
        } else {
            currentLang = 'english';
        }
        lang = getLang[currentLang].User.Setting;
    }

    langCheker();
    onAuthStateChanged(auth, (user) => { // Check User Authentication State
        container.innerHTML = lang.getting;
        if(user) {
            getID(user).then((res) => {
                currentID = res;
                Setting.init(user);
            });
        } else {
            window.location.href = window.location.origin + '/Online/loginOn.html';
        }
    })

})();