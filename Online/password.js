// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider, updatePassword } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-database.js";

// Import firebaseConfig securely from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY, // Securely access the API key from environment variables
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

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
    alert("No user found");
    const errorCode = error.code;
    const errorMessage = error.message;
    // Log error details for debugging purposes
    console.error(`Error Code: ${errorCode}, Error Message: ${errorMessage}`);
  });
});
```