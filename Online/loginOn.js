        // Import the functions you need from the SDKs you need
        import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
        import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";
        import { getAuth, signInWithEmailAndPassword , signInWithPopup, GoogleAuthProvider, updatePassword } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
        import { firebaseConfig } from '/Online/data/js/config.js';
        import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-database.js";
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/contacts.readonly');

        
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const analytics = getAnalytics(app);
        const db = getDatabase(app);
        const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// Get the submit button
const submitBtn = document.getElementById("submitBtn");

// Get the Auth object for the default app
const auth = getAuth();

const gmailLogin = document.getElementById("Gmail");
gmailLogin.addEventListener("click", (e) => {
  e.preventDefault();
signInWithPopup(auth, provider)
  .then((result) => {
    // This gives you a Google Access Token. You can use it to access the Google API.
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential.accessToken;
    // The signed-in user info.
    const user = result.user;


    // onAuthStateChanged(auth, (user) => {
    //   if (user) {
    //     const usersRef = ref(db, "user");
    //     get(usersRef).then((snapshot) => {
    //       const userSnapshot = snapshot.child(user.uid);
    //       if (userSnapshot.exists()) {
    //       const userPass = userSnapshot.child("password").val();
    //       console.log(userPass);
    //       const user = auth.currentUser;
    //       updatePassword(user, userPass).then(() => {
    //         // Update successful.
    //       }).catch((error) => {
    //         // An error ocurred
    //         // ...
    //       });
          
    //     }
    //     });
    //   }
    // });
    // IdP data available using getAdditionalUserInfo(result)
    // ...
    window.location.href = "/Online/dashboard/";
  }).catch((error) => {
    // Handle Errors here.
    const errorCode = error.code;
    const errorMessage = error.message;
    // The email of the user's account used.
    const email = error.customData.email;
    // The AuthCredential type that was used.
    const credential = GoogleAuthProvider.credentialFromError(error);
    // ...
  });
});

// Add event listener to submit button
submitBtn.addEventListener("click", (e) => {
  e.preventDefault();

  const email = emailInput.value;
  const password = passwordInput.value;
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // User is signed in
      const user = userCredential.user;
      // Redirect to home page
      window.location.href = "dashboard/";
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;

      // Handle errors
      alert(errorMessage);
    });
});
