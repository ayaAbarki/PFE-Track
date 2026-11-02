/**
 * ui.js — Helpers d'interface partagés par toutes les pages.
 * À charger APRÈS api.js et AVANT auth.js et les scripts de page :
 *   <script src="js/api.js"></script>
 *   <script src="js/ui.js"></script>
 *
 * Expose la globale : UI
 */

(function (global) {
  "use strict";

  /* ------------------------------------------------------------------
   * Valeurs autorisées par le contrat API
   * ------------------------------------------------------------------ */
  const STATUSES = [
    "To Contact",
    "Application Sent",
    "Waiting for Response",
    "Interview Scheduled",
    "Accepted",
    "Rejected",
  ];

  const PRIORITIES = ["Low", "Medium", "High"];

  /* ------------------------------------------------------------------
   * Sécurité : échappement HTML (obligatoire avant tout innerHTML)
   * ------------------------------------------------------------------ */
  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ------------------------------------------------------------------
   * Dates
   * ------------------------------------------------------------------ */
  function parseDate(value) {
    if (!value) return null;
    const str = String(value);
    // "YYYY-MM-DD" : on construit une date locale pour éviter le décalage de fuseau
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(str.replace(" ", "T"));
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(value) {
    const d = parseDate(value);
    if (!d) return "—";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatDateTime(value) {
    const d = parseDate(value);
    if (!d) return "—";
    return d.toLocaleString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  /** true si la date d'échéance est strictement avant aujourd'hui */
  function isOverdue(value) {
    const d = parseDate(value);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  }

  /* ------------------------------------------------------------------
   * Badges (classes définies dans style.css)
   * ------------------------------------------------------------------ */
  function slugify(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
  }

  function statusBadge(status) {
    if (!status) return '<span class="badge">—</span>';
    return '<span class="badge badge--' + slugify(status) + '">' + escapeHtml(status) + "</span>";
  }

  function priorityBadge(priority) {
    if (!priority) return '<span class="badge">—</span>';
    return '<span class="badge badge--' + slugify(priority) + '">' + escapeHtml(priority) + "</span>";
  }

  /** Construit les <option> d'un <select> à partir d'une liste de valeurs */
  function optionsHtml(values, selected, placeholder) {
    let html = placeholder ? '<option value="">' + escapeHtml(placeholder) + "</option>" : "";
    values.forEach(function (v) {
      html +=
        '<option value="' + escapeHtml(v) + '"' + (v === selected ? " selected" : "") + ">" +
        escapeHtml(v) + "</option>";
    });
    return html;
  }

  /* ------------------------------------------------------------------
   * Toasts (messages de confirmation / d'erreur)
   * ------------------------------------------------------------------ */
  function getToastContainer() {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }
    return container;
  }

  function toast(message, type, duration) {
    type = type || "info";
    duration = duration === undefined ? 4000 : duration;

    const el = document.createElement("div");
    el.className = "toast toast--" + type;
    el.setAttribute("role", type === "error" ? "alert" : "status");

    const text = document.createElement("div");
    text.className = "toast-message";
    text.textContent = message; // textContent : pas d'injection HTML possible

    const close = document.createElement("button");
    close.type = "button";
    close.className = "toast-close";
    close.setAttribute("aria-label", "Fermer");
    close.innerHTML = "&times;";

    el.appendChild(text);
    el.appendChild(close);
    getToastContainer().appendChild(el);

    function remove() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    close.addEventListener("click", remove);
    if (duration > 0) setTimeout(remove, duration);
    return el;
  }

  const success = (msg) => toast(msg, "success");
  const info = (msg) => toast(msg, "info");
  const error = (msg) => toast(msg, "error", 6000);

  /** Affiche proprement n'importe quelle erreur (ApiError ou autre) */
  function showError(err) {
    const message = err && err.message ? err.message : "Une erreur inattendue est survenue.";
    error(message);
  }

  /* ------------------------------------------------------------------
   * Loader global (branché sur Api.setLoadingHandler)
   * Affiché seulement si l'appel dure plus de 200 ms, pour éviter le clignotement.
   * ------------------------------------------------------------------ */
  let loaderEl = null;
  let loaderTimer = null;

  function showLoader() {
    if (loaderEl) return;
    loaderEl = document.createElement("div");
    loaderEl.className = "loading-overlay";
    loaderEl.setAttribute("role", "status");
    loaderEl.setAttribute("aria-label", "Chargement en cours");
    loaderEl.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loaderEl);
  }

  function hideLoader() {
    clearTimeout(loaderTimer);
    loaderTimer = null;
    if (loaderEl && loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl);
    loaderEl = null;
  }

  if (global.Api && typeof global.Api.setLoadingHandler === "function") {
    global.Api.setLoadingHandler(function (pending) {
      if (pending > 0) {
        if (!loaderEl && !loaderTimer) loaderTimer = setTimeout(showLoader, 200);
      } else {
        hideLoader();
      }
    });
  }

  /** Bouton en cours de traitement (spinner + désactivation) */
  function setButtonLoading(button, isLoading) {
    if (!button) return;
    button.classList.toggle("is-loading", isLoading);
    button.disabled = isLoading;
  }

  /** Zone de chargement locale dans un conteneur (liste, tableau...) */
  function showLoadingBlock(container, text) {
    container.innerHTML =
      '<div class="loading-block"><div class="spinner"></div><span>' +
      escapeHtml(text || "Chargement...") + "</span></div>";
  }

  function showEmptyState(container, title, text) {
    container.innerHTML =
      '<div class="empty-state"><strong>' + escapeHtml(title) + "</strong>" +
      (text ? "<span>" + escapeHtml(text) + "</span>" : "") + "</div>";
  }

  /* ------------------------------------------------------------------
   * Formulaires : lecture des valeurs et affichage des erreurs
   * ------------------------------------------------------------------ */

  /** Lit les champs nommés d'un formulaire (chaînes nettoyées avec trim) */
  function getFormData(form) {
    const data = {};
    Array.prototype.forEach.call(form.elements, function (field) {
      if (!field.name || field.disabled) return;
      if (field.type === "checkbox") {
        data[field.name] = field.checked;
      } else if (field.type === "radio") {
        if (field.checked) data[field.name] = field.value;
      } else {
        data[field.name] = typeof field.value === "string" ? field.value.trim() : field.value;
      }
    });
    return data;
  }

  function clearFormErrors(form) {
    form.querySelectorAll(".form-error").forEach(function (el) { el.remove(); });
    form.querySelectorAll(".is-invalid").forEach(function (el) { el.classList.remove("is-invalid"); });
    const alertEl = form.querySelector(".form-alert");
    if (alertEl) alertEl.remove();
  }

  /** Affiche une erreur sous un champ (par son attribut name) */
  function setFieldError(form, name, message) {
    const field = form.elements[name];
    if (!field) return false;
    field.classList.add("is-invalid");
    const el = document.createElement("div");
    el.className = "form-error";
    el.textContent = Array.isArray(message) ? message.join(" ") : String(message);
    field.insertAdjacentElement("afterend", el);
    return true;
  }

  /** Affiche un message général en haut du formulaire (erreur renvoyée par l'API) */
  function setFormAlert(form, message, type) {
    const old = form.querySelector(".form-alert");
    if (old) old.remove();
    const el = document.createElement("div");
    el.className = "alert alert--" + (type || "error") + " form-alert";
    el.setAttribute("role", "alert");
    el.textContent = message;
    form.insertBefore(el, form.firstChild);
  }

  /**
   * Affiche une ApiError dans un formulaire :
   * erreurs par champ si l'API en fournit, sinon message général.
   */
  function showFormError(form, err) {
    clearFormErrors(form);
    const fieldErrors = (err && err.fieldErrors) || {};
    let shown = 0;
    Object.keys(fieldErrors).forEach(function (name) {
      if (setFieldError(form, name, fieldErrors[name])) shown += 1;
    });
    if (shown === 0 || (err && err.message && shown < Object.keys(fieldErrors).length)) {
      setFormAlert(form, (err && err.message) || "Une erreur est survenue.");
    }
  }

  /* ------------------------------------------------------------------
   * Modales
   * ------------------------------------------------------------------ */

  /**
   * Boîte de confirmation. Renvoie une Promise<boolean>.
   *   if (await UI.confirmDialog("Supprimer cette candidature ?")) { ... }
   */
  function confirmDialog(message, options) {
    options = options || {};
    return new Promise(function (resolve) {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML =
        '<div class="modal modal--sm" role="dialog" aria-modal="true">' +
        '<div class="modal-header"><h2>' + escapeHtml(options.title || "Confirmation") + "</h2></div>" +
        '<div class="modal-body"><p style="margin:0"></p></div>' +
        '<div class="modal-footer">' +
        '<button type="button" class="btn btn-secondary" data-action="cancel">' +
        escapeHtml(options.cancelText || "Annuler") + "</button>" +
        '<button type="button" class="btn btn-danger" data-action="confirm">' +
        escapeHtml(options.confirmText || "Supprimer") + "</button>" +
        "</div></div>";
      overlay.querySelector(".modal-body p").textContent = message;

      function close(result) {
        document.removeEventListener("keydown", onKey);
        overlay.remove();
        resolve(result);
      }
      function onKey(e) {
        if (e.key === "Escape") close(false);
      }

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close(false);
        const action = e.target.getAttribute && e.target.getAttribute("data-action");
        if (action === "confirm") close(true);
        if (action === "cancel") close(false);
      });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(overlay);
      overlay.querySelector('[data-action="cancel"]').focus();
    });
  }

  /**
   * Ouvre/ferme une modale déjà présente dans le HTML (formulaires d'ajout/édition).
   * Structure attendue : <div class="modal-overlay hidden" id="..."> ... </div>
   * Fermeture : bouton avec l'attribut data-close-modal, clic sur le fond, ou Échap.
   */
  function openModal(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    const first = overlay.querySelector("input, select, textarea");
    if (first) first.focus();
  }

  function closeModal(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function bindModal(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target.closest("[data-close-modal]")) closeModal(id);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeModal(id);
    });
  }

  /* ------------------------------------------------------------------
   * Navbar des pages privées
   * Utilisation : <div id="navbar"></div> puis
   *   UI.renderNavbar({ active: "dashboard", user: user, onLogout: fn })
   * ------------------------------------------------------------------ */
  const NAV_ITEMS = [
    { key: "dashboard", label: "Tableau de bord", href: "dashboard.html" },
    { key: "applications", label: "Candidatures", href: "applications.html" },
    { key: "tasks", label: "Tâches", href: "tasks.html" },
  ];

  function renderNavbar(options) {
    options = options || {};
    const host = document.getElementById("navbar");
    if (!host) return;

    const links = NAV_ITEMS.map(function (item) {
      return (
        '<li><a href="' + item.href + '"' +
        (item.key === options.active ? ' class="active" aria-current="page"' : "") + ">" +
        escapeHtml(item.label) + "</a></li>"
      );
    }).join("");

    const userName =
      options.user && (options.user.name || options.user.full_name || options.user.email)
        ? options.user.name || options.user.full_name || options.user.email
        : "";

    host.innerHTML =
      '<header class="navbar"><div class="container">' +
      '<a class="brand" href="dashboard.html"><span class="brand-mark">P</span>PFE Track</a>' +
      '<button type="button" class="nav-toggle" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav-menu">&#9776;</button>' +
      '<nav class="nav-menu" id="nav-menu" aria-label="Navigation principale">' +
      '<ul class="nav-links">' + links + "</ul>" +
      '<div class="nav-user">' +
      '<span class="nav-user-name">' + escapeHtml(userName) + "</span>" +
      '<button type="button" class="btn btn-secondary btn-sm" id="logout-btn">Déconnexion</button>' +
      "</div></nav></div></header>";

    const toggle = host.querySelector(".nav-toggle");
    const menu = host.querySelector(".nav-menu");
    toggle.addEventListener("click", function () {
      const open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    const logoutBtn = host.querySelector("#logout-btn");
    if (logoutBtn && typeof options.onLogout === "function") {
      logoutBtn.addEventListener("click", function () {
        options.onLogout(logoutBtn);
      });
    }
  }

  /* ------------------------------------------------------------------
   * API publique
   * ------------------------------------------------------------------ */
  global.UI = {
    STATUSES: STATUSES,
    PRIORITIES: PRIORITIES,
    escapeHtml: escapeHtml,
    parseDate: parseDate,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    isOverdue: isOverdue,
    slugify: slugify,
    statusBadge: statusBadge,
    priorityBadge: priorityBadge,
    optionsHtml: optionsHtml,
    toast: toast,
    success: success,
    info: info,
    error: error,
    showError: showError,
    showLoader: showLoader,
    hideLoader: hideLoader,
    setButtonLoading: setButtonLoading,
    showLoadingBlock: showLoadingBlock,
    showEmptyState: showEmptyState,
    getFormData: getFormData,
    clearFormErrors: clearFormErrors,
    setFieldError: setFieldError,
    setFormAlert: setFormAlert,
    showFormError: showFormError,
    confirmDialog: confirmDialog,
    openModal: openModal,
    closeModal: closeModal,
    bindModal: bindModal,
    renderNavbar: renderNavbar,
  };
})(window);