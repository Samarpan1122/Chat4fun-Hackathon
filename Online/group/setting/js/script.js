import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { getDatabase, ref, remove, update, get } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-database.js";
import { getStorage, ref as sref, deleteObject, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js";
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

    const urlParam = new URLSearchParams(window.location.search);
    let urlResult = urlParam.get('gid') || 'none';

    const getURL = () => {
        if(urlResult == 'none') {
            container.innerHTML = lang.something_wrong;
        } else {
            getGroupID(urlResult);
        }
    }

    const getGroupID = async (id) => {

        await get(ref(db, `guild/${id}`)).then((g) => {
            if(g.val().owner != currentID) return window.location.href = `${window.location.origin}/Online/dashboard/`;
        });

        let data = null;
        await get(ref(db, 'guild')).then((g) => {
            g.forEach((list) => {
                if(list.key == id) data = list;
            });
        });

        if(data == null) return container.innerHTML = lang.group_not_found;

        createElement.init(data);
    }

    const createElement = {
        header() {
            const element = document.createElement('h1');
            element.innerHTML = (`
                <button id="back-dashboard"><i class="fa-solid fa-arrow-left"></i></button>
                ${lang.group_edit}
            `);
            container.appendChild(element);

            const back = element.querySelector('#back-dashboard');
            back.onclick = () => window.location.href = window.location.origin + '/Online/dashboard/';
        },
        main(data) {

            const element = document.createElement('div');
            element.classList.add('form');
            element.innerHTML = (`
                <p class="Group-id c-yellow">
                    ID: 11223344
                </p>
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
                    <button class="action" id="delete-group">${lang.delete}</button>
                    <button class="action" id="done-group">${lang.done}</button>
                </div>
            `);

            let groupDetail = {
                username: data.val().username,
                gid: data.key,
                file: null,
                ext: null,
            }

            const groupID = element.querySelector(`.Group-id`);
            groupID.innerText = `ID: ${data.key}`;

            const groupInput = element.querySelector(`input#group-name`);
            groupInput.value = groupDetail.username;

            const groupPhoto = element.querySelector(`.Group-picture`);
            groupPhoto.style.backgroundImage = `url(${data.val().photoURL || '../../data/img/group.jpg'})`;
            groupPhoto.onclick = () => pictInput();

            container.appendChild(element);
            groupInput.focus();

            const pictInput = () => {       // Upload photo group
                const input = document.createElement('input');
                input.setAttribute('type', 'file');
                input.setAttribute('accept', 'image/*');
                input.click();

                input.onchange = () => {
                    const ext = input.value.slice((Math.max(0, input.value.lastIndexOf(".")) || Infinity) + 1);
                    const valid = ["jpg", "jpeg", "png", "webp"];
                    const file = input.files[0];
                    const ukuran = file.size / 1053818;
                    const bulat = Math.ceil(ukuran * Math.pow(10, 2)) / Math.pow(10, 2);

                    if(!valid.includes(ext.toLowerCase())) return popup.alert(lang.failed_format);
                    if(file.size > 2102394) return popup.alert(`${lang.failed_size_1} ${bulat} ${lang.failed_size_2}`);

                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => popup.confirm({
                        msg: `${lang.continue_with}<br><img src="${reader.result}" alt="${file.name}" />`,
                        onyes: () => {
                            groupDetail.ext = ext;
                            groupDetail.file = file;
                            groupPhoto.style.backgroundImage = `url(${reader.result})`;
                            input.remove();
                        },
                        onno: () => input.remove()
                    });
                }
            }

            groupInput.onkeyup = () => {
                groupInput.value = groupInput.value.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, '');
            }

            const doneBtn = element.querySelector(`#done-group`);
            doneBtn.onclick = () => {   
                if(groupInput.value.length < 4) return popup.alert(`${lang.failed_length_1} ${groupInput.value.length}<br/>${lang.failed_length_2}`);
                if(groupInput.value.length > 15) return popup.alert(`${lang.failed_length_1} ${groupInput.value.length}<br/>${lang.failed_length_3}`);

                if(groupDetail.file != null) {
                    const path = `image/${auth.currentUser.uid}/${groupDetail.gid}.${groupDetail.ext}`;
                    const photoUp = uploadBytesResumable(sref(storage, path), groupDetail.file);

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
                            let groupData = {
                                username: groupInput.value.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, ''),
                                photoURL: imgURL,
                                path
                            }
                            update(ref(db, `guild/${groupDetail.gid}`), groupData);
                            uploadElement.remove();
                            popup.alert({msg: lang.modified, type: 'info', onyes: () => {
                                window.location.href = `${window.location.origin}/Online/dashboard/`;
                            }});
                        })
                    })
                } else {
                    let groupData = {
                        username: groupInput.value.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, ''),
                    }
                    update(ref(db, `guild/${groupDetail.gid}`), groupData);
                    popup.alert({msg: lang.modified, type: 'info', onyes: () => {
                        window.location.href = `${window.location.origin}/Online/dashboard/`;
                    }});
                }
            }

            const deleteBtn = element.querySelector(`#delete-group`);
            deleteBtn.onclick = () => {
                popup.confirm({
                    msg: lang.danger_delete,
                    type: 'danger',
                    onyes: () => {
                        const uploadElement = document.createElement("div");
                        uploadElement.classList.add("Uploader");
                        uploadElement.innerHTML = (`<h1 class="c-red">${lang.deleting}</h1>`);

                        container.appendChild(uploadElement);

                        deleteNow(uploadElement);
                    }
                });

                const deleteNow = async (upEl) => {     // Delete group
                    await get(ref(db, `group/${groupDetail.gid}`)).then((g) => {
                        if(g.exists()) {
                            g.forEach((d) => {
                                if(d.val().path) {
                                    deleteObject(sref(storage, d.val().path)).catch((err) => console.log(err));
                                }
                            });
                        }
                    });

                    await get(ref(db, `guild/${groupDetail.gid}`)).then((g) => {
                        if(g.val().path) {
                            deleteObject(sref(storage, g.val().path)).catch((err) => console.log(err));
                        }
                    })
                    
                    await remove(ref(db, `group/${groupDetail.gid}`));
                    await remove(ref(db, `guild/${groupDetail.gid}`));

                    upEl.remove();
                    popup.alert({msg: lang.deleted, type: 'info', onyes: () => {
                        window.location.href = `${window.location.origin}/Online/dashboard/`;
                    }});
                }
            }

        },
        init(data) {
            container.innerHTML = '';
            this.header();
            this.main(data);
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
        
        lang = getLang[currentLang].Group.Setting;
    }
    langCheker();

    onAuthStateChanged(auth, (user) => {    // Check if user is logged in
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