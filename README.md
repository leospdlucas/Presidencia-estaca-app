# Painel da Presidência da Estaca

Aplicativo web (PWA) para a presidência da estaca, os secretários e os
administradores. Funciona no navegador e pode ser instalado no celular.

## Antes do primeiro deploy (obrigatório)

No Netlify, abra **Site configuration → Environment variables** e crie:

| Variável | O que é | Exemplo |
|---|---|---|
| `AUTH_SECRET` | Chave secreta que assina os logins. Mínimo de 32 caracteres aleatórios. Se for trocada, todos precisam entrar de novo. | gere com `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `ADMIN_BOOTSTRAP_PIN` | PIN de 6 a 10 dígitos usado **só** no primeiro acesso, para criar os usuários. Deixa de funcionar assim que existir um administrador. | `482915` |

Sem `AUTH_SECRET`, o login mostra a mensagem "Servidor sem AUTH_SECRET configurado".

## Primeiro acesso

1. Abra o site. Na tela de login escolha **Configuração inicial (admin)** e digite o `ADMIN_BOOTSTRAP_PIN`.
2. Crie o seu usuário como **Administrador** com um PIN pessoal. O acesso de configuração inicial é encerrado nesse momento.
3. Entre com o seu usuário e crie os demais (presidente, conselheiros, secretários).
4. Entregue cada PIN pessoalmente e peça que a pessoa use **Trocar meu PIN** no primeiro acesso.
5. Em **Importar lista de membros**, envie o CSV exportado do LCR (ou o JSON antigo) para reativar a sugestão de nomes.

## O que o painel faz

| Grupo | Abas |
|---|---|
| Presidência | Deveres do presidente, conselheiros e secretários (Manual Geral cap. 6) |
| Planejamento | **Acompanhamento** (o que está atrasado), Agenda, Designações, Reuniões/atas com pauta sugerida por tipo (29.3), Calendário, **Conferência de Estaca** (29.3.1), **Discursos** da estaca nas alas (6.5.1), **Vamos dividir a Estaca** (requisitos do cap. 36, simulador e metas; só totais agregados) |
| Pessoas | **Chamados**, desobrigações e ordenações (30.8, 18.10), **Missionários**, **Líderes** (proteção de crianças e jovens, 30.2), Organograma do sumo conselho |
| Referência | Sumo sacerdotes, Ordenanças, Notas, Como usar |

## Modo demonstrativo

Para apresentar o painel sem expor dados reais: botão **Ver demonstração** na tela de login ou endereço `/?demo=1`.

- Uma estaca fictícia completa (todas as abas preenchidas, datas relativas ao dia de hoje).
- Nenhuma chamada `/api/*` sai do navegador; as respostas vêm de um servidor em memória (`js/demo.js`).
- Alterações ficam no `sessionStorage` da aba e somem ao fechá-la. A fila offline real não é enviada.
- Nomes reais escritos no HTML (presidência, estaca, alas) são trocados na tela.

## Segurança

- Todas as rotas `/api/*` exigem login. Sem login não se lê nem se grava nada.
- PINs são guardados apenas como hash (scrypt). Cinco PINs errados bloqueiam o usuário por 15 minutos.
- Trocar ou redefinir um PIN encerra as sessões daquela pessoa em todos os aparelhos.
- As APIs não liberam acesso a outros sites (sem CORS).
- Gravações são atômicas: duas pessoas salvando ao mesmo tempo não apagam o trabalho uma da outra.
- **Não registre** no painel conteúdo de entrevistas, assuntos de dignidade ou deliberações de conselhos de condição de membro.

## Desenvolvimento

```bash
npm install
npm test            # testes das APIs
npm run build       # gera dist/
node scripts/dev.mjs   # servidor local em http://localhost:8888 (PIN inicial 123456, dados em memória)
```

Estrutura:

- `index.html` — marcação das telas
- `css/` — estilos
- `js/` — scripts do app (cada arquivo cuida de uma área)
- `netlify/functions/` — APIs (uma por arquivo, rota em `config.path`)
- `netlify/lib/` — autenticação, gravação atômica e fábrica de APIs
- Novos módulos se registram com `registrarAba()` (carga e botão +) e `registrarBusca()` (busca global)
- `scripts/build.mjs` — copia para `dist/` e versiona CSS/JS e o service worker
