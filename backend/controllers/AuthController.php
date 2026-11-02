<?php

require_once __DIR__ . '/../models/User.php';

class AuthController
{
    private User $userModel;

    public function __construct(PDO $pdo)
    {
        $this->userModel = new User($pdo);
    }

    // ---------- INSCRIPTION ----------
    public function register(): void
    {
        $input    = getJsonInput();
        $fullName = trim($input['full_name'] ?? '');
        $email    = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';

        // 1. Validation
        $errors = [];
        if ($fullName === '' || mb_strlen($fullName) < 2 || mb_strlen($fullName) > 100) {
            $errors['full_name'] = 'Full name must be between 2 and 100 characters';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150) {
            $errors['email'] = 'Invalid email address';
        }
        if (!is_string($password) || strlen($password) < 8) {
            $errors['password'] = 'Password must be at least 8 characters';
        }
        if (!empty($errors)) {
            errorResponse('Validation error', 422, $errors);
        }

        // 2. Email déjà utilisé ?
        if ($this->userModel->emailExists($email)) {
            errorResponse('Email already in use', 409, ['email' => 'This email is already registered']);
        }

        // 3. Création (le mot de passe est hashé, jamais stocké en clair)
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $id   = $this->userModel->create($fullName, $email, $hash);

        successResponse($this->userModel->findById($id), 'Registration successful', 201);
    }

    // ---------- CONNEXION ----------
    public function login(): void
    {
        $input    = getJsonInput();
        $email    = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';

        $errors = [];
        if ($email === '') {
            $errors['email'] = 'Email is required';
        }
        if (!is_string($password) || $password === '') {
            $errors['password'] = 'Password is required';
        }
        if (!empty($errors)) {
            errorResponse('Validation error', 422, $errors);
        }

        $user = $this->userModel->findByEmail($email);

        // Même message si l'email OU le mot de passe est faux
        // (on ne dit pas à un attaquant quel email existe)
        if (!$user || !password_verify($password, $user['password'])) {
            errorResponse('Invalid email or password', 401);
        }

        startSession();
        session_regenerate_id(true);          // nouvel id de session après connexion
        $_SESSION['user_id'] = (int) $user['id'];

        successResponse($this->userModel->findById((int) $user['id']), 'Login successful');
    }

    // ---------- DÉCONNEXION ----------
    public function logout(): void
    {
        startSession();
        $_SESSION = [];                       // vide les données de session

        // Supprime le cookie de session dans le navigateur
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }

        session_destroy();                    // détruit la session côté serveur
        successResponse([], 'Logout successful');
    }

    // ---------- UTILISATEUR CONNECTÉ ----------
    public function me(): void
    {
        $userId = requireAuth();              // 401 si pas connecté
        $user   = $this->userModel->findById($userId);

        if (!$user) {
            errorResponse('Unauthorized', 401);
        }
        successResponse($user, 'Current user');
    }
}