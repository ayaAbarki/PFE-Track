<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../controllers/TaskController.php';

try {
    $method = requireMethod(['GET', 'POST', 'PUT', 'DELETE']);
    $userId = requireAuth();

    $id = null;
    if (isset($_GET['id'])) {
        $id = filter_var($_GET['id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            errorResponse('Invalid id', 400);
        }
    }

    $controller = new TaskController(getConnection());

    switch ($method) {
        case 'GET':    $controller->get($userId, $id);    break;
        case 'POST':   $controller->create($userId);      break;
        case 'PUT':    $controller->update($userId, $id); break;
        case 'DELETE': $controller->delete($userId, $id); break;
    }
} catch (PDOException $e) {
    error_log($e->getMessage());
    errorResponse('Internal server error', 500);
}