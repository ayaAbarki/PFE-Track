<?php
// Ce fichier crée UNE connexion à la base de données.
// Tous les autres fichiers l'utiliseront.

function getConnection(): PDO
{
    $host     = getenv('DB_HOST') ?: 'localhost';
    $dbname   = getenv('DB_NAME') ?: 'pfe_track';
    $username = getenv('DB_USER') ?: 'root';
    $password = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';

    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";

    $options = [
        // Si une erreur SQL arrive, PHP lance une exception
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        // Les résultats sont retournés sous forme de tableaux nommés
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        // Vraies requêtes préparées (plus sûr contre l'injection SQL)
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    return new PDO($dsn, $username, $password, $options);
}