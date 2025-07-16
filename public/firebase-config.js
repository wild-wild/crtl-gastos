// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDKcnEELcrc5mnCg6Pc1SDL33rFta4S1Rc",
    authDomain: "ctrl-pay.firebaseapp.com",
    projectId: "ctrl-pay",
    storageBucket: "ctrl-pay.appspot.com",   // ⚠ Ojo: debería terminar en `.appspot.com` no `.storage.app`
    messagingSenderId: "821834498554",
    appId: "1:821834498554:web:fa2f917da2acd920a96443",
    measurementId: "G-M5FD5W16CH"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();


{/* <script type="module">
  // Import the functions you need from the SDKs you need
    import {initializeApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
    import {getAnalytics} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
    // TODO: Add SDKs for Firebase products that you want to use
    // https://firebase.google.com/docs/web/setup#available-libraries

    // Your web app's Firebase configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
        apiKey: "AIzaSyDKcnEELcrc5mnCg6Pc1SDL33rFta4S1Rc",
    authDomain: "ctrl-pay.firebaseapp.com",
    projectId: "ctrl-pay",
    storageBucket: "ctrl-pay.firebasestorage.app",
    messagingSenderId: "821834498554",
    appId: "1:821834498554:web:fa2f917da2acd920a96443",
    measurementId: "G-M5FD5W16CH"
  };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
</script> */}
