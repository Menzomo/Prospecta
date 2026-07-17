-- Coletados no momento em que o usuário reivindica um número Telnyx dedicado
-- (não no cadastro inicial): CPF/CNPJ, por responsabilidade legal sobre o número
-- perante a ANATEL, e o celular pessoal pra onde chamadas de entrada são encaminhadas.

ALTER TABLE company_profiles
  ADD COLUMN cpf_cnpj              text,
  ADD COLUMN forwarding_cell_phone text;

ALTER TABLE company_profiles
  ADD CONSTRAINT company_profiles_cpf_cnpj_format
    CHECK (cpf_cnpj IS NULL OR cpf_cnpj ~ '^\d{11}$' OR cpf_cnpj ~ '^\d{14}$'),
  ADD CONSTRAINT company_profiles_forwarding_cell_e164
    CHECK (forwarding_cell_phone IS NULL OR forwarding_cell_phone ~ '^\+[1-9]\d{7,14}$');
