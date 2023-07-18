import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-database.js";
import { firebaseConfig } from '../../data/js/config.js';

const isAccountExist = async(acc) => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    let accRef = ref(db, 'accounts/' + acc.uid);
    let uRef = ref(db, 'users')
    await get(accRef).then(async(account) => {
        if(!account.exists()) {
            await get(uRef).then(async(lists) => {
                let numbers = ['0','1','2','3','4','5','6','7','8','9','2','4','1','3','5','0','7','9','8'];
                let normalID = `7${numbers[Math.floor(Math.random() * numbers.length)]}${numbers[Math.floor(Math.random() * numbers.length)]}000`;
                let globalID = parseInt(normalID);
                if(lists.exists()) {
                    let newID = globalID + lists.size + 1;
                    await set(accRef, {
                        gid: newID.toString()
                    }).then(async() => {
                        await set(child(uRef, newID.toString()), {
                            displayName: acc.displayName || `user${newID}`,
                            photoURL: acc.photoURL || '../../data/img/profile.jpg', 
                        });
                    }).catch(async(err) => {
                        console.log(err);
                    });
                } else {
                    let newID = globalID + 1;                    
                    await set(accRef, {
                        gid: newID.toString()
                    }).then(async() => {
                        await set(child(uRef, newID.toString()), {
                            displayName: acc.displayName || `user${newID}`,
                            photoURL: acc.photoURL || '../../data/img/profile.jpg',
                        });
                    }).catch(async(err) => {
                        console.log(err);
                    })
                }
            });
        }
    });
}
export const getID = async (user) => {
    const db = getDatabase();
    let thisID = null;
    await isAccountExist(user).then(async () => {
        await get(ref(db, 'accounts/' + user.uid)).then((datas) => {
            if(datas.exists()) thisID = datas.val().gid;
        });
    })
    return thisID;
}