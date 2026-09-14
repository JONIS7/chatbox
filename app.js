/**
 * GUIA TRT-8 LOCALIZA - Lógica do Chatbot, Busca Inteligente e Moderação
 * Tribunal Regional do Trabalho da 8ª Região (Belém - PA)
 */

document.addEventListener("DOMContentLoaded", () => {
  // Estado da Aplicação
  let locais = carregarLocaisCompletos();
  let sugestoes = carregarSugestoes();

  // Elementos do DOM
  const chatMessages = document.getElementById("chatMessages");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const sidebar = document.getElementById("sidebar");
  const mobileToggle = document.getElementById("mobileToggle");
  const moderationCounter = document.getElementById("moderationCounter");

  // Modais
  const modalSugerir = document.getElementById("modalSugerir");
  const modalModeracao = document.getElementById("modalModeracao");
  const formSugerir = document.getElementById("formSugerir");
  const listaSugestoes = document.getElementById("listaSugestoes");

  // Atualiza contador de sugestões pendentes
  atualizarContadorModeracao();

  // Event Listeners Globais
  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // Envio de mensagem pelo Chat
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const texto = chatInput.value.trim();
    if (!texto) return;

    // Adiciona mensagem do usuário
    adicionarMensagemUsuario(texto);
    chatInput.value = "";

    // Simula indicador de digitação e responde
    exibirDigitandoEProcessar(texto);
  });

  // Filtro por Chips Rápidos
  document.querySelectorAll(".quick-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const query = chip.getAttribute("data-query");
      const label = chip.textContent.trim();
      adicionarMensagemUsuario(label);
      exibirDigitandoEProcessar(query);
    });
  });

  // Filtro de Andares na Barra Lateral
  document.querySelectorAll(".floor-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const andarStr = btn.getAttribute("data-floor");
      const andarNum = parseInt(andarStr, 10);
      const label = andarNum === 1 ? "Térreo / 1º Andar" : `${andarNum}º Andar`;
      
      adicionarMensagemUsuario(`O que tem no ${label}?`);
      exibirDigitandoEProcessar(`andar ${andarNum}`);
      
      // Fecha sidebar no mobile
      if (window.innerWidth <= 860) {
        sidebar.classList.remove("open");
      }
    });
  });

  // Filtro por Prédio
  document.querySelectorAll(".predio-card").forEach(card => {
    card.addEventListener("click", () => {
      const predio = card.getAttribute("data-predio");
      const nome = card.querySelector(".predio-name").textContent.trim();
      adicionarMensagemUsuario(`O que funciona no ${nome}?`);
      exibirDigitandoEProcessar(predio);

      if (window.innerWidth <= 860) {
        sidebar.classList.remove("open");
      }
    });
  });

  // Exemplos da mensagem de boas-vindas
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("example-btn")) {
      const query = e.target.getAttribute("data-query");
      chatInput.value = query;
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  // --- MODAIS ---
  document.getElementById("btnAbrirSugerir").addEventListener("click", () => {
    abrirModal(modalSugerir);
  });

  document.getElementById("btnAbrirModeracao").addEventListener("click", () => {
    renderizarPainelModeracao();
    abrirModal(modalModeracao);
  });

  document.querySelectorAll(".btn-close-modal").forEach(btn => {
    btn.addEventListener("click", () => {
      fecharTodosModais();
    });
  });

  // Fecha clicando no fundo escuro
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) {
      fecharTodosModais();
    }
  });

  // Submissão do Formulário de Sugestão
  formSugerir.addEventListener("submit", (e) => {
    e.preventDefault();

    const novaSugestao = {
      id: "sug-" + Date.now(),
      data: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
      tipo: document.getElementById("sugTipo").value,
      nome: document.getElementById("sugNome").value.trim(),
      predio: document.getElementById("sugPredio").value,
      andar: document.getElementById("sugAndar").value,
      numeroAndar: extrairNumeroAndar(document.getElementById("sugAndar").value),
      referencia: document.getElementById("sugReferencia").value.trim(),
      ramal: document.getElementById("sugRamal").value.trim(),
      dicaChamado: document.getElementById("sugDica").value.trim(),
      solicitante: document.getElementById("sugEstagiario").value.trim() || "Estagiário Anônimo",
      status: "pendente" // 'pendente', 'aprovado', 'rejeitado'
    };

    sugestoes.push(novaSugestao);
    salvarSugestoes(sugestoes);
    atualizarContadorModeracao();

    formSugerir.reset();
    fecharTodosModais();

    exibirToast("Sugestão enviada com sucesso! Ela ficará disponível no chatbox após aprovação da moderação.", "success");
    
    // Adiciona mensagem no chat avisando sobre a moderação
    setTimeout(() => {
      adicionarMensagemBot(`📋 **Nova contribuição registrada!**<br>A sala/gabinete <strong>"${novaSugestao.nome}"</strong> foi enviada para o Painel de Moderação. Assim que aprovada, qualquer estagiário poderá consultá-la aqui no chat.`);
    }, 400);
  });

  // --- FUNÇÕES DO CHAT ---

  function adicionarMensagemUsuario(texto) {
    const row = document.createElement("div");
    row.className = "message-row user";
    row.innerHTML = `
      <div class="message-avatar">👤</div>
      <div class="message-bubble">${escaparHtml(texto)}</div>
    `;
    chatMessages.appendChild(row);
    scrollParaBaixo();
  }

  function adicionarMensagemBot(htmlContent) {
    const row = document.createElement("div");
    row.className = "message-row bot";
    row.innerHTML = `
      <div class="message-avatar">⚖️</div>
      <div class="message-bubble">${htmlContent}</div>
    `;
    chatMessages.appendChild(row);
    scrollParaBaixo();
  }

  function exibirDigitandoEProcessar(query) {
    const typingRow = document.createElement("div");
    typingRow.className = "message-row bot typing-row";
    typingRow.innerHTML = `
      <div class="message-avatar">⚖️</div>
      <div class="message-bubble typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    chatMessages.appendChild(typingRow);
    scrollParaBaixo();

    setTimeout(() => {
      typingRow.remove();
      processarConsulta(query);
    }, 350);
  }

  // Motor de Busca Inteligente
  function processarConsulta(query) {
    const termo = normalizarTexto(query);

    // 1. Pergunta sobre todas as varas
    if (termo.includes("todas as vara") || termo === "varas" || termo === "varas belem" || termo.includes("todas varas")) {
      responderTodasVaras();
      return;
    }

    // 2. Consulta por Andar Específico (ex: "andar 4", "4 andar", "quarto andar")
    const matchAndar = termo.match(/(?:andar\s*(\d{1,2})|(\d{1,2})º?\s*andar)/);
    if (matchAndar) {
      const num = parseInt(matchAndar[1] || matchAndar[2], 10);
      responderPorAndar(num);
      return;
    }

    // 3. Consulta por Prédio
    if (termo.includes("forum") || termo.includes("alencastro") || termo.includes("698")) {
      responderPorPredio("Fórum Trabalhista");
      return;
    }
    if (termo.includes("sede") || termo.includes("746")) {
      responderPorPredio("Edifício-Sede");
      return;
    }

    // 4. Busca direta na base de locais
    const resultados = buscarLocais(termo);

    if (resultados.length > 0) {
      let respostaHtml = "";
      if (resultados.length === 1) {
        respostaHtml = `<p>Encontrei a localização exata para você atender seu chamado:</p>`;
      } else {
        respostaHtml = `<p>Encontrei <strong>${resultados.length} locais</strong> correspondentes no TRT-8:</p>`;
      }

      resultados.forEach(loc => {
        respostaHtml += renderizarCardLocal(loc);
      });

      adicionarMensagemBot(respostaHtml);
    } else {
      // Resposta de não encontrado com sugestão
      adicionarMensagemBot(`
        <p>🤔 Não encontrei nenhum setor ou sala com o termo <strong>"${escaparHtml(query)}"</strong> no complexo de Belém.</p>
        <p style="margin-top:0.4rem; font-size:0.85rem; color:var(--text-muted)">
          💡 <em>Dicas: Tente buscar por número (ex: "5ª vara", "12"), por sigla ("SETIN", "CEJUSC") ou pelo nome da turma/gabinete.</em>
        </p>
        <p style="margin-top:0.5rem">
          Se for uma sala nova ou que mudou de andar recentemente, você pode usar o botão <strong>"➕ Sugerir / Atualizar Local"</strong> no topo para cadastrá-la!
        </p>
      `);
    }
  }

  // Lista de palavras irrelevantes para busca semântica
  const STOP_WORDS = new Set([
    "onde", "fica", "como", "chego", "chegar", "para", "qual", "quais", "sala", "setor", "setores",
    "o", "a", "os", "as", "um", "uma", "uns", "umas", "meu", "minha",
    "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "ao", "aos",
    "com", "por", "que", "se", "eu", "preciso", "ir", "atender", "chamado", "chamados",
    "favor", "obrigado", "gostaria", "saber"
  ]);

  // Algoritmo de busca com pontuação de relevância e prioridade exata
  function buscarLocais(termoOriginal) {
    let termoTratado = normalizarTexto(termoOriginal);

    // Mapeamento de números por extenso para dígitos
    const numExtenso = {
      "primeira": "1", "segunda": "2", "terceira": "3", "quarta": "4", "quinta": "5",
      "sexta": "6", "setima": "7", "sétima": "7", "oitava": "8", "nona": "9", "decima": "10", "décima": "10",
      "decima primeira": "11", "decima segunda": "12", "decima terceira": "13", "decima quarta": "14",
      "decima quinta": "15", "decima sexta": "16", "decima setima": "17", "decima oitava": "18", "decima nona": "19"
    };

    for (const [ext, n] of Object.entries(numExtenso)) {
      if (termoTratado.includes(ext)) {
        termoTratado = termoTratado.replace(new RegExp("\\b" + ext + "\\b", "g"), n);
      }
    }

    // 1. VERIFICAÇÃO DIRETA: Consulta específica por número de VARA
    // Exemplos: "4 vara", "vara 4", "4ª vara", "vt 4", "vt4", "4 vt"
    const regexVara = /(?:(?:vara|vt)\s*(\d{1,2})|(\d{1,2})\s*(?:vara|vt)|(\d{1,2})(?:a|ª)\s*vara)/;
    const matchVara = termoTratado.match(regexVara);
    if (matchVara) {
      const numVara = matchVara[1] || matchVara[2] || matchVara[3];
      const varaExata = locais.find(l => l.categoria === "varas" && (l.tags.includes(numVara) || l.sigla.includes(`${numVara}ª`)));
      if (varaExata) {
        return [varaExata]; // Retorna unicamente a vara solicitada
      }
    }

    // 2. VERIFICAÇÃO DIRETA: Consulta específica por TURMA (2º Grau)
    // Exemplos: "2 turma", "turma 2", "2ª turma"
    const regexTurma = /(?:turma\s*(\d{1,2})|(\d{1,2})\s*turma)/;
    const matchTurma = termoTratado.match(regexTurma);
    if (matchTurma) {
      const numTurma = matchTurma[1] || matchTurma[2];
      const turmaExata = locais.find(l => l.categoria === "turmas" && (l.tags.includes(`turma ${numTurma}`) || l.sigla.includes(`${numTurma}ª`)));
      if (turmaExata) {
        return [turmaExata];
      }
    }

    // 3. Extração e filtragem de tokens significativos (sem stopwords)
    const tokensBrutos = termoTratado.split(/\s+/).filter(w => w.length > 0);
    const tokens = tokensBrutos.filter(w => !STOP_WORDS.has(w) && w.length >= 2);

    // Se todos eram stopwords (ex: usuário só digitou "onde fica?"), retorna vazio
    if (tokens.length === 0) {
      return [];
    }

    // 4. Avaliação de Relevância por Pontuação
    const pontuados = [];

    locais.forEach(loc => {
      const nomeNorm = normalizarTexto(loc.nome);
      const siglaNorm = normalizarTexto(loc.sigla || "");
      const tagsNorm = normalizarTexto((loc.tags || []).join(" "));
      const refNorm = normalizarTexto(loc.referencia || "");
      const dicaNorm = normalizarTexto(loc.dicaChamado || "");
      const juizNorm = normalizarTexto(loc.juizTitular || "");
      const diretorNorm = normalizarTexto(loc.diretor || "");

      let score = 0;
      let tokensCorrespondidos = 0;

      // Correspondência da frase inteira
      const consultaLimpa = tokens.join(" ");
      if (nomeNorm.includes(consultaLimpa)) {
        score += 150;
      }

      tokens.forEach(tok => {
        let matchEncontrado = false;

        if (nomeNorm.includes(tok)) {
          score += 40;
          matchEncontrado = true;
        }
        if (siglaNorm.includes(tok)) {
          score += 35;
          matchEncontrado = true;
        }
        if (tagsNorm.includes(tok)) {
          score += 25;
          matchEncontrado = true;
        }
        if (refNorm.includes(tok)) {
          score += 15;
          matchEncontrado = true;
        }
        if (juizNorm.includes(tok) || diretorNorm.includes(tok)) {
          score += 15;
          matchEncontrado = true;
        }
        if (dicaNorm.includes(tok)) {
          score += 10;
          matchEncontrado = true;
        }

        if (matchEncontrado) {
          tokensCorrespondidos++;
        }
      });

      // Cálculo de cobertura: porcentagem de tokens da busca atendidos
      const cobertura = tokensCorrespondidos / tokens.length;

      // Critério de admissão:
      // Se a consulta tem 2 ou mais termos significativos (ex: "gabinete desembargador teste"),
      // exigimos que pelo menos 60% dos termos batam para não trazer falsos positivos!
      if (tokens.length === 1 && tokensCorrespondidos >= 1) {
        pontuados.push({ loc, score, cobertura });
      } else if (tokens.length >= 2 && cobertura >= 0.6) {
        pontuados.push({ loc, score, cobertura });
      }
    });

    if (pontuados.length === 0) {
      return [];
    }

    // Ordena por pontuação decrescente
    pontuados.sort((a, b) => b.score - a.score);

    const melhorPontuacao = pontuados[0].score;

    // Se o melhor resultado teve pontuação alta e se destacou, filtra os que ficaram muito distantes
    const filtrados = pontuados
      .filter(item => item.score >= melhorPontuacao * 0.6)
      .map(item => item.loc);

    return filtrados;
  }

  function responderTodasVaras() {
    const varas = locais.filter(l => l.categoria === "varas");
    let html = `
      <p>🏢 <strong>Distribuição das 19 Varas do Trabalho de Belém</strong></p>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem">
        Todas localizadas no <strong>Fórum Trabalhista (Ed. Alencastro) - Tv. Dom Pedro I, 698</strong>:
      </p>
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.4rem; font-size:0.8rem;">
    `;

    varas.forEach(v => {
      html += `
        <div style="background:var(--bg-app); border:1px solid var(--border-color); padding:0.4rem 0.5rem; border-radius:6px;">
          <strong style="color:var(--trt-blue-900);">${v.sigla}:</strong> <span style="color:#b45309; font-weight:700;">${v.andar}</span><br>
          <span style="font-size:0.72rem; color:var(--text-muted);">Ramal: ${v.ramal}</span>
        </div>
      `;
    });

    html += `
      </div>
      <p style="margin-top:0.6rem; font-size:0.82rem;">Digite o número da vara (ex: <em>"7ª vara"</em>) para ver pontos de rede, contatos e referências de acesso.</p>
    `;
    adicionarMensagemBot(html);
  }

  function responderPorAndar(numeroAndar) {
    const noAndar = locais.filter(l => l.numeroAndar === numeroAndar);
    const nomeAndar = numeroAndar === 1 ? "Térreo / 1º Andar" : `${numeroAndar}º Andar`;

    if (noAndar.length === 0) {
      adicionarMensagemBot(`Não encontrei setores mapeados especificamente para o ${nomeAndar} no momento.`);
      return;
    }

    let html = `<p>📍 <strong>Setores e Varas no ${nomeAndar}:</strong></p>`;
    noAndar.forEach(loc => {
      html += renderizarCardLocal(loc);
    });

    adicionarMensagemBot(html);
  }

  function responderPorPredio(nomePredio) {
    const doPredio = locais.filter(l => l.predio.includes(nomePredio));
    let html = `<p>🏛️ <strong>Locais no ${nomePredio} (${doPredio.length} unidades):</strong></p>`;
    
    doPredio.slice(0, 6).forEach(loc => {
      html += renderizarCardLocal(loc);
    });

    if (doPredio.length > 6) {
      html += `<p style="font-size:0.82rem; color:var(--text-muted); margin-top:0.4rem;">... e mais ${doPredio.length - 6} setores. Digite o que você precisa especificamente!</p>`;
    }

    adicionarMensagemBot(html);
  }

  // Gera o Card Visual Estruturado
  function renderizarCardLocal(loc) {
    return `
      <div class="location-card" id="card-${loc.id}">
        <div class="location-card-header">
          <div class="location-title-wrap">
            <h4>🏢 ${escaparHtml(loc.nome)}</h4>
          </div>
          <span class="location-badge-floor">📍 ${escaparHtml(loc.andar)}</span>
        </div>
        <div class="location-card-body">
          <div class="location-item">
            <span class="location-item-icon">🏛️</span>
            <div>
              <span class="location-item-label">Prédio:</span>
              <span class="location-item-value">${escaparHtml(loc.predio)} (${escaparHtml(loc.endereco)})</span>
            </div>
          </div>

          <div class="location-item">
            <span class="location-item-icon">🧭</span>
            <div>
              <span class="location-item-label">Referência de Acesso:</span>
              <span class="location-item-value">${escaparHtml(loc.referencia)}</span>
            </div>
          </div>

          ${loc.ramal ? `
          <div class="location-item">
            <span class="location-item-icon">📞</span>
            <div>
              <span class="location-item-label">Ramal / Telefone:</span>
              <span class="location-item-value"><strong>${escaparHtml(loc.ramal)}</strong> ${loc.telefone ? `(${escaparHtml(loc.telefone)})` : ''}</span>
            </div>
          </div>` : ''}

          ${loc.email ? `
          <div class="location-item">
            <span class="location-item-icon">✉️</span>
            <div>
              <span class="location-item-label">E-mail:</span>
              <span class="location-item-value">${escaparHtml(loc.email)}</span>
            </div>
          </div>` : ''}

          ${loc.dicaChamado ? `
          <div class="support-tip-card">
            <span>🛠️</span>
            <div>
              <strong>Dica para o Chamado:</strong> ${escaparHtml(loc.dicaChamado)}
            </div>
          </div>` : ''}
        </div>
        <div class="location-card-footer">
          <button class="btn-card-action" onclick="copiarInfoLocal('${loc.id}')">
            📋 Copiar Localização
          </button>
          ${loc.ramal ? `
          <button class="btn-card-action" onclick="copiarRamal('${loc.ramal}')">
            📞 Ramal ${loc.ramal}
          </button>` : ''}
        </div>
      </div>
    `;
  }

  // --- MODERAÇÃO DE SUGESTÕES ---

  function renderizarPainelModeracao() {
    listaSugestoes.innerHTML = "";

    if (sugestoes.length === 0) {
      listaSugestoes.innerHTML = `
        <div style="text-align:center; padding:2rem; color:var(--text-muted);">
          <div style="font-size:2.5rem; margin-bottom:0.5rem;">📭</div>
          <p>Nenhuma sugestão enviada no momento.</p>
          <p style="font-size:0.8rem; margin-top:0.3rem;">Quando os estagiários sugerirem novos gabinetes ou alterações, eles aparecerão aqui para aprovação.</p>
        </div>
      `;
      return;
    }

    sugestoes.forEach((sug, index) => {
      const card = document.createElement("div");
      card.className = "suggestion-card";
      
      let badgeClass = "pending";
      let badgeText = "🟡 Aguardando Aprovação";
      if (sug.status === "aprovado") {
        badgeClass = "approved";
        badgeText = "🟢 Aprovado e Ativo";
      } else if (sug.status === "rejeitado") {
        badgeClass = "rejected";
        badgeText = "🔴 Rejeitado";
      }

      card.innerHTML = `
        <div class="suggestion-header">
          <span class="suggestion-name">📍 ${escaparHtml(sug.nome)}</span>
          <span class="badge-status ${badgeClass}">${badgeText}</span>
        </div>
        <div class="suggestion-details">
          <strong>Prédio:</strong> ${escaparHtml(sug.predio)} | <strong>Andar:</strong> ${escaparHtml(sug.andar)}<br>
          <strong>Referência:</strong> ${escaparHtml(sug.referencia)}<br>
          ${sug.ramal ? `<strong>Ramal:</strong> ${escaparHtml(sug.ramal)}<br>` : ''}
          ${sug.dicaChamado ? `<strong>Dica de Suporte:</strong> ${escaparHtml(sug.dicaChamado)}<br>` : ''}
          <span style="font-size:0.72rem; color:var(--text-light); margin-top:4px; display:inline-block;">
            Sugerido por: <strong>${escaparHtml(sug.solicitante)}</strong> em ${escaparHtml(sug.data)}
          </span>
        </div>
        ${sug.status === "pendente" ? `
        <div class="suggestion-actions">
          <button class="btn-approve" onclick="aprovarSugestao('${sug.id}')">✅ Aprovar e Publicar no Chat</button>
          <button class="btn-reject" onclick="rejeitarSugestao('${sug.id}')">❌ Rejeitar</button>
        </div>
        ` : ''}
      `;

      listaSugestoes.appendChild(card);
    });
  }

  window.aprovarSugestao = function(id) {
    const sug = sugestoes.find(s => s.id === id);
    if (!sug) return;

    sug.status = "aprovado";
    salvarSugestoes(sugestoes);

    // Converte a sugestão em um registro ativo do chatbox
    const novoRegistro = {
      id: "usr-" + Date.now(),
      nome: sug.nome,
      sigla: sug.nome.substring(0, 15),
      categoria: "custom",
      predio: sug.predio,
      endereco: sug.predio.includes("Fórum") ? "Tv. Dom Pedro I, nº 698" : "Tv. Dom Pedro I, nº 746",
      andar: sug.andar,
      numeroAndar: sug.numeroAndar || 1,
      referencia: sug.referencia,
      ramal: sug.ramal || "",
      telefone: sug.ramal ? `(91) 4008-${sug.ramal}` : "",
      email: "",
      dicaChamado: sug.dicaChamado,
      tags: [sug.nome.toLowerCase(), sug.andar.toLowerCase()]
    };

    locais.push(novoRegistro);
    salvarLocaisNoStorage(locais);

    atualizarContadorModeracao();
    renderizarPainelModeracao();
    exibirToast(`Local "${sug.nome}" aprovado com sucesso! Já está disponível nas buscas do chat.`, "success");
  };

  window.rejeitarSugestao = function(id) {
    const sug = sugestoes.find(s => s.id === id);
    if (!sug) return;

    sug.status = "rejeitado";
    salvarSugestoes(sugestoes);

    atualizarContadorModeracao();
    renderizarPainelModeracao();
    exibirToast(`Sugestão rejeitada.`, "info");
  };

  // Exportar dados atualizados em formato JSON
  document.getElementById("btnExportarDados").addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(locais, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trt8_locais_atualizado_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    exibirToast("Arquivo JSON gerado para a equipe de TI!", "success");
  });

  // Funções Auxiliares de Sugestões
  function carregarSugestoes() {
    const salvas = localStorage.getItem("trt8_sugestoes");
    if (salvas) {
      try {
        return JSON.parse(salvas);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  function salvarSugestoes(lista) {
    localStorage.setItem("trt8_sugestoes", JSON.stringify(lista));
  }

  function atualizarContadorModeracao() {
    const pendentes = sugestoes.filter(s => s.status === "pendente").length;
    if (pendentes > 0) {
      moderationCounter.style.display = "inline-block";
      moderationCounter.textContent = pendentes;
    } else {
      moderationCounter.style.display = "none";
    }
  }

  // Funções Globais de Cópia
  window.copiarInfoLocal = function(id) {
    const loc = locais.find(l => l.id === id);
    if (!loc) return;

    const texto = `📍 ${loc.nome}\n🏢 Prédio: ${loc.predio} (${loc.endereco})\n📌 Andar: ${loc.andar}\n🧭 Ponto de Referência: ${loc.referencia}${loc.ramal ? `\n📞 Ramal: ${loc.ramal}` : ''}${loc.dicaChamado ? `\n🛠️ Dica de Suporte: ${loc.dicaChamado}` : ''}`;
    
    navigator.clipboard.writeText(texto).then(() => {
      exibirToast("Informações do local copiadas para a área de transferência!", "success");
    }).catch(() => {
      exibirToast("Não foi possível copiar.", "info");
    });
  };

  window.copiarRamal = function(ramal) {
    navigator.clipboard.writeText(ramal).then(() => {
      exibirToast(`Ramal ${ramal} copiado!`, "info");
    });
  };

  // Utilitários
  function abrirModal(modal) {
    modal.classList.add("open");
  }

  function fecharTodosModais() {
    document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("open"));
  }

  function scrollParaBaixo() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function normalizarTexto(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/gi, " ")
      .trim();
  }

  function extrairNumeroAndar(strAndar) {
    const m = strAndar.match(/\d+/);
    return m ? parseInt(m[0], 10) : 1;
  }

  function escaparHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function exibirToast(mensagem, tipo = "info") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `<span>${tipo === 'success' ? '✅' : 'ℹ️'}</span> <div>${escaparHtml(mensagem)}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
});
