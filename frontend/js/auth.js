/**
 * auth.js — Connexion, inscription, déconnexion et garde de session.
 * À charger APRÈS api.js et ui.js :
 *   <script src="js/api.js"></script>
 *   <script src="js/ui.js"></script>
 *   <script src="js/auth.js"></script>
 *
 * Expose la globale : Auth
 *
 * Pages publiques : on ajoute data-page sur <body>
 *   index.html    -> <body data-page="index">
 *   login.html    -> <body data-page="login">      (form id="login-form")
 *   register.html -> <body data-page="register">    (form id="register-form")
 *
 * Pages privées (dashboard, applications, tasks) : le script de la page appelle
 *   const user = await Auth.initPrivatePage("dashboard");
 *   if (!user) return;   // redirection vers login.html déjà lancée
 */
 
(function (global) {
  "use strict";
 
  const LOGIN_PAGE = "login.html";
  const DASHBOARD_PAGE = "dashboard.html";
 
  /* ------------------------------------------------------------------
   * Utilitaires
   * ------------------------------------------------------------------ */
 
  /**
   * L'API enveloppe peut-être l'utilisateur dans { data: {...} }.
   * On accepte les deux formes pour rester compatible avec le contrat.
   */
  function unwrap(response) {
    if (response && typeof response === "object" && "data" in response) {
      return response.data;
    }
    return response;
  }
 
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 
  /* ------------------------------------------------------------------
   * Session
   * ------------------------------------------------------------------ */
 
  /** Renvoie l'utilisateur connecté, ou null s'il n'y a pas de session. */
  async function getCurrentUser() {
    try {
      const response = await Api.auth.me();
      return unwrap(response) || null;
    } catch (err) {
      return null;
    }
  }
 
  function goToLogin() {
    window.location.href = LOGIN_PAGE;
  }
 
  function goToDashboard() {
    window.location.href = DASHBOARD_PAGE;
  }
 
  /**
   * Garde des pages privées : vérifie la session, affiche la navbar.
   * Renvoie l'utilisateur, ou null (et redirige) s'il n'est pas connecté.
   */
  async function initPrivatePage(activeKey) {
    const user = await getCurrentUser();
    if (!user) {
      goToLogin();
      return null;
    }
    UI.renderNavbar({
      active: activeKey,
      user: user,
      onLogout: logout,
    });
    return user;
  }
 
  /** Sur login/register : si déjà connecté, on va directement au dashboard. */
  async function redirectIfLoggedIn() {
    const user = await getCurrentUser();
    if (user) goToDashboard();
  }
 
  async function logout(button) {
    UI.setButtonLoading(button, true);
    try {
      await Api.auth.logout();
      goToLogin();
    } catch (err) {
      UI.setButtonLoading(button, false);
      UI.showError(err);
    }
  }
 
  /* ------------------------------------------------------------------
   * Validation côté client (mêmes règles que le backend)
   * ------------------------------------------------------------------ */
 
  function validateLogin(data) {
    const errors = {};
    if (!data.email) errors.email = "L'email est obligatoire.";
    else if (!EMAIL_REGEX.test(data.email)) errors.email = "Adresse email invalide.";
    if (!data.password) errors.password = "Le mot de passe est obligatoire.";
    return errors;
  }
 
  function validateRegister(data) {
    const errors = {};
    const name = data.full_name || "";
    if (name.length < 2 || name.length > 100) {
      errors.full_name = "Le nom doit contenir entre 2 et 100 caractères.";
    }
    if (!data.email) errors.email = "L'email est obligatoire.";
    else if (!EMAIL_REGEX.test(data.email) || data.email.length > 150) {
      errors.email = "Adresse email invalide.";
    }
    if (!data.password || data.password.length < 8) {
      errors.password = "Le mot de passe doit contenir au moins 8 caractères.";
    }
    if (data.password !== data.confirm_password) {
      errors.confirm_password = "Les mots de passe ne correspondent pas.";
    }
    return errors;
  }
 
  /** Affiche les erreurs de validation. Renvoie true s'il y en a. */
  function showValidationErrors(form, errors) {
    UI.clearFormErrors(form);
    const names = Object.keys(errors);
    names.forEach(function (name) {
      UI.setFieldError(form, name, errors[name]);
    });
    if (names.length) {
      const first = form.elements[names[0]];
      if (first) first.focus();
    }
    return names.length > 0;
  }
 
  /* ------------------------------------------------------------------
   * Formulaires
   * ------------------------------------------------------------------ */
 
  function initLoginForm() {
    const form = document.getElementById("login-form");
    if (!form) return;
 
    // Message après une inscription réussie (?registered=1)
    if (new URLSearchParams(window.location.search).get("registered") === "1") {
      UI.setFormAlert(form, "Compte créé avec succès. Vous pouvez vous connecter.", "success");
    }
 
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const button = form.querySelector('[type="submit"]');
      const data = UI.getFormData(form);
 
      if (showValidationErrors(form, validateLogin(data))) return;
 
      // Le backend met l'email en minuscules ; on envoie exactement les champs du contrat
      const payload = { email: data.email, password: data.password };
 
      UI.setButtonLoading(button, true);
      try {
        await Api.auth.login(payload);
        UI.success("Connexion réussie.");
        goToDashboard();
      } catch (err) {
        UI.setButtonLoading(button, false);
        UI.showFormError(form, err);
      }
    });
  }
 
  function initRegisterForm() {
    const form = document.getElementById("register-form");
    if (!form) return;
 
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const button = form.querySelector('[type="submit"]');
      const data = UI.getFormData(form);
 
      if (showValidationErrors(form, validateRegister(data))) return;
 
      // confirm_password n'existe pas dans le contrat : on ne l'envoie pas
      const payload = {
        full_name: data.full_name,
        email: data.email,
        password: data.password,
      };
 
      UI.setButtonLoading(button, true);
      try {
        await Api.auth.register(payload);
        // Le backend ne connecte pas l'utilisateur après l'inscription :
        // on l'envoie vers la page de connexion.
        window.location.href = LOGIN_PAGE + "?registered=1";
      } catch (err) {
        UI.setButtonLoading(button, false);
        UI.showFormError(form, err);
      }
    });
  }
 
  /* ------------------------------------------------------------------
   * Page d'entrée (index.html)
   * ------------------------------------------------------------------ */
  async function initIndex() {
    const user = await getCurrentUser();
    window.location.replace(user ? DASHBOARD_PAGE : LOGIN_PAGE);
  }
 
  /* ------------------------------------------------------------------
   * Démarrage automatique selon <body data-page="...">
   * ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    const page = document.body.getAttribute("data-page");
    if (page === "index") initIndex();
    if (page === "login") {
      redirectIfLoggedIn();
      initLoginForm();
    }
    if (page === "register") {
      redirectIfLoggedIn();
      initRegisterForm();
    }
  });
 
  global.Auth = {
    getCurrentUser: getCurrentUser,
    initPrivatePage: initPrivatePage,
    logout: logout,
  };
})(window);