<?php
// Fonctions réutilisables par tous les endpoints.

// Ne jamais afficher les erreurs PHP à l'utilisateur (on les écrit dans les logs)
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Toute exception non prévue => réponse JSON 500 propre
set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'errors'  => new stdClass(),
    ]);
});

// ---------- 1. Sessions ----------
function startSession(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 0,          // le cookie disparaît à la fermeture du navigateur
            'path'     => '/',
            'httponly' => true,       // JavaScript ne peut pas lire le cookie
            'samesite' => 'Lax',      // protection contre certaines attaques CSRF
        ]);
        session_start();
    }
}

// ---------- 2. Réponses JSON ----------
function sendJson(array $body, int $statusCode): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit; // on arrête le script ici
}

function successResponse($data = [], string $message = 'Operation successful', int $code = 200): void
{
    sendJson([
        'success' => true,
        'message' => $message,
        'data'    => $data,
    ], $code);
}

function errorResponse(string $message, int $code = 400, array $errors = []): void
{
    sendJson([
        'success' => false,
        'message' => $message,
        'errors'  => (object) $errors, // (object) pour avoir {} et non [] quand c'est vide
    ], $code);
}

// ---------- 3. Lire le JSON envoyé par le frontend ----------
function getJsonInput(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        errorResponse('Invalid JSON body', 400);
    }
    return $data;
}

// ---------- 4. Vérifier la méthode HTTP ----------
function requireMethod(array $allowedMethods): string
{
    $method = $_SERVER['REQUEST_METHOD'];
    if (!in_array($method, $allowedMethods, true)) {
        header('Allow: ' . implode(', ', $allowedMethods));
        errorResponse('Method not allowed', 400);
    }
    return $method;
}

// ---------- 5. Vérifier que l'utilisateur est connecté ----------
function requireAuth(): int
{
    startSession();
    if (empty($_SESSION['user_id'])) {
        errorResponse('Unauthorized', 401);
    }
    return (int) $_SESSION['user_id'];
}