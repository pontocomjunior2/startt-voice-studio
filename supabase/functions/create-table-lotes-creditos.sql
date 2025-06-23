-- Criação da tabela lotes_creditos se não existir
-- Esta tabela é a fonte única de verdade para créditos do sistema

CREATE TABLE IF NOT EXISTS lotes_creditos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quantidade_adicionada INTEGER NOT NULL CHECK (quantidade_adicionada >= 0),
  quantidade_usada INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_usada >= 0),
  data_validade TIMESTAMP WITH TIME ZONE NULL, -- NULL = sem validade
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  data_adicao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  admin_id_que_adicionou UUID REFERENCES profiles(id) ON DELETE SET NULL,
  observacao_admin TEXT NULL,
  
  -- Constraints
  CONSTRAINT quantidade_usada_nao_maior_que_adicionada 
    CHECK (quantidade_usada <= quantidade_adicionada),
  CONSTRAINT data_validade_futura 
    CHECK (data_validade IS NULL OR data_validade > NOW() - INTERVAL '1 day')
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lotes_creditos_user_id ON lotes_creditos(user_id);
CREATE INDEX IF NOT EXISTS idx_lotes_creditos_status ON lotes_creditos(status);
CREATE INDEX IF NOT EXISTS idx_lotes_creditos_data_validade ON lotes_creditos(data_validade);
CREATE INDEX IF NOT EXISTS idx_lotes_creditos_user_status_validade 
  ON lotes_creditos(user_id, status, data_validade);

-- RLS (Row Level Security)
ALTER TABLE lotes_creditos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Usuários podem ver apenas seus próprios lotes" ON lotes_creditos;
CREATE POLICY "Usuários podem ver apenas seus próprios lotes" 
  ON lotes_creditos 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins podem ver todos os lotes" ON lotes_creditos;
CREATE POLICY "Admins podem ver todos os lotes" 
  ON lotes_creditos 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Service role pode tudo" ON lotes_creditos;
CREATE POLICY "Service role pode tudo" 
  ON lotes_creditos 
  FOR ALL 
  TO service_role 
  USING (true);

-- Função para consumir créditos (usado quando cliente solicita gravação)
CREATE OR REPLACE FUNCTION consumir_creditos(
  p_user_id UUID,
  p_quantidade INTEGER,
  p_pedido_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creditos_disponiveis INTEGER;
  v_lotes_para_consumir RECORD;
  v_quantidade_restante INTEGER;
  v_quantidade_a_consumir INTEGER;
BEGIN
  -- 1. Verificar créditos disponíveis
  SELECT COALESCE(SUM(quantidade_adicionada - quantidade_usada), 0)
  INTO v_creditos_disponiveis
  FROM lotes_creditos
  WHERE user_id = p_user_id 
    AND status = 'ativo'
    AND (data_validade IS NULL OR data_validade > NOW());

  IF v_creditos_disponiveis < p_quantidade THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Créditos insuficientes',
      'disponiveis', v_creditos_disponiveis,
      'solicitados', p_quantidade
    );
  END IF;

  -- 2. Consumir créditos dos lotes (FIFO - os que vencem primeiro)
  v_quantidade_restante := p_quantidade;
  
  FOR v_lotes_para_consumir IN
    SELECT id, quantidade_adicionada, quantidade_usada
    FROM lotes_creditos
    WHERE user_id = p_user_id 
      AND status = 'ativo'
      AND (data_validade IS NULL OR data_validade > NOW())
      AND quantidade_adicionada > quantidade_usada
    ORDER BY 
      CASE WHEN data_validade IS NULL THEN '2099-12-31'::timestamp ELSE data_validade END ASC,
      data_adicao ASC
  LOOP
    -- Calcular quanto pode ser consumido deste lote
    v_quantidade_a_consumir := LEAST(
      v_quantidade_restante,
      v_lotes_para_consumir.quantidade_adicionada - v_lotes_para_consumir.quantidade_usada
    );
    
    -- Atualizar o lote
    UPDATE lotes_creditos
    SET quantidade_usada = quantidade_usada + v_quantidade_a_consumir
    WHERE id = v_lotes_para_consumir.id;
    
    -- Diminuir quantidade restante
    v_quantidade_restante := v_quantidade_restante - v_quantidade_a_consumir;
    
    -- Se já consumiu tudo, sair do loop
    EXIT WHEN v_quantidade_restante <= 0;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'creditos_consumidos', p_quantidade,
    'pedido_id', p_pedido_id,
    'creditos_restantes', v_creditos_disponiveis - p_quantidade
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Erro interno: ' || SQLERRM
    );
END;
$$;

-- Função para verificar saldo de um usuário específico
CREATE OR REPLACE FUNCTION get_saldo_creditos_validos(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantidade_adicionada - quantidade_usada), 0)
  INTO v_saldo
  FROM lotes_creditos
  WHERE user_id = p_user_id 
    AND status = 'ativo'
    AND (data_validade IS NULL OR data_validade > NOW());
    
  RETURN v_saldo;
END;
$$;

-- Grants para as novas funções
GRANT EXECUTE ON FUNCTION consumir_creditos(UUID, INTEGER, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_saldo_creditos_validos(UUID) TO anon, authenticated, service_role;

-- Trigger para atualizar data de modificação
CREATE OR REPLACE FUNCTION update_lotes_creditos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_adicao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DROP TRIGGER IF EXISTS update_lotes_creditos_updated_at_trigger ON lotes_creditos;
-- CREATE TRIGGER update_lotes_creditos_updated_at_trigger
--   BEFORE UPDATE ON lotes_creditos
--   FOR EACH ROW EXECUTE FUNCTION update_lotes_creditos_updated_at(); 