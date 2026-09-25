<?php

function setCorsHeaders()
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-Id');

    // Browser may send an OPTIONS request before the real request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function jsonResponse($data, $statusCode = 200)
{
    http_response_code($statusCode);
    header('Content-Type: application/json');

    echo json_encode($data);
    exit;
}

function requireAuth($pdo)
{
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    // Optional fallback header
    $userIdHeader = $_SERVER['HTTP_X_USER_ID'] ?? '';

    $userID = null;

    // Expected format: Authorization: Bearer 5
    if (preg_match('/Bearer\s+(\d+)/i', $authHeader, $matches)) {
        $userID = (int)$matches[1];
    } elseif ($userIdHeader !== '') {
        $userID = (int)$userIdHeader;
    }

    if (!$userID) {
        jsonResponse([
            "error" => "Authentication required"
        ], 401);
    }

    $stmt = $pdo->prepare(
        "SELECT ID, FirstName, LastName, Login, Role, Enabled
         FROM Users
         WHERE ID = ?"
    );

    $stmt->execute([$userID]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        jsonResponse([
            "error" => "Invalid authentication"
        ], 401);
    }

    if (!$user['Enabled']) {
        jsonResponse([
            "error" => "Account is disabled"
        ], 403);
    }

    return $user;
}

function requireAdmin($pdo)
{
    $user = requireAuth($pdo);

    if ($user['Role'] !== 'Admin') {
        jsonResponse([
            "error" => "Admin access required"
        ], 403);
    }

    return $user;
}
