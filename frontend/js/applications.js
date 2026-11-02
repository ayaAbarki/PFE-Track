/**
 * applications.js — Page « Candidatures ».
 * Endpoints : GET/POST /applications.php, PUT/DELETE /applications.php?id=
 * Champs : company_name, position, domain, application_date, status,
 *          offer_url, contact_email, notes
 *
 * La recherche et le filtre par statut se font côté navigateur
 * sur la liste reçue de l'API (le contrat n'a pas de paramètre de recherche).
 */
 
(function () {
  "use strict";
 
  const MODAL_ID = "application-modal";
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 
  let applications = []; // dernière liste reçue de l'API
  let editingId = null;  // null = ajout, sinon id de la candidature modifiée
 
  // Éléments de la page (remplis dans init)
  let listBox, countEl, searchInput, statusFilter, form, submitBtn, modalTitle;
 
  /* ------------------------------------------------------------------
   * Utilitaires
   * ------------------------------------------------------------------ */
  function unwrap(response) {
    if (response && typeof response === "object" && !Array.isArray(response) && "data" in response) {
      return response.data;
    }
    return response;
  }
 
  function todayIso() {
    const d = new Date();
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
 
  function isHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || ""));
  }
 
  /* ------------------------------------------------------------------
   * Affichage de la liste
   * ------------------------------------------------------------------ */
  function getFilteredApplications() {
    const term = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
 
    return applications.filter(function (app) {
      if (status && app.status !== status) return false;
      if (!term) return true;
      return (
        String(app.company_name || "").toLowerCase().includes(term) ||
        String(app.position || "").toLowerCase().includes(term)
      );
    });
  }
 
  function renderRow(app) {
    const email = app.contact_email
      ? '<span class="cell-sub">' + UI.escapeHtml(app.contact_email) + "</span>"
      : "";
    const offer = isHttpUrl(app.offer_url)
      ? '<span class="cell-sub"><a href="' + UI.escapeHtml(app.offer_url) +
        '" target="_blank" rel="noopener noreferrer">Voir l\'offre</a></span>'
      : "";
    const id = UI.escapeHtml(app.id);
 
    return (
      "<tr>" +
      '<td data-label="Entreprise"><span class="cell-title">' + UI.escapeHtml(app.company_name) + "</span>" + email + "</td>" +
      '<td data-label="Poste">' + UI.escapeHtml(app.position) + offer + "</td>" +
      '<td data-label="Domaine">' + UI.escapeHtml(app.domain) + "</td>" +
      '<td data-label="Date">' + UI.escapeHtml(UI.formatDate(app.application_date)) + "</td>" +
      '<td data-label="Statut">' + UI.statusBadge(app.status) + "</td>" +
      '<td data-label="Actions"><div class="table-actions">' +
      '<button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="' + id + '">Modifier</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="' + id + '">Supprimer</button>' +
      "</div></td>" +
      "</tr>"
    );
  }
 
  function render() {
    const total = applications.length;
    const items = getFilteredApplications();
 
    countEl.textContent =
      total === 0
        ? "Aucune candidature"
        : items.length === total
          ? total + (total > 1 ? " candidatures" : " candidature")
          : items.length + " sur " + total + (total > 1 ? " candidatures" : " candidature");
 
    if (total === 0) {
      UI.showEmptyState(listBox, "Aucune candidature pour le moment", "Cliquez sur « Ajouter une candidature » pour commencer.");
      return;
    }
    if (items.length === 0) {
      UI.showEmptyState(listBox, "Aucun résultat", "Essayez une autre recherche ou un autre statut.");
      return;
    }
 
    listBox.innerHTML =
      '<div class="table-wrapper"><table class="table">' +
      "<thead><tr><th>Entreprise</th><th>Poste</th><th>Domaine</th><th>Date</th><th>Statut</th>" +
      '<th><span class="sr-only">Actions</span></th></tr></thead>' +
      "<tbody>" + items.map(renderRow).join("") + "</tbody></table></div>";
  }
 
  async function loadApplications() {
    UI.showLoadingBlock(listBox);
    try {
      const data = unwrap(await Api.applications.list());
      applications = Array.isArray(data) ? data : [];
      render();
    } catch (err) {
      UI.showError(err);
      UI.showEmptyState(listBox, "Impossible de charger les candidatures", "Vérifiez que le backend est démarré.");
    }
  }
 
  /* ------------------------------------------------------------------
   * Formulaire (ajout / modification)
   * ------------------------------------------------------------------ */
  function openForm(app) {
    UI.clearFormErrors(form);
    form.reset();
    editingId = app ? app.id : null;
    modalTitle.textContent = app ? "Modifier la candidature" : "Ajouter une candidature";
 
    if (app) {
      form.elements.company_name.value = app.company_name || "";
      form.elements.position.value = app.position || "";
      form.elements.domain.value = app.domain || "";
      form.elements.application_date.value = app.application_date || "";
      form.elements.status.value = app.status || UI.STATUSES[0];
      form.elements.offer_url.value = app.offer_url || "";
      form.elements.contact_email.value = app.contact_email || "";
      form.elements.notes.value = app.notes || "";
    } else {
      form.elements.application_date.value = todayIso();
      form.elements.status.value = UI.STATUSES[0];
    }
    UI.openModal(MODAL_ID);
  }
 
  function validate(data) {
    const errors = {};
    if (!data.company_name) errors.company_name = "L'entreprise est obligatoire.";
    if (!data.position) errors.position = "Le poste est obligatoire.";
    if (!data.domain) errors.domain = "Le domaine est obligatoire.";
    if (!data.application_date) errors.application_date = "La date est obligatoire.";
    if (UI.STATUSES.indexOf(data.status) === -1) errors.status = "Statut invalide.";
    if (data.offer_url && !isHttpUrl(data.offer_url)) {
      errors.offer_url = "Le lien doit commencer par http:// ou https://";
    }
    if (data.contact_email && !EMAIL_REGEX.test(data.contact_email)) {
      errors.contact_email = "Adresse email invalide.";
    }
    return errors;
  }
 
  async function onSubmit(e) {
    e.preventDefault();
    const data = UI.getFormData(form);
 
    UI.clearFormErrors(form);
    const errors = validate(data);
    const names = Object.keys(errors);
    if (names.length) {
      names.forEach(function (name) { UI.setFieldError(form, name, errors[name]); });
      form.elements[names[0]].focus();
      return;
    }
 
    // Uniquement les champs du contrat
    const payload = {
      company_name: data.company_name,
      position: data.position,
      domain: data.domain,
      application_date: data.application_date,
      status: data.status,
      offer_url: data.offer_url,
      contact_email: data.contact_email,
      notes: data.notes,
    };
 
    UI.setButtonLoading(submitBtn, true);
    try {
      if (editingId === null) {
        await Api.applications.create(payload);
        UI.success("Candidature ajoutée.");
      } else {
        await Api.applications.update(editingId, payload);
        UI.success("Candidature modifiée.");
      }
      UI.closeModal(MODAL_ID);
      await loadApplications();
    } catch (err) {
      UI.showFormError(form, err);
    } finally {
      UI.setButtonLoading(submitBtn, false);
    }
  }
 
  /* ------------------------------------------------------------------
   * Suppression
   * ------------------------------------------------------------------ */
  async function deleteApplication(app) {
    const ok = await UI.confirmDialog(
      "Supprimer la candidature « " + app.company_name + " — " + app.position + " » ? " +
      "Les tâches liées ne seront pas supprimées.",
      { title: "Supprimer la candidature" }
    );
    if (!ok) return;
 
    try {
      await Api.applications.remove(app.id);
      UI.success("Candidature supprimée.");
      await loadApplications();
    } catch (err) {
      UI.showError(err);
    }
  }
 
  function onListClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const app = applications.find(function (a) { return String(a.id) === btn.getAttribute("data-id"); });
    if (!app) return;
 
    if (btn.getAttribute("data-action") === "edit") openForm(app);
    if (btn.getAttribute("data-action") === "delete") deleteApplication(app);
  }
 
  /* ------------------------------------------------------------------
   * Démarrage
   * ------------------------------------------------------------------ */
  async function init() {
    const user = await Auth.initPrivatePage("applications");
    if (!user) return;
 
    listBox = document.getElementById("applications-list");
    countEl = document.getElementById("applications-count");
    searchInput = document.getElementById("search-input");
    statusFilter = document.getElementById("status-filter");
    form = document.getElementById("application-form");
    submitBtn = document.getElementById("application-submit");
    modalTitle = document.getElementById("application-modal-title");
 
    statusFilter.innerHTML = UI.optionsHtml(UI.STATUSES, "", "Tous les statuts");
    form.elements.status.innerHTML = UI.optionsHtml(UI.STATUSES, UI.STATUSES[0]);
 
    UI.bindModal(MODAL_ID);
    document.getElementById("add-application-btn").addEventListener("click", function () { openForm(null); });
    searchInput.addEventListener("input", render);
    statusFilter.addEventListener("change", render);
    form.addEventListener("submit", onSubmit);
    listBox.addEventListener("click", onListClick);
 
    loadApplications();
  }
 
  document.addEventListener("DOMContentLoaded", init);
})();