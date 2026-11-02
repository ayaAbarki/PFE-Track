<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

try {
    $pdo = getConnection();
    successResponse(['db' => 'connected'], 'Test OK');
} catch (PDOException $e) {
    errorResponse('Database error', 500);
}