const firebaseConfig = {
  apiKey: "AIzaSyDPDtZsGgltEXZY6wcxlWHXEnJ6JypMuhU",
  authDomain: "music-mylink.firebaseapp.com",
  projectId: "music-mylink",
  storageBucket: "music-mylink.firebasestorage.app",
  messagingSenderId: "739219345122",
  appId: "1:739219345122:web:f2b7cc0ea336e56d8a58bb",
  measurementId: "G-7ELE7ZK1RB"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
