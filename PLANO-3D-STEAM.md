# Cordel em 3D + coop na Steam — plano

Documento de decisão. A versão atual (2D, HTML/Canvas, roda no navegador) continua servindo como
**protótipo jogável e "bíblia de design"**: toda a regra, número e conteúdo já estão provados nela.
O que muda daqui pra frente é a **tecnologia**.

> Resumo da real: 3D de verdade e coop online na Steam **não** são um ajuste nesta base — são um
> **novo projeto, em outra ferramenta**, que vira um programa que se instala (não roda mais só pelo link).
> A boa notícia: o design está pronto e testado, então não começamos do zero, começamos do mapa.

---

## 1. A grande escolha de visual: 2.5D ou 3D puro?

Antes da engine, a decisão que mais pesa no esforço:

| | **2.5D (mundo 3D + bonecos "chapados")** | **3D puro (tudo modelado)** |
|---|---|---|
| O que é | Chão e cenário em 3D, mas os personagens e bichos são **imagens planas** que sempre olham pra câmera (billboard) | Todo mundo é um **modelo 3D** com esqueleto e animação |
| Trabalho de arte | **Baixo**: dá pra reaproveitar a arte de cordel como está | **Alto**: modelar, texturizar e animar ~20 personagens e chefes |
| Cara "Megabonk" | Boa parte dos "survivors 3D" usa exatamente isso | A mais "cheia", mas é a mais cara |
| Recomendação | **Começar por aqui** | Migrar bichos específicos pra 3D depois, se valer |

**Recomendo 2.5D para começar.** É o caminho que muitos jogos desse gênero usam, mantém a nossa
identidade de cordel (que ficou única) e deixa a câmera girar, dar zoom e ter profundidade — o "3D" que
você quer sentir — sem precisar modelar tudo. Dá pra promover um chefe ou outro a 3D de verdade no futuro.

---

## 2. A engine: Godot 4 ou Unity

Unreal é overkill aqui (feito pra gráfico realista pesado). As duas opções reais:

| | **Godot 4** | **Unity** |
|---|---|---|
| Preço | Grátis, código aberto, sem royalties | Grátis até um faturamento alto; já teve polêmica de cobrança |
| Linguagem | GDScript (parecido com Python — perto do que já escrevemos) ou C# | C# |
| Tamanho/leveza | Leve, abre rápido, bom pra 2.5D | Mais pesado, ecossistema maior |
| Steam | **GodotSteam** (addon que liga na Steamworks) | **Steamworks.NET** / **Facepunch.Steamworks** |
| Multiplayer | Sistema de rede embutido + sockets da Steam | Mirror, Fish-Net, Netcode for GameObjects, Photon |
| Comunidade de "survivors" | Crescendo rápido | Enorme, muitos tutoriais do gênero |
| Curva pra você | Menor (GDScript lembra o que já fizemos) | Um pouco maior, mas mais material pronto |

**Recomendo Godot 4.** É grátis de verdade pra sempre, leve, o GDScript é o mais próximo do nosso código
atual, e dá conta tranquilo de um 2.5D com muitos inimigos. Unity só se você já tiver familiaridade ou
quiser o mar de tutoriais prontos.

---

## 3. Coop multiplayer na Steam — como funciona

Três peças, todas cobertas pela **Steamworks** (o kit oficial da Steam) e pelos addons acima:

1. **Convidar o amigo**: você cria um **lobby** da Steam; o amigo entra pelo **convite** (o "Convidar para
   jogar" do overlay da Steam) ou pela lista de amigos. Isso é pronto da Steamworks.
2. **Conectar os jogos**: a Steam tem uma **rede de relay própria** (os dados passam pelos servidores da
   Valve). Isso resolve o pesadelo de "abrir porta no roteador" e esconde o IP de todo mundo. É de graça
   pra jogos na Steam.
3. **Sincronizar a partida**: um jogador é o **anfitrião** (host). O computador dele roda a simulação de
   verdade; os outros mandam só o que apertam e recebem o estado do jogo. É o modelo **host-autoritativo**,
   o mais simples e o mais à prova de trapaça.

### O desafio de verdade (ser honesto)
Nosso jogo tem **centenas de bichos** na tela. Mandar a posição de cada um pela internet, 60 vezes por
segundo, para 5 pessoas, **não cabe**. As saídas, do mais simples ao mais robusto:

- **Simulação determinística + só os comandos** (lockstep): todos rodam a mesma simulação com a mesma
  "semente"; pela rede viajam só os botões apertados. Pouquíssimo dado, mas exige que o jogo seja
  **100% determinístico** (nosso motor já foi feito pensando nisso — bom presságio) e trava se alguém
  tiver lag.
- **Host manda o resumo** (host-autoritativo com replicação): o host simula e envia posições de forma
  comprimida e só do que está perto de cada jogador, além dos "eventos" (nasceu chefe, caiu baú...).
  Mais tolerante a lag, é por onde eu começaria.

A dificuldade por número de jogadores (1 a 5) **já está pronta na lógica** — é só ligar no número real de
gente conectada.

### Custo da Steam
- **US$ 100** uma vez por jogo (a taxa Steam Direct), que volta pra você depois de um tanto de vendas.
- Precisa de conta de desenvolvedor na Steam e preencher a papelada (impostos, banco).

---

## 4. O que reaproveitamos do protótipo atual

Muita coisa — por isso não é começar do zero:

- **Todo o design**: as 4 classes, os golpes, as 5 builds e sinergias, a **fórmula de dano** (base ×
  bônus × multiplicadores × crítico), raridades, Treino, os 10 chefes, o equilíbrio já ajustado, os mapas
  infinitos, os elementos interativos. Isso tudo é **especificação pronta e testada**.
- **A direção de arte de cordel**: a arte vira textura/billboard; o estilo continua.
- **A lógica** (não o código em si): as fórmulas e o comportamento dos bichos traduzem direto pra GDScript.
- **A história e o folclore**, o tutorial do Seu Biu, a trilha por bioma (regravável).
- **O simulador de testes**: a ideia de um "bot que joga sozinho e procura bug" dá pra recriar na engine nova.

O que **não** se aproveita direto: o código JS em si, e os desenhos feitos por código (viram imagens).

---

## 5. Caminho em etapas (roadmap)

Pensado para solo, no seu ritmo. Cada etapa é jogável antes da próxima.

- **Etapa 0 — Decidir e preparar** (curto): escolher Godot (ou Unity), instalar, criar o projeto,
  colocar a arte atual como imagens.
- **Etapa 1 — Andar e bater em 2.5D** ✅ FEITO (na pasta `godot/`): câmera por cima com zoom, Capoeirista
  andando com a arte de cordel chapada, golpe automático, Caipora e Saci perseguindo, elite e mini-chefe,
  vaga-lumes, nível, vida e morte. Rodado no Godot sem erros de código. É o nosso ponto de partida.
- **Etapa 2 — Portar o conteúdo** (o maior trecho, em ondas): as 4 classes, os golpes, as cartas, as
  builds, a Feira, os chefes, os mapas. Aqui o protótipo 2D é o manual: copiamos número por número.
- **Etapa 3 — Steam solo** (médio): publicar na Steam **só para 1 jogador** primeiro — conquistas,
  nuvem de save, página da loja. Já é um jogo de verdade vendável.
- **Etapa 4 — Coop** (grande): lobby + convite + relay da Steam, host-autoritativo, 2 jogadores primeiro,
  depois até 5, ligando a dificuldade no número real de gente.
- **Etapa 5 — Polir e lançar**: demo pro Steam Next Fest, trailer, feedback, equilíbrio do coop.

---

## 6. Tempo e esforço (sem enganação)

Não dá pra prometer datas sem saber quanto você vai tocar por semana, mas as ordens de grandeza, solo:

- Protótipo 2.5D andando e batendo: **semanas**.
- Conteúdo todo portado + Steam solo: **meses**.
- Coop online redondo: **mais meses** — é a parte mais difícil e imprevisível de qualquer jogo.

O coop costuma custar **o dobro de dor de cabeça** do que parece: sincronização, lag, trapaça, testar com
gente de verdade. Por isso o plano **lança o solo primeiro** e só depois liga o coop.

---

## 6b. Plano concreto: do single-player ao coop

**Fase A — Single-player completo (o grosso do trabalho)**
1. ✅ Esqueleto 2.5D rodando (feito).
2. ✅ As 4 classes e os 11 golpes portados (feito). Falta: especial (Q) e ultimate (R) de cada classe.
3. Portar cartas, raridades, builds e sinergias; tela de escolha ao subir de nível.
4. Portar a Feira, os baús, potes, oratórios e o Treino (pila).
5. Portar os 10 chefes do folclore e os padrões de ataque deles.
6. Portar os mapas infinitos, etapas, recorde de sobrevida e desbloqueio.
7. Recriar o HUD e os menus de cordel em 3D; trilha e efeitos.
8. Um "bot que joga sozinho e procura bug", como temos no 2D.
→ Resultado: o jogo que já temos, agora em 2.5D, pronto para a Steam solo.

**Fase B — Steam solo**
9. Conta de desenvolvedor Steam (US$ 100) e página da loja.
10. Ligar a Steamworks (GodotSteam): conquistas e save na nuvem.
11. Demo para o Steam Next Fest; ouvir jogadores; ajustar.

**Fase C — Coop (a parte difícil, por último)**
12. Deixar a simulação **determinística** (mesma semente → mesmo resultado) — já projetamos assim no 2D.
13. Lobby + convite de amigo + relay da Steam (um jogador é o anfitrião).
14. Modelo **host-autoritativo**: o anfitrião simula; os outros mandam só os botões e recebem o estado.
15. Começar com **2 jogadores**, acertar sincronização e lag, depois subir até **5**.
16. Ligar a **dificuldade no número real de gente** (1 a 5) — a lógica já está pronta no 2D.
17. Testar coop com gente de verdade (é onde aparecem os bugs que ninguém previu).

## 6c. Idiomas e vozes (perto do lançamento, não agora)

Para vender bem na Steam, idiomas importam muito. O barato é **preparar desde já** e **traduzir no fim**.

- **Desde o começo**: nenhum texto escrito "na mão" dentro do código. Todo texto sai de uma **tabela de
  traduções** (o Godot já tem isso pronto: arquivos CSV/PO + a função `tr()`). Fazer isso agora custa
  pouco; deixar para depois é retrabalho enorme.
- **Quais idiomas** (os mais usados na Steam): **inglês** (obrigatório, abre o mundo), **espanhol**,
  **chinês simplificado**, **português** (o nosso), e na sequência **russo, alemão, francês, japonês**.
- **Como traduzir**: perto do lançamento, uma passada de tradução (profissional ou revisada) em cima da
  tabela de textos. Como o nosso texto é enxuto, é barato.
- **Vozes em vários idiomas**: os gritos do ultimate ("Iê, Capoeira!", "Finalização!"...) podem ter uma
  **gravação por idioma** — e, onde não houver gravação, o jogo cai na voz do sistema naquele idioma (já
  deixei o 2D preparado para gravação real por arquivo). Um acervo pequeno de gritos por idioma resolve.
- **O que fica em português de propósito**: nomes do folclore (Saci, Boitatá, Caipora...) e termos como
  "pila" podem ficar no original, com uma explicaçãozinha — é parte do charme "bem brasileiro".

## 7. Minha recomendação

1. **Godot 4**, visual **2.5D** (mundo 3D + bonecos de cordel chapados).
2. **Lançar solo primeiro**, coop como atualização grande depois.
3. Manter a versão 2D no navegador como protótipo e vitrine — inclusive pra mostrar o jogo pra gente
   antes de o 3D ficar pronto.
4. No coop, começar **host-autoritativo** com 2 jogadores, crescer até 5.

---

## 8. Onde estamos agora

A **Etapa 1 já está pronta** na pasta `godot/` (veja o `godot/LEIA-ME.md`): instalei o Godot 4.3, montei o
esqueleto 2.5D com a nossa arte de cordel e rodei sem erros de código. É só você baixar o Godot, abrir a
pasta e apertar F5 para ver andando.

**Próximo passo**: começar a **Fase A** (portar o conteúdo) — as classes e golpes primeiro. É um caminho
longo, mas cada pedaço vira algo jogável na hora. Me diz se quer que eu já comece a portar as 4 classes.
