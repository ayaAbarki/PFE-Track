<?php

class Task
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // MySQL renvoie completed en 0/1 : on le convertit en vrai booléen pour le JSON
    private function format(array $row): array
    {
        $row['completed']      = (bool) $row['completed'];
        $row['id']             = (int) $row['id'];
        $row['application_id'] = $row['application_id'] === null ? null : (int) $row['application_id'];
        return $row;
    }

    public function findAllByUser(int $userId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM tasks
             WHERE user_id = :user_id
             ORDER BY completed ASC, due_date ASC, id DESC'
        );
        $stmt->execute(['user_id' => $userId]);
        return array_map([$this, 'format'], $stmt->fetchAll());
    }

    public function findByIdAndUser(int $id, int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM tasks WHERE id = :id AND user_id = :user_id LIMIT 1'
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        $row = $stmt->fetch();
        return $row ? $this->format($row) : null;
    }

    public function create(int $userId, array $d): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO tasks
               (user_id, application_id, title, description, due_date, priority, completed)
             VALUES
               (:user_id, :application_id, :title, :description, :due_date, :priority, :completed)'
        );
        $stmt->execute([
            'user_id'        => $userId,
            'application_id' => $d['application_id'],
            'title'          => $d['title'],
            'description'    => $d['description'],
            'due_date'       => $d['due_date'],
            'priority'       => $d['priority'],
            'completed'      => $d['completed'] ? 1 : 0,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, int $userId, array $d): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE tasks SET
               application_id = :application_id,
               title = :title,
               description = :description,
               due_date = :due_date,
               priority = :priority,
               completed = :completed
             WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute([
            'application_id' => $d['application_id'],
            'title'          => $d['title'],
            'description'    => $d['description'],
            'due_date'       => $d['due_date'],
            'priority'       => $d['priority'],
            'completed'      => $d['completed'] ? 1 : 0,
            'id'             => $id,
            'user_id'        => $userId,
        ]);
    }

    public function delete(int $id, int $userId): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM tasks WHERE id = :id AND user_id = :user_id');
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
    }
}