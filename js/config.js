/* ============================================================================
   הגדרות חיבור ל-Firebase
   ----------------------------------------------------------------------------
   כדי שהאתר יאסוף תשובות בזמן אמת בין מכשירים, צריך פרויקט Firebase חינמי.
   ראו הוראות מלאות ב-README.md ("הקמת Firebase").

   מדביקים כאן את אובייקט ה-config שמקבלים מ-Firebase. כל עוד השדות ריקים,
   האתר עובד במצב "הדגמה מקומית" (כל הכרטיסיות באותו דפדפן מסתנכרנות ביניהן),
   שנוח לבדיקה לפני שמחברים Firebase אמיתי.

   השדות האלה הם מפתחות צד-לקוח (public) ולא סוד — אבל עדיין מומלץ להגדיר
   כללי אבטחה ל-Database כפי שמתואר ב-README.

   הערה: מדביקים כאן רק את *הערכים* של firebaseConfig. אין להדביק שורות
   import או initializeApp מהקונסולה — האתר טוען את Firebase לבד (compat SDK).
   ============================================================================ */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCLdnsDszxLZ78XZUxSmg_9Gclelova_nc",
  authDomain: "demographics-israel.firebaseapp.com",
  databaseURL: "https://demographics-israel-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "demographics-israel",
  storageBucket: "demographics-israel.firebasestorage.app",
  messagingSenderId: "788369626157",
  appId: "1:788369626157:web:475a3365223a758a7e14a4",
  measurementId: "G-BHVY9J2R06"
};

/* נחשב כ"מחובר" רק אם יש לפחות apiKey ו-databaseURL */
window.FIREBASE_ENABLED = !!(window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.databaseURL);

/* קבועים כלליים */
window.APP = {
  ROOM_CODE_LENGTH: 4,
  // אותיות לקוד חדר — בלי תווים מבלבלים (I/O/0/1)
  ROOM_CODE_ALPHABET: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
};
