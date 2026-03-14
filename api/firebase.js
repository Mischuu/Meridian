// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDRldwJTYPn1chtDnoCAO5FoqQaeuqmeR0",
  authDomain: "meridian-1b7e7.firebaseapp.com",
  projectId: "meridian-1b7e7",
  storageBucket: "meridian-1b7e7.firebasestorage.app",
  messagingSenderId: "779490384069",
  appId: "1:779490384069:web:ca31e77bd65c8cb90638ac",
  measurementId: "G-8DRWLVVRN4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);