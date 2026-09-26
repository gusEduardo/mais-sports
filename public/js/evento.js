// Este arquivo roda no navegador. Os repositórios e o Express rodam no servidor.
const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fusoHorario = 'America/Sao_Paulo'

function preencherTexto(id, valor) {
    document.getElementById(id).textContent = valor ?? 'Não informado'
}

function formatarPreco(centavos) {
    return Number.isFinite(centavos) ? formatoMoeda.format(centavos / 100) : 'Não informado'
}

function formatarData(data, opcoes) {
    if (!data || Number.isNaN(new Date(data).getTime())) return 'Não informada'
    return new Intl.DateTimeFormat('pt-BR', { timeZone: fusoHorario, ...opcoes }).format(new Date(data))
}

function preencherData(id, data, opcoes) {
    const elemento = document.getElementById(id)
    elemento.textContent = formatarData(data, opcoes)
    if (data) elemento.dateTime = data
}

// Usamos createElement + textContent para não interpretar o texto do JSON como HTML.
function criarElemento(tag, texto, classes = '') {
    const elemento = document.createElement(tag)
    if (texto !== undefined) elemento.textContent = texto
    elemento.className = classes
    return elemento
}

function urlHttp(valor) {
    if (!valor) return null
    try {
        const url = new URL(valor, window.location.origin)
        return ['http:', 'https:'].includes(url.protocol) ? url.href : null
    } catch {
        return null
    }
}

function preencherImagem(id, caminho, alt) {
    const imagem = document.getElementById(id)
    const url = urlHttp(caminho)
    imagem.hidden = !url
    if (!url) return
    imagem.alt = alt
    imagem.src = url
    imagem.addEventListener('error', () => { imagem.hidden = true }, { once: true })
}

function preencherLink(id, endereco) {
    const link = document.getElementById(id)
    const url = urlHttp(endereco)
    link.hidden = !url
    if (url) link.href = url
    else link.removeAttribute('href')
}

function textoIdade(idade) {
    if (!Number.isFinite(idade)) return 'Idade mínima não informada'
    return idade === 0 ? 'Sem idade mínima' : `Idade mínima: ${idade} anos`
}

function preencherModalidades(modalidades) {
    const lista = document.getElementById('evento-modalidades')
    const idades = document.getElementById('evento-idades')
    lista.replaceChildren()
    idades.replaceChildren()

    if (modalidades.length === 0) {
        lista.append(criarElemento('p', 'Modalidades não informadas.', 'text-muted'))
        idades.append(criarElemento('li', 'Não informada'))
    }

    modalidades.forEach(modalidade => {
        const card = criarElemento('article', undefined, 'bg-secondary rounded-xl p-4 border border-white/5')
        card.append(criarElemento('p', modalidade.distancia ?? '', 'font-display text-5xl text-lime leading-none'))
        card.append(criarElemento('h3', modalidade.nome, 'mt-2 text-lg'))

        const detalhes = criarElemento('ul', undefined, 'mt-2 text-sm text-muted space-y-1')
        const textos = modalidade.detalhes ?? []
        textos.forEach(detalhe => detalhes.append(criarElemento('li', detalhe)))
        detalhes.append(criarElemento('li', textoIdade(modalidade.idadeMinima)))
        card.append(detalhes, criarElemento('p', formatarPreco(modalidade.precoCentavos), 'mt-3 text-2xl font-mono text-lime'))
        lista.append(card)
        idades.append(criarElemento('li', `${modalidade.nome}: ${textoIdade(modalidade.idadeMinima)}`))
    })
}

function preencherKit(kit) {
    const itens = kit?.itens ?? []
    const lista = document.getElementById('evento-kit-itens')
    lista.replaceChildren()
    preencherTexto('evento-kit-mensagem', itens.length ? 'Itens incluídos na inscrição:' : 'Este evento não possui itens de kit cadastrados.')

    itens.forEach(item => {
        lista.append(criarElemento('li', item, 'bg-secondary rounded-xl p-4 border border-white/5 text-center font-mono text-sm text-lime'))
    })

    let retirada = 'Não informada'
    if (kit?.diaRetiradaKit) {
        // Meio-dia no Brasil evita transformar uma data sem horário no dia anterior.
        retirada = formatarData(`${kit.diaRetiradaKit}T12:00:00-03:00`, { dateStyle: 'short' })
        if (kit.horarioInicioKit && kit.horarioLimiteKit) retirada += `, das ${kit.horarioInicioKit} às ${kit.horarioLimiteKit}`
        else if (kit.horarioLimiteKit) retirada += `, até ${kit.horarioLimiteKit}`
        else if (kit.horarioInicioKit) retirada += `, a partir das ${kit.horarioInicioKit}`
    }
    preencherTexto('evento-retirada-kit', retirada)
}

function preencherOrganizador(organizador) {
    preencherTexto('organizador-nome', organizador?.nome ?? 'Organizador não informado')
    preencherTexto('organizador-cargo', organizador?.cargo ?? '')
    preencherImagem('organizador-imagem', organizador?.imagem, organizador?.imagemAlt ?? `Imagem de ${organizador?.nome ?? 'organizador'}`)
    preencherLink('organizador-instagram', organizador?.redesSociais?.instagram)
    preencherLink('organizador-site', organizador?.redesSociais?.site)

    const contatos = document.getElementById('organizador-contatos')
    contatos.replaceChildren()
    const telefone = organizador?.contato?.telefone
    const email = organizador?.contato?.email

    if (telefone) {
        const item = criarElemento('li')
        const link = criarElemento('a', telefone, 'text-lime underline')
        link.href = `tel:${String(telefone).replace(/[^\d+]/g, '')}`
        item.append(link)
        contatos.append(item)
    }
    if (email) {
        const item = criarElemento('li')
        const link = criarElemento('a', email, 'text-lime underline break-all')
        link.href = `mailto:${encodeURIComponent(email)}`
        item.append(link)
        contatos.append(item)
    }
    if (!telefone && !email) contatos.append(criarElemento('li', 'Contato não informado'))
}

function preencherInscricao(evento) {
    const status = {
        abertas: 'Inscrições abertas',
        encerradas: 'Inscrições encerradas',
        em_breve: 'Inscrições em breve',
        esgotadas: 'Inscrições esgotadas',
        canceladas: 'Inscrições canceladas'
    }
    const label = status[evento.statusInscricao] ?? 'Inscrições indisponíveis'
    const dataPassou = new Date(evento.data).getTime() <= Date.now()
    const semVagas = evento.vagas?.disponiveis === 0
    const aberta = evento.statusInscricao === 'abertas' && !dataPassou && !semVagas
    preencherTexto('evento-status', label)
    document.getElementById('evento-status-ponto').hidden = !aberta

    let textoBotao = label
    if (dataPassou) textoBotao = 'Evento já iniciado'
    else if (semVagas) textoBotao = 'Vagas esgotadas'
    if (aberta) textoBotao = 'Inscrever-se →'

    for (const id of ['evento-inscricao', 'evento-inscricao-final']) {
        const link = document.getElementById(id)
        link.textContent = textoBotao
        if (aberta) {
            link.href = `/views/checkout.html?evento=${evento.id}`
            link.removeAttribute('aria-disabled')
            link.removeAttribute('tabindex')
        } else {
            link.removeAttribute('href')
            link.setAttribute('aria-disabled', 'true')
            link.setAttribute('tabindex', '-1')
        }
    }
    preencherTexto('evento-inscricao-mensagem', aberta ? 'Escolha sua modalidade e participe.' : textoBotao)
}

function iniciarContagem(data) {
    const alvo = new Date(data).getTime()
    if (!Number.isFinite(alvo)) {
        preencherTexto('evento-contagem-titulo', 'Data não informada')
        return
    }
    function atualizar() {
        const restante = Math.max(alvo - Date.now(), 0)
        const valores = [
            Math.floor(restante / 86400000),
            Math.floor((restante % 86400000) / 3600000),
            Math.floor((restante % 3600000) / 60000),
            Math.floor((restante % 60000) / 1000)
        ]
        const ids = ['event-cd-dias', 'event-cd-hrs', 'event-cd-min', 'event-cd-seg']
        ids.forEach((id, indice) => {
            preencherTexto(id, String(valores[indice]).padStart(2, '0'))
        })
        if (!restante) preencherTexto('evento-contagem-titulo', 'Evento já iniciado')
        return restante
    }
    if (atualizar() > 0) {
        const intervalo = setInterval(() => {
            if (atualizar() === 0) clearInterval(intervalo)
        }, 1000)
    }
}

function preencherLocal(local) {
    for (const id of ['evento-local', 'evento-local-mapa']) preencherTexto(id, local?.nome)
    for (const id of ['evento-endereco', 'evento-endereco-mapa']) preencherTexto(id, local?.endereco)

    const latitude = local?.latitude
    const longitude = local?.longitude
    const temCoordenadas = Number.isFinite(latitude) && Number.isFinite(longitude)
        && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    const consulta = temCoordenadas ? `${latitude},${longitude}` : [local?.nome, local?.endereco].filter(Boolean).join(', ')
    preencherLink('evento-google-maps', consulta ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}` : null)

    if (!temCoordenadas || !window.L) return
    const container = document.getElementById('evento-mapa-container')
    container.hidden = false
    try {
        const mapa = window.L.map(document.getElementById('event-location-map'), {
            zoomControl: false, dragging: false, scrollWheelZoom: false,
            doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false
        }).setView([latitude, longitude], 15)

        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mapa)
        window.L.marker([latitude, longitude], { interactive: false, keyboard: false, icon: window.L.divIcon({
            html: '<span class="event-map-pin"></span>', className: 'event-map-marker', iconSize: [32, 44], iconAnchor: [16, 32]
        }) }).addTo(mapa)
        requestAnimationFrame(() => mapa.invalidateSize())
    } catch {
        // A falha de um mapa externo não impede a leitura dos dados do evento.
        container.hidden = true
    }
}

function preencherEvento(evento) {
    document.title = `+Sports - ${evento.nome}`
    preencherTexto('evento-nome', evento.nome)
    preencherTexto('evento-descricao', evento.descricao)
    preencherTexto('evento-sobre', evento.sobre)
    preencherTexto('evento-preco', formatarPreco(evento.valorInscricaoCentavos))
    preencherTexto('evento-resumo', [formatarData(evento.data, { day: '2-digit', month: 'short' }), evento.local?.nome, evento.modalidade].filter(Boolean).join(' · '))
    preencherImagem('evento-imagem', evento.imagemFundo, evento.imagemAlt ?? evento.nome)

    for (const id of ['evento-data', 'evento-info-data']) preencherData(id, evento.data, { dateStyle: 'long' })
    for (const id of ['evento-horario', 'evento-info-horario']) preencherData(id, evento.data, { hour: '2-digit', minute: '2-digit' })
    preencherTexto('evento-dia-semana', formatarData(evento.data, { weekday: 'long' }))

    preencherTexto('evento-vagas-disponiveis', evento.vagas?.disponiveis)
    preencherTexto('evento-vagas-total', evento.vagas?.total)
    const percentual = evento.vagas?.total > 0 ? (evento.vagas.disponiveis / evento.vagas.total) * 100 : 0
    document.getElementById('evento-vagas-barra').style.width = `${Math.min(100, Math.max(0, percentual))}%`

    preencherModalidades(evento.modalidades ?? [])
    preencherKit(evento.kit)
    preencherOrganizador(evento.organizador)
    preencherInscricao(evento)
    iniciarContagem(evento.data)
    // Com <base>, fragmentos precisam incluir a rota atual para permanecer na página.
    document.getElementById('evento-link-modalidades').href = `${window.location.pathname}#evento-modalidades-secao`
    document.getElementById('evento-conteudo').hidden = false
    preencherLocal(evento.local)
}

async function carregarEvento() {
    try {
        const rota = window.location.pathname.match(/^\/evento\/([1-9]\d*)\/?$/)
        if (!rota) throw new Error('Abra esta página pelo endereço /evento/1 ou por outro ID cadastrado.')
        const id = rota[1]
        const resposta = await fetch(`/api/eventos/${id}`, { headers: { Accept: 'application/json' } })
        const dados = await resposta.json()
        if (!resposta.ok) throw new Error(dados.message ?? 'Não foi possível carregar o evento.')
        preencherEvento(dados)
    } catch (erro) {
        document.getElementById('evento-conteudo').hidden = true
        document.getElementById('evento-erro').hidden = false
        preencherTexto('evento-erro-mensagem', erro instanceof TypeError || erro instanceof SyntaxError
            ? 'Não foi possível obter os dados. Verifique sua conexão e tente novamente.' : erro.message)
    } finally {
        document.getElementById('evento-carregando').hidden = true
    }
}

carregarEvento()
