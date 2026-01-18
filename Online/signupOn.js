// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";
import { getAuth, updateProfile, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-database.js";
import { firebaseConfig } from '/Online/data/js/config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const nameInput = document.getElementById("name");
// Get the submit button
const submitBtn = document.getElementById("submitBtn");

// Get the Auth object for the default app
const auth = getAuth();

// Add event listener to submit button
submitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const name = nameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;

    // Create a new user with the given email and password
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            updateProfile(user, {
                displayName: name
            }).then(() => {
                // Profile updated!
                // Store user data in the database
                set(ref(db, "user/" + user.uid), {
                    name: name,
                    email: email,
                    // Do not store passwords in the database
                })
                .then(() => {
                    console.log("Data added successfully");
                    sendEmailVerification(user)
                        .then(() => {
                            console.log("Email verification sent");
                            window.location.href = "loginOn.html";
                        })
                        .catch((error) => {
                            console.error("Error sending email verification", error);
                        });
                })
                .catch((error) => {
                    console.error("Error writing data to database", error);
                });
            })
            .catch((error) => {
                console.error("Error updating profile", error);
            });
        })
        .catch((error) => {
            console.error("Error creating user", error);
            alert("Error creating user: " + error.message);
        });
});
```

// Security Fixes:
// 1. Corrected import statements to ensure proper syntax and functionality.
// 2. Updated deprecated Firebase API usage to the latest methods.
// 3. Removed password storage in the database for security reasons.