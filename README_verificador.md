# Verificador de Status de Links HTML

Este script Python verifica o status real de URLs lendo o conteúdo HTML das páginas, especialmente útil para detectar páginas 404 que retornam status HTTP 200.

## Instalação

```bash
pip install -r requirements.txt
```

## Como usar

### 1. Uso básico com URLs no código:

```python
python verificador_links.py
```

### 2. Verificar URLs de um arquivo:

Crie um arquivo `urls.txt` com uma URL por linha:
```
https://www.paguemenos.com.br/produto1
https://www.paguemenos.com.br/produto2
https://www.paguemenos.com.br/produto3
```

Depois modifique o script para ler do arquivo:

```python
# Ler URLs de arquivo
with open('urls.txt', 'r') as f:
    urls_teste = [linha.strip() for linha in f.readlines() if linha.strip()]
```

### 3. Integrar com planilha Excel:

```python
import pandas as pd

# Ler URLs de planilha Excel
df = pd.read_excel('planilha_urls.xlsx')
urls_teste = df['URL'].tolist()

# Após verificação, salvar resultados de volta na planilha
df_resultados = pd.DataFrame(resultados, columns=['URL', 'Status', 'Mensagem'])
df_resultados.to_excel('resultados_verificacao.xlsx', index=False)
```

## Funcionalidades

- ✅ **Detecção de páginas 404**: Identifica páginas que mostram "Oops... Página não encontrada" mesmo retornando HTTP 200
- ✅ **Detecção de produtos válidos**: Reconhece páginas com produtos reais
- ✅ **Headers realistas**: Simula um navegador real para evitar bloqueios
- ✅ **Relatório detalhado**: Gera estatísticas e salva em CSV
- ✅ **Controle de velocidade**: Delay configurável entre requisições
- ✅ **Tratamento de erros**: Captura timeouts e erros de conexão

## Indicadores detectados

### Páginas de erro (404):
- "oops"
- "página não encontrada" 
- "404"
- "produto não encontrado"
- E outros...

### Páginas de produto válidas (200):
- "adicionar ao carrinho"
- "comprar agora"
- "preço"
- "medicamento"
- E outros...

## Exemplo de saída

```
Verificando: https://www.paguemenos.com.br/dipirona-mohidrataa
❌ [1/4] https://www.paguemenos.com.br/dipirona-mohidrataa
   Status: 404 - Página não encontrada - Detectado: 'oops'

✅ [2/4] https://www.paguemenos.com.br/dipirona-sodica-500mg
   Status: 200 - Produto encontrado - Detectado: 'adicionar ao carrinho'
```

## Personalização

Você pode modificar as listas `indicadores_erro` e `indicadores_produto` no código para adicionar novos termos específicos do seu site.