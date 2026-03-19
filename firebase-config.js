const firebaseConfig = {
  apiKey: "AIzaSyACU8Slf3gDQricK3UcI10NFzKJGmk2x0I",
  authDomain: "milreis.firebaseapp.com",
  projectId: "milreis",
  storageBucket: "milreis.firebasestorage.app",
  messagingSenderId: "118772353218",
  appId: "1:118772353218:web:4d391a30549075be2f935b",
  measurementId: "G-HDMRCVFLY9"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();