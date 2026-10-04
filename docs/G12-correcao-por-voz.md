# G12 — Correção do desafio com IA e por voz (frontend)

Data: 2026-10-04. O plano está na pasta pai, em `docs/goals/G12-correcao-por-voz.md`. O status de lá continua **planejado**. A base de voz e de fila está neste repo. O veredito em si é o backend (`docs/G12-correcao-por-voz.md`).

O goal não está fechado. Falta a chave do OpenRouter para ver o modelo de verdade. Sem ela, a tela mostra a rubrica local com o mesmo formato de veredito.

## Falar e corrigir

No modo falar, `ChallengePanel` passa `onRecord` para o painel de pergunta. `useSpeech` transcreve em pt-BR. O texto cai no campo (`setText`) e `fromVoice` fica verdadeiro. O aluno lê e aperta corrigir. O POST é `{ inputKind: 'voice', text }` mais sessão, item e duração. O mesmo painel, no modo escrever, manda `{ inputKind: 'text', text }`. A API não distingue os dois na rubrica.

`voice_used` com `success: true` só sai quando a transcrição não é vazia. Clique que o browser recusa, gravação vazia, erro ou fim sem texto saem com `success: false`. Trocar o modo para fora de “falar” zera `fromVoice`, para uma resposta digitada depois não ser lida em voz alta.

## Ler o veredito

`SpeakFeedback` só entra na árvore quando a resposta corrigida foi por voz. O texto falado é o título do veredito (`challenge.verdict.title.*`) e, se houver, o feedback, em pt-BR. Movimento reduzido (`data-motion=reduced` ou `prefers-reduced-motion`) não fala. Não há fala contínua: uma elocução por veredito, cancelada se o painel sair.

O áudio do aluno não é gravado neste app nem enviado. Só o texto.

## Sem rede

Se o POST de responder, notar ou terminar falha com mensagem `network`, o cliente guarda o corpo em `remoa-offline-answers` (últimos 30) e, na resposta, devolve na hora um resultado local: veredito nulo, `fallback: 'offline'`, nota não travada, e a prévia das quatro notas com intervalo zero. A string é `challenge.fallbackOffline`. A tela deixa o aluno notar. A IA não corre no aparelho.

`finish` sem rede também enfileira e apaga `remoa-last-session`, para a página offline não reabrir uma sessão que o aluno já encerrou. Com rede, o fim também apaga essa chave.

`flushOffline` roda quando o `Pwa` monta e de novo no evento `online`. Cada item aceito dispara `offline_answer_synced`. Itens que a API rejeita por validação saem da fila. Itens que ainda não têm rede ficam, na ordem.

`offline.html` repete esse fluxo sem o React, para o caso de `/revisar` nem montar. Ela lê a última sessão, não a fila de revisão. Ao voltar a rede, recarrega, o app monta e o flush corre.

## O que o goal pedia e a tela já cobre

| Critério | Onde |
|---|---|
| Leitura em voz alta só depois de resposta falada, e calada com movimento reduzido | `SpeakFeedback` |
| Áudio não sai do aparelho; o aluno confirma o texto | `useSpeech` e o campo antes de corrigir |
| Sem rede, resposta e nota ficam na fila e sobem quando o servidor aceita | `queueOffline`, `flushOffline`, `client.test.ts` |

## O que ainda falta para tratar o goal como feito

- Ver, com a chave no backend, o feedback do modelo chegando em pedaços e o fallback local quando a resposta do modelo é inválida. A tela já tem os dois caminhos; eles não foram observados com OpenRouter de verdade.
- O arquivo do goal na pasta pai permanece planejado. As caixas marcadas descrevem esta base. Não fecham o goal.
