<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../controllers/AuthController.php';

try {
    $pdo        = getConnection();
    $controller = new AuthController($pdo);
    $action     = $_GET['action'] ?? '';

    switch ($action) {
        case 'register':
            requireMethod(['POST']);
            $controller->register();
            break;
        case 'login':
            requireMethod(['POST']);
            $controller->login();
            break;
        case 'logout':
            requireMethod(['POST']);
            $controller->logout();
            break;
        case 'me':
            requireMethod(['GET']);
            $controller->me();
            break;
        default:
            errorResponse('Not found', 404);
    }
} catch (PDOException $e) {
    // On n'affiche jamais le détail de l'erreur SQL à l'utilisateur
    error_log($e->getMessage());
    errorResponse('Internal server error', 500);
}