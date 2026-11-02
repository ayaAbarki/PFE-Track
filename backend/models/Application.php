<?php

class Application
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // Toutes les candidatures d'un utilisateur (les plus récentes d'abord)
    public function findAllByUser(int $userId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM applications
             WHERE user_id = :user_id
             ORDER BY application_date DESC, id DESC'
        );
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll();
    }

    // Une candidature, SEULEMENT si elle appartient à cet utilisateur
    public function findByIdAndUser(int $id, int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM applications WHERE id = :id AND user_id = :user_id LIMIT 1'
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(int $userId, array $d): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO applications
               (user_id, company_name, position, domain, application_date,
                status, offer_url, contact_email, notes)
             VALUES
               (:user_id, :company_name, :position, :domain, :application_date,
                :status, :offer_url, :contact_email, :notes)'
        );
        $stmt->execute([
            'user_id'          => $userId,
            'company_name'     => $d['company_name'],
            'position'         => $d['position'],
            'domain'           => $d['domain'],
            'application_date' => $d['application_date'],
            'status'           => $d['status'],
            'offer_url'        => $d['offer_url'],
            'contact_email'    => $d['contact_email'],
            'notes'            => $d['notes'],
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, int $userId, array $d): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE applications SET
               company_name = :company_name,
               position = :position,
               domain = :domain,
               application_date = :application_date,
               status = :status,
               offer_url = :offer_url,
               contact_email = :contact_email,
               notes = :notes
             WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute([
            'company_name'     => $d['company_name'],
            'position'         => $d['position'],
            'domain'           => $d['domain'],
            'application_date' => $d['application_date'],
            'status'           => $d['status'],
            'offer_url'        => $d['offer_url'],
            'contact_email'    => $d['contact_email'],
            'notes'            => $d['notes'],
            'id'               => $id,
            'user_id'          => $userId,
        ]);
    }

    public function delete(int $id, int $userId): void
    {
        $stmt = $this->pdo->prepare(
            'DELETE FROM applications WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
    }
}