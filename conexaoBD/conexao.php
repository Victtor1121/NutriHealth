<?php
// conexao.php
// Ajuste os valores de acordo com seu ambiente XAMPP e banco de dados.

$host     = 'localhost';     // geralmente 'localhost' no XAMPP
$usuario  = 'root';          // padrão do XAMPP é 'root'
$senha    = '';              // padrão do XAMPP é senha vazia
$banco    = 'nutrihealth';   // substitua pelo nome do seu banco

// Cria conexão
$conn = new mysqli($host, $usuario, $senha, $banco);

// Verifica erro de conexão
if ($conn->connect_error) {
    die('Erro na conexão com o banco: ' . $conn->connect_error);
}

// Define charset para evitar problemas com acentos
if (!$conn->set_charset('utf8mb4')) {
    die('Erro ao definir charset: ' . $conn->error);
}
?>
