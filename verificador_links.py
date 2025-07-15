import requests
from bs4 import BeautifulSoup
import time
import csv
from urllib.parse import urlparse

def verificar_status_html(url):
    """
    Verifica o status real de uma URL lendo o HTML da página
    Retorna tupla (url, status, mensagem)
    """
    try:
        # Headers para simular um navegador real
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        print(f"Verificando: {url}")
        response = requests.get(url, timeout=15, headers=headers)
        
        # Verifica se a requisição foi bem-sucedida
        if response.status_code != 200:
            return (url, response.status_code, f"HTTP {response.status_code}")
        
        html = response.text
        soup = BeautifulSoup(html, 'html.parser')
        
        # Converte todo o texto para minúsculo para busca case-insensitive
        texto_pagina = soup.get_text().lower()
        
        # Lista de indicadores de erro 404 (baseado na imagem do PagueMenos)
        indicadores_erro = [
            "oops",
            "página não encontrada",
            "page not found",
            "404",
            "erro 404",
            "not found",
            "página inexistente",
            "conteúdo não encontrado",
            "produto não encontrado",
            "página removida",
            "url não encontrada",
            "endereço incorreto"
        ]
        
        # Verifica se algum indicador de erro está presente
        for indicador in indicadores_erro:
            if indicador in texto_pagina:
                return (url, 404, f"Página não encontrada - Detectado: '{indicador}'")
        
        # Lista de indicadores de produto válido (específico para e-commerce)
        indicadores_produto = [
            "adicionar ao carrinho",
            "comprar agora",
            "add to cart",
            "buy now",
            "preço",
            "price",
            "produto",
            "medicamento",
            "disponível",
            "estoque",
            "quantidade",
            "comprar",
            "carrinho",
            "valor",
            "desconto"
        ]
        
        # Verifica se é uma página de produto válida
        for indicador in indicadores_produto:
            if indicador in texto_pagina:
                return (url, 200, f"Produto encontrado - Detectado: '{indicador}'")
        
        # Se não encontrou nem erro nem indicadores de produto
        return (url, 200, "Página válida (sem indicadores específicos)")
        
    except requests.exceptions.Timeout:
        return (url, 'TIMEOUT', 'Timeout na requisição (>15s)')
    except requests.exceptions.ConnectionError:
        return (url, 'CONEXAO', 'Erro de conexão')
    except requests.exceptions.RequestException as e:
        return (url, 'ERRO', f'Erro de requisição: {str(e)}')
    except Exception as e:
        return (url, 'ERRO', f'Erro inesperado: {str(e)}')

def verificar_multiplas_urls(urls, delay=1):
    """
    Verifica múltiplas URLs com delay entre requisições
    """
    resultados = []
    
    print(f"Iniciando verificação de {len(urls)} URLs...")
    print("-" * 80)
    
    for i, url in enumerate(urls, 1):
        # Adiciona https:// se não tiver protocolo
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
            
        resultado = verificar_status_html(url)
        resultados.append(resultado)
        
        # Mostra o resultado
        status_cor = "✅" if resultado[1] == 200 else "❌" if resultado[1] == 404 else "⚠️"
        print(f"{status_cor} [{i}/{len(urls)}] {resultado[0]}")
        print(f"   Status: {resultado[1]} - {resultado[2]}")
        print()
        
        # Delay entre requisições para não sobrecarregar o servidor
        if i < len(urls):
            time.sleep(delay)
    
    return resultados

def salvar_resultados_csv(resultados, nome_arquivo="resultados_verificacao.csv"):
    """
    Salva os resultados em um arquivo CSV
    """
    with open(nome_arquivo, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['URL', 'Status', 'Mensagem'])
        
        for resultado in resultados:
            writer.writerow(resultado)
    
    print(f"Resultados salvos em: {nome_arquivo}")

def gerar_relatorio(resultados):
    """
    Gera um relatório resumido dos resultados
    """
    total = len(resultados)
    status_200 = len([r for r in resultados if r[1] == 200])
    status_404 = len([r for r in resultados if r[1] == 404])
    erros = len([r for r in resultados if r[1] not in [200, 404]])
    
    print("=" * 80)
    print("RELATÓRIO FINAL")
    print("=" * 80)
    print(f"Total de URLs verificadas: {total}")
    print(f"✅ Páginas válidas (200): {status_200} ({status_200/total*100:.1f}%)")
    print(f"❌ Páginas não encontradas (404): {status_404} ({status_404/total*100:.1f}%)")
    print(f"⚠️  Erros de conexão: {erros} ({erros/total*100:.1f}%)")
    print("=" * 80)

# Exemplo de uso
if __name__ == "__main__":
    # URLs de exemplo (você pode substituir pelas suas URLs)
    urls_teste = [
        "https://www.paguemenos.com.br/dipirona-mohidrataa",  # Exemplo que você mostrou (404)
        "https://www.paguemenos.com.br/dipirona-sodica-500mg-10-comprimidos-generico-medley",  # Exemplo válido
        "https://www.paguemenos.com.br/produto-inexistente-teste",  # Outro teste 404
        "https://www.paguemenos.com.br/",  # Página inicial
    ]
    
    # Você também pode ler URLs de um arquivo
    # with open('urls.txt', 'r') as f:
    #     urls_teste = [linha.strip() for linha in f.readlines() if linha.strip()]
    
    # Executa a verificação
    resultados = verificar_multiplas_urls(urls_teste, delay=2)
    
    # Salva os resultados
    salvar_resultados_csv(resultados)
    
    # Gera relatório
    gerar_relatorio(resultados)
    
    print("\nDetalhes dos resultados:")
    for resultado in resultados:
        print(f"URL: {resultado[0]}")
        print(f"Status: {resultado[1]}")
        print(f"Mensagem: {resultado[2]}")
        print("-" * 40)