const htmlInput = document.getElementById("htmlInput");
const renderedOutput = document.getElementById("renderedOutput");
const boldButton = document.getElementById("boldButton");
const linkButton = document.getElementById("linkButton");
const copyTextButton = document.getElementById("copyTextButton");
const clearTextButton = document.getElementById("clearTextButton");
const copyHtmlButton = document.getElementById("copyHtmlButton");
const linkCount = document.getElementById("linkCount");
const progressFill = document.getElementById("progressFill");
const linkStatus = document.getElementById("linkStatus");
const charCount = document.getElementById("charCount");

// Função para atualizar contador de caracteres
function updateCharCounter() {
    const count = htmlInput.value.length;
    charCount.textContent = count.toLocaleString();
    
    // Mudar cor baseado na quantidade
    if (count > 5000) {
        charCount.style.color = 'var(--destructive)';
    } else if (count > 3000) {
        charCount.style.color = '#ff6348';
    } else {
        charCount.style.color = 'var(--muted-foreground)';
    }
}

// Função para verificar status do link - baseada na lógica Python que funciona
async function checkLinkStatus(url) {
    // Implementação baseada exatamente na função validar_link do Python
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
    
    try {
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            signal: AbortSignal.timeout(20000) // 20s como no Python
        });
        
        // Verifica status HTTP primeiro (como no Python)
        if (response.status === 404) {
            return { status: "ERRO 404", message: "Status Code 404" };
        } else if (response.status >= 500) {
            return { status: "ERRO CONEXÃO", message: `Erro do servidor: ${response.status}` };
        } else if (response.status !== 200) {
            return { status: "OK", message: `Status ${response.status} - Página acessível` };
        }
        
        // Se status é 200, analisa o conteúdo (como no Python)
        const content = await response.text();
        const contentLower = content.toLowerCase();
        
        // Verifica condição específica do PagueMenos (exatamente como no Python)
        if (contentLower.includes("nenhum resultado encontrado") && 
            contentLower.includes("início / nenhum resultado encontrado")) {
            return { status: "ERRO 404", message: "Erro 404 confirmado - Página de erro detectada" };
        }
        
        // Verifica título da página (exatamente como no Python)
        if (contentLower.includes("<title>")) {
            const titleStart = contentLower.indexOf('<title>') + 7;
            const titleEnd = contentLower.indexOf('</title>');
            if (titleEnd > titleStart) {
                const title = content.substring(titleStart, titleEnd).trim();
                if (title && title.length > 10) {
                    const nomeProduto = title.replace(/ - pague menos/gi, '').trim();
                    return { status: "OK", message: `Produto válido detectado: ${nomeProduto.substring(0, 30)}` };
                }
            }
        }
        
        // Se chegou até aqui, página OK sem indicadores específicos (como no Python)
        return { status: "OK", message: "Página OK - Nenhum indicador de erro" };
        
    } catch (error) {
        // Tratamento de erros (exatamente como no Python)
        if (error.name === 'AbortError') {
            return { status: "ERRO CONEXÃO", message: "Timeout na conexão" };
        }
        return { status: "ERRO CONEXÃO", message: error.message.substring(0, 60) };
    }
}

// Função para contar links e atualizar barra
async function updateLinkCounter() {
    const doc = renderedOutput.contentDocument || renderedOutput.contentWindow.document;
    const links = doc.querySelectorAll('a[href]');
    const count = links.length;
    
    linkCount.textContent = count;
    
    // Contar frequência de cada link
    const linkFrequency = {};
    links.forEach(link => {
        const href = link.href;
        linkFrequency[href] = (linkFrequency[href] || 0) + 1;
    });
    
    // Atualizar tabela de links
    const linkTable = document.getElementById('linkTable');
    linkTable.innerHTML = '';
    
    if (Object.keys(linkFrequency).length > 0) {
        for (const [url, frequency] of Object.entries(linkFrequency)) {
            // Verificar se é link externo (não é do PagueMenos)
            const isExternalLink = !url.includes('paguemenos.com.br');
            
            const row = document.createElement('tr');
            
            // Adicionar classe para links externos
            if (isExternalLink) {
                row.classList.add('external-link-row');
            }
            
            row.innerHTML = `
                <td class="link-url"><a href="${url}" target="_blank">${url}</a></td>
                <td class="link-count">${frequency}</td>
                <td class="link-status-cell">
                    <span class="checking-status">Verificando...</span>
                </td>
            `;
            linkTable.appendChild(row);
            
            // Verificar status do link de forma assíncrona
            checkLinkStatus(url).then(({ status, message }) => {
                const statusCell = row.querySelector('.link-status-cell');
                
                // Mapeia status do Python para classes CSS
                if (status === "OK") {
                    statusCell.innerHTML = `<span class="status-200" title="${message}">200</span>`;
                } else if (status === "ERRO 404") {
                    statusCell.innerHTML = `<span class="status-404" title="${message}">404</span>`;
                } else {
                    // ERRO CONEXÃO ou outros erros
                    statusCell.innerHTML = `<span class="status-error" title="${message}">ERRO</span>`;
                }
            }).catch(error => {
                console.error('Erro na verificação:', error);
                const statusCell = row.querySelector('.link-status-cell');
                statusCell.innerHTML = `<span class="status-error" title="Erro na verificação">ERRO</span>`;
            }).catch(error => {
                console.error('Erro na verificação do link:', error);
                const statusCell = row.querySelector('.link-status-cell');
                statusCell.innerHTML = `<span class="status-error">Erro</span>`;
            });
        }
    }
    
    let percentage = 0;
    let status = '';
    let statusClass = '';
    
    if (count >= 0 && count <= 2) {
        percentage = (count / 2) * 30; // Máximo 30% para vermelho
        status = 'Ruim!';
        statusClass = 'bad';
    } else if (count >= 3 && count <= 5) {
        percentage = 30 + ((count - 3) / 2) * 40; // 30% a 70% para amarelo
        status = 'Padrão';
        statusClass = 'average';
    } else {
        percentage = Math.min(70 + ((count - 5) / 5) * 30, 100); // 70% a 100% para verde
        status = 'Muito Bom';
        statusClass = 'good';
    }
    
    progressFill.style.width = percentage + '%';
    linkStatus.textContent = status;
    linkStatus.className = 'link-status ' + statusClass;
    progressFill.className = 'progress-fill ' + statusClass;
}

// Atualiza o iframe quando o conteúdo do textarea muda
htmlInput.addEventListener("input", () => {
    updateCharCounter();
    renderedOutput.srcdoc = htmlInput.value;
});

// Garantir que o textarea está sempre editável
htmlInput.addEventListener("focus", () => {
    htmlInput.readOnly = false;
    htmlInput.disabled = false;
});

// Permitir colar conteúdo
htmlInput.addEventListener("paste", (e) => {
    // Permitir a operação de colar normalmente
    setTimeout(() => {
        updateCharCounter();
        renderedOutput.srcdoc = htmlInput.value;
        updateLinkCounter();
    }, 10);
});

// Sincroniza o HTML de volta ao textarea quando o iframe é editado
renderedOutput.addEventListener("load", () => {
    const doc = renderedOutput.contentDocument || renderedOutput.contentWindow.document;
    doc.body.contentEditable = true;

    doc.body.addEventListener("input", () => {
        const content = doc.body.innerHTML.replace(/&nbsp;/g, ' ');
        htmlInput.value = content;
        updateCharCounter();
        updateLinkCounter();
    });

    // Abrir links na mesma página ou em nova aba com CTRL
    doc.body.addEventListener("click", (event) => {
        if (event.target.tagName === 'A') {
            if (event.ctrlKey) {
                event.preventDefault();
                window.open(event.target.href, '_blank');
            } else {
                event.preventDefault();
                window.location.href = event.target.href;
            }
        }
    });
    
    // Atualizar contador quando o iframe carrega
    updateLinkCounter();
});

// Botão Negrito (Corrigido)
boldButton.addEventListener("click", () => {
    const doc = renderedOutput.contentDocument || renderedOutput.contentWindow.document;
    const selection = doc.getSelection();

    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let selectedText = range.toString();

        if (selectedText.trim() === "") return; // Evita negrito sem texto selecionado

        let parentTag = range.commonAncestorContainer.parentElement;

        if (parentTag.tagName === "STRONG" || parentTag.tagName === "B") {
            // Se já está em negrito, remover negrito mantendo o texto
            const textNode = document.createTextNode(parentTag.textContent);
            parentTag.replaceWith(textNode);
        } else {
            // Se não está em negrito, aplicar negrito
            const strong = doc.createElement("strong");
            strong.textContent = selectedText;
            range.deleteContents();
            range.insertNode(strong);
        }

        // Atualiza o textarea com a nova formatação
        const content = doc.body.innerHTML.replace(/&nbsp;/g, ' ');
        htmlInput.value = content;
        updateLinkCounter();
    }
});

// Botão Inserir Link
linkButton.addEventListener("click", () => {
    const doc = renderedOutput.contentDocument || renderedOutput.contentWindow.document;
    const selection = doc.getSelection();

    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let selectedText = range.toString();

        if (selectedText.trim() === "") return; // Evita link sem texto selecionado

        // Criar modal personalizado
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            min-width: 400px;
            max-width: 500px;
        `;
        
        modalContent.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #333; font-size: 1.2rem;">Inserir Link</h3>
            <p style="margin: 0 0 15px 0; color: #666;">Texto selecionado: <strong>"${selectedText}"</strong></p>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">URL do Link:</label>
                <input type="text" id="linkInput" placeholder="https://exemplo.com" 
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; box-sizing: border-box;">
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: space-between; margin-bottom: 20px;">
                <button id="generateLinkBtn" style="
                    flex: 1;
                    padding: 10px 15px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.3s;
                ">🔗 Gerar Link PagueMenos</button>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancelBtn" style="
                    padding: 10px 20px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                ">Cancelar</button>
                <button id="insertBtn" style="
                    padding: 10px 20px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                ">Inserir Link</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        const linkInput = modal.querySelector('#linkInput');
        const generateBtn = modal.querySelector('#generateLinkBtn');
        const cancelBtn = modal.querySelector('#cancelBtn');
        const insertBtn = modal.querySelector('#insertBtn');
        
        // Função para gerar link automático
        generateBtn.addEventListener('click', () => {
            // Converter texto selecionado para formato de URL
            const urlText = selectedText
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
                .replace(/\s+/g, '-') // Substitui espaços por hífens
                .replace(/-+/g, '-') // Remove hífens duplicados
                .replace(/^-|-$/g, ''); // Remove hífens do início e fim
            
            const generatedLink = `https://www.paguemenos.com.br/${urlText}`;
            linkInput.value = generatedLink;
            linkInput.focus();
        });
        
        // Função para inserir o link
        const insertLink = () => {
            const link = linkInput.value.trim();
            if (link) {
                const anchor = doc.createElement("a");
                anchor.setAttribute("href", link);
                anchor.textContent = selectedText;
                range.deleteContents();
                range.insertNode(anchor);
                
                // Atualizar textarea e contador
                const content = doc.body.innerHTML.replace(/&nbsp;/g, ' ');
                htmlInput.value = content;
                updateLinkCounter();
            }
            document.body.removeChild(modal);
        };
        
        // Event listeners
        insertBtn.addEventListener('click', insertLink);
        cancelBtn.addEventListener('click', () => document.body.removeChild(modal));
        
        // Enter para inserir, Escape para cancelar
        linkInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                insertLink();
            } else if (e.key === 'Escape') {
                document.body.removeChild(modal);
            }
        });
        
        // Fechar modal clicando fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // Focar no input
        setTimeout(() => linkInput.focus(), 100);

    }
});

// Função melhorada para copiar texto formatado
async function copyFormattedContent() {
    const doc = renderedOutput.contentDocument || renderedOutput.contentWindow.document;
    
    // Obter o HTML formatado do iframe e remover target="_blank" e outros atributos indesejados
    let htmlContent = doc.body.innerHTML
        .replace(/\s*target="_blank"/gi, '')
        .replace(/\s*target='_blank'/gi, '')
        .replace(/\s*target="[^"]*"/gi, '')
        .replace(/\s*target='[^']*'/gi, '');
    
    // Garantir espaços adequados entre elementos
    htmlContent = htmlContent.replace(/(<\/(?:strong|a|em|b|i)>)(\w)/gi, '$1 $2');
    htmlContent = htmlContent.replace(/(\w)(<(?:strong|a|em|b|i)[^>]*>)/gi, '$1 $2');
    
    // Obter o texto simples como fallback
    const textContent = doc.body.textContent || doc.body.innerText || '';
    
    try {
        // Verificar se o navegador suporta ClipboardItem
        if (window.ClipboardItem) {
            // Criar um blob com o HTML
            const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
            const textBlob = new Blob([textContent], { type: 'text/plain' });
            
            // Criar item da área de transferência com múltiplos formatos
            const clipboardItem = new ClipboardItem({
                'text/html': htmlBlob,
                'text/plain': textBlob
            });
            
            // Copiar para a área de transferência
            await navigator.clipboard.write([clipboardItem]);
        } else {
            // Fallback para navegadores que não suportam ClipboardItem
            await navigator.clipboard.writeText(textContent);
        }
        
        // Feedback visual
        copyTextButton.textContent = 'Copiado!';
        copyTextButton.style.backgroundColor = 'var(--success)';
        
        setTimeout(() => {
            copyTextButton.textContent = 'Copiar';
            copyTextButton.style.backgroundColor = 'var(--success)';
        }, 2000);
        
    } catch (err) {
        console.error('Erro ao copiar:', err);
        
        // Tentativa alternativa usando document.execCommand (deprecated mas funciona)
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            document.body.appendChild(tempDiv);
            
            const range = document.createRange();
            range.selectNodeContents(tempDiv);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            document.execCommand('copy');
            
            selection.removeAllRanges();
            document.body.removeChild(tempDiv);
            
            copyTextButton.textContent = 'Copiado!';
            copyTextButton.style.backgroundColor = 'var(--success)';
            
            setTimeout(() => {
                copyTextButton.textContent = 'Copiar';
                copyTextButton.style.backgroundColor = 'var(--success)';
            }, 2000);
            
        } catch (fallbackErr) {
            console.error('Erro no fallback:', fallbackErr);
            alert('Erro ao copiar texto formatado. Tente novamente.');
        }
    }
}

// Botão Copiar Texto Formatado (atualizado)
copyTextButton.addEventListener("click", copyFormattedContent);

// Botão Apagar Texto
clearTextButton.addEventListener("click", () => {
    htmlInput.value = '';
    renderedOutput.srcdoc = '';
    updateCharCounter();
    updateLinkCounter();
});

// Botão Copiar HTML
copyHtmlButton.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(htmlInput.value);
        copyHtmlButton.textContent = 'Copiado!';
        setTimeout(() => {
            copyHtmlButton.textContent = 'Copiar';
        }, 2000);
    } catch (err) {
        alert('Erro ao copiar HTML');
    }
});

// Inicializar contador
updateCharCounter();
updateLinkCounter();