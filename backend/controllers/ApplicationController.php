<?php

require_once __DIR__ . '/../models/Application.php';

class ApplicationController
{
    private const STATUSES = [
        'To Contact', 'Application Sent', 'Waiting for Response',
        'Interview Scheduled', 'Accepted', 'Rejected',
    ];

    private Application $model;

    public function __construct(PDO $pdo)
    {
        $this->model = new Application($pdo);
    }

    // GET /applications.php  ou  GET /applications.php?id=1
    public function get(int $userId, ?int $id): void
    {
        if ($id === null) {
            successResponse($this->model->findAllByUser($userId), 'Applications retrieved');
        }
        $app = $this->model->findByIdAndUser($id, $userId);
        if (!$app) {
            errorResponse('Application not found', 404);
        }
        successResponse($app, 'Application retrieved');
    }

    // POST /applications.php
    public function create(int $userId): void
    {
        $input = getJsonInput();
        $data  = $this->validate($input);   // s'arrête avec 422 si invalide

        $id = $this->model->create($userId, $data);
        successResponse($this->model->findByIdAndUser($id, $userId), 'Application created', 201);
    }

    // PUT /applications.php?id=1
    public function update(int $userId, ?int $id): void
    {
        if ($id === null) {
            errorResponse('Application id is required', 400);
        }
        $existing = $this->model->findByIdAndUser($id, $userId);
        if (!$existing) {
            errorResponse('Application not found', 404);
        }

        // On part des valeurs actuelles et on remplace seulement ce qui est envoyé
        $input = array_merge($existing, getJsonInput());
        $data  = $this->validate($input);

        $this->model->update($id, $userId, $data);
        successResponse($this->model->findByIdAndUser($id, $userId), 'Application updated');
    }

    // DELETE /applications.php?id=1
    public function delete(int $userId, ?int $id): void
    {
        if ($id === null) {
            errorResponse('Application id is required', 400);
        }
        if (!$this->model->findByIdAndUser($id, $userId)) {
            errorResponse('Application not found', 404);
        }
        // Les tâches liées passent à application_id = NULL (ON DELETE SET NULL en base)
        $this->model->delete($id, $userId);
        successResponse([], 'Application deleted');
    }

    // ---------- Validation + nettoyage des données ----------
    private function validate(array $in): array
    {
        $errors = [];

        $company  = trim((string) ($in['company_name'] ?? ''));
        $position = trim((string) ($in['position'] ?? ''));
        $domain   = trim((string) ($in['domain'] ?? ''));
        $date     = trim((string) ($in['application_date'] ?? ''));
        $status   = trim((string) ($in['status'] ?? 'To Contact'));
        $url      = trim((string) ($in['offer_url'] ?? ''));
        $email    = trim((string) ($in['contact_email'] ?? ''));
        $notes    = trim((string) ($in['notes'] ?? ''));

        if ($company === '' || mb_strlen($company) > 150) {
            $errors['company_name'] = 'Company name is required (max 150 characters)';
        }
        if ($position === '' || mb_strlen($position) > 150) {
            $errors['position'] = 'Position is required (max 150 characters)';
        }
        if ($domain === '' || mb_strlen($domain) > 100) {
            $errors['domain'] = 'Domain is required (max 100 characters)';
        }

        // Date au format YYYY-MM-DD et réellement valide
        $d = DateTime::createFromFormat('Y-m-d', $date);
        if (!$d || $d->format('Y-m-d') !== $date) {
            $errors['application_date'] = 'Date must be valid and formatted YYYY-MM-DD';
        }

        if (!in_array($status, self::STATUSES, true)) {
            $errors['status'] = 'Status must be one of: ' . implode(', ', self::STATUSES);
        }

        if ($url !== '') {
            $validUrl = filter_var($url, FILTER_VALIDATE_URL)
                && preg_match('#^https?://#i', $url)
                && mb_strlen($url) <= 255;
            if (!$validUrl) {
                $errors['offer_url'] = 'Offer URL must be a valid http(s) URL';
            }
        }
        if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150)) {
            $errors['contact_email'] = 'Contact email is invalid';
        }

        if (!empty($errors)) {
            errorResponse('Validation error', 422, $errors);
        }

        return [
            'company_name'     => $company,
            'position'         => $position,
            'domain'           => $domain,
            'application_date' => $date,
            'status'           => $status,
            'offer_url'        => $url === '' ? null : $url,      // vide => NULL en base
            'contact_email'    => $email === '' ? null : $email,
            'notes'            => $notes === '' ? null : $notes,
        ];
    }
}