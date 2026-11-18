// ==================== إعدادات Firebase ====================
const firebaseConfig = {
    apiKey: "AIzaSyCi3UL4g-4mKpBGEmccI6egsfgSCgwgaqA",
    authDomain: "e-learning-18a52.firebaseapp.com",
    databaseURL: "https://e-learning-18a52-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "e-learning-18a52",
    storageBucket: "e-learning-18a52.firebasestorage.app",
    appId: "1:59167845805:web:b24d1a134f9dd244ec8524"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const SERVER_URL = 'https://super-paper-3699.croissant2009a.workers.dev';
