<?php

require_once __DIR__ . '/config/helpers.php';
require_once __DIR__ . '/config/db.php';

setCorsHeaders();

// Ping Query
if (isset($_GET['ping'])) {

    jsonResponse([
        "status" => "OK",
        "timestamp" => time()
    ]);
}

// DBtest Query
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
            "message" => "Database connection failed"
        ], 500);
    }
}

// Login Query
if (
    $_SERVER['REQUEST_METHOD'] === 'POST' &&
    isset($_GET['action']) &&
    $_GET['action'] === 'login'
) {

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
            "SELECT ID, FirstName, LastName, Login, Password, Role, Enabled
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

        if (!$user['Enabled']) {
            jsonResponse([
                "error" => "Account is disabled"
            ], 403);
        }

        jsonResponse([
            "id" => $user['ID'],
            "firstName" => $user['FirstName'],
            "lastName" => $user['LastName'],
            "login" => $user['Login'],
            "role" => $user['Role'],
            "enabled" => (bool)$user['Enabled'],
            "token" => (string)$user['ID'],
            "error" => ""
        ], 200);

    } catch (Exception $e) {
        jsonResponse([
            "error" => "Login failed"
        ], 500);
    }
}

// Registration Query
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
            "INSERT INTO Users (FirstName, LastName, Login, Password, Role, Enabled)
             VALUES (?, ?, ?, ?, 'User', 1)"
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

// Admin Search/List Users
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' &&
    isset($_GET['admin']) &&
    $_GET['admin'] === 'users'
) {
    $pdo = getDB();

    // Only an authenticated Admin can continue
    $admin = requireAdmin($pdo);

    $search = trim($_GET['q'] ?? '');

    if ($search === '') {

        // No search term: return all users
        $stmt = $pdo->prepare(
            "SELECT ID, FirstName, LastName, Login, Role, Enabled,
                    DateCreated, DateUpdated
             FROM Users
             ORDER BY LastName, FirstName"
        );

        $stmt->execute();

    } else {

        // Search users by first name, last name, or login
        $searchTerm = '%' . $search . '%';

        $stmt = $pdo->prepare(
            "SELECT ID, FirstName, LastName, Login, Role, Enabled,
                    DateCreated, DateUpdated
             FROM Users
             WHERE FirstName LIKE ?
                OR LastName LIKE ?
                OR Login LIKE ?
             ORDER BY LastName, FirstName"
        );

        $stmt->execute([
            $searchTerm,
            $searchTerm,
            $searchTerm
        ]);
    }

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get all contacts belonging to each returned user
    $contactStmt = $pdo->prepare(
        "SELECT ID, FirstName, LastName, Email, Phone,
                DateCreated, DateUpdated, UserID
        FROM Contacts
        WHERE UserID = ?
        ORDER BY LastName, FirstName"
    );

    foreach ($users as &$user) {

        $contactStmt->execute([$user['ID']]);

        $user['Contacts'] = $contactStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    unset($user);

    jsonResponse([
        "users" => $users,
        "error" => ""
    ], 200);
}

// Admin Enable/Disable User
if (
    $_SERVER['REQUEST_METHOD'] === 'PUT' &&
    isset($_GET['admin']) &&
    $_GET['admin'] === 'status'
) {
    $pdo = getDB();

    // Only an authenticated Admin can continue
    $admin = requireAdmin($pdo);

    $userID = (int)($_GET['id'] ?? 0);

    $data = json_decode(file_get_contents('php://input'), true);

    if ($userID <= 0 || !isset($data['enabled'])) {
        jsonResponse([
            "error" => "User ID and enabled status are required"
        ], 400);
    }

    // Make sure enabled is actually true or false
    $enabled = filter_var(
        $data['enabled'],
        FILTER_VALIDATE_BOOLEAN,
        FILTER_NULL_ON_FAILURE
    );

    if ($enabled === null) {
        jsonResponse([
            "error" => "Enabled must be true or false"
        ], 400);
    }

    // Check that the target user exists
    $stmt = $pdo->prepare(
        "SELECT ID, Login, Enabled
         FROM Users
         WHERE ID = ?"
    );

    $stmt->execute([$userID]);

    $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$targetUser) {
        jsonResponse([
            "error" => "User not found"
        ], 404);
    }

    // Prevent an Admin from disabling their own account
    if ($userID === (int)$admin['ID'] && !$enabled) {
        jsonResponse([
            "error" => "You cannot disable your own account"
        ], 400);
    }

    $stmt = $pdo->prepare(
        "UPDATE Users
         SET Enabled = ?
         WHERE ID = ?"
    );

    $stmt->execute([
        $enabled ? 1 : 0,
        $userID
    ]);

    jsonResponse([
        "message" => $enabled
            ? "User enabled successfully"
            : "User disabled successfully",
        "id" => $userID,
        "enabled" => $enabled,
        "error" => ""
    ], 200);
}

// Change Password (Admin)
if (
    $_SERVER['REQUEST_METHOD'] === 'PUT' &&
    isset($_GET['admin']) &&
    $_GET['admin'] === 'password'
) {
    $pdo = getDB();

    // Only an authenticated Admin can continue
    $admin = requireAdmin($pdo);

    $userID = (int)($_GET['id'] ?? 0);

    $data = json_decode(file_get_contents('php://input'), true);

    $newPassword = $data['password'] ?? '';

    if ($userID <= 0 || $newPassword === '') {
        jsonResponse([
            "error" => "User ID and new password are required"
        ], 400);
    }

    // Check whether the target user exists
    $stmt = $pdo->prepare(
        "SELECT ID, Login
         FROM Users
         WHERE ID = ?"
    );

    $stmt->execute([$userID]);

    $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$targetUser) {
        jsonResponse([
            "error" => "User not found"
        ], 404);
    }

    // Hash the new password before storing it
    $passwordHash = password_hash(
        $newPassword,
        PASSWORD_DEFAULT
    );

    $stmt = $pdo->prepare(
        "UPDATE Users
         SET Password = ?
         WHERE ID = ?"
    );

    $stmt->execute([
        $passwordHash,
        $userID
    ]);

    jsonResponse([
        "message" => "Password changed successfully",
        "id" => $userID,
        "error" => ""
    ], 200);
}

// Create New Admin (Admin)
if (
    $_SERVER['REQUEST_METHOD'] === 'POST' &&
    isset($_GET['admin']) &&
    $_GET['admin'] === 'create'
) {
    $pdo = getDB();

    // Only an authenticated Admin can continue
    $admin = requireAdmin($pdo);

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

    // Make sure the login is not already taken
    $stmt = $pdo->prepare(
        "SELECT ID
         FROM Users
         WHERE Login = ?"
    );

    $stmt->execute([$login]);

    if ($stmt->fetch()) {
        jsonResponse([
            "error" => "Login already exists"
        ], 409);
    }

    // Hash the password before storing it
    $passwordHash = password_hash(
        $password,
        PASSWORD_DEFAULT
    );

    $stmt = $pdo->prepare(
        "INSERT INTO Users
            (FirstName, LastName, Login, Password, Role, Enabled)
         VALUES
            (?, ?, ?, ?, 'Admin', 1)"
    );

    $stmt->execute([
        $firstName,
        $lastName,
        $login,
        $passwordHash
    ]);

    $newAdminID = $pdo->lastInsertId();

    jsonResponse([
        "message" => "Admin created successfully",
        "id" => (int)$newAdminID,
        "role" => "Admin",
        "error" => ""
    ], 201);
}

// Contact Search/List
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' &&
    isset($_GET['contacts']) &&
    $_GET['contacts'] === 'search'
) {
    $pdo = getDB();

    // Only an authenticated user can see their own contacts
    $user = requireAuth($pdo);

    $search = trim($_GET['q'] ?? '');

    if ($search === '') {

        // No search term: return all contacts for this user
        $stmt = $pdo->prepare(
            "SELECT ID, FirstName, LastName, Email, Phone,
                    DateCreated, DateUpdated
             FROM Contacts
             WHERE UserID = ?
             ORDER BY LastName, FirstName"
        );

        $stmt->execute([(int)$user['ID']]);

    } else {

        // Search this user's contacts by name, email, or phone
        $searchTerm = '%' . $search . '%';

        $stmt = $pdo->prepare(
            "SELECT ID, FirstName, LastName, Email, Phone,
                    DateCreated, DateUpdated
             FROM Contacts
             WHERE UserID = ?
               AND (
                    FirstName LIKE ?
                    OR LastName LIKE ?
                    OR Email LIKE ?
                    OR Phone LIKE ?
               )
             ORDER BY LastName, FirstName"
        );

        $stmt->execute([
            (int)$user['ID'],
            $searchTerm,
            $searchTerm,
            $searchTerm,
            $searchTerm
        ]);
    }

    $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse([
        "contacts" => $contacts,
        "error" => ""
    ], 200);
}

// Add Contact
if (
    $_SERVER['REQUEST_METHOD'] === 'POST' &&
    isset($_GET['contacts']) &&
    $_GET['contacts'] === 'add'
) {
    $pdo = getDB();

    // The new contact belongs to the signed-in user
    $user = requireAuth($pdo);

    $data = json_decode(file_get_contents('php://input'), true);

    $firstName = trim($data['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? '');
    $email = trim($data['email'] ?? '');
    $phone = trim($data['phone'] ?? '');

    if (
        $firstName === '' ||
        $lastName === '' ||
        $email === '' ||
        $phone === ''
    ) {
        jsonResponse([
            "error" => "All fields are required"
        ], 400);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO Contacts
            (FirstName, LastName, Email, Phone, UserID)
         VALUES
            (?, ?, ?, ?, ?)"
    );

    $stmt->execute([
        $firstName,
        $lastName,
        $email,
        $phone,
        (int)$user['ID']
    ]);

    jsonResponse([
        "message" => "Contact added successfully",
        "id" => (int)$pdo->lastInsertId(),
        "error" => ""
    ], 201);
}

// Delete Contact
if (
    $_SERVER['REQUEST_METHOD'] === 'DELETE' &&
    isset($_GET['contacts']) &&
    $_GET['contacts'] === 'delete'
) {
    $pdo = getDB();

    // A user can delete only their own contacts
    $user = requireAuth($pdo);

    $contactID = (int)($_GET['id'] ?? 0);

    if ($contactID <= 0) {
        jsonResponse([
            "error" => "Contact ID is required"
        ], 400);
    }

    $stmt = $pdo->prepare(
        "DELETE FROM Contacts
         WHERE ID = ?
           AND UserID = ?"
    );

    $stmt->execute([
        $contactID,
        (int)$user['ID']
    ]);

    if ($stmt->rowCount() === 0) {
        jsonResponse([
            "error" => "Contact not found"
        ], 404);
    }

    jsonResponse([
        "message" => "Contact deleted successfully",
        "id" => $contactID,
        "error" => ""
    ], 200);
}

// Update Contact
if (
    $_SERVER['REQUEST_METHOD'] === 'PUT' &&
    isset($_GET['contacts']) &&
    $_GET['contacts'] === 'update'
) {
    $pdo = getDB();

    // A user can update only their own contacts
    $user = requireAuth($pdo);

    $contactID = (int)($_GET['id'] ?? 0);

    $data = json_decode(file_get_contents('php://input'), true);

    $firstName = trim($data['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? '');
    $email = trim($data['email'] ?? '');
    $phone = trim($data['phone'] ?? '');

    if (
        $contactID <= 0 ||
        $firstName === '' ||
        $lastName === '' ||
        $email === '' ||
        $phone === ''
    ) {
        jsonResponse([
            "error" => "Contact ID and all fields are required"
        ], 400);
    }

    $stmt = $pdo->prepare(
        "SELECT ID
         FROM Contacts
         WHERE ID = ?
           AND UserID = ?"
    );

    $stmt->execute([
        $contactID,
        (int)$user['ID']
    ]);

    if (!$stmt->fetch()) {
        jsonResponse([
            "error" => "Contact not found"
        ], 404);
    }

    $stmt = $pdo->prepare(
        "UPDATE Contacts
         SET FirstName = ?,
             LastName = ?,
             Email = ?,
             Phone = ?
         WHERE ID = ?
           AND UserID = ?"
    );

    $stmt->execute([
        $firstName,
        $lastName,
        $email,
        $phone,
        $contactID,
        (int)$user['ID']
    ]);

    jsonResponse([
        "message" => "Contact updated successfully",
        "id" => $contactID,
        "error" => ""
    ], 200);
}

jsonResponse([
    "error" => "Route not found"
], 404);
