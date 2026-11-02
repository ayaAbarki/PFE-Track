/**
 * tasks.js — Page « Tâches ».
 * Endpoints : GET/POST /tasks.php, PUT/DELETE /tasks.php?id=
 * Champs : title, description, due_date, priority, completed, application_id
 *
 * Règles du backend à respecter :
 *   - completed doit être un vrai booléen (true / false)
 *   - application_id doit être un entier ou null (jamais une chaîne)
 *   - due_date au format YYYY-MM-DD
 */
 
(function () {
  "use strict";
 
  const MODAL_ID = "task-modal";
 
  let tasks = [];          // dernière liste reçue de l'API
  let applications = [];   // pour associer une tâche à une candidature
  let editingId = null;    // null = ajout, sinon id de la tâche modifiée
 
  let listBox, countEl, filterSelect, form, submitBtn, modalTitle;
 
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
 
  function findApplication(id) {
    if (id === null || id === undefined) return null;
    return applications.find(function (a) { return String(a.id) === String(id); }) || null;
  }
 
  /* ------------------------------------------------------------------
   * Affichage de la liste
   * ------------------------------------------------------------------ */
  function getFilteredTasks() {
    const filter = filterSelect.value;
    return tasks.filter(function (t) {
      if (filter === "todo") return !t.completed;
      if (filter === "done") return !!t.completed;
      return true;
    });
  }
 
  function renderTask(task) {
    const id = UI.escapeHtml(task.id);
    const overdue = !task.completed && UI.isOverdue(task.due_date);
    const app = findApplication(task.application_id);
 
    const appMeta = app
      ? "<span>📎 " + UI.escapeHtml(app.company_name) + " — " + UI.escapeHtml(app.position) + "</span>"
      : "";
    const description = task.description
      ? '<div class="text-muted" style="font-size:0.85rem;margin-top:2px;">' + UI.escapeHtml(task.description) + "</div>"
      : "";
 
    return (
      '<li class="list-item task-item' + (task.completed ? " is-completed" : "") + (overdue ? " is-overdue" : "") + '">' +
      '<input type="checkbox" class="task-check" data-id="' + id + '"' + (task.completed ? " checked" : "") +
      ' aria-label="Marquer comme terminée : ' + UI.escapeHtml(task.title) + '">' +
      '<div class="list-item-body">' +
      '<div class="list-item-title">' + UI.escapeHtml(task.title) + "</div>" +
      description +
      '<div class="list-item-meta">' +
      '<span class="due">Échéance : ' + UI.escapeHtml(UI.formatDate(task.due_date)) +
      (overdue ? " (en retard)" : "") + "</span>" +
      UI.priorityBadge(task.priority) +
      appMeta +
      "</div></div>" +
      '<div class="table-actions">' +
      '<button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="' + id + '">Modifier</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="' + id + '">Supprimer</button>' +
      "</div></li>"
    );
  }
 
  function render() {
    const total = tasks.length;
    const items = getFilteredTasks();
    const done = tasks.filter(function (t) { return t.completed; }).length;
 
    countEl.textContent =
      total === 0
        ? "Aucune tâche"
        : total + (total > 1 ? " tâches" : " tâche") + " · " + done + (done > 1 ? " terminées" : " terminée");
 
    if (total === 0) {
      UI.showEmptyState(listBox, "Aucune tâche pour le moment", "Cliquez sur « Ajouter une tâche » pour commencer.");
      return;
    }
    if (items.length === 0) {
      UI.showEmptyState(listBox, "Aucune tâche dans cette catégorie");
      return;
    }
 
    listBox.innerHTML = '<ul class="list task-card-list">' + items.map(renderTask).join("") + "</ul>";
  }
 
  async function loadTasks() {
    UI.showLoadingBlock(listBox);
    try {
      const data = unwrap(await Api.tasks.list());
      tasks = Array.isArray(data) ? data : [];
      render();
    } catch (err) {
      UI.showError(err);
      UI.showEmptyState(listBox, "Impossible de charger les tâches", "Vérifiez que le backend est démarré.");
    }
  }
 
  /** Charge les candidatures pour la liste déroulante (non bloquant) */
  async function loadApplications() {
    try {
      const data = unwrap(await Api.applications.list());
      applications = Array.isArray(data) ? data : [];
    } catch (err) {
      applications = [];
    }
    fillApplicationSelect("");
  }
 
  function fillApplicationSelect(selectedId) {
    const select = form.elements.application_id;
    let html = '<option value="">Aucune</option>';
    applications.forEach(function (app) {
      const selected = String(app.id) === String(selectedId) ? " selected" : "";
      html +=
        '<option value="' + UI.escapeHtml(app.id) + '"' + selected + ">" +
        UI.escapeHtml(app.company_name + " — " + app.position) + "</option>";
    });
    select.innerHTML = html;
  }
 
  /* ------------------------------------------------------------------
   * Formulaire (ajout / modification)
   * ------------------------------------------------------------------ */
  function openForm(task) {
    UI.clearFormErrors(form);
    form.reset();
    editingId = task ? task.id : null;
    modalTitle.textContent = task ? "Modifier la tâche" : "Ajouter une tâche";
 
    fillApplicationSelect(task ? task.application_id : "");
 
    if (task) {
      form.elements.title.value = task.title || "";
      form.elements.description.value = task.description || "";
      form.elements.due_date.value = task.due_date || "";
      form.elements.priority.value = task.priority || "Medium";
      form.elements.completed.checked = !!task.completed;
    } else {
      form.elements.due_date.value = todayIso();
      form.elements.priority.value = "Medium";
    }
    UI.openModal(MODAL_ID);
  }
 
  function validate(data) {
    const errors = {};
    if (!data.title) errors.title = "Le titre est obligatoire.";
    else if (data.title.length > 150) errors.title = "Le titre ne doit pas dépasser 150 caractères.";
    if (!data.due_date) errors.due_date = "La date d'échéance est obligatoire.";
    if (UI.PRIORITIES.indexOf(data.priority) === -1) errors.priority = "Priorité invalide.";
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
 
    // Uniquement les champs du contrat, avec les bons types
    const payload = {
      title: data.title,
      description: data.description,
      due_date: data.due_date,
      priority: data.priority,
      completed: data.completed === true,
      application_id: data.application_id === "" ? null : Number(data.application_id),
    };
 
    UI.setButtonLoading(submitBtn, true);
    try {
      if (editingId === null) {
        await Api.tasks.create(payload);
        UI.success("Tâche ajoutée.");
      } else {
        await Api.tasks.update(editingId, payload);
        UI.success("Tâche modifiée.");
      }
      UI.closeModal(MODAL_ID);
      await loadTasks();
    } catch (err) {
      UI.showFormError(form, err);
    } finally {
      UI.setButtonLoading(submitBtn, false);
    }
  }
 
  /* ------------------------------------------------------------------
   * Terminer / suppression
   * ------------------------------------------------------------------ */
  async function toggleCompleted(task, checked) {
    try {
      // Le backend accepte un envoi partiel : on ne change que "completed"
      await Api.tasks.update(task.id, { completed: checked });
      UI.success(checked ? "Tâche terminée." : "Tâche rouverte.");
      await loadTasks();
    } catch (err) {
      UI.showError(err);
      render(); // remet la case dans son état d'origine
    }
  }
 
  async function deleteTask(task) {
    const ok = await UI.confirmDialog(
      "Supprimer la tâche « " + task.title + " » ?",
      { title: "Supprimer la tâche" }
    );
    if (!ok) return;
 
    try {
      await Api.tasks.remove(task.id);
      UI.success("Tâche supprimée.");
      await loadTasks();
    } catch (err) {
      UI.showError(err);
    }
  }
 
  function findTask(id) {
    return tasks.find(function (t) { return String(t.id) === String(id); }) || null;
  }
 
  function onListClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const task = findTask(btn.getAttribute("data-id"));
    if (!task) return;
 
    if (btn.getAttribute("data-action") === "edit") openForm(task);
    if (btn.getAttribute("data-action") === "delete") deleteTask(task);
  }
 
  function onListChange(e) {
    if (!e.target.classList.contains("task-check")) return;
    const task = findTask(e.target.getAttribute("data-id"));
    if (task) toggleCompleted(task, e.target.checked);
  }
 
  /* ------------------------------------------------------------------
   * Démarrage
   * ------------------------------------------------------------------ */
  async function init() {
    const user = await Auth.initPrivatePage("tasks");
    if (!user) return;
 
    listBox = document.getElementById("tasks-list");
    countEl = document.getElementById("tasks-count");
    filterSelect = document.getElementById("task-filter");
    form = document.getElementById("task-form");
    submitBtn = document.getElementById("task-submit");
    modalTitle = document.getElementById("task-modal-title");
 
    form.elements.priority.innerHTML = UI.optionsHtml(UI.PRIORITIES, "Medium");
 
    UI.bindModal(MODAL_ID);
    document.getElementById("add-task-btn").addEventListener("click", function () { openForm(null); });
    filterSelect.addEventListener("change", render);
    form.addEventListener("submit", onSubmit);
    listBox.addEventListener("click", onListClick);
    listBox.addEventListener("change", onListChange);
 
    // Les candidatures d'abord, pour afficher leur nom dans la liste des tâches
    await loadApplications();
    loadTasks();
  }
 
  document.addEventListener("DOMContentLoaded", init);
})();