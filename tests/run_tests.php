<?php
$fails = 0;
function check(string $name, bool $ok): void {
    global $fails;
    echo ($ok ? "[OK]   " : "[ECHEC] ") . $name . PHP_EOL;
    if (!$ok) { $fails++; }
}

require_once __DIR__ . '/../backend/models/User.php';
require_once __DIR__ . '/../backend/models/Application.php';
require_once __DIR__ . '/../backend/models/Task.php';

check('Classe User', class_exists('User'));
check('Classe Application', class_exists('Application'));
check('Classe Task', class_exists('Task'));
check('User::emailExists existe', method_exists('User', 'emailExists'));
check('Application::findAllByUser existe', method_exists('Application', 'findAllByUser'));

$sql = file_get_contents(__DIR__ . '/../database/pfe_track.sql');
check('SQL : table users', str_contains($sql, 'CREATE TABLE users'));
check('SQL : table applications', str_contains($sql, 'CREATE TABLE applications'));
check('SQL : table tasks', str_contains($sql, 'CREATE TABLE tasks'));

exit($fails > 0 ? 1 : 0);