/**
 * api.js — Point d'entrée unique pour tous les appels vers le backend PHP.
 * Les endpoints et les noms de champs respectent strictement le contrat API.
 *
 * Expose deux globales : Api et ApiError (pas de modules, scripts classiques).
 */

(function (global) {
  "use strict";

  const API_BASE_URL = "http://localhost/pfe-track/backend/api";
  const REQUEST_TIMEOUT_MS = 15000;
  const LOGIN_PAGE = "login.html";

  /* ------------------------------------------------------------------
   * Erreur API
   * ------------------------------------------------------------------ */
  class ApiError extends Error {
    /**
     * @param {string} message  Message lisible pour l'utilisateur
     * @param {number} status   Code HTTP (0 = serveur injoignable)
     * @param {*}      data     Corps JSON brut renvoyé par l'API (si présent)
     */
    constructor(message, status, data) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data || null;
      // Erreurs par champ, si l'API en renvoie (objet { champ: "message" })
      this.fieldErrors = extractFieldErrors(data);
    }
  }

  /* ------------------------------------------------------------------
   * Indicateur de chargement global
   * ui.js enregistrera un callback via Api.setLoadingHandler(fn).
   * fn reçoit le nombre de requêtes en cours (0 = plus rien en cours).
   * ------------------------------------------------------------------ */
  let pendingRequests = 0;
  let loadingHandler = null;

  function trackLoading(delta) {
    pendingRequests = Math.max(0, pendingRequests + delta);
    if (typeof loadingHandler === "function") {
      loadingHandler(pendingRequests);
    }
  }

  /* ------------------------------------------------------------------
   * Lecture des erreurs renvoyées par l'API
   * ------------------------------------------------------------------ */
  function extractMessage(data) {
    if (!data || typeof data !== "object") return null;
    if (typeof data.message === "string" && data.message) return data.message;
    if (typeof data.error === "string" && data.error) return data.error;
    if (data.error && typeof data.error.message === "string") return data.error.message;
    return null;
  }

  function extractFieldErrors(data) {
    if (!data || typeof data !== "object") return {};
    const candidate = data.errors;
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate;
    }
    return {};
  }

  function defaultMessageForStatus(status) {
    switch (status) {
      case 400: return "Requête invalide. Vérifiez les champs saisis.";
      case 401: return "Votre session a expiré. Veuillez vous reconnecter.";
      case 403: return "Vous n'avez pas l'autorisation d'effectuer cette action.";
      case 404: return "Ressource introuvable.";
      case 409: return "Conflit : cette ressource existe déjà.";
      case 422: return "Certaines données sont invalides.";
      default:
        return status >= 500
          ? "Erreur du serveur. Veuillez réessayer plus tard."
          : "Une erreur est survenue (code " + status + ").";
    }
  }

  /* ------------------------------------------------------------------
   * Fonction centrale d'appel
   *
   * options.skipAuthRedirect : true => ne pas rediriger vers login.html sur 401
   *                            (login, register, me gèrent eux-mêmes le 401)
   * ------------------------------------------------------------------ */
  async function request(path, { method = "GET", body, skipAuthRedirect = false } = {}) {
    const headers = { Accept: "application/json" };
    const init = {
      method,
      headers,
      credentials: "include", // indispensable pour la session PHP
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    init.signal = controller.signal;
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    trackLoading(+1);
    let response;
    try {
      response = await fetch(API_BASE_URL + path, init);
    } catch (err) {
      const message =
        err && err.name === "AbortError"
          ? "Le serveur met trop de temps à répondre."
          : "Impossible de contacter le serveur. Vérifiez votre connexion et que le backend est démarré.";
      throw new ApiError(message, 0, null);
    } finally {
      clearTimeout(timer);
      trackLoading(-1);
    }

    // Lecture du corps : on tolère les réponses vides (204) ou non-JSON
    let data = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401 && !skipAuthRedirect) {
        redirectToLogin();
      }
      throw new ApiError(
        extractMessage(data) || defaultMessageForStatus(response.status),
        response.status,
        data
      );
    }

    return data;
  }

  function redirectToLogin() {
    if (!window.location.pathname.endsWith("/" + LOGIN_PAGE)) {
      window.location.href = LOGIN_PAGE;
    }
  }

  function withId(resource, id) {
    return "/" + resource + ".php?id=" + encodeURIComponent(id);
  }

  /* ------------------------------------------------------------------
   * API publique — un objet par ressource du contrat
   * ------------------------------------------------------------------ */
  const Api = {
    baseUrl: API_BASE_URL,

    setLoadingHandler(fn) {
      loadingHandler = fn;
    },

    // POST/GET /auth.php?action=...
    auth: {
      register: (payload) =>
        request("/auth.php?action=register", { method: "POST", body: payload, skipAuthRedirect: true }),
      login: (payload) =>
        request("/auth.php?action=login", { method: "POST", body: payload, skipAuthRedirect: true }),
      logout: () =>
        request("/auth.php?action=logout", { method: "POST" }),
      me: () =>
        request("/auth.php?action=me", { skipAuthRedirect: true }),
    },

    // /applications.php
    applications: {
      list: () => request("/applications.php"),
      get: (id) => request(withId("applications", id)),
      create: (payload) => request("/applications.php", { method: "POST", body: payload }),
      update: (id, payload) => request(withId("applications", id), { method: "PUT", body: payload }),
      remove: (id) => request(withId("applications", id), { method: "DELETE" }),
    },

    // /tasks.php
    tasks: {
      list: () => request("/tasks.php"),
      get: (id) => request(withId("tasks", id)),
      create: (payload) => request("/tasks.php", { method: "POST", body: payload }),
      update: (id, payload) => request(withId("tasks", id), { method: "PUT", body: payload }),
      remove: (id) => request(withId("tasks", id), { method: "DELETE" }),
    },

    // /dashboard.php
    dashboard: {
      get: () => request("/dashboard.php"),
    },
  };

  global.Api = Api;
  global.ApiError = ApiError;
})(window);