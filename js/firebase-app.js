/**
 * Infirmation — shared Auth/Firestore helpers (tighter session UX)
 */
(function (global) {
  function ensureFirebase() {
    if (!global.FIREBASE_CONFIG || !global.FIREBASE_CONFIG.apiKey || String(global.FIREBASE_CONFIG.apiKey).indexOf("PASTE_") === 0) {
      console.warn("[Infirmation] firebase-config.js missing keys");
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
    } catch (e) {}
  }

  async function getPatientDoc(uid) {
    var fb = ensureFirebase();
    if (!fb || !uid) return null;
    try {
      var snap = await fb.db.collection("patients").doc(uid).get();
      return snap.exists ? Object.assign({ id: snap.id }, snap.data()) : null;
    } catch (e) {
      console.error("[Infirmation] getPatientDoc", e);
      return null;
    }
  }

  function requireAuth() {
    var fb = ensureFirebase();
    if (!fb) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var unsub = fb.auth.onAuthStateChanged(function (user) {
        unsub();
        resolve(user || null);
      });
    });
  }

  /** Create patients/{uid} if missing. Throws on permission errors. */
  async function ensurePatientProfile(user, fields) {
    fields = fields || {};
    var fb = ensureFirebase();
    if (!fb || !user) throw new Error("Not signed in");
    var ref = fb.db.collection("patients").doc(user.uid);
    var snap = await ref.get();
    if (snap.exists) return Object.assign({ id: snap.id }, snap.data());

    var now = firebase.firestore.FieldValue.serverTimestamp();
    var ndaVersion = global.NDA_VERSION || "administrative-non-disclosure-2026-10";
    var data = {
      displayName: fields.displayName || user.displayName || "",
      email: user.email || fields.email || "",
      phone: fields.phone || "",
      dob: fields.dob || "",
      ndaAccepted: true,
      ndaVersion: ndaVersion,
      ndaAcceptedAt: now,
      status: "nda_accepted",
      createdAt: now,
      updatedAt: now
    };
    await ref.set(data);
    await ref.collection("consents").doc("nda").set({
      version: ndaVersion,
      acceptedAt: now,
      userAgent: navigator.userAgent || "",
      instrument: "administrative-non-disclosure"
    });
    if (data.displayName && !user.displayName) {
      try { await user.updateProfile({ displayName: data.displayName }); } catch (e) {}
    }
    notifyAdmin({
      _subject: "AVI Chronograph · Non-Disclosure accepted · New patient",
      event: "admin_nd_signup",
      aspirant_name: data.displayName,
      email: data.email,
      phone: data.phone,
      ndaVersion: ndaVersion
    });
    return data;
  }

  async function hydrateIdentityFields(selectors) {
    selectors = selectors || {};
    var loginHref = selectors.loginHref || "../login.html";
    var regHref = selectors.registerHref || "../administrative-non-disclosure.html#register";
    var user = await requireAuth();
    var banner = document.getElementById("identity-auth-banner");
    if (!user) {
      if (banner) {
        banner.style.display = "block";
        banner.innerHTML = 'Sign in required. <a href="' + loginHref + '">Sign in</a> or <a href="' + regHref + '">register under Non-Disclosure</a>.';
      }
      return null;
    }
    var patient = await getPatientDoc(user.uid);
    if (!patient) {
      if (banner) {
        banner.style.display = "block";
        banner.innerHTML = 'Signed in without a patient profile. <a href="' + regHref + '">Complete Non-Disclosure registration</a>.';
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
    set("full_name", patient.displayName || "");
    set("email", patient.email || user.email || "");
    set("phone", patient.phone || "");
    set("date_of_birth", patient.dob || "");
    if (banner) {
      banner.style.display = "block";
      banner.innerHTML = "Signed in as <strong>" + (patient.displayName || user.email) + "</strong> — identity from profile (not asked again). <a href=\"" + (selectors.homeHref || "../patient-home.html") + "\">Patient home</a>";
    }
    return { user: user, patient: patient };
  }

  global.InfirmationFB = {
    ensureFirebase: ensureFirebase,
    notifyAdmin: notifyAdmin,
    getPatientDoc: getPatientDoc,
    requireAuth: requireAuth,
    ensurePatientProfile: ensurePatientProfile,
    hydrateIdentityFields: hydrateIdentityFields
  };
})(window);
