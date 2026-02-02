
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyDyX9Urt6DGU0uWfOR9YwmwnMTHYt9T64E",
  authDomain: "device-streaming-66ea969e.firebaseapp.com",
  projectId: "device-streaming-66ea969e",
  storageBucket: "device-streaming-66ea969e.firebasestorage.app",
  messagingSenderId: "612374627190",
  appId: "1:612374627190:web:29be987ecb638436197057"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

export default firebaseApp;
