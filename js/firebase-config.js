/**
 * Infirmation Xone — Firebase web config
 * Project: infirmation-xone
 *
 * 1. Firebase Console → Project settings → Your apps → Web app
 * 2. Copy the firebaseConfig values into the object below
 * 3. Deploy this file with your site (same origin as the HTML pages)
 */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC0ZHbHUhUveqQmuJfZzBY7JyI6dr0W3mE",
  authDomain: "infirmation-xone.firebaseapp.com",
  projectId: "infirmation-xone",
  storageBucket: "infirmation-xone.firebasestorage.app",
  messagingSenderId: "968630743856",
  appId: "1:968630743856:web:4aa4cad4d3ece3a3d90ef5",
  measurementId: "G-0Q54MR2QDD"
};

/** NDA / consent instrument version (bump when legal text changes) */
window.NDA_VERSION = "administrative-non-disclosure-2026-10";

/** Where to send admin notices (FormSubmit AJAX; optional) */
window.ADMIN_NOTIFY_EMAIL = "doctorofpsy@outlook.com";
window.FORMSUBMIT_ENDPOINT = "https://formsubmit.co/ajax/doctorofpsy@outlook.com";

/** Success / failure pages on your GitHub site */
window.SUCCESS_MESSAGE_URL = "https://himavinandan.github.io/Infirmation/success_message.html";
window.FAILURE_MESSAGE_URL = "https://himavinandan.github.io/Infirmation/failure_message.html";
