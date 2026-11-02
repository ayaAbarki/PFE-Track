<?php

require_once __DIR__ . '/../models/Task.php';
require_once __DIR__ . '/../models/Application.php';

class TaskController
{
    private const PRIORITIES = ['Low', 'Medium', 'High'];

    private Task $model;
    private Application $applicationModel;

    public function __construct(PDO $pdo)
    {
        $this->model            = new Task($pdo);
        $this->applicationModel = new Application($pdo);
    }

    // GET /tasks.php  ou  GET /tasks.php?id=1
    public function get(int $userId, ?int $id): void
    {
        if ($id === null) {
            successResponse($this->model->findAllByUser($userId), 'Tasks retrieved');
        }
        $task = $this->model->findByIdAndUser($id, $userId);
        if (!$task) {
            errorResponse('Task not found', 404);
        }
        successResponse($task, 'Task retrieved');
    }

    // POST /tasks.php
    public function create(int $userId): void
    {
        $data = $this->validate(getJsonInput(), $userId);

        $id = $this->model->create($userId, $data);
        successResponse($this->model->findByIdAndUser($id, $userId), 'Task created', 201);
    }

    // PUT /tasks.php?id=1
    public function update(int $userId, ?int $id): void
    {
        if ($id === null) {
            errorResponse('Task id is required', 400);
        }
        $existing = $this->model->findByIdAndUser($id, $userId);
        if (!$existing) {
            errorResponse('Task not found', 404);
        }

        // Valeurs actuelles + champs envoyés (permet de ne changer que "completed", par exemple)
        $input = array_merge($existing, getJsonInput());
        $data  = $this->validate($input, $userId);

        $this->model->update($id, $userId, $data);
        successResponse($this->model->findByIdAndUser($id, $userId), 'Task updated');
    }

    // DELETE /tasks.php?id=1
    public function delete(int $userId, ?int $id): void
    {
        if ($id === null) {
            errorResponse('Task id is required', 400);
        }
        if (!$this->model->findByIdAndUser($id, $userId)) {
            errorResponse('Task not found', 404);
        }
        $this->model->delete($id, $userId);
        successResponse([], 'Task deleted');
    }

    // ---------- Validation + nettoyage ----------
    private function validate(array $in, int $userId): array
    {
        $errors = [];

        $title    = trim((string) ($in['title'] ?? ''));
        $desc     = trim((string) ($in['description'] ?? ''));
        $dueDate  = trim((string) ($in['due_date'] ?? ''));
        $priority = trim((string) ($in['priority'] ?? 'Medium'));

        if ($title === '' || mb_strlen($title) > 150) {
            $errors['title'] = 'Title is required (max 150 characters)';
        }

        $d = DateTime::createFromFormat('Y-m-d', $dueDate);
        if (!$d || $d->format('Y-m-d') !== $dueDate) {
            $errors['due_date'] = 'Due date must be valid and formatted YYYY-MM-DD';
        }

        if (!in_array($priority, self::PRIORITIES, true)) {
            $errors['priority'] = 'Priority must be one of: ' . implode(', ', self::PRIORITIES);
        }

        // completed : doit être un vrai booléen (true / false)
        $completed = $in['completed'] ?? false;
        if (!is_bool($completed)) {
            $errors['completed'] = 'Completed must be a boolean (true or false)';
        }

        // application_id : null, ou un entier qui appartient à l'utilisateur
        $applicationId = $in['application_id'] ?? null;
        if ($applicationId !== null) {
            if (!is_int($applicationId) || $applicationId < 1) {
                $errors['application_id'] = 'application_id must be a positive integer or null';
            } elseif (!$this->applicationModel->findByIdAndUser($applicationId, $userId)) {
                // Même message si elle n'existe pas ou appartient à quelqu'un d'autre
                $errors['application_id'] = 'Application not found';
            }
        }

        if (!empty($errors)) {
            errorResponse('Validation error', 422, $errors);
        }

        return [
            'title'          => $title,
            'description'    => $desc === '' ? null : $desc,
            'due_date'       => $dueDate,
            'priority'       => $priority,
            'completed'      => $completed,
            'application_id' => $applicationId,
        ];
    }
}