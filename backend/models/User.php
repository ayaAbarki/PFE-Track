<?php

class User
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // Cherche un utilisateur par email (utilisé pour le login)
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    // Cherche un utilisateur par id, SANS le mot de passe
    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, full_name, email, created_at FROM users WHERE id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    // Vérifie si un email existe déjà
    public function emailExists(string $email): bool
    {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM users WHERE email = :email');
        $stmt->execute(['email' => $email]);
        return (int) $stmt->fetchColumn() > 0;
    }

    // Crée un utilisateur et retourne son id
    public function create(string $fullName, string $email, string $passwordHash): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO users (full_name, email, password)
             VALUES (:full_name, :email, :password)'
        );
        $stmt->execute([
            'full_name' => $fullName,
            'email'     => $email,
            'password'  => $passwordHash,
        ]);
        return (int) $this->pdo->lastInsertId();
    }
}