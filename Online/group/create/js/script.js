import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { getDatabase, ref, set, update } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-database.js";
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

    const createElement = {
        header() {

            const element = document.createElement('h1');
            element.innerHTML = (`
                <button id="back-dashboard"><i class="fa-solid fa-arrow-left"></i></button>
                ${lang.create_group}
            `);
            container.appendChild(element);

            const back = element.querySelector('#back-dashboard');
            back.onclick = () => window.location.href = window.location.origin + '/Online/dashboard/';
        },
        main() {

            const element = document.createElement('div');
            element.classList.add('form');
            element.innerHTML = (`
                <div class="Group-picture">
                    <button class="Group-picture-edit">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                </div>
                <div class="Group-name">
                    <label for="group-name">${lang.group_name}:</label>
                    <input maxlength="15" type="text" name="group-name" id="group-name" placeholder="${lang.type_here}"/>
                </div>
                <div class="buttons">
                    <button class="action" id="cancel-creation">
                    <i class="fa-duotone fa-circle-x"></i>
                    Cancel</button>
                    <button class="action" id="done-creation">
                    <i class="fa-duotone fa-circle-check"></i> ${lang.done}
                    </button>
                </div>
            `);

            let groupPhoto = {
                file: null,
                ext: null
            };

            const inputPhoto = element.querySelector(`.Group-picture`);
            inputPhoto.onclick = () => {
                const fileInput = document.createElement('input');
                fileInput.setAttribute('type', 'file');
                fileInput.setAttribute('accept', 'image/*');
                fileInput.click();
                
                fileInput.onchange = () => {        // Check File Type & Size

                    const ext = fileInput.value.slice((Math.max(0, fileInput.value.lastIndexOf(".")) || Infinity) + 1);
                    const valid = ["jpg", "jpeg", "png", "webp"];
                    const file = fileInput.files[0];
                    const ukuran = file.size / 1053818;
                    const bulat = Math.ceil(ukuran * Math.pow(10, 2)) / Math.pow(10, 2);

                    if(!valid.includes(ext.toLowerCase())) return popup.alert(lang.failed_format);
                    if(file.size > 2102394) return popup.alert(`${lang.failed_size_1} ${bulat} ${lang.failed_size_2}`);

                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => popup.confirm({
                        msg: `${lang.continue_with}<br><img src="${reader.result}" alt="${file.name}" />`,
                        type: 'info',
                        onyes: () => {
                            groupPhoto.file = file;
                            groupPhoto.ext = ext;
                            inputPhoto.style.backgroundImage = `url(${reader.result})`;
                            fileInput.remove();
                        },
                        onno: () => fileInput.remove()
                    });

                }
            }

            const inputName = element.querySelector(`#group-name`);
            inputName.onkeyup = () => {     // Remove Space
                inputName.value = inputName.value.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, '');
            }

            const doneBtn = element.querySelector(`#done-creation`);
            doneBtn.onclick = () => {

                if(inputName.value.length < 4) return popup.alert(`${lang.failed_length_1} ${inputName.value.length}<br/>${lang.failed_length_2}`);
                if(inputName.value.length > 15) return popup.alert(`${lang.failed_length_1} ${inputName.value.length}<br/>${lang.failed_length_3}`);

                const now = new Date().getTime().toString();

                if(groupPhoto.file !== null) {
                    const path = `image/${auth.currentUser.uid}/${now}.${groupPhoto.ext}`;
                    const photoUp = uploadBytesResumable(sref(storage, path), groupPhoto.file);

                    const uploadElement = document.createElement("div");
                    uploadElement.classList.add("Uploader");
                    uploadElement.innerHTML = (`<h1>${lang.uploading}</h1>`);

                    container.appendChild(uploadElement);

                    photoUp.on('state_changed', (snapshot) => { // Upload Progress 
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
                        getDownloadURL(photoUp.snapshot.ref).then((imgURL) => { // Get URL Image Uploaded
                            let groupData = {
                                username: inputName.value.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, ''),
                                owner: currentID,
                                photoURL: imgURL,
                                path
                            }
                            set(ref(db, 'guild/' + now), groupData);
                            update(ref(db, `guild/${now}/member/${currentID}`), {member: true});
                            uploadElement.remove();
                            popup.alert({msg: lang.created, type: 'info', onyes: () => {
                                userLocale.action.changePage('dashboard_groups');
                                window.location.href = `${window.location.origin}/Online/chat/?r=group&gid=${now}`;
                            }});
                        })
                    })
                } else {
                    let groupData = {
                        username: inputName.value.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, ''),
                        owner: currentID,
                    }
                    set(ref(db, 'guild/' + now), groupData);
                    update(ref(db, `guild/${now}/member/${currentID}`), {member: true});
                    popup.alert({msg: lang.created, type: 'info', onyes: () => {
                        userLocale.action.changePage('dashboard_groups');
                        window.location.href = `${window.location.origin}/Online/chat/?r=group&gid=${now}`;
                    }});
                }
            }

            const cancel = element.querySelector(`#cancel-creation`); // Cancel button
            cancel.onclick = () => {
                userLocale.action.changePage('dashboard_groups');
                window.location.href = `${window.location.origin}/Online/dashboard`;
            }

            container.appendChild(element);
            inputName.focus();

        },
        init() {
            container.innerHTML = '';
            this.header();
            this.main();
        }
    }

    const langCheker = async() => {
        let getLang;
        await fetch('../../data/js/language.json').then((data) => data.json()).then((res) => {
            getLang = res;
        });

        let currentLang;
        if(userLocale.state.last_lang == 'english') {
            currentLang = 'english'
        } else {
            currentLang = 'english';
        }
        
        lang = getLang[currentLang].Group.Create;
    }
    langCheker();

    onAuthStateChanged(auth, (user) => {    // Check if user is logged in
        if(user) {
            getID(user).then((res) => {
                currentID = res;
                createElement.init();
            })
        } else {
            window.location.href = `${window.location.origin}/Online/loginOn.html`;
        }
    })

})();