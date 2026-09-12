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
   ============================================================================ */

window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",   // לדוגמה: https://your-project-default-rtdb.firebaseio.com
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

/* נחשב כ"מחובר" רק אם יש לפחות apiKey ו-databaseURL */
window.FIREBASE_ENABLED = !!(window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.databaseURL);

/* קבועים כלליים */
window.APP = {
  ROOM_CODE_LENGTH: 4,
  // אותיות לקוד חדר — בלי תווים מבלבלים (I/O/0/1)
  ROOM_CODE_ALPHABET: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
};
