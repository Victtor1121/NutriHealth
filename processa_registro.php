<?php
// processa_registro.php
// Insere em profissional e, se for Empresa, insere em Empresa.

ini_set('display_errors', 1);
error_reporting(E_ALL);

include __DIR__ . '/conexao.php'; // $conn é mysqli

function limpar($v){return htmlspecialchars(trim((string)$v), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');}

// Valida método
if ($_SERVER['REQUEST_METHOD'] !== 'POST') die("Acesso inválido.");

// Recebe campos obrigatórios
$cargo     = limpar($_POST['cargo'] ?? '');
$nome      = limpar($_POST['nome'] ?? '');
$email     = limpar($_POST['email'] ?? '');
$telefone  = limpar($_POST['telefone'] ?? '');
$cpf       = preg_replace('/\D/','', $_POST['cpf'] ?? '');
$senha     = $_POST['senha'] ?? '';
$confirmar = $_POST['confirmar_senha'] ?? '';
$crn       = ($cargo==='Nutricionista') ? limpar($_POST['crn'] ?? '') : null;

// Campos empresa
$tipo_trabalho    = limpar($_POST['tipo_trabalho'] ?? '');
$tipo_atendimento = limpar($_POST['tipo_atendimento'] ?? '');
$tipo_empresa     = limpar($_POST['tipo_empresa'] ?? '');
$nome_local       = limpar($_POST['nome_local'] ?? '');
$endereco         = limpar($_POST['endereco'] ?? '');
$telefone_local   = limpar($_POST['telefone_local'] ?? '');
$cidade           = limpar($_POST['cidade'] ?? '');
$estado           = limpar($_POST['estado'] ?? '');
$cep              = limpar($_POST['cep'] ?? '');
$cnpj             = limpar($_POST['cnpj'] ?? '');

// Validação básica
$erros=[];
if(!$cargo||!$nome||!$email||!$telefone||!$cpf||!$senha) $erros[]="Preencha todos os campos obrigatórios.";
if(!filter_var($email,FILTER_VALIDATE_EMAIL)) $erros[]="Email inválido.";
if(strlen($cpf)!==11) $erros[]="CPF inválido.";
if($senha!==$confirmar) $erros[]="As senhas não coincidem.";
if($cargo==='Nutricionista' && !$crn) $erros[]="CRN é obrigatório para nutricionistas.";
if($tipo_trabalho==='Empresa'){
    if(!$tipo_atendimento||!$tipo_empresa||!$nome_local||!$endereco||!$cidade||!$estado||!$cep||!$cnpj){
        $erros[]="Preencha todos os dados da empresa.";
    }
}
if($erros) die("Erro: ".implode(' ',$erros));

// Hash da senha
$senhaHash=password_hash($senha,PASSWORD_DEFAULT);

// Upload opcional (imagem em LONGBLOB)
$imagemBin=null;
if(!empty($_FILES['foto']['name'])){
    $f=$_FILES['foto'];
    if($f['error']!==UPLOAD_ERR_OK) die("Erro no upload: ".$f['error']);
    if($f['size']>5*1024*1024) die("Erro: imagem maior que 5MB.");
    $ext=strtolower(pathinfo($f['name'],PATHINFO_EXTENSION));
    $permit=['jpg','jpeg','png','gif','webp'];
    if(!in_array($ext,$permit)) die("Erro: tipo de imagem não permitido.");
    $imagemBin=file_get_contents($f['tmp_name']);
}

// Insere profissional
$sql="INSERT INTO profissional (cargo,nomeComple,email,telefone,CPF,CRN,senha,imagem)
      VALUES (?,?,?,?,?,?,?,?)";
$stmt=$conn->prepare($sql);
if(!$stmt) die("Erro prepare: ".$conn->error);
$stmt->bind_param(
    "ssssssss",
    $cargo,$nome,$email,$telefone,$cpf,$crn,$senhaHash,$imagemBin
);
if(!$stmt->send_long_data(7,$imagemBin??'')){/* ignora se null */}
if(!$stmt->execute()){
    die("Erro ao inserir profissional: ".$stmt->error);
}
$idPro=$stmt->insert_id;
$stmt->close();

// Se for Empresa, insere dados na tabela Empresa
if($tipo_trabalho==='Empresa'){
    $sqlE="INSERT INTO Empresa 
        (idPro,TipoAtendimento,TipoEmpresa,NomeLocal,Endereco,TelefoneLocal,Cidade,Estado,CEP,CNPJ) 
        VALUES (?,?,?,?,?,?,?,?,?,?)";
    $stmtE=$conn->prepare($sqlE);
    if(!$stmtE) die("Erro prepare empresa: ".$conn->error);
    $stmtE->bind_param(
        "isssssssss",
        $idPro,$tipo_atendimento,$tipo_empresa,$nome_local,$endereco,$telefone_local,$cidade,$estado,$cep,$cnpj
    );
    if(!$stmtE->execute()){
        // se falhar, opcional: remover profissional inserido ou tratar erro
        die("Erro ao inserir empresa: ".$stmtE->error);
    }
    $stmtE->close();
}

$conn->close();
header("Location: pag-menu/home.html");
exit;

?>
