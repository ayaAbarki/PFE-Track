/**
 * dashboard.js — Page « Tableau de bord ».
 * Toutes les données viennent de GET /dashboard.php (aucune donnée statique).
 *
 * Champs utilisés (contrat) :
 *   total_applications, application_sent, waiting_for_response,
 *   interview_scheduled, accepted, rejected,
 *   upcoming_tasks[]      : id, application_id, title, description, due_date, priority, completed
 *   recent_applications[] : id, company_name, position, domain, application_date, status
 */
 
(function () {
  "use strict";
 
  const STAT_FIELDS = {
    "stat-total": "total_applications",
    "stat-sent": "application_sent",
    "stat-waiting": "waiting_for_response",
    "stat-interview": "interview_scheduled",
    "stat-accepted": "accepted",
    "stat-rejected": "rejected",
  };
 
  /** L'API peut envelopper les données dans { data: {...} } */
  function unwrap(response) {
    if (response && typeof response === "object" && "data" in response) {
      return response.data;
    }
    return response;
  }
 
  function renderStats(data) {
    Object.keys(STAT_FIELDS).forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      const value = data[STAT_FIELDS[id]];
      el.textContent = value === undefined || value === null ? "0" : String(value);
    });
  }
 
  function renderUpcomingTasks(tasks) {
    const container = document.getElementById("upcoming-tasks");
    if (!tasks || !tasks.length) {
      UI.showEmptyState(container, "Aucune tâche à venir", "Vous êtes à jour.");
      return;
    }
 
    const items = tasks.map(function (task) {
      return (
        '<li class="list-item task-item' + (UI.isOverdue(task.due_date) ? " is-overdue" : "") + '">' +
        '<div class="list-item-body">' +
        '<div class="list-item-title">' + UI.escapeHtml(task.title) + "</div>" +
        '<div class="list-item-meta">' +
        '<span class="due">Échéance : ' + UI.escapeHtml(UI.formatDate(task.due_date)) + "</span>" +
        "</div></div>" +
        UI.priorityBadge(task.priority) +
        "</li>"
      );
    }).join("");
 
    container.innerHTML = '<ul class="list">' + items + "</ul>";
  }
 
  function renderRecentApplications(applications) {
    const container = document.getElementById("recent-applications");
    if (!applications || !applications.length) {
      UI.showEmptyState(container, "Aucune candidature", "Ajoutez votre première candidature.");
      return;
    }
 
    const items = applications.map(function (app) {
      const sub = [app.domain, UI.formatDate(app.application_date)]
        .filter(function (v) { return v && v !== "—"; })
        .map(UI.escapeHtml)
        .join(" · ");
      return (
        '<li class="list-item">' +
        '<div class="list-item-body">' +
        '<div class="list-item-title">' + UI.escapeHtml(app.company_name) +
        " — " + UI.escapeHtml(app.position) + "</div>" +
        '<div class="list-item-meta"><span>' + sub + "</span></div>" +
        "</div>" +
        UI.statusBadge(app.status) +
        "</li>"
      );
    }).join("");
 
    container.innerHTML = '<ul class="list">' + items + "</ul>";
  }
 
  async function init() {
    const user = await Auth.initPrivatePage("dashboard");
    if (!user) return;
 
    const tasksBox = document.getElementById("upcoming-tasks");
    const appsBox = document.getElementById("recent-applications");
    UI.showLoadingBlock(tasksBox);
    UI.showLoadingBlock(appsBox);
 
    try {
      const data = unwrap(await Api.dashboard.get()) || {};
      renderStats(data);
      renderUpcomingTasks(data.upcoming_tasks);
      renderRecentApplications(data.recent_applications);
    } catch (err) {
      UI.showError(err);
      UI.showEmptyState(tasksBox, "Impossible de charger les tâches");
      UI.showEmptyState(appsBox, "Impossible de charger les candidatures");
    }
  }
 
  document.addEventListener("DOMContentLoaded", init);
})();