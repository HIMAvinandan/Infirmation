/**
 * Shared Firebase init + patient helpers (compat SDK for simple static pages)
 */
(function (global) {
  function ensureFirebase() {
    if (!global.FIREBASE_CONFIG || !global.FIREBASE_CONFIG.apiKey || global.FIREBASE_CONFIG.apiKey.indexOf("PASTE_") === 0) {
      console.warn("[Infirmation] Paste real keys into js/firebase-config.js");
      return null;
    }
    if (!global.firebase) {
      console.error("[Infirmation] Firebase SDK not loaded");
      return null;
    }
    if (!global.firebase.apps.length) {
      global.firebase.initializeApp(global.FIREBASE_CONFIG);
    }
    return {
      auth: global.firebase.auth(),
      db: global.firebase.firestore()
    };
  }

  async function notifyAdmin(payload) {
    var endpoint = global.FORMSUBMIT_ENDPOINT;
    if (!endpoint) return;
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.assign({
          _subject: payload._subject || "AVI Chronograph · Patient event",
          time: new Date().toISOString()
        }, payload))
      });
    } catch (e) { /* non-blocking */ }
  }

  async function getPatientDoc(uid) {
    var fb = ensureFirebase();
    if (!fb || !uid) return null;
    var snap = await fb.db.collection("patients").doc(uid).get();
    return snap.exists ? Object.assign({ id: snap.id }, snap.data()) : null;
  }

  async function requireAuth() {
    var fb = ensureFirebase();
    if (!fb) return null;
    return new Promise(function (resolve) {
      var unsub = fb.auth.onAuthStateChanged(function (user) {
        unsub();
        resolve(user || null);
      });
    });
  }

  /**
   * Fill identity inputs from patient profile; lock them so details are not re-typed.
   * selectors: { full_name, email, phone, date_of_birth }
   */
  async function hydrateIdentityFields(selectors) {
    selectors = selectors || {};
    var user = await requireAuth();
    var banner = document.getElementById("identity-auth-banner");
    if (!user) {
      if (banner) {
        banner.style.display = "block";
        banner.innerHTML = 'Please <a href="login.html">sign in</a> or <a href="nda-signup.html">register under NDA</a> so your details are not requested again.';
      }
      return null;
    }
    var patient = await getPatientDoc(user.uid);
    if (!patient) {
      if (banner) {
        banner.style.display = "block";
        banner.textContent = "Signed in, but no patient profile found. Complete NDA registration.";
      }
      return { user: user, patient: null };
    }
    function set(name, value) {
      var el = document.querySelector(selectors[name] || ('[name="' + name + '"]'));
      if (!el || value == null || value === "") return;
      el.value = value;
      el.readOnly = true;
      el.setAttribute("data-from-profile", "1");
      el.style.background = "#f5f7f8";
    }
    set("full_name", patient.displayName || patient.full_name || "");
    set("email", patient.email || user.email || "");
    set("phone", patient.phone || "");
    set("date_of_birth", patient.dob || patient.date_of_birth || "");
    if (banner) {
      banner.style.display = "block";
      banner.style.borderLeftColor = "#8193a1";
      banner.innerHTML = "Signed in as <strong>" + (patient.displayName || user.email) + "</strong> — identity loaded from your profile (not asked again).";
    }
    return { user: user, patient: patient };
  }

  global.InfirmationFB = {
    ensureFirebase: ensureFirebase,
    notifyAdmin: notifyAdmin,
    getPatientDoc: getPatientDoc,
    requireAuth: requireAuth,
    hydrateIdentityFields: hydrateIdentityFields
  };
})(window);
