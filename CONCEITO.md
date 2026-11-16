# Encantados — Lendas do Brasil (documento do jogo)

Roguelike de ação com cartas, 100% brasileiro: folclore, lutas, comida, amuletos e trilha de ritmos brasileiros.
"Encantados" é como o povo da Amazônia chama os seres do folclore (Boto, Iara, Curupira...). O nome ainda pode mudar.
Inspirações de *mecânica* (não de arte nem de conteúdo): roguelikes de cartas com multiplicadores que escalam
(estilo Balatro) e modos de horda com melhorias a cada nível (estilo Anima Squad / survivors).

## Como jogar agora
- Abra o arquivo `index.html` no navegador (dois cliques). Não precisa instalar nada.
- **WASD/setas** andam · **Espaço** esquiva · **Q** (ou botão direito) especial em área · **R** ultimate (recarga de 50s) · **E** item ativo ·
  **Esc/P** pausa (mostra toda a build) · **1–5** escolhe carta · **R** rerrola · **X** pula carta ·
  **M** silencia · **N** liga/desliga a música · botões 🔊 e ♪ no canto da tela · controle de videogame funciona.
- Passe o mouse em qualquer carta, golpe ou item para ver a dica detalhada (antes → depois dos seus atributos).

## Tutorial com narrador
Botão **Tutorial** no menu. Quem conta é **Seu Biu, cantador de cordel**: primeiro a história (quem são os
encantados, a lenda do Boitatá e por que a mata está em fúria), depois 7 lições jogáveis — andar, golpes
automáticos, esquiva, vaga-lumes e cartas, especial (Q), ultimate (R) e item ativo (E) — e por fim como é a
jornada (fases, chefes, baú, Feira, vantagens, pila e Treino). No tutorial ninguém morre, não tem relógio
e não conta recorde nem pila. Se o navegador tiver voz em português, Seu Biu também fala em voz alta.
O roteiro fica em `src/tutorial.js` (lista `TUT_STEPS`), fácil de reescrever.

## O loop
1. Escolha um personagem e um **mapa** (só o primeiro começa aberto). Escolha também quantos **jogadores** (1 a 5):
   cada jogador a mais deixa tudo mais difícil (dificuldade = número de jogadores).
2. Cada mapa é uma **fase sem fim**. Você sobrevive às ondas; a cada ~100s a mata esquenta uma **etapa**
   (criaturas mais fortes), e aos 65s de cada etapa chega um **chefe**. Não precisa matar ninguém para seguir —
   só aguentar. Seu **recorde é o tempo** que durou em cada mapa.
3. Pelo mapa há **elementos interativos**: a **barraca da Feira** (encoste para comprar; reabastece a cada etapa),
   **potes de barro** para quebrar (moedas, coxinha, berrante, sino ou vaga-lumes), **oratórios** que dão uma
   **bênção** (cura + dano) a quem fica rezando um instante, e **baús trancados** que você abre pagando.
4. Vaga-lumes = XP → sobe de nível → escolhe **1 de 3 cartas**. Subir de nível **não cura**.
5. Chefe derrotado deixa um **baú no chão** (é só buscar). Elite a cada três deixa um **balaio** (reforço na hora).
6. Derrotar os chefes de um mapa **abre o mapa seguinte**: Mata Atlântica → Sertão → Vila → Pantanal → Amazônia →
   Coração da Mata. Dá para jogar cada um para sempre, até os bichos ficarem fortes demais.

## Itens de chão que aparecem no mapa
- **Berrante**: puxa todos os vaga-lumes e moedas. **Sino da capela**: varre a tela (limpa a praga).
- **Balaio**: um upgrade na hora. **Baú**: escolha 1 de 3 tesouros.

## Personagens
| Classe | Build | Vantagem própria | Especial (Q) |
|---|---|---|---|
| Capoeirista | Capoeira | Golpes de Capoeira 20% mais rápidos e +10% de dano | Roda de Capoeira (giros em área) |
| Lutadora de Jiu-Jitsu | Jiu-Jitsu | Abater com Jiu-Jitsu cura; **faixas** evoluem com o nível (Branca → Preta) | Arrastão (salta no bolo e derruba) |
| Benzedeira | Mandinga | +20% de área em Mandinga; abates com Mandinga curam um pouco | Reza Forte (círculo de luz + cura) |
| Cangaceiro | Cangaço | +30% de dano de Cangaço nas fases de **sol** (Sertão, Pantanal), +10% nas outras | Tiroteio (balas para todo lado) |

Dá para jogar de Lutadora usando golpes de Cangaço, mas a vantagem só vale para a build do personagem.
A Lutadora luta colada: Kimura, Mata-Leão e Queda de Baiana são **investidas de verdade** (ela corre até o alvo).
Todo golpe tem animação própria no boneco (giro, chute, rasteira, tiro, arremesso, reza).

**Ultimates (R):** Roda Grande (Capoeirista), Finalização Geral (Lutadora), Procissão das Almas (Benzedeira),
Bando de Lampião (Cangaceiro). Cada um toca um tema próprio (berimbau de roda, tambor e gongo, sino e ladainha, xaxado)
e o personagem grita. A Lutadora também grita o nome do golpe ("Kimura!") e os chutes de capoeira tocam berimbau.
A voz usa a fala do próprio navegador em português; se o navegador não tiver voz instalada, fica só o som.

## Cartas e raridades
- Toda carta de atributo existe em versões **Comum → Incomum → Rara → Épica → Lendária**, da raridade base dela para cima.
  Força em relação à comum: ×1,5 · ×2,5 · ×5 · ×12,5 (Guaraná comum +10% de velocidade → lendário +125%).
- Chance de a carta vir melhorada: incomum ~13%, rara ~4%, épica ~1,2%, lendária ~0,3% (a Sorte aumenta).
- **Itens passivos** = encantos (até 6). **Item ativo** = 1 por vez, tecla E: Fogos de São João, Rede de Pesca,
  Chá da Vó, Pandeiro, Cuia de Chimarrão.

## Builds (sinergias com 2 / 4 / 6 cartas da mesma tag)
**Capoeira** (velocidade/esquiva) · **Jiu-Jitsu** (controle/defesa) · **Mandinga** (magia/área) ·
**Cangaço** (força/crítico) · **Raiz** (comida/vida).

> "Build de macumba" virou **Mandinga** — palavra da capoeira e do jeito brasileiro de falar de feitiço/malícia —
> para não caricaturar religiões de matriz africana. Os poderes são de benzedeira: reza, arruda, garrafada, patuá.

## Fórmula de dano (estilo Balatro)
`dano = base do golpe × (1 + soma dos bônus) × (produto dos multiplicadores) × crítico`
A tela de pausa e as dicas mostram cada parte da conta.

## Treino (evolução permanente)
Pila por corrida = 3 + nível + 10 por fase vencida + 1 a cada 25 criaturas (+40 por ciclo).
Dez melhorias: Fôlego (vida), Força (dano), Couro Grosso, Reza Braba, Pernas Ligeiras, Olho Bom, Estudo,
Mesada, Manha e Especial Afiado. Ficam salvas no navegador.

## Criaturas e chefes
- Criaturas: Caipora (bando), Saci (teleporta), Curupira (ziguezague), Mula sem Cabeça (investida com fogo),
  Iara (canto que deixa lento), Lobisomem (salto), Boto (corações), Mapinguari (gigante), Pisadeira (bote).
- Chefes: Saci Redemoinho, Mula sem Cabeça, Iara, Lobisomem da Lua Cheia, Cuca, Boto Encantado,
  Mapinguari Ancião, Pisadeira, Curupira Guardião e Boitatá.

## Arte e som
- Personagens e criaturas desenhados por código, com sombreado e animação de passos; câmera próxima (estilo survivors).
- Mata Atlântica com ipê-amarelo, palmito-juçara, embaúba, bromélias, troncos caídos, flores e folhas no chão.
- Cartas em estilo **xilogravura de cordel**. Logo estilo capa de cordel.
- Trilha gerada por código, um ritmo por bioma: **berimbau/capoeira** (Mata), **baião** (Sertão), **funk** (Vila),
  **samba** (Pantanal), **carimbó** (Amazônia), **maracatu** (Coração da Mata).

## Testes automáticos (pasta `test/`)
- `node test/sim.js 10 foco 2` — bot joga 10 corridas por classe. `SKILL=0.3..0.7` muda a habilidade;
  `META=0` simula a primeira corrida, `META=20` vinte melhorias de treino, `META=full` tudo comprado.
  O bot joga mal de corpo a corpo: para equilíbrio entre classes, a sensação de quem joga vale mais que ele.
- `node test/stress.js` — 400 cartas empilhadas, fórmula de dano em extremos, ciclos até o 12.
- `node test/spawn.js` — nenhum bicho pode nascer/teleportar colado no jogador.
- `node test/lunge.js` — investidas do Jiu-Jitsu, especiais de todas as classes e itens ativos.
- `node test/tips.js` — gera as ~1.150 dicas e confere que nenhuma quebra nem altera o jogo.
- `node test/raridade.js` — versões das cartas, textos e chances.
- `python test/versao.py` — troca o número de versão no `index.html` (evita o navegador usar arquivo antigo).

## Próximos passos sugeridos
1. Seu teste: o que é divertido, o que irrita, que carta nunca vale a pena.
2. Bater o martelo no nome e na identidade visual.
3. Mais folclore: Cobra Grande, Negrinho do Pastoreio, Cabeça de Cuia, Comadre Fulozinha, Matinta Pereira.
4. Cenário mais rico nos outros biomas (o capricho maior até agora foi na Mata Atlântica).
5. Steam: empacotar com Electron/Tauri, conquistas, página da loja, demo.

## Arquivos
- `index.html`, `style.css` — página do jogo.
- `src/data/` — classes, cartas, itens, treino, criaturas, chefes, fases, textos de apresentação.
- `src/engine/` — simulação (sem tela, por isso o simulador consegue rodar).
- `src/render/` — sprites, arte das cartas, logo, desenho do mundo e HUD.
- `src/ui/` — telas e dicas. `src/main.js`, `src/audio.js` — entrada, treino salvo, som e música.
- `prototipo-turnos/` — o primeiro protótipo (por turnos), guardado para referência.
