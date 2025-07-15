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

// Função para formatar HTML de forma limpa
function formatHTML(html) {
    if (!html || html.trim() === '') return '';
    
    // Limpar tags font desnecessárias e outros elementos de formatação indesejados
    let cleaned = html
        // Remove todas as tags <font> mantendo apenas o conteúdo
        .replace(/<font[^>]*>/gi, '')
        .replace(/<\/font>/gi, '')
        // Remove atributos de estilo inline desnecessários
        .replace(/\s*style="[^"]*"/gi, '')
        // Remove target="_blank" dos links
        .replace(/\s*target="_blank"/gi, '')
        // Padroniza aspas simples nos links
        .replace(/href="([^"]*)"/gi, "href='$1'")
        // Remove espaços extras entre tags mas preserva espaços entre palavras
        .replace(/>\s+</g, '> <')
        // Remove quebras de linha desnecessárias
        .replace(/\n\s*\n/g, '\n')
        // Remove espaços no início e fim
        .trim();

    // Garantir espaços adequados entre elementos inline
    cleaned = cleaned.replace(/(<\/(?:strong|a|em|b|i)>)(\w)/gi, '$1 $2');
    cleaned = cleaned.replace(/(\w)(<(?:strong|a|em|b|i)[^>]*>)/gi, '$1 $2');
    
    // Converte <br/> para quebras de linha
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    
    // Separa conteúdo em blocos baseado em quebras de linha duplas
    let blocks = cleaned.split(/\n\s*\n/);
    
    let formattedHtml = '';
    
    blocks.forEach((block, index) => {
        block = block.trim();
        if (!block) return;
        
        // Remove espaços extras mas preserva espaços únicos entre palavras
        block = block.replace(/\s+/g, ' ').trim();
        
        // Verifica se é um título (começa com texto em maiúscula seguido de dois pontos ou ponto de interrogação)
        const textOnly = block.replace(/<[^>]*>/g, '');
        if (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^?:]*[?:]?\s*$/.test(textOnly) && textOnly.length < 100) {
            formattedHtml += `<h2>${block}</h2>\n`;
        }
        // Verifica se é uma lista (contém múltiplas linhas ou bullets)
        else if (block.includes('\n') || /^[\s]*[-•*]\s/.test(block)) {
            let lines = block.split('\n').filter(line => line.trim());
            if (lines.length > 1) {
                formattedHtml += '<ul>\n';
                lines.forEach(line => {
                    line = line.replace(/^[\s]*[-•*]\s*/, '').trim();
                    if (line) {
                        formattedHtml += `<li>${line}</li>\n`;
                    }
                });
                formattedHtml += '</ul>\n';
            } else {
                formattedHtml += `<p>${block}</p>\n`;
            }
        }
        // Parágrafo normal
        else {
            formattedHtml += `<p>${block}</p>\n`;
        }
    });
    
    // Remove parágrafos vazios que possam ter sido criados antes de h2
    formattedHtml = formattedHtml.replace(/<p>\s*<\/p>\s*(<h2>)/gi, '$1');
    
    // Remove qualquer <p> que apareça imediatamente antes de <h2>
    formattedHtml = formattedHtml.replace(/<p>([^<]*)<\/p>\s*(<h2>)/gi, (match, p1, h2) => {
        // Se o conteúdo do parágrafo parece ser um título, converte para h2
        const textOnly = p1.replace(/<[^>]*>/g, '').trim();
        if (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^?:]*[?:]?\s*$/.test(textOnly) && textOnly.length < 100) {
            return `<h2>${p1}</h2>\n${h2}`;
        }
        return `<p>${p1}</p>\n${h2}`;
    });
    
    // Adiciona quebras de linha para melhor legibilidade
    formattedHtml = formattedHtml
        .replace(/(<\/h2>)/gi, '$1\n')
        .replace(/(<\/p>)/gi, '$1\n')
        .replace(/(<\/ul>)/gi, '$1\n')
        .replace(/(<\/li>)/gi, '$1\n')
        // Remove quebras de linha extras
        .replace(/\n\s*\n/g, '\n')
        .trim();
    
    // Se começar com <p> e o conteúdo parece ser um título, converte para h2
    if (formattedHtml.startsWith('<p>')) {
        const firstPMatch = formattedHtml.match(/^<p>([^<]*(?:<[^>]*>[^<]*)*)<\/p>/);
        if (firstPMatch) {
            const textOnly = firstPMatch[1].replace(/<[^>]*>/g, '').trim();
            if (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^?:]*[?:]?\s*$/.test(textOnly) && textOnly.length < 100) {
                formattedHtml = formattedHtml.replace(/^<p>([^<]*(?:<[^>]*>[^<]*)*)<\/p>/, '<h2>$1</h2>');
            }
        }
    }

    // Remove <p> do início e fim se existirem
    formattedHtml = formattedHtml.replace(/^<p>/, '').replace(/<\/p>$/, '');
    
    return formattedHtml;
}

// Função para verificar status do link
async function checkLinkStatus(url) {
    try {
        // Tentar fazer uma requisição HEAD primeiro (mais rápida)
        const headResponse = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors', // Evita problemas de CORS
            cache: 'no-cache'
        });
        
        // Se chegou até aqui, o link responde
        return { status: 200, text: 'Link ativo' };
        
    } catch (error) {
        // Se deu erro, tentar uma abordagem diferente
        try {
            // Tentar criar um elemento img para testar se o domínio responde
            const img = new Image();
            const domain = new URL(url).origin;
            
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve({ status: 404, text: 'Link inativo' });
                }, 5000);
                
                img.onload = () => {
                    clearTimeout(timeout);
                    resolve({ status: 200, text: 'Link ativo' });
                };
                
                img.onerror = () => {
                    clearTimeout(timeout);
                    // Tentar verificar se é um erro de CORS ou realmente 404
                    if (error.message && error.message.includes('CORS')) {
                        resolve({ status: 200, text: 'Link ativo (CORS)' });
                    } else {
                        resolve({ status: 404, text: 'Link inativo' });
                    }
                };
                
                // Usar favicon como teste
                img.src = `${domain}/favicon.ico`;
            });
            
        } catch (fallbackError) {
            console.error('Erro ao verificar link:', fallbackError);
            
            // Verificação básica de URL válida
            try {
                new URL(url);
                return { status: 200, text: 'URL válida' };
            } catch (urlError) {
                return { status: 404, text: 'URL inválida' };
            }
        }
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
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="link-url"><a href="${url}" target="_blank">${url}</a></td>
                <td class="link-count">${frequency}</td>
                <td class="link-status-cell">
                    <span class="checking-status">Verificando...</span>
                </td>
            `;
            linkTable.appendChild(row);
            
            // Verificar status do link de forma assíncrona
            checkLinkStatus(url).then(result => {
                const statusCell = row.querySelector('.link-status-cell');
                let statusClass, statusText;
                
                if (result.status === 200) {
                    statusClass = 'status-200';
                    statusText = '200';
                } else if (result.status === 404) {
                    statusClass = 'status-404';
                    statusText = '404';
                } else {
                    statusClass = 'status-error';
                    statusText = 'Erro';
                }
                
                statusCell.innerHTML = `<span class="${statusClass}">${statusText}</span>`;
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
    // Formatar HTML automaticamente
    const formattedHtml = formatHTML(htmlInput.value);
    if (formattedHtml !== htmlInput.value) {
        const cursorPos = htmlInput.selectionStart;
        htmlInput.value = formattedHtml;
        htmlInput.setSelectionRange(cursorPos, cursorPos);
    }
    
    renderedOutput.srcdoc = htmlInput.value;
});

// Sincroniza o HTML de volta ao textarea quando o iframe é editado
renderedOutput.addEventListener("load", () => {
    const doc = renderedOutput.contentDocument || renderedOutput.contentWindow.document;
    doc.body.contentEditable = true;

    doc.body.addEventListener("input", () => {
        const content = doc.body.innerHTML.replace(/&nbsp;/g, ' ');
        const cleanedContent = formatHTML(content);
        htmlInput.value = cleanedContent;
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
        htmlInput.value = formatHTML(content);
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

        const link = prompt("Insira o link:");
        if (link) {
            const anchor = doc.createElement("a");
            anchor.setAttribute("href", link);
            anchor.textContent = selectedText;
            range.deleteContents();
            range.insertNode(anchor);
        }

        const content = doc.body.innerHTML.replace(/&nbsp;/g, ' ');
        htmlInput.value = formatHTML(content);
        updateLinkCounter();
    }
});

// Função melhorada para copiar texto formatado
async function copyFormattedContent() {
    const doc = renderedOutput.contentDocument || renderedOutput.contentWindow.document;
    
    // Obter o HTML formatado do iframe
    let htmlContent = doc.body.innerHTML;
    
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
        copyTextButton.style.backgroundColor = '#28a745';
        
        setTimeout(() => {
            copyTextButton.textContent = 'Copiar';
            copyTextButton.style.backgroundColor = '#17a2b8';
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
            copyTextButton.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                copyTextButton.textContent = 'Copiar';
                copyTextButton.style.backgroundColor = '#17a2b8';
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
updateLinkCounter();