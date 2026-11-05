# ConsolePR

[English](README.en.md)

Busca rápida de efeitos para o Adobe Premiere Pro e o After Effects, no estilo do FX Console: aperte um atalho, digite parte do nome e o efeito é aplicado aos clipes ou camadas selecionados.

![Janela do ConsolePR filtrando efeitos de vídeo e de áudio enquanto o nome é digitado, e abrindo o menu de print do frame](docs/demo.gif)

Testado no Premiere Pro 2026 (26.5.2) e no After Effects 2026 (26.5) no Windows. O suporte a macOS foi escrito, mas ainda não foi testado num Mac. O manifesto aceita as versões 22 ou superiores dos dois programas, mas versões anteriores às testadas não foram verificadas.

A janela segue o idioma do Premiere ou do After Effects: português quando o programa está em português e inglês nos demais. As mensagens dos instaladores seguem o idioma do sistema da mesma forma.

## Instalação

Você precisa do Premiere Pro ou do After Effects instalado, no Windows ou no macOS. Não é preciso instalar mais nada.

### Windows

1. Feche o Premiere e o After Effects.
2. Baixe o projeto: clique em **Code > Download ZIP** nesta página e extraia o arquivo em qualquer pasta. Se preferir usar o Git:

   ```bash
   git clone https://github.com/Kievy/consolePR.git
   ```

3. Dê dois cliques em **`install.bat`** e aguarde a mensagem de conclusão. Se o Windows mostrar um aviso de segurança, escolha **Mais informações > Executar assim mesmo**.
4. Abra o programa e aperte `Ctrl+Espaço` com ele em primeiro plano.

O instalador copia a extensão para `%APPDATA%\Adobe\CEP\extensions\com.consolepr`, então a pasta baixada pode ser apagada depois. Para atualizar, baixe a versão nova e repita os passos.

A extensão não é assinada, então o instalador também liga o `PlayerDebugMode` do CEP no registro do usuário. Sem isso, o Premiere não a carrega.

### macOS

1. Feche o Premiere e o After Effects.
2. Baixe o ZIP como no Windows e extraia.
3. Clique com o botão direito em **`install.command`** e escolha **Abrir** (o macOS bloqueia o duplo clique em scripts baixados). Se preferir, rode no Terminal, dentro da pasta extraída:

   ```bash
   bash install.command
   ```

4. Abra o programa e aperte `Control+Espaço`. Na primeira vez, o macOS pede para permitir o Premiere ou o After Effects em **Ajustes do Sistema > Privacidade e Segurança > Monitoramento de Entrada**. Ative a permissão e reabra o programa.

O instalador copia a extensão para `~/Library/Application Support/Adobe/CEP/extensions/com.consolepr` e liga o `PlayerDebugMode` do CEP com `defaults write`.

No macOS a janela mantém a barra de título do sistema, e o atalho não é bloqueado para o resto do sistema. Se `Control+Espaço` também troca o idioma do teclado no seu Mac, [troque o atalho](#trocar-o-atalho) ou desative essa opção em **Ajustes do Sistema > Teclado > Atalhos de Teclado > Fontes de Entrada**.

### Se não funcionar

- **O atalho não abre a janela:** veja se a extensão aparece em `Window > Extensions > ConsolePR` e confira o arquivo `consolepr.log` na pasta temporária (`%TEMP%` no Windows, `$TMPDIR` no macOS). No macOS, confira também a permissão de Monitoramento de Entrada. Outro programa pode já estar usando a mesma combinação; nesse caso, [troque o atalho](#trocar-o-atalho).
- **A extensão não aparece no menu:** confirme que o Premiere foi reiniciado depois da instalação.

### Desinstalar

Com o Premiere e o After Effects fechados, dê dois cliques em **`uninstall.bat`** (Windows) ou abra **`uninstall.command`** (macOS). Ele remove a extensão e o atalho salvo, e mantém o `PlayerDebugMode` ligado porque outras extensões podem precisar dele.

## Uso

1. Selecione um ou mais clipes na timeline do Premiere, ou camadas na composição do After Effects.
2. Aperte o atalho com o programa em primeiro plano.
3. Digite parte do nome. Acentos e maiúsculas são ignorados, e letras em sequência também funcionam (`gblur` encontra Gaussian Blur).
4. Use `Enter` ou clique para aplicar. `↑`/`↓` navegam, `Esc`, clicar fora ou repetir o atalho fecham a janela.

Efeitos de vídeo vão só para clipes de vídeo, e efeitos de áudio só para clipes de áudio. No After Effects, a aplicação em várias camadas é desfeita de uma vez com `Ctrl+Z`. Os nomes aparecem como cada programa os informa ao script.

A janela também abre em `Window > Extensions > ConsolePR`.

## Print do frame

Clique no botão da câmera, ao lado da engrenagem, para capturar o frame onde está a agulha da sequência ativa no Premiere ou da composição ativa no After Effects. O print sai sempre em qualidade máxima, no tamanho da sequência ou composição, mesmo com o preview em 1/2 ou 1/4:

- **Copiar para a área de transferência:** é só colar em outro programa.
- **Salvar como PNG ou JPEG:** escolha a pasta e o nome na janela de salvar. O ConsolePR lembra a última pasta usada.

## Suavização de keyframes (só no After Effects)

O botão do keyframe, à esquerda da câmera, abre os controles de suavização dos keyframes selecionados na timeline:

| Controle | O que faz |
| --- | --- |
| `<` | Suavização de entrada (influência de 0 a 100) |
| `>` | Suavização de saída |
| `><` | Entrada e saída juntas |
| Quadrado | Interpolação HOLD |
| Losango | Interpolação LINEAR |
| Círculo | Interpolação BEZIER |

Nos botões de interpolação, clique para mudar os dois lados, `Alt+Clique` para mudar só a entrada (IN) e `Shift+Clique` só a saída (OUT). Como no After Effects o HOLD sempre vale para o trecho depois de um keyframe, o HOLD na entrada é aplicado na saída do keyframe anterior, e o primeiro keyframe de cada propriedade não tem entrada para segurar. Os sliders aplicam ao soltar, e cada ajuste vira um único passo no `Ctrl+Z`. Abaixo deles, o preview mostra a curva e uma animação de como o movimento vai ficar.

O Premiere não permite controlar a suavização por script, por isso o botão não aparece lá.

## Trocar o atalho

1. Abra a janela e clique na engrenagem ao lado da busca.
2. Clique no campo do atalho e pressione a nova combinação. Ela passa a valer na hora, sem reiniciar o Premiere.

Use `Ctrl` ou `Alt` com uma letra, número ou Espaço, ou uma tecla F. No macOS também vale `Command`, e `Alt` aparece como `Option`. Se outro programa já estiver usando a combinação, o atalho anterior continua valendo. O botão **Restaurar padrão** volta para `Ctrl+Espaço`.

Cada programa guarda o próprio atalho. Se você usa o FX Console no After Effects, o ConsolePR tem prioridade sobre o `Ctrl+Espaço`; troque o atalho de um dos dois para usar ambos.

As configurações ficam em `%APPDATA%\ConsolePR\config.json` no Windows e em `~/Library/Application Support/ConsolePR/config.json` no macOS, e são mantidas ao reinstalar ou atualizar.

O atalho só fica registrado enquanto o Premiere ou o After Effects está em primeiro plano, então a mesma combinação continua funcionando nos outros programas. Enquanto isso, ele tem prioridade sobre um atalho igual configurado no próprio programa.

## Mudar a cor de destaque

Na mesma tela da engrenagem, digite um código hexadecimal (como `#C64BF2`) ou clique no círculo colorido para abrir o seletor de cores. A cor muda na hora, fica salva junto com o atalho e vale para os dois programas. O botão **Padrão** volta para o roxo original.

## Como funciona

| Parte | Função |
| --- | --- |
| `extension/background` | Extensão invisível que inicia com o programa e controla o processo do atalho |
| `extension/helper/hotkey.ps1` | Windows: registra o atalho, tira a barra de título da janela, centraliza e dá foco ao campo de busca |
| `extension/helper/hotkey-mac.js` | macOS: script JXA, rodado pelo `osascript` do sistema, que avisa quando o atalho é pressionado |
| `extension/palette` | Janela de busca |
| `extension/palette/i18n.js` | Textos da janela em português e inglês |
| `extension/jsx/host.jsx` | Lista e aplica os efeitos: API QE no Premiere e `app.effects` no After Effects |

A API QE do Premiere não é documentada pela Adobe e pode mudar em versões futuras.

Problemas com o atalho ficam registrados em `consolepr.log`, na pasta temporária do sistema.

## Testes

```bash
node --test test/search.test.js test/hotkey.test.js test/color.test.js test/frame.test.js test/icons.test.js test/i18n.test.js test/keyframes.test.js
```
