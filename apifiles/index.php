<?php

require_once __DIR__ . '/config/helpers.php';
require_once __DIR__ . '/config/db.php';

setCorsHeaders();

if (isset($_GET['ping'])) {

    jsonResponse([
        "status" => "OK",
        "timestamp" => time()
    ]);
}

if (isset($_GET['dbtest'])) {
    try {
        $pdo = getDB();

        jsonResponse([
            "status" => "OK",
            "message" => "Database connected"
        ]);
    } catch (Exception $e) {
        jsonResponse([
            "status" => "ERROR",
            "message" => $e->getMessage()
        ], 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_GET['register'])) {

    $data = json_decode(file_get_contents('php://input'), true);

    $login = trim($data['login'] ?? '');
    $password = $data['password'] ?? '';

    if ($login === '' || $password === '') {
        jsonResponse([
            "error" => "Login and password are required"
        ], 400);
    }

    try {
        $pdo = getDB();

        $stmt = $pdo->prepare(
            "SELECT ID, FirstName, LastName, Login, Password
             FROM Users
             WHERE Login = ?"
        );

        $stmt->execute([$login]);

        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($password, $user['Password'])) {
            jsonResponse([
                "error" => "Invalid login or password"
            ], 401);
        }

        jsonResponse([
            "id" => $user['ID'],
            "firstName" => $user['FirstName'],
            "lastName" => $user['LastName'],
            "login" => $user['Login'],
            "error" => ""
        ], 200);

    } catch (Exception $e) {
        jsonResponse([
            "error" => "Login failed"
        ], 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['register'])) {

    $data = json_decode(file_get_contents('php://input'), true);

    $firstName = trim($data['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? '');
    $login = trim($data['login'] ?? '');
    $password = $data['password'] ?? '';

    if (
        $firstName === '' ||
        $lastName === '' ||
        $login === '' ||
        $password === ''
    ) {
        jsonResponse([
            "error" => "All fields are required"
        ], 400);
    }

    try {
        $pdo = getDB();

        // Check whether login already exists
        $stmt = $pdo->prepare(
            "SELECT ID FROM Users WHERE Login = ?"
        );

        $stmt->execute([$login]);

        if ($stmt->fetch()) {
            jsonResponse([
                "error" => "Login already exists"
            ], 409);
        }

        // Hash password before storing it
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare(
            "INSERT INTO Users (FirstName, LastName, Login, Password)
             VALUES (?, ?, ?, ?)"
        );

        $stmt->execute([
            $firstName,
            $lastName,
            $login,
            $passwordHash
        ]);

        jsonResponse([
            "message" => "User registered successfully",
            "error" => ""
        ], 201);

    } catch (Exception $e) {
        jsonResponse([
            "error" => "Registration failed"
        ], 500);
    }
}