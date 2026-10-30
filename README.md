# ConsolePR

Busca rápida de efeitos para o Adobe Premiere Pro, no estilo do FX Console: aperte um atalho, digite parte do nome e o efeito é aplicado aos clipes selecionados.

Testado no Premiere Pro 2026 (26.5.2) no Windows. O atalho global só existe no Windows. O manifesto aceita Premiere 22 ou superior, mas versões anteriores à 26.5 não foram testadas.

## Instalação

Você precisa de Windows e do Premiere Pro instalado. Não é preciso instalar mais nada.

1. Feche o Premiere.
2. Baixe o projeto: clique em **Code > Download ZIP** nesta página e extraia o arquivo em qualquer pasta. Se preferir usar o Git:

   ```bash
   git clone https://github.com/Kievy/consolePR.git
   ```

3. Abra o PowerShell na pasta do projeto (a que contém o `install.ps1`) e rode:

   ```bash
   powershell -ExecutionPolicy Bypass -File install.ps1
   ```

4. Abra o Premiere e aperte `Ctrl+Espaço` com ele em primeiro plano.

O instalador copia a extensão para `%APPDATA%\Adobe\CEP\extensions\com.consolepr`, então a pasta baixada pode ser apagada depois. Para atualizar, baixe a versão nova e repita os passos.

A extensão não é assinada, então o instalador também liga o `PlayerDebugMode` do CEP no registro do usuário. Sem isso, o Premiere não a carrega.

### Se não funcionar

- **O atalho não abre a janela:** veja se a extensão aparece em `Window > Extensions > ConsolePR` e confira o arquivo `%TEMP%\consolepr.log`. Outro programa pode já estar usando a mesma combinação; nesse caso, [troque o atalho](#trocar-o-atalho).
- **A extensão não aparece no menu:** confirme que o Premiere foi reiniciado depois da instalação.

### Desinstalar

Com o Premiere fechado, rode na pasta do projeto:

```bash
powershell -ExecutionPolicy Bypass -File uninstall.ps1
```

## Uso

1. Selecione um ou mais clipes na timeline.
2. Aperte `Ctrl+Espaço` com o Premiere em primeiro plano.
3. Digite parte do nome. Acentos e maiúsculas são ignorados, e letras em sequência também funcionam (`gblur` encontra Gaussian Blur).
4. Use `Enter` ou clique para aplicar. `↑`/`↓` navegam, `Esc`, clicar fora ou repetir o atalho fecham a janela.

Efeitos de vídeo vão só para clipes de vídeo, e efeitos de áudio só para clipes de áudio. Os nomes aparecem como o Premiere os informa ao script, em inglês mesmo com a busca em português.

A janela também abre em `Window > Extensions > ConsolePR`.

## Trocar o atalho

Edite `hotkey` em `%APPDATA%\Adobe\CEP\extensions\com.consolepr\config.json` e reinicie o Premiere. Exemplos: `Ctrl+Space`, `Ctrl+Shift+F`, `Alt+F2`.

O atalho só fica registrado enquanto o Premiere está em primeiro plano, então a mesma combinação continua funcionando nos outros programas. Enquanto isso, ele tem prioridade sobre um atalho igual configurado no próprio Premiere.

## Como funciona

| Parte | Função |
| --- | --- |
| `extension/background` | Extensão invisível que inicia com o Premiere e controla o processo do atalho |
| `extension/helper/hotkey.ps1` | Registra o atalho, tira a barra de título da janela, centraliza e dá foco ao campo de busca |
| `extension/palette` | Janela de busca |
| `extension/jsx/host.jsx` | Lista e aplica os efeitos pela API QE do Premiere |

A API QE não é documentada pela Adobe e pode mudar em versões futuras do Premiere.

Problemas com o atalho ficam registrados em `%TEMP%\consolepr.log`.

## Testes

```bash
node --test test/search.test.js
```
