// Firebase Realtime Database for Merge Master 2048
// Client-side only - works with static export

import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyBVXOjeN8VspUQuDh2g7yEGUDld7CLOcMg",
  authDomain: "game-dcef2.firebaseapp.com",
  databaseURL: "https://game-dcef2-default-rtdb.firebaseio.com",
  projectId: "game-dcef2",
  storageBucket: "game-dcef2.firebasestorage.app",
  messagingSenderId: "1048666233598",
  appId: "1:1048666233598:web:b5072b6c217dd403fe23af"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
