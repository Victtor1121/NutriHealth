<?php
// pag-nutricionista/perfil-data.php
session_start();
$_SESSION['idPro'] = 2; // coloque aqui o idPro que você quer testar

require_once __DIR__ . '/../conexaoBD/conexao.php'; // Ajuste o caminho se necessário

header('Content-Type: application/json; charset=utf-8');

// Pega o ID da sessão (definido no login)
$idPro = $_SESSION['idPro'] ?? null;

if (!$idPro) {
    echo json_encode(['erro' => 'Usuário não logado']);
    exit;
}

// Consulta os dados do profissional e do tipo de atendimento
$sql = "SELECT p.nomeComple, p.imagem, e.TipoAtendimento
        FROM profissional p
        LEFT JOIN empresa e ON p.idPro = e.idPro
        WHERE p.idPro = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $idPro);
$stmt->execute();
$result = $stmt->get_result();
$dados = $result->fetch_assoc();
$stmt->close();

if (!$dados) {
    echo json_encode(['erro' => 'Profissional não encontrado']);
    exit;
}

// Converte imagem para base64
$imagem = null;
if (!empty($dados['imagem'])) {
    $imagem = 'data:image/jpeg;base64,' . base64_encode($dados['imagem']);
}

// Retorna JSON
echo json_encode([
    'nome'   => $dados['nomeComple'] ?? 'Profissional',
    'tipo'   => $dados['TipoAtendimento'] ?? '—',
    'imagem' => $imagem
]);
