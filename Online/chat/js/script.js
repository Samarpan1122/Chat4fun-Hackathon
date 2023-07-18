import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { getDatabase, orderByKey, startAt, ref, set, remove, update, get, onChildAdded, onChildChanged, onChildRemoved, off, child, query, limitToLast } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-database.js";
import { getStorage, ref as sref, deleteObject, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js";
import { firebaseConfig } from '../../data/js/config.js';
import { getID } from "../../data/js/authState.js";

(() => {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getDatabase(app);
    const storage = getStorage(app);
    userLocale.onData.load();

    let lang;
    let currentID = null;
    let currentRoom = null;
    let reKey = null;
    let reElement = null;

    const container = document.querySelector('.container');
    let mainArea = null;
    let footerTextarea = null;

    const getRoomURL = (urlParam) => {
        let room = urlParam.get('r') || 'none';

        switch(room) {
            case 'group':
                roomGroup(urlParam);
                break;
            default:
                container.innerHTML = lang.something_wrong;
                break;
        }
    }

    const roomUser = async (urlParam) => {

        let id = urlParam.get('gid') || 'none';

        if(id == 'none') return popup.alert({msg:lang.group_id_failed, onyes:() => window.location.href = window.location.origin + '/Online/dashboard/'});

        if(id == currentID) return popup.alert({msg:lang.cannot_self_chat, onyes: () => window.location.href = window.location.origin + '/Online/dashboard/'});

        let data = null;
        await get(ref(db, 'users/' + id)).then((list) => {
            if(list.exists()) data = list;
        });

        if(data == null) return popup.alert({msg:lang.id_not_found,onyes: () => window.location.href = window.location.origin + '/Online/dashboard/'});

        currentRoom = 'private';

        const userSubmission = (people) => {

            let roomKey = null;

            let myID = currentID;
            let peopleID = people.key;

            let theirID = {
                'first': myID,
                'second': peopleID
            }

            const theirDB = ref(db, 'privateRoom');
            let isChatBefore = false;
            get(theirDB).then((privates) => {
                privates.forEach((privated) => {
                    const s = privated.val();
                    if((s.first == theirID.first && s.second == theirID.second) || (s.first == theirID.second && s.second == theirID.first)) {
                        roomKey = privated.key;
                        isChatBefore = true;
                    }
                });

                if(isChatBefore === false) {
                    roomKey = `${myID}_${peopleID}`;

                    set(child(theirDB, roomKey), theirID).then(() => {
                        createElement.init(roomKey, people);
                    }).catch((err) => popup.alert(err));
                } else {
                    createElement.init(roomKey, people);
                }
            })
        }
        userSubmission(data);
    }
    
    const roomGroup = async (urlParam) => {

        let id = urlParam.get('gid') || 'none';

        if(id == 'none') return popup.alert({msg: lang.group_id_failed, onyes: () => window.location.href = window.location.origin + '/Online/dashboard/'})

        let gidData = null;
        await get(ref(db, `guild/${id}/member/${currentID}`)).then((g) => {
            if(g.exists()) {
                gidData = 'ada';
            }
        });

        if(gidData == null) return popup.alert({msg: lang.group_id_not_found,onyes: () => window.location.href = window.location.origin + '/Online/dashboard/'});

        let data = null;
        await get(ref(db, 'guild/' + id)).then((list) => {
            if(list.exists()) data = list;
        })

        if(data == null) return popup.alert({msg: lang.group_not_found,onyes: () => window.location.href = window.location.origin + '/Online/dashboard/'});

        currentRoom = 'group';

        createElement.init(id, data);
    }


    const parseMD = (sentence) => {
        let boldX = /\*([^.*]+)\*/g;
        let italicX = /\_([^.*]+)\_/g;

        return sentence.replace(italicX, '<i>$1</i>').replace(boldX, '<b>$1</b>');
    }

    const createElement = {
        header(key, people) {
            const element = document.createElement('header');
            element.innerHTML = (`
                <button id="back-dashboard">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <h1 id="people-detail">
                    <img src="../data/img/profile.jpg" alt="Foto Profil" id="people-picture"/>
                    <p id="people-username">${lang.loading}</p>
                </h1>
                
            `);
            
            element.querySelector(`#back-dashboard`).onclick = () => window.location.href = `${window.location.origin}/Online/dashboard/`;

            

            const uname = element.querySelector(`#people-username`);
            let newName;
            if(currentRoom == 'private' || currentRoom == 'group') {
                newName = people.val().username || people.val().displayName;
            } else {
                newName = people.username;
            }
            uname.innerText = newName.length > 15 ? newName.substring(0, 15) + '...' : newName;

            const upict = element.querySelector(`#people-picture`);
            if(currentRoom == 'private') {
                upict.setAttribute('src', people.val().pictureURL || people.val().photoURL);
                element.querySelector('#people-detail').style.cursor = 'pointer';
            } else if(currentRoom == 'group') {
                upict.setAttribute('src', people.val().photoURL || '../data/img/group.jpg');
                element.querySelector('#people-detail').style.cursor = 'pointer';
            } else if(currentRoom == 'public') {
                upict.remove();
            }

            const detailElement = element.querySelector(`#people-detail`);
            detailElement.onclick = () => {
                if(currentRoom == 'private') {
                    window.location.href = `${window.location.origin}/Online/user/?gid=${people.key}`;
                } else if(currentRoom == 'group') {
                    window.location.href = `${window.location.origin}/Online/group/?gid=${people.key}`;
                }
            }

            
            container.appendChild(element);
        }, main(key) {
            const mainAreaBefore = container.querySelector('main');
            if(mainAreaBefore) mainAreaBefore.remove();
            mainArea = document.createElement('main');
            let disabledScroll = false;
            let firstScroll = true;
            const roomRef = query(ref(db, `${currentRoom}/${key}`));
            const showChat = (limitation, roomFixed) => {
                onChildAdded(roomFixed, (chat) => {
                    let s = chat.val();
                    const untaian = document.createElement('div');
                    untaian.id = chat.key;
                    untaian.classList.add(`chatroom-${chat.key}`);
                    if(chat.val().gid == currentID) {
                        untaian.classList.add('card-chat', 'our');
                    } else {
                        untaian.classList.add('card-chat', 'their');
                    }

                    // SENDER [START]
                    const Sender = document.createElement('div');
                    Sender.classList.add('sender');
                    // SENDER >> TOP [START]
                    const Top = document.createElement('div');
                    Top.classList.add('top');
                    // SENDER >> TOP >> NAME
                    const Name = document.createElement('p');
                    Name.classList.add('username');
                    // SENDER >> TOP >> NAME >> USERNAME
                    let gbName;
                    get(ref(db, `users/${s.gid}`)).then((u) => {
                        let uname = u.val().username ? `@${u.val().username}` : u.val().displayName;
                        uname.length > 15 ? uname = uname.substring(0, 15) + '...' : uname = uname;
                        gbName = uname;
                        const Username = document.createElement('i');
                        Username.innerText = `~ ${uname}`;
                        Username.style.cursor = 'pointer';
                        Username.onclick = () => {window.location.href = `${window.location.origin}/Online/user/?gid=${s.gid}`};
                        Name.appendChild(Username);
                    });
                    // SENDER >> TOP >> OPTION
                    const Option = document.createElement('button');
                    Option.classList.add('option');
                    Option.innerHTML = `<i class="fa-regular fa-ellipsis"></i>`;
                    Option.onclick = () => {
                        const Attach_Before = document.querySelector('.Chat-Attach');
                        if(Attach_Before) Attach_Before.remove();
                        const Attach = document.createElement('div');
                        Attach.classList.add('Chat-Attach');

                        const Chat_Preview = document.createElement('div');
                        Chat_Preview.classList.add('chat-preview');
                        // CHAT PREVIEW [START]
                        const Chat_Sender = document.createElement('p');
                        Chat_Sender.classList.add('sender');
                        const Chat_Sender_Name = document.createElement('i');
                        Chat_Sender_Name.innerText = gbName;
                        Chat_Sender.appendChild(Chat_Sender_Name);
                        Chat_Preview.appendChild(Chat_Sender);
                        if(s.gid == currentID) {
                            if(s.type === undefined) {
                                const Chat_Message = document.createElement('p');
                                Chat_Message.classList.add('message');
                                Chat_Message.innerText = s.msg.length > 20 ? `${s.msg.replace(/\n/g, ' ').substring(0, 20)}...` : s.msg.replace(/\n/g, ' ');
                                Chat_Message.innerHTML = parseMD(Chat_Message.innerHTML);

                                Chat_Preview.appendChild(Chat_Message);
                                
                                const Option_Preview = document.createElement('div');
                                Option_Preview.classList.add('opt-preview');

                                const Option_Reply = document.createElement('button');
                                Option_Reply.classList.add('action', 'replyBtn');
                                Option_Reply.innerHTML = `<i class="fa-solid fa-reply"></i> ${lang.reply}`;
                                Option_Reply.onclick = () => Option_Action.reply(Attach);
                                const Option_Edit = document.createElement('button');
                                Option_Edit.classList.add('action', 'editBtn');
                                Option_Edit.innerHTML = `<i class="fa-solid fa-edit"></i> ${lang.edit}`;
                                Option_Edit.onclick = () => Option_Action.edit(Attach);
                                const Option_Trash = document.createElement('button');
                                Option_Trash.classList.add('action', 'trashBtn');
                                Option_Trash.innerHTML = `<i class="fa-solid fa-trash"></i> ${lang.delete}`;
                                Option_Trash.onclick = () => Option_Action.trash(Attach);

                                Option_Preview.append(Option_Reply, Option_Edit, Option_Trash);
                                Attach.append(Chat_Preview, Option_Preview);
                            } else if(s.type == 'image') {
                                const Chat_Message = document.createElement('p');
                                Chat_Message.classList.add('message');
                                const Chat_Message_Image = document.createElement('div');
                                Chat_Message_Image.classList.add('image');
                                const Chat_Message_Image_Img = document.createElement('img');
                                Chat_Message_Image_Img.src = s.msg;
                                Chat_Message_Image_Img.onerror = () => Chat_Message_Image_Img.src = '../data/img/error.jpg';

                                Chat_Message_Image.appendChild(Chat_Message_Image_Img)
                                Chat_Message.appendChild(Chat_Message_Image);
                                Chat_Preview.appendChild(Chat_Message);
                                
                                const Option_Preview = document.createElement('div');
                                Option_Preview.classList.add('opt-preview', 'two');

                                const Option_Reply = document.createElement('button');
                                Option_Reply.classList.add('action', 'replyBtn');
                                Option_Reply.innerHTML = `<i class="fa-solid fa-reply"></i> ${lang.reply}`;
                                Option_Reply.onclick = () => Option_Action.reply(Attach);
                                const Option_Trash = document.createElement('button');
                                Option_Trash.classList.add('action', 'trashBtn');
                                Option_Trash.innerHTML = `<i class="fa-solid fa-trash"></i> ${lang.delete}`;
                                Option_Trash.onclick = () => Option_Action.trash(Attach);

                                Option_Preview.append(Option_Reply, Option_Trash);
                                Attach.append(Chat_Preview, Option_Preview);
                            } else if(s.type == 'file') {
                                const Chat_Message = document.createElement('p');
                                Chat_Message.classList.add('message');

                                Chat_Message.innerHTML += `<chatroom-file src="${s.msg}">${s.desc}</chatroom-file>`;
                                Chat_Preview.appendChild(Chat_Message);
                                
                                const Option_Preview = document.createElement('div');
                                Option_Preview.classList.add('opt-preview', 'two');

                                const Option_Reply = document.createElement('button');
                                Option_Reply.classList.add('action', 'replyBtn');
                                Option_Reply.innerHTML = `<i class="fa-solid fa-reply"></i> ${lang.reply}`;
                                Option_Reply.onclick = () => Option_Action.reply(Attach);
                                const Option_Trash = document.createElement('button');
                                Option_Trash.classList.add('action', 'trashBtn');
                                Option_Trash.innerHTML = `<i class="fa-solid fa-trash"></i> ${lang.delete}`;
                                Option_Trash.onclick = () => Option_Action.trash(Attach);

                                Option_Preview.append(Option_Reply, Option_Trash);
                                Attach.append(Chat_Preview, Option_Preview);
                            } else if(s.type == 'audio') {
                                const Chat_Message = document.createElement('p');
                                Chat_Message.classList.add('message');

                                Chat_Message.innerHTML += `<chatroom-audio src="${s.msg}"></chatroom-audio>`;
                                Chat_Preview.appendChild(Chat_Message);
                                
                                const Option_Preview = document.createElement('div');
                                Option_Preview.classList.add('opt-preview', 'two');

                                const Option_Reply = document.createElement('button');
                                Option_Reply.classList.add('action', 'replyBtn');
                                Option_Reply.innerHTML = `<i class="fa-solid fa-reply"></i> ${lang.reply}`;
                                Option_Reply.onclick = () => Option_Action.reply(Attach);
                                const Option_Trash = document.createElement('button');
                                Option_Trash.classList.add('action', 'trashBtn');
                                Option_Trash.innerHTML = `<i class="fa-solid fa-trash"></i> ${lang.delete}`;
                                Option_Trash.onclick = () => Option_Action.trash(Attach);

                                Option_Preview.append(Option_Reply, Option_Trash);
                                Attach.append(Chat_Preview, Option_Preview);
                            } else {
                                const Chat_Message = document.createElement('p');
                                Chat_Message.classList.add('message');
                                Chat_Message.innerHTML = `<i class="c-yellow">${lang.has_been_deleted}</i>`;
                                Chat_Preview.appendChild(Chat_Message);

                                Attach.append(Chat_Preview);
                            }
                        } else {
                            if(s.type === undefined) {
                                const Chat_Message = document.createElement('p');
                                Chat_Message.classList.add('message');
                                Chat_Message.innerText = s.msg.length > 20 ? `${s.msg.replace(/\n/g, ' ').substring(0, 20)}...` : s.msg.replace(/\n/g, ' ');
                                Chat_Message.innerHTML = parseMD(Chat_Message.innerHTML);
                                Chat_Preview.appendChild(Chat_Message);
                                
                                const Option_Preview = document.createElement('div');
                                Option_Preview.classList.add('opt-preview', 'one');

                                const Option_Reply = document.createElement('button');
                                Option_Reply.classList.add('action', 'replyBtn');
                                Option_Reply.innerHTML = `<i class="fa-solid fa-reply"></i> ${lang.reply}`;
                                Option_Reply.onclick = () => Option_Action.reply(Attach);

                                Option_Preview.append(Option_Reply);
                                Attach.append(Chat_Preview, Option_Preview);
                            } else if(s.type == 'image') {
                                const Chat_Message = document.createElement('p');
                                Chat_Message.classList.add('message');
                                const Chat_Message_Image = document.createElement('div');
                                Chat_Message_Image.classList.add('image');
                                const Chat_Message_Image_Img = document.createElement('img');
                                Chat_Message_Image_Img.src = s.msg;
                                Chat_Message_Image_Img.onerror = () => Chat_Message_Image_Img.src = '../data/img/error.jpg';

                                Chat_Message_Image.appendChild(Chat_Message_Image_Img)
                                Chat_Message.appendChild(Chat_Message_Image);
                                Chat_Preview.appendChild(Chat_Message);
                                
                                const Option_Preview = document.createElement('div');
                                Option_Preview.classList.add('opt-preview', 'one');

                                const Option_Reply = document.createElement('button');
                                Option_Reply.classList.add('action', 'replyBtn');
                                Option_Reply.innerHTML = `<i class="fa-solid fa-reply"></i> ${lang.reply}`;
                                Option_Reply.onclick = () => Option_Action.reply(Attach);

                                Option_Preview.append(Option_Reply);
                                Attach.append(Chat_Preview, Option_Preview);
                            } else if(s.type == 'file') {
                                const Chat_Message = document.createElement('p');
                                Chat_Message.classList.add('message');

                                Chat_Message.innerHTML += `<chatroom-file src="${s.msg}">${s.desc}</chatroom-file>`;
                                Chat_Preview.appendChild(Chat_Message);
                                
                                const Option_Preview = document.createElement('div');
                                Option_Preview.classList.add('opt-preview', 'one');

                                const Option_Reply = document.createElement('button');
                                Option_Reply.classList.add('action', 'replyBtn');
                                Option_Reply.innerHTML = `<i class="fa-solid fa-reply"></i> ${lang.reply}`;
                                Option_Reply.onclick = () => Option_Action.reply(Attach);

                                Option_Preview.append(Option_Reply);
                                Attach.append(Chat_Preview, Option_Preview);
                            } else if(s.type == 'audio') {
                                const Chat_Message = document.createElement('p');
                                Chat_Message.classList.add('message');

                                Chat_Message.innerHTML += `<chatroom-audio src="${s.msg}"></chatroom-audio>`;
                                Chat_Preview.appendChild(Chat_Message);
                                
                                const Option_Preview = document.createElement('div');
                                Option_Preview.classList.add('opt-preview', 'one');

                                const Option_Reply = document.createElement('button');
                                Option_Reply.classList.add('action', 'replyBtn');
                                Option_Reply.innerHTML = `<i class="fa-solid fa-reply"></i> ${lang.reply}`;
                                Option_Reply.onclick = () => Option_Action.reply(Attach);

                                Option_Preview.append(Option_Reply);
                                Attach.append(Chat_Preview, Option_Preview);
                            } else {
                                const Chat_Message = document.createElement('p');
                                Chat_Message.classList.add('message');
                                Chat_Message.innerHTML = `<i class="c-yellow">${lang.has_been_deleted}</i>`;
                                Chat_Preview.appendChild(Chat_Message);

                                Attach.append(Chat_Preview);
                            }
                        }
                        const Attach_Cancel = document.createElement('button');
                        Attach_Cancel.classList.add('action', 'cancelBtn');
                        Attach_Cancel.innerHTML = `<i class="fa-duotone fa-circle-x"></i> ${lang.cancel}`;

                        Attach_Cancel.onclick = () => {
                            Attach.remove();
                        }

                        Attach.appendChild(Attach_Cancel);
                        container.appendChild(Attach);
                    }
                    
                    const Option_Action = {
                        reply(Option_Child) {
                            const Reply_Element_Before = document.querySelector('.reply-preview');
                            if(Reply_Element_Before) Reply_Element_Before.remove();
                            reKey = chat.key;

                            Option_Child.remove();

                            const Reply_Element = document.createElement('div');
                            Reply_Element.classList.add('reply-preview');
                            const Line_Reply = document.createElement('div');
                            Line_Reply.classList.add('line');
                            const From_Reply = document.createElement('div');
                            From_Reply.classList.add('from');
                            Reply_Element.appendChild(Line_Reply);

                            const From_Reply_Name = document.createElement('div');
                            From_Reply_Name.classList.add('re-name');
                            From_Reply_Name.innerText = gbName;
                            From_Reply.appendChild(From_Reply_Name);

                            if(s.type === undefined) {
                                const From_Reply_Desc = document.createElement('div');
                                From_Reply_Desc.classList.add('re-desc');
                                From_Reply_Desc.innerText = s.msg.length > 20 ? `${s.msg.replace(/\n/g, ' ').substring(0, 20)}...` : s.msg.replace(/\n/g, ' ');
                                From_Reply.appendChild(From_Reply_Desc);
                            } else if(s.type === 'image') {
                                const Image_Reply = document.createElement('div');
                                Image_Reply.classList.add('re-image');
                                Image_Reply.style.backgroundImage = `url(${s.msg})`;

                                const From_Reply_Desc = document.createElement('div');
                                From_Reply_Desc.classList.add('re-desc');
                                From_Reply_Desc.innerText = s.desc ? (s.desc.length > 30 ? `${s.desc.replace(/\n/g, ' ')}...` : s.desc.replace(/\n/g, ' ')) : `[${lang.picture}]`;
                                
                                From_Reply.appendChild(From_Reply_Desc);
                                Reply_Element.appendChild(Image_Reply);
                            } else if(s.type === 'file') {
                                const From_Reply_Desc = document.createElement('div');
                                From_Reply_Desc.classList.add('re-desc');
                                From_Reply_Desc.innerText = s.desc.length > 30 ? `${s.desc.replace(/\n/g, ' ').substring(0, 15)}...${s.desc.slice((Math.max(0, s.desc.lastIndexOf(".")) || Infinity) - 5)}` : s.desc;
                                From_Reply.appendChild(From_Reply_Desc);
                            } else if(s.type === 'audio') {
                                
                                const From_Reply_Desc = document.createElement('div');
                                From_Reply_Desc.classList.add('re-desc');
                                From_Reply_Desc.innerHTML = `[${lang.voice_chat}]`;
                                From_Reply.appendChild(From_Reply_Desc);
                            } else {
                                reKey = null;
                            }

                            const Cancel_Reply = document.createElement('button');
                            Cancel_Reply.classList.add('cancel-reply');
                            const Cancel_Reply_Symbol = document.createElement('i');
                            Cancel_Reply_Symbol.classList.add('fa-duotone', 'fa-circle-x');
                            Cancel_Reply.appendChild(Cancel_Reply_Symbol);
                            
                            reElement = Reply_Element;

                            if(footerTextarea.scrollHeight < 40) {
                                reElement.style.bottom = '40px';
                                mainArea.style.bottom = '86px';
                            } else {
                                reElement.style.bottom = '57px';
                                mainArea.style.bottom = '103px';
                            }
                            
                            Cancel_Reply.onclick = () => {
                                reKey = null;
                                Reply_Element.remove();
                                if(footerTextarea.scrollHeight < 40) {
                                    mainArea.style.bottom = '40px';
                                } else {
                                    mainArea.style.bottom = '57px';
                                }
                            }

                            Reply_Element.append(From_Reply, Cancel_Reply);
                            container.appendChild(Reply_Element);
                        }, edit(Option_Child) {
                            Option_Child.remove();
                            let f = chat.val().type;
                            if(f) return;
                        
                            popup.prompt({
                                msg: lang.edit_message,
                                textarea: true,
                                max: 300,
                                val: s.msg,
                                placeholder: lang.type_here,
                                onyes: (res) => {
                                    if(res.length < 1) return popup.alert(lang.your_chat_cannot);
                                    if(res.length > 300) return popup.alert(`${lang.your_text_1} ${res.length}<br/>${lang.your_text_2}`);

                                    update(ref(db, `${currentRoom}/${key}/${chat.key}`), {
                                        msg: res.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, ''),
                                        edited: true,
                                    }, (err) => {
                                        if(err) {
                                            popup.alert(err);
                                            reKey = null;
                                        } else {
                                            popup.alert({msg: lang.modified, type:'info'});
                                            reKey = null;
                                        }
                                    });
                                }
                            });

                        }, trash(Option_Child) {
                            Option_Child.remove();

                            popup.confirm({
                                msg: lang.do_delete_message,
                                onyes: () => {deleting()},
                                type: 'danger'
                            })

                            const deleting = () => {
                                let f = chat.val().type;

                                if(f === 'image' || f === 'file' || f === 'audio') {


                                    deleteObject(sref(storage, s.path)).then(() => {
                                        update(ref(db, `${currentRoom}/${key}/${chat.key}`), {type: 'deleted'});
                                        remove(ref(db, `${currentRoom}/${key}/${chat.key}/path`));
                                        popup.alert(lang.removed);
                                    }).catch((err) => console.log(err));
                                } else {
                                    update(ref(db, `${currentRoom}/${key}/${chat.key}`), {type: 'deleted', edited:false});
                                    popup.alert(lang.removed);
                                }
                            }
                        }
                    }

                    Top.appendChild(Name);
                    Top.appendChild(Option);
                    // SENDER >> TOP [END]

                    // SENDER >> MIDDLE [START]
                    const Middle = document.createElement('div');
                    Middle.classList.add('middle');
                    // SENDER >> MIDDLE >> <p/>
                    (() => { // MESSAGE
                        const Message = document.createElement('p');
                        const Message_Convert = (field, msg) => {
                            let show_max = false;
                            const ReadMore = document.createElement('a');
                            ReadMore.style.textDecoration = 'underline';
                            ReadMore.style.cursor = 'pointer';
                            ReadMore.innerText = lang.read_more;
                            field.innerText = msg.replace(/\n/g, ' ').substring(0, 100) + '... ';
                            field.innerHTML = parseMD(field.innerHTML);
                            field.appendChild(ReadMore);

                            ReadMore.onclick = () => {
                                if(show_max === false) {
                                    ReadMore.innerText = lang.read_less;
                                    field.innerText = msg + '\n';
                                    field.innerHTML = parseMD(field.innerHTML);
                                    field.appendChild(ReadMore);
                                    show_max = true;
                                } else {
                                    ReadMore.innerText = lang.read_more;
                                    field.innerText = msg.replace(/\n/g, ' ').substring(0, 100) + '... ';
                                    field.innerHTML = parseMD(field.innerHTML);
                                    field.appendChild(ReadMore);
                                    show_max = false;
                                }
                            }
                        }
                        const Check_Message_Length = (field, msg, max_length = 100) => {
                            if(msg.includes('\n')) {
                                let line_breaks = Array.from(msg);
                                let new_line = 0;
                                line_breaks.forEach((line_break) => {
                                    if(line_break == '\n') new_line++;
                                });
                                if(new_line > 5) {
                                    Message_Convert(field, msg);
                                } else {
                                    if(msg.length > max_length) {
                                        Message_Convert(field, msg);
                                    } else {
                                        Message.innerText = msg;
                                        Message.innerHTML = parseMD(Message.innerHTML);
                                    }
                                }
                            } else {
                                if(msg.length > max_length) {
                                    Message_Convert(field, msg);
                                } else {
                                    Message.innerText = msg;
                                    Message.innerHTML = parseMD(Message.innerHTML);
                                }
                            }
                        }
                        if(s.type === undefined) {
                            Check_Message_Length(Message, s.msg, 100);
                            Middle.appendChild(Message);
                        } else if(s.type === 'image') {
                            // SENDER >> MIDDLE >> PICTURE
                            const Picture = document.createElement('div');
                            Picture.classList.add('picture');
                            // SENDER >> MIDDLE >> PICTURE >> <img/>
                            const Img = document.createElement('img');
                            Img.setAttribute('src', s.msg);
                            Img.onerror = () => Img.setAttribute('src', '../data/img/error.jpg');
                            Picture.appendChild(Img);
                            Picture.onclick = () => {window.open(s.msg)};
                            Middle.prepend(Picture);
                            if(s.desc) {Check_Message_Length(Message, s.desc, 100);
                            Middle.appendChild(Message);}
                            Img.onload = () => {
                                if(disabledScroll === false || firstScroll === true) {
                                    setTimeout(() => {
                                        mainArea.scrollTop = mainArea.scrollHeight;
                                    }, 250);
                                }
                            }
                        } else if(s.type === 'file') {
                            Middle.innerHTML += `<chatroom-file src="${s.msg}">${s.desc}</chatroom-file>`;
                        } else if(s.type === 'audio') {
                            Middle.innerHTML += `<chatroom-audio src="${s.msg}"></chatroom-audio>`
                        } else {
                            const Deleted = document.createElement('i');
                            Deleted.classList.add('c-yellow');
                            Deleted.innerText = lang.has_been_deleted;
                            Message.appendChild(Deleted);
                            Middle.appendChild(Message);
                        }
                    })();
                    // SENDER >> MIDDLE [END]

                    // SENDER >> BOTTOM [START]
                    const Bottom = document.createElement('div');
                    Bottom.classList.add('bottom');
                    // SENDER >> BOTTOM >> TIME
                    (() => { // TIME
                        const Time = document.createElement('p');
                        Time.classList.add('time');
                        const time = s.time.toString();
                        const one = `${time.split('')[11]}${time.split('')[12]}`;
                        const two = `${time.split('')[3]}${time.split('')[4]}`;
                        const three = `${time.split('')[9]}${time.split('')[10]}`;
                        const four = `${time.split('')[1]}${time.split('')[2]}`;
                        const five = `${time.split('')[5]}${time.split('')[6]}${time.split('')[7]}${time.split('')[8]}`;
                        let utcDate = `${five}/${four}/${three} ${one}:${two}:00 UTC`;
                        let dt = new Date(utcDate);
                        const date = {
                            hour: dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours(),
                            minute: dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes(),
                            date: dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate(),
                            month: dt.getMonth() + 1 < 10 ? '0' + (dt.getMonth() + 1) : dt.getMonth() + 1,
                            year: dt.getFullYear(),
                        }
                        Time.innerText = `${date.hour}:${date.minute} - ${date.date}/${date.month}/${date.year}`;
                        Bottom.appendChild(Time);
                    })();
                    // SENDER >> BOTTOM >> EDITED
                    (() => { // EDITED
                        if(s.edited === true) {
                            const Edited = document.createElement('p');
                            Edited.classList.add('edited', 'c-yellow');
                            Edited.innerText = lang.edited;
                            Bottom.appendChild(Edited);
                        }
                    })();
                    // SENDER >> BOTTOM [END]

                    Sender.appendChild(Top);

                    // SENDER >> REPLIED [START]
                    (() => {
                        if(s.reKey) {
                            const Replied = document.createElement('div');
                            Replied.classList.add('replied');
                            Sender.classList.add(`replyto-${s.reKey}`);

                            get(ref(db, `${currentRoom}/${key}/${s.reKey}`)).then((reply) => {
                                if(reply.exists()) {
                                    
                                    get(ref(db, `users/${reply.val().gid}`)).then((u) => {
                                        let uname = u.val().username ? `@${u.val().username}` : u.val().displayName;
                                        uname.length > 15 ? uname.substring(0, 15) : uname;
                                        let t = reply.val().type;
                                        let c = reply.val();
    
                                        if(t === undefined) {
                                            const From = document.createElement('div');
                                            From.classList.add('from');
                                            const ReName = document.createElement('p');
                                            ReName.classList.add('re-name');
                                            ReName.innerText = uname;
                                            const ReDesc = document.createElement('p');
                                            ReDesc.classList.add('re-desc');
                                            ReDesc.innerText = c.msg.length > 30 ? `${c.msg.replace(/\n/g, ' ').substring(0, 30)}...` : c.msg.replace(/\n/g, ' ');
                                            ReDesc.innerHTML = parseMD(ReDesc.innerHTML);
    
                                            From.append(ReName, ReDesc);
                                            Replied.appendChild(From);
                                        } else if(t === 'image') {
                                            const ReImage = document.createElement('div');
                                            ReImage.classList.add('re-image');
                                            ReImage.style.backgroundImage = `url(${c.msg})`;
                                            Replied.appendChild(ReImage);
    
                                            const From = document.createElement('div');
                                            From.classList.add('from');
                                            const ReName = document.createElement('p');
                                            ReName.classList.add('re-name');
                                            ReName.innerText = uname;
                                            const ReDesc = document.createElement('p');
                                            ReDesc.classList.add('re-desc');
    
                                            if(c.desc) {
                                                ReDesc.innerText = c.desc.length > 30 ? `${c.desc.replace(/\n/g, ' ').substring(0, 30)}...` : c.desc.replace(/\n/g, ' ');
                                            } else {
                                                ReDesc.innerHTML = `<i class="fa-solid fa-image"></i> ${lang.picture}`;
                                            }
                                            From.append(ReName, ReDesc);
                                            Replied.appendChild(From);
                                        } else if(t === 'audio') {
                                            const From = document.createElement('div');
                                            From.classList.add('from');
                                            const ReName = document.createElement('div');
                                            ReName.classList.add('re-name');
                                            ReName.innerText = uname;
    
                                            const ReDesc = document.createElement('p');
                                            ReDesc.classList.add('re-desc');
                                            ReDesc.innerHTML = `<i class="fa-light fa-microphone"></i> ${lang.voice_chat}`;
    
                                            From.append(ReName, ReDesc);
                                            Replied.appendChild(From);
                                        } else if(t === 'file') {
                                            const From = document.createElement('div');
                                            From.classList.add('from');
                                            const ReName = document.createElement('div');
                                            ReName.classList.add('re-name');
                                            ReName.innerText = uname;
    
                                            const ReDesc = document.createElement('p');
                                            ReDesc.classList.add('re-desc');
                                            ReDesc.innerHTML = c.desc.length > 20 ? `<i class="fa-light fa-file"></i> ${c.desc.substring(0, 10)}...${c.desc.slice((Math.max(0, c.desc.lastIndexOf(".")) || Infinity) - 5)}` : `<i class="fa-light fa-file"></i> ${c.desc}`;
    
                                            From.append(ReName, ReDesc);
                                            Replied.appendChild(From);
                                        } else {
                                            const From = document.createElement('div');
                                            From.classList.add('from');
                                            const ReName = document.createElement('div');
                                            ReName.classList.add('re-name');
                                            ReName.innerText = uname;
    
                                            const ReDesc = document.createElement('p');
                                            ReDesc.classList.add('re-desc');
                                            ReDesc.innerHTML = `<i class="fa-light fa-comment-question"></i> ${lang.deleted}`;
    
                                            From.append(ReName, ReDesc);
                                            Replied.appendChild(From);
                                        }
                                    });
                                } else {
                                    const From = document.createElement('div');
                                    From.classList.add('from');
                                    const ReName = document.createElement('div');
                                    ReName.classList.add('re-name');
                                    ReName.innerText = lang.deleted;

                                    const ReDesc = document.createElement('p');
                                    ReDesc.classList.add('re-desc');
                                    ReDesc.innerHTML = `<i class="fa-light fa-comment-question"></i> ${lang.deleted}`;

                                    From.append(ReName, ReDesc);
                                    Replied.appendChild(From);
                                }
                            });
                            Sender.appendChild(Replied);
                        }
                    })();
                    // SENDER >> REPLIED [END]

                    Sender.append(Middle, Bottom);
                    untaian.appendChild(Sender);

                    mainArea.appendChild(untaian);
                    if(disabledScroll === false || firstScroll === true) {
                        mainArea.scrollTop = mainArea.scrollHeight;
                    }
                });
                container.appendChild(mainArea);
                
            }

            mainArea.onscroll = () => {
                if(mainArea.scrollHeight - mainArea.scrollTop < mainArea.clientHeight + 100) {
                    disabledScroll = false;
                    firstScroll = false;
                    const scrollNow_Before = mainArea.querySelector('.scroll-button');
                    if(scrollNow_Before) {
                        scrollNow_Before.remove();
                    }
                } else {
                    disabledScroll = true;

                    const scrollNow_Before = mainArea.querySelector('.scroll-button');
                    if(!scrollNow_Before) {
                        const scrollNow = document.createElement('button');
                        scrollNow.classList.add('scroll-button');
                        scrollNow.innerHTML = `<i class="fa-solid fa-chevron-down"></i>`;
                        scrollNow.onclick = () => mainArea.scrollTop = mainArea.scrollHeight;
                        mainArea.appendChild(scrollNow);
                    }
                }
            }
            

            (() => {
                const last_key = userLocale.state.cleared_chat[key];
                if(last_key && last_key !== null) {
                    showChat(true, query(ref(db, `${currentRoom}/${key}`), limitToLast(50), orderByKey(), startAt(`${(last_key+1).toString()}`)));
                } else {
                    showChat(true, query(ref(db, `${currentRoom}/${key}`), limitToLast(50), orderByKey(), startAt('0')));
                }
            })();

            onChildChanged(roomRef, (chat) => {
                const Changed = document.getElementById(chat.key);
                if(!Changed) return;
                const Message_Convert = (field, msg) => {
                    let show_max = false;
                    const ReadMore = document.createElement('a');
                    ReadMore.style.textDecoration = 'underline';
                    ReadMore.style.cursor = 'pointer';
                    ReadMore.innerText = lang.read_more;
                    field.innerText = msg.replace(/\n/g, ' ').substring(0, 100) + '... ';
                    field.innerHTML = parseMD(field.innerHTML);
                    field.appendChild(ReadMore);

                    ReadMore.onclick = () => {
                        if(show_max === false) {
                            ReadMore.innerText = lang.read_less;
                            field.innerText = msg + '\n';
                            field.innerHTML = parseMD(field.innerHTML);
                            field.appendChild(ReadMore);
                            show_max = true;
                        } else {
                            ReadMore.innerText = lang.read_more;
                            field.innerText = msg.replace(/\n/g, ' ').substring(0, 100) + '... ';
                            field.innerHTML = parseMD(field.innerHTML);
                            field.appendChild(ReadMore);
                            show_max = false;
                        }
                    }
                }
                const Check_Message_Length = (field, msg, max_length = 100) => {
                    if(msg.includes('\n')) {
                        let line_breaks = Array.from(msg);
                        let new_line = 0;
                        line_breaks.forEach((line_break) => {
                            if(line_break == '\n') new_line++;
                        });
                        if(new_line > 5) {
                            Message_Convert(field, msg);
                        } else {
                            if(msg.length > max_length) {
                                Message_Convert(field, msg);
                            } else {
                                field.innerText = msg;
                                field.innerHTML = parseMD(field.innerHTML);
                            }
                        }
                    } else {
                        if(msg.length > max_length) {
                            Message_Convert(field, msg);
                        } else {
                            field.innerText = msg;
                            field.innerHTML = parseMD(field.innerHTML);
                        }
                    }
                }
                (() => {
                    if(!Changed.querySelector('.sender .bottom .edited')){
                        Changed.querySelector('.sender .bottom').innerHTML += `<p class="edited c-yellow">${lang.edited}</p>`;
                    }
                    const ReplyChanged = document.querySelectorAll(`.replyto-${chat.key}`);
                    if(ReplyChanged) {
                        ReplyChanged.forEach((changeElement) => {
                            Check_Message_Length(changeElement.querySelector('.from .re-desc'), chat.val().msg, 100);
                        });
                    }
                    if(chat.val().type === undefined) {
                        Check_Message_Length(Changed.querySelector(`.sender .middle p`)||Changed.querySelector(`.sender .middle`), chat.val().msg, 100);
                    } else {
                        if(Changed.querySelector(`.sender .middle`)) {
                            Changed.querySelector(`.sender .middle`).innerHTML = `<p><i class="c-yellow">${lang.has_been_deleted}</i></p>`;
                        }
                        const imageChanged = Changed.querySelector('.sender .middle .picture');
                        if(imageChanged) {
                            imageChanged.remove();
                        }
                        if(ReplyChanged) {
                            ReplyChanged.forEach((changeElement) => {
                                if(changeElement.querySelector('.replied .re-image')) {
                                    changeElement.querySelector('.replied .re-image').remove();
                                }

                                if(changeElement.querySelector('.from .re-desc')) {
                                    changeElement.querySelector('.from .re-desc').innerHTML = `<p><i class="c-yellow">${lang.has_been_deleted}</i></p>`;
                                }
                            })
                        }
                    }

                })();
            });

            onChildRemoved(roomRef, (chat) => {
                const Removed = document.getElementById(chat.key);
                if(!Removed) return;
                Removed.remove();
            });

            window.onunload = () => {
                off(roomRef);
            }

        }, footer(key) {
            const footerTextareaBefore = container.querySelector('footer');
            if(footerTextareaBefore) footerTextareaBefore.remove();
            const element = document.createElement('footer');
            element.innerHTML = (`
                <div class="inputs">
                    <button id="emoji-input">
                        <i class="fa-light fa-face-smile"></i>
                    </button>
                    <textarea maxlength="300" name="text-input" id="text-input" placeholder="${lang.type_here}"></textarea>
                    <button id="file-input">
                        <i class="fa-solid fa-paperclip"></i>
                    </button>
                    <button id="picture-input">
                        <i class="fa-solid fa-camera-retro"></i>
                    </button>
                </div>
                <button class="send-button" data-button="send">
                    <i class="fa-solid fa-microphone"></i>
                </button>
            `);
            container.appendChild(element);

            const inputs = element.querySelector('.inputs');
            const textarea = element.querySelector(`textarea`);
            textarea.focus();

            
            
            
            
            footerTextarea = textarea;

            textarea.onkeyup = () => typingLogic();
            textarea.onkeydown = () => typingLogic();
            textarea.onfocus = () => typingLogic();
            
            let textSend = false;

            const pictureInput = element.querySelector('#picture-input');
            const fileInput = element.querySelector('#file-input');
            const emojiInput = element.querySelector('#emoji-input');
            
            const sendBtn = element.querySelector(`[data-button="send"]`);
            const typingLogic = () => {
                textarea.value = textarea.value.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, '');


                textarea.style.height = '17px';
                let scHeigth = textarea.scrollHeight;
                textarea.style.height = `${scHeigth}px`;
                element.style.height = `${scHeigth + 23}px`;
                inputs.style.height = `${scHeigth + 18}px`;

                if(reKey === null) {
                    if(scHeigth < 40) {
                        mainArea.style.bottom = `${scHeigth + 23}px`;
                    }
                } else {
                    if(scHeigth < 40) {
                        if(reElement) reElement.style.bottom = `${scHeigth + 23}px`;
                        mainArea.style.bottom = `${scHeigth + 69}px`;
                    }
                }

                let micButton = sendBtn.querySelector(`i`);
                if(textarea.value.length >= 1) {
                    micButton.classList.remove('fa-microphone');
                    micButton.classList.add('fa-angles-right');
                    textSend = true;
                } else {
                    micButton.classList.remove('fa-angles-right');
                    micButton.classList.add('fa-microphone');
                    textSend = false;
                }

            }

            sendBtn.onclick = async () => {
                if(textSend === false) return voiceSend(sendBtn, inputs);
                if(textarea.value.length < 1) return voiceSend(sendBtn, inputs);
                if(textarea.value.length > 300) return popup.alert(`${lang.your_text_1} ${textarea.value.length} ${lang.your_text_2}`);

                let savedText = textarea.value;

                const apiKey = "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";
                const preText = 
                "I will give you text,you just have to reply 'yes' if you find it offesive or abusive or something that is kind of cyberbullying or any type of racisms like calling fat or black person/boy etc and anything you find like cyberbyllying,else reply 'no'.,bye is not an offensive of abusive or cyberbullying word,so you can reply 'no' for that. "; //pretext for chatbot
                const response = await axios.post(
                    "https://api.openai.com/v1/completions",
                    {
                      prompt: preText + `${savedText}`,
                      model: "text-davinci-003",
                      temperature: 0,
                      max_tokens: 500,
                      top_p: 1,
                      frequency_penalty: 0.0,
                      presence_penalty: 0.0,
                    },
                    {
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                      },
                    }
                  );
                const chatbotResponse = response.data.choices[0].text;
                if(chatbotResponse.includes("Yes")){ //if chatbot response includes yes
                    popup.alert("Please use appropriate language")
                } else{

                

                textarea.value = '';
                let untaian = document.createElement('div');
                untaian.classList.add('card-chat', 'our');
                untaian.innerHTML = (`
                <div class="sender">
                    <div class="top">
                        <p class="username"><i>~ ${lang.loading}</i></p>
                        <p></p>
                    </div>
                    <div class="middle">
                        <p></p>
                    </div>
                    <div class="bottom">
                        <p class="time"><i class="fa-regular fa-clock"></i> ${lang.sending}</p>
                    </div>
                </div>
                `);
                untaian.querySelector(`.sender .middle p`).innerText = savedText.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, '');
                mainArea.appendChild(untaian);
                mainArea.scrollTop = mainArea.scrollHeight;

                let one = new Date().getUTCHours();
                if(one < 10) one = '0' + one;
                let two = new Date().getUTCMinutes();
                if(two < 10) two = '0' + two;
                let three = new Date().getUTCDate();
                if(three < 10) three = '0' + three;
                let four = new Date().getUTCMonth();
                four = four + 1;
                if(four < 10) four = '0' + four;
                let five = new Date().getUTCFullYear();
                if(five < 10) five = '0' + five;

                let dataSend = null;
                if(reKey === null) {
                    dataSend = {
                        gid: currentID,
                        msg: savedText.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, ''),
                        time: parseInt(`7${four}${two}${five}${three}${one}`),
                    }
                } else {
                    dataSend = {
                        gid: currentID,
                        msg: savedText.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, ''),
                        time: parseInt(`7${four}${two}${five}${three}${one}`),
                        reKey
                    }
                }

                set(ref(db, `${currentRoom}/${key}/${new Date().getTime().toString()}`), dataSend).then(() => untaian.remove()).catch((err) => popup.alert(err));

                reKey = null;
                if(reElement !== null) reElement.remove();
                reElement = null;
                savedText = '';
                typingLogic();
                textarea.focus();
                }
            }

            let chunks = [];
            let recorder = undefined;
            const voiceSend = (btnIcon, input) => { // audio send
                // input.style.visibility = 'hidden';
                const micIcon = btnIcon.querySelector(`i`);

                let device = navigator.mediaDevices.getUserMedia({audio: true}); // get audio
                device.then((stream) => {
                    if(recorder === undefined) {
                        recorder = new MediaRecorder(stream);
                        recorder.ondataavailable = (e) => {
                            chunks.push(e.data);
                            if(recorder.state == 'inactive') {
                                let blob = new Blob(chunks, {
                                    type: 'audio/webm'
                                });
                                input.style.visibility = 'visible';
                                const reader = new FileReader();
                                const getTime = new Date().getTime().toString();
                                reader.addEventListener('load', function() {
                                    const path = (`audio/${auth.currentUser.uid}/${getTime}.opus`);
                                    const voiceUp = uploadBytesResumable(sref(storage, path), e.data);

                                    const uploadElement = document.createElement('div');
                                    uploadElement.classList.add('card-chat', 'our');
                                    uploadElement.innerHTML = (`
                                        <div class="sender">
                                            <div class="middle">
                                                <p>${lang.converting}..</p>
                                            </div>
                                        </div>
                                    `);

                                    mainArea.appendChild(uploadElement);
                                    mainArea.scrollTop = mainArea.scrollHeight;
                                    
                                    mainArea.style.bottom = '40px';
                                    if(reElement !== null) reElement.remove();
                                    reElement = null;
                                    

                                    voiceUp.on('state_changed', (snapshot) => { //progress
                                        let progress = Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                                        uploadElement.querySelector(`.sender .middle p`).innerHTML = `${lang.converting_voice}: ${progress}%`;
                                    }, (err) => {
                                        return popup.alert(err);
                                    }, () => {

                                        let one = new Date().getUTCHours();
                                        if(one < 10) one = '0' + one;
                                        let two = new Date().getUTCMinutes();
                                        if(two < 10) two = '0' + two;
                                        let three = new Date().getUTCDate();
                                        if(three < 10) three = '0' + three;
                                        let four = new Date().getUTCMonth();
                                        four = four + 1;
                                        if(four < 10) four = '0' + four;
                                        let five = new Date().getUTCFullYear();
                                        if(five < 10) five = '0' + five;

                                        getDownloadURL(voiceUp.snapshot.ref).then((voiceURL) => {

                                            let dataSend = null;
                                            if(reKey === null) {
                                                dataSend = {
                                                    gid: currentID,
                                                    msg: voiceURL,
                                                    time: parseInt(`7${four}${two}${five}${three}${one}`),
                                                    type: 'audio',
                                                    path,
                                                }
                                            } else {
                                                dataSend = {
                                                    gid: currentID,
                                                    msg: voiceURL,
                                                    time: parseInt(`7${four}${two}${five}${three}${one}`),
                                                    type: 'audio',
                                                    path, reKey
                                                }
                                            }

                                            set(ref(db, `${currentRoom}/${key}/${getTime}`), dataSend);
                                            reKey = null;
                                            uploadElement.remove();
                                        });
                                    })  
                                }, false);
                                reader.readAsDataURL(blob);
                            }
                        }
                        recorder.start();
                        micIcon.classList.remove('fa-microphone');
                        micIcon.classList.add('fa-stop');
                    }
                })
                if(recorder !== undefined) {    // stop
                    if(micIcon.classList.contains('fa-stop')) {
                        recorder.stop();
                        mainArea.style.bottom = '40px';
                        if(reElement !== null) reElement.remove();
                        reElement = null;
                        micIcon.classList.remove('fa-stop');
                        micIcon.classList.add('fa-microphone');
                        input.style.visibility = 'visible';
                    } else {
                        chunks = [];
                        recorder.start();
                        micIcon.classList.remove('fa-microphone');
                        micIcon.classList.add('fa-stop');
                        input.style.visibility = 'hidden';
                    }
                }
            }

            pictureInput.onclick = () => createInput.startPicture(key);
            fileInput.onclick = () => createInput.startFile(key);
            emojiInput.onclick = () => createInput.startEmoji(textarea, emojiInput);

        }, init(theirKey, people) {
            container.innerHTML = '';
            this.header(theirKey, people);
            this.main(theirKey);
            this.footer(theirKey);
        }
    }

    const createInput = {
        inputElement: null,
        emojiElement: null,
        startPicture(key) {

            const pictInput = document.createElement('input')
            pictInput.setAttribute('type', 'file');
            pictInput.setAttribute('accept', 'image/*');
            pictInput.click();

            pictInput.onchange = () => { // picture input extension and size control
                const ext = pictInput.value.slice((Math.max(0, pictInput.value.lastIndexOf(".")) || Infinity) + 1);
                const valid = ["jpg", "jpeg", "png", "webp"];
                const file = pictInput.files[0];
                const inp = file.size / 1053818;
                const size = Math.ceil(inp * Math.pow(10, 2)) / Math.pow(10, 2);

                if(!valid.includes(ext.toLowerCase())) return popup.alert(lang.failed_format);
                if(file.size > 2102394) return popup.alert(`${lang.failed_size_1} ${size} ${lang.failed_size_2}`);

                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const element = document.createElement('div');
                    element.classList.add('Chat-Attach');
                    element.innerHTML = (`
                        <div class="image-preview">
                            <img src="${reader.result}" alt="${file.name}"/>
                        </div>
                        <textarea maxlength="300" id="about-file" placeholder="${lang.description_here}.."></textarea>
                        <div class="buttons">
                            <button data-button="cancel-file"><i class="fa-duotone fa-circle-x"></i> ${lang.cancel}</button>
                            <button data-button="send-file"><i class="fa-duotone fa-circle-check"></i> ${lang.send}</button>
                        </div>
                    `);
                    this.inputElement = element;
                    const textPicture = element.querySelector(`#about-file`);
                    
                    textPicture.onkeydown = () => textReplace();
                    textPicture.onkeyup = () => textReplace();

                    const textReplace = () => {
                        textPicture.value =  textPicture.value.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, '');
                    }

                    const cancel = element.querySelector(`.buttons [data-button="cancel-file"]`);
                    cancel.onclick = () => {
                        this.end();
                        pictInput.remove();
                    }
                    const sendFile = element.querySelector(`.buttons [data-button="send-file"]`);
                    sendFile.onclick = () => {

                        if(textPicture.value.length > 300) return popup.alert(`${lang.your_text_1} ${textPicture.value.length} ${lang.your_text_2}`);
                        
                        mainArea.style.bottom = '40px';
                        element.remove();
                        pictureSend(textPicture.value, file, ext);
                    }
                    container.appendChild(element);
                    textPicture.focus();
                }

            }
            const pictureSend = (desc, file, ext) => { //send picture
                const getTime = new Date().getTime().toString();
                const path = (`image/${auth.currentUser.uid}/${getTime}.${ext}`);
                const pictureUp = uploadBytesResumable(sref(storage, path), file);

                const uploadElement = document.createElement('div');
                uploadElement.classList.add('card-chat', 'our');
                uploadElement.innerHTML = (`
                    <div class="sender">
                        <div class="middle">
                            <p>${lang.uploading}..</p>
                        </div>
                    </div>
                `);

                mainArea.style.bottom = '40px';
                mainArea.appendChild(uploadElement);

                mainArea.scrollTop = mainArea.scrollHeight;
                if(reElement !== null) reElement.remove();
                reElement = null;

                pictureUp.on('state_changed', (snapshot) => { //progress 
                    let progress = Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    uploadElement.querySelector(`.sender .middle p`).innerHTML = `${lang.uploading}: ${progress}%`;
                }, (err) => {
                    return popup.alert(err);
                }, () => {
                    let one = new Date().getUTCHours();
                    if(one < 10) one = '0' + one;
                    let two = new Date().getUTCMinutes();
                    if(two < 10) two = '0' + two;
                    let three = new Date().getUTCDate();
                    if(three < 10) three = '0' + three;
                    let four = new Date().getUTCMonth();
                    four = four + 1;
                    if(four < 10) four = '0' + four;
                    let five = new Date().getUTCFullYear();
                    if(five < 10) five = '0' + five;

                    getDownloadURL(pictureUp.snapshot.ref).then((pictureURL) => { // pictureURL 
                        let dataSend = null;
                
                        if(reKey === null) {
                            if(desc.length < 1) {
                                dataSend = {
                                    gid: currentID,
                                    msg: pictureURL,
                                    time: parseInt(`7${four}${two}${five}${three}${one}`),
                                    type: 'image',
                                    path,
                                }
                            } else {
                                dataSend = {
                                    gid: currentID,
                                    msg: pictureURL,
                                    time: parseInt(`7${four}${two}${five}${three}${one}`),
                                    desc: desc.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, ''),
                                    type: 'image',
                                    path,
                                }
                            }
                        } else {
                            if(desc.length < 1) {
                                dataSend = {
                                    gid: currentID,
                                    msg: pictureURL,
                                    time: parseInt(`7${four}${two}${five}${three}${one}`),
                                    type: 'image',
                                    path, reKey
                                }
                            } else {
                                dataSend = {
                                    gid: currentID,
                                    msg: pictureURL,
                                    time: parseInt(`7${four}${two}${five}${three}${one}`),
                                    desc: desc.replace(/^\s+/g, '').replace(/ +(?= )/g,'').replace(/^\n+/g, '').replace(/\n /g, '\n').replace(/\n+(?=\n\n)/g, ''),
                                    type: 'image',
                                    path, reKey
                                }
                            }
                        }
                        
                        set(ref(db, `${currentRoom}/${key}/${getTime}`), dataSend);
                        reKey = null;
                        uploadElement.remove();
                    })
                })
            }
        },
        startFile(key) { // file send start function
            const fileInput = document.createElement('input');
            fileInput.setAttribute('type', 'file');
            fileInput.click();
            fileInput.onchange = () => {
                const ext5 = fileInput.value.slice((Math.max(0, fileInput.value.lastIndexOf(".")) || Infinity) - 5);
                const ext = fileInput.value.slice((Math.max(0, fileInput.value.lastIndexOf(".")) || Infinity) + 1);
                const file = fileInput.files[0];
                const inp = file.size / 1053818;
                const size = Math.ceil(inp * Math.pow(10, 2)) / Math.pow(10, 2);

                if(file.size > 2102394) return popup.alert(`${lang.failed_size_1} ${size} ${lang.failed_size_2}`);

                
                const element = document.createElement('div');
                element.classList.add('Chat-Attach');
                element.innerHTML = (`
                    <div class="file-preview">
                        <p data-file="file-name"><i class="fa-light fa-file"></i> ${file.name.length > 20 ? `${file.name.substring(0, 10)} ... ${ext5}` : file.name}</p>
                    </div>
                    <div class="buttons">
                        <button data-button="cancel-file"><i class="fa-duotone fa-circle-x"></i> ${lang.cancel}</button>
                        <button data-button="send-file"><i class="fa-duotone fa-circle-check"></i> ${lang.send}</button>
                    </div>
                `);
                this.inputElement = element;
                const cancel = element.querySelector('.buttons [data-button="cancel-file"]');
                cancel.onclick = () => this.end();

                const sendFile = element.querySelector(`.buttons [data-button="send-file"]`);
                sendFile.onclick = () => {
                    element.remove();
                    mainArea.style.bottom = '40px';
                    fileSend(file, ext);
                }

                container.appendChild(element);
            }
            const fileSend = (file, ext) => { // Send File Function
                const getTime = new Date().getTime().toString();
                const path = (`file/${auth.currentUser.uid}/${getTime}.${ext}`);
                const fileUp = uploadBytesResumable(sref(storage, path), file);

                const uploadElement = document.createElement('div');
                uploadElement.classList.add('card-chat', 'our');
                uploadElement.innerHTML = (`
                    <div class="sender">
                        <div class="middle">
                            <p>${lang.uploading}.</p>
                        </div>
                    </div>
                `);

                mainArea.style.bottom = '40px';

                mainArea.appendChild(uploadElement);
                mainArea.scrollTop = mainArea.scrollHeight;
                

                if(reElement !== null) reElement.remove();
                reElement = null;

                fileUp.on('state_changed', (snapshot) => { // Upload Progress Event Listener and time out event listener if upload failed or slow connection  
                    let progress = Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    uploadElement.querySelector(`.sender .middle p`).innerHTML = `${lang.uploading}: ${progress}%`;
                }, (err) => {
                    return popup.alert(err);
                }, () => {
                    let one = new Date().getUTCHours();
                    if(one < 10) one = '0' + one;
                    let two = new Date().getUTCMinutes();
                    if(two < 10) two = '0' + two;
                    let three = new Date().getUTCDate();
                    if(three < 10) three = '0' + three;
                    let four = new Date().getUTCMonth();
                    four = four + 1;
                    if(four < 10) four = '0' + four;
                    let five = new Date().getUTCFullYear();
                    if(five < 10) five = '0' + five;
                    getDownloadURL(fileUp.snapshot.ref).then((fileURL) => {

                        let dataSend = null;

                        if(reKey === null) {
                            dataSend = {
                                gid: currentID,
                                msg: fileURL,
                                time: parseInt(`7${four}${two}${five}${three}${one}`),
                                desc: file.name,
                                type: 'file',
                                path,
                            }
                        } else {
                            dataSend = {
                                gid: currentID,
                                msg: fileURL,
                                time: parseInt(`7${four}${two}${five}${three}${one}`),
                                desc: file.name,
                                type: 'file',
                                path, reKey
                            }
                        }

                        set(ref(db, `${currentRoom}/${key}/${getTime}`), dataSend);
                        reKey = null;
                        uploadElement.remove();
                    });
                });
            }
        },
        startEmoji(textarea, emojiInput){       // Emoji Start Function 
            if(this.emojiElement === null) {
                const element = document.createElement('div');
                element.classList.add('Emoji-Attach');   
                let face = '';
                for(let i = 128512; i <= 129488; i++) {
                    face += `<span>&#${i};</span>`;
                }
                element.innerHTML = face;

                element.querySelectorAll('span').forEach((emot) => {
                    emot.onclick = () => {
                        textarea.value += emot.innerHTML;
                        textarea.focus();
                    }
                });
                this.emojiElement = element;
                element.remove();

                textarea.onkeypress = () => {
                    if(this.emojiElement !== null) {
                        this.emojiElement.remove();
                        this.emojiElement = null;
                        emojiInput.innerHTML = `<i class="fa-light fa-face-smile"></i>`;
                    }
                }
                textarea.focus();
                emojiInput.innerHTML = `<i class="fa-solid fa-x"></i>`
                container.appendChild(this.emojiElement);
            } else {
                this.emojiElement.remove();
                this.emojiElement = null;
                emojiInput.innerHTML = `<i class="fa-light fa-face-smile"></i>`;
            }
            


        },
        end() {
            container.removeChild(this.inputElement);
            this.inputElement = null;
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
        
        lang = getLang[currentLang].Chat;
    }
    langCheker();

    onAuthStateChanged(auth, (user) => {    // Check if user is logged in
        if(user) {
            const urlParam = new URLSearchParams(window.location.search);
            getID(user).then((res) => {
                currentID = res;
                getRoomURL(urlParam);
            });

        } else {
            window.location.href = `${window.location.origin}/Online/loginOn.html`;
        }
    })
})();