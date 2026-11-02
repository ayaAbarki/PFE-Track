<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

try {
    requireMethod(['GET']);
    $userId = requireAuth();              // 401 si pas connecté
    $pdo    = getConnection();

    // ---------- 1. Compteurs par statut (une seule requête) ----------
    $stmt = $pdo->prepare(
        'SELECT status, COUNT(*) AS total
         FROM applications
         WHERE user_id = :user_id
         GROUP BY status'
    );
    $stmt->execute(['user_id' => $userId]);

    // On part de zéro pour chaque statut, puis on remplit avec les résultats
    $counts = [
        'To Contact'          => 0,
        'Application Sent'    => 0,
        'Waiting for Response'=> 0,
        'Interview Scheduled' => 0,
        'Accepted'            => 0,
        'Rejected'            => 0,
    ];
    foreach ($stmt->fetchAll() as $row) {
        if (array_key_exists($row['status'], $counts)) {
            $counts[$row['status']] = (int) $row['total'];
        }
    }

    // ---------- 2. Tâches à venir (non terminées, échéance aujourd'hui ou plus tard) ----------
    $stmt = $pdo->prepare(
        'SELECT id, application_id, title, description, due_date, priority, completed
         FROM tasks
         WHERE user_id = :user_id
           AND completed = 0
           AND due_date >= CURDATE()
         ORDER BY due_date ASC, id ASC
         LIMIT 5'
    );
    $stmt->execute(['user_id' => $userId]);
    $upcomingTasks = array_map(function ($t) {
        $t['id']             = (int) $t['id'];
        $t['application_id'] = $t['application_id'] === null ? null : (int) $t['application_id'];
        $t['completed']      = (bool) $t['completed'];
        return $t;
    }, $stmt->fetchAll());

    // ---------- 3. Candidatures récentes ----------
    $stmt = $pdo->prepare(
        'SELECT id, company_name, position, domain, application_date, status
         FROM applications
         WHERE user_id = :user_id
         ORDER BY application_date DESC, id DESC
         LIMIT 5'
    );
    $stmt->execute(['user_id' => $userId]);
    $recentApplications = $stmt->fetchAll();

    // ---------- 4. Réponse ----------
    successResponse([
        'total_applications'   => array_sum($counts),
        'to_contact'           => $counts['To Contact'],
        'application_sent'     => $counts['Application Sent'],
        'waiting_for_response' => $counts['Waiting for Response'],
        'interview_scheduled'  => $counts['Interview Scheduled'],
        'accepted'             => $counts['Accepted'],
        'rejected'             => $counts['Rejected'],
        'upcoming_tasks'       => $upcomingTasks,
        'recent_applications'  => $recentApplications,
    ], 'Dashboard retrieved');

} catch (PDOException $e) {
    error_log($e->getMessage());
    errorResponse('Internal server error', 500);
}