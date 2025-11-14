create database nutrihealth;
use nutrihealth;

CREATE TABLE profissional (
    idPro INT AUTO_INCREMENT PRIMARY KEY,
    cargo ENUM('Nutricionista', 'Personal') NOT NULL,
    nomeComple VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefone VARCHAR(20),
    CPF VARCHAR(14),
    CRN VARCHAR(20) NULL,
    senha VARCHAR(255) NOT NULL,
    imagem LONGBLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE Empresa (
    idEmpresa INT AUTO_INCREMENT PRIMARY KEY, 
    idPro INT,
    TipoAtendimento ENUM('Online', 'Presencial', 'Ambos') NOT NULL,
    TipoEmpresa ENUM('MEI', 'PJ') NOT NULL,
    NomeLocal VARCHAR(150) NOT NULL,
    Endereco VARCHAR(255) NOT NULL,
    TelefoneLocal VARCHAR(20),
    Cidade VARCHAR(100) NOT NULL,
    Estado CHAR(2) NOT NULL, 
    CEP CHAR(9) NOT NULL,   
    CNPJ CHAR(18) NOT NULL UNIQUE,
    FOREIGN KEY(idPro) references profissional(idPro) 
);
