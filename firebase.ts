import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDWt291FPz-a6Yy_FFrDukoqI9PLVV89uE",
  authDomain: "nitda-checkme-8a68e.firebaseapp.com",
  projectId: "nitda-checkme-8a68e",
  storageBucket: "nitda-checkme-8a68e.firebasestorage.app",
  messagingSenderId: "144149062847",
  appId: "1:144149062847:web:8a020392e0246b1f7fd20a",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
