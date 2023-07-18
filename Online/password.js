        // Import the functions you need from the SDKs you need
        import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
        import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";
        import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider, updatePassword } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
        import { firebaseConfig } from '/Online/data/js/config.js';
        import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-database.js";
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/contacts.readonly');

        
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const analytics = getAnalytics(app);
        const db = getDatabase(app);
        const emailInput = document.getElementById("email");


// Get the submit button
const submitBtn = document.getElementById("submitBtn");

// Get the Auth object for the default app
const auth = getAuth();

// Add event listener to submit button
submitBtn.addEventListener("click", (e) => {
  e.preventDefault();

  const email = emailInput.value;
  sendPasswordResetEmail(auth, email)
  .then(() => {
    console.log("Password reset email sent!");
    alert("Password reset email sent!");
    window.location.replace("loginOn.html");
    // Password reset email sent!
    // ..
  })
  .catch((error) => {
    alert("no user found");
    const errorCode = error.code;
    const errorMessage = error.message;
    // ..
  });
});
