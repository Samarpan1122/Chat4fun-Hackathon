let userLocale = {
    state: {
        last_lang: null,
        last_theme: null,
        last_page: null,
        cleared_chat: {
            handler: null
        }
    },
    action: {
        cahngeLang(data) {
            userLocale.state.last_lang = data;
            userLocale.onData.save();
        },
        changeTheme(data) {
            userLocale.state.last_theme = data;
            userLocale.onData.save();
        },
        changePage(data) {
            userLocale.state.last_page = data;
            userLocale.onData.save();
        },
        changeCleared(key, value) {
            userLocale.state.cleared_chat[key] = value;
            userLocale.onData.save();
        }
    },
    onData: {
        save() {
            window.localStorage.setItem('chatroom_user_data', JSON.stringify({
                state: {
                    last_lang: userLocale.state.last_lang,
                    last_theme: userLocale.state.last_theme,
                    last_page: userLocale.state.last_page,
                    cleared_chat: userLocale.state.cleared_chat
                }
            }));
        }, find() {
            try {
                const lastData = window.localStorage.getItem('chatroom_user_data');
                return lastData ? JSON.parse(lastData) : null;
            } catch {
                return null;
            }
        }, load() {
            const lastData = this.find();
            if(lastData) {
                Object.keys(userLocale.state).forEach((key) => {
                    userLocale.state[key] = lastData.state[key];


                })
            }
        }, delete() {
            window.localStorage.removeItem('chatroom_user_data');
        }
    }
}

userLocale.onData.load();
if(userLocale.state.last_theme == 'light') {
    if(document.body.classList.contains('dark')) {
        document.body.classList.remove('dark');
    }
} else {
    document.body.classList.add('dark');
}