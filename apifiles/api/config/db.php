<?php

function getDB()
{
    $envPath = dirname(__DIR__, 3) . '/.env.example';

    if (!file_exists($envPath)) {
        throw new Exception('.env.example file not found');
    }

    $env = parse_ini_file($envPath);

    $host = $env['DB_HOST'];
    $name = $env['DB_NAME'];
    $user = $env['DB_USER'];
    $password = $env['DB_PASSWORD'];
    $port = $env['DB_PORT'];
    $charset = $env['DB_CHARSET'];

    $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=$charset";

    $pdo = new PDO($dsn, $user, $password);

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    return $pdo;
}