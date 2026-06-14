import express from 'express';
import cors from 'cors';
import fs from 'fs';
import compression from 'compression';

const app = express();
app.use(compression()); 
app.use(cors());
app.use(express.json());

const BANCO_ARQUIVO = './foxyz_database.json';

// Função auxiliar para leitura segura do banco JSON
const lerBanco = () => {
  try {
    if (!fs.existsSync(BANCO_ARQUIVO)) {
      fs.writeFileSync(BANCO_ARQUIVO, JSON.stringify({ usuarios: {}, inventarios: {} }, null, 2));
    }
    const dados = fs.readFileSync(BANCO_ARQUIVO, 'utf-8');
    return JSON.parse(dados);
  } catch (error) {
    console.error("Erro ao ler banco de dados:", error);
    return { usuarios: {}, inventarios: {} };
  }
};

// Função auxiliar para salvar os dados no arquivo JSON
const salvarBanco = (dados) => {
  try {
    fs.writeFileSync(BANCO_ARQUIVO, JSON.stringify(dados, null, 2));
  } catch (error) {
    console.error("Erro ao salvar no banco de dados:", error);
  }
};

// ==========================================
// ROTA 1: INTERFACE VISUAL (HTML/CSS)
// ==========================================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>FoxyzMobile - Painel Online</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
            body { background: #0d0e12; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
            body::before { content: ''; position: absolute; width: 300px; height: 300px; background: #ff4a4a; border-radius: 50%; filter: blur(150px); top: 20%; left: 20%; }
            body::after { content: ''; position: absolute; width: 300px; height: 300px; background: #ff9900; border-radius: 50%; filter: blur(150px); bottom: 20%; right: 20%; }
            .login-container { background: rgba(20, 22, 28, 0.9); padding: 40px; border-radius: 16px; width: 100%; max-width: 400px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.08); backdrop-filter: blur(10px); z-index: 10; text-align: center; }
            h2 { font-size: 28px; margin-bottom: 8px; font-weight: 700; letter-spacing: 1px; }
            h2 span { color: #ff4a4a; }
            p.subtitle { color: #717684; font-size: 14px; margin-bottom: 30px; }
            .input-group { margin-bottom: 20px; text-align: left; }
            .input-group label { display: block; color: #a0a5b5; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; }
            .input-group input { width: 100%; padding: 14px; background: #181b23; border: 1px solid #2c313f; border-radius: 8px; color: #fff; font-size: 15px; }
            .btn-login { width: 100%; padding: 14px; background: linear-gradient(90deg, #ff4a4a, #ff764a); border: none; border-radius: 8px; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 10px; }
            #message-box { margin-top: 20px; padding: 12px; border-radius: 6px; font-size: 14px; display: none; }
            .error-msg { background: rgba(255, 74, 74, 0.15); border: 1px solid #ff4a4a; color: #ff6b6b; }
            .success-msg { background: rgba(46, 213, 115, 0.15); border: 1px solid #2ed573; color: #2ed573; }
        </style>
    </head>
    <body>
        <div class="login-container">
            <h2>FOXYZ<span>MOBILE</span></h2>
            <p class="subtitle">Servidor Nuvem 24/7 Ativo</p>
            <form id="loginForm">
                <div class="input-group">
                    <label>ID do Jogador</label>
                    <input type="text" id="jogadorId" placeholder="Ex: player_01" required>
                </div>
                <div class="input-group">
                    <label>Nickname (Novas Contas)</label>
                    <input type="text" id="nickname" placeholder="Ex: FoxyPro">
                </div>
                <button type="submit" class="btn-login" id="btnSubmit">ENTRAR NO SERVIDOR</button>
            </form>
            <div id="message-box"></div>
        </div>
        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const jogadorId = document.getElementById('jogadorId').value.trim();
                const nickname = document.getElementById('nickname').value.trim();
                const messageBox = document.getElementById('message-box');
                const btnSubmit = document.getElementById('btnSubmit');

                messageBox.style.display = "none";
                btnSubmit.innerText = "A CONECTAR...";
                btnSubmit.disabled = true;

                try {
                    const response = await fetch("/login", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jogadorId, nickname: nickname || null })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || "Erro na conexão.");

                    messageBox.className = "success-msg";
                    messageBox.innerText = data.status === "registrado" 
                        ? \`Sucesso! Conta criada para \${data.perfil.nickname}!\`
                        : \`Bem-vindo de volta \${data.perfil.nickname}!\`;
                    messageBox.style.display = "block";
                } catch (error) {
                    messageBox.className = "error-msg";
                    messageBox.innerText = error.message;
                    messageBox.style.display = "block";
                } finally {
                    btnSubmit.innerText = "ENTRAR NO SERVIDOR";
                    btnSubmit.disabled = false;
                }
            });
        </script>
    </body>
    </html>
  `);
});

// ==========================================
// ROTA 2: API DE LOGIN DO JOGO
// ==========================================
app.post('/login', (req, res) => {
  const { jogadorId, nickname } = req.body;
  if (!jogadorId) return res.status(400).json({ error: "O campo jogadorId é obrigatório." });

  let banco = lerBanco();

  if (!banco.usuarios[jogadorId]) {
    const novoNick = nickname || `Player_${jogadorId.substring(0, 5)}`;
    
    banco.usuarios[jogadorId] = {
      jogadorId,
      nickname: novoNick,
      nivel: 1,
      ouro: 1000,
      diamantes: 0,
      status: "No Lobby"
    };

    banco.inventarios[jogadorId] = {
      skins_armas: ["M4A1_Original"]
    };

    salvarBanco(banco);

    return res.status(201).json({
      status: "registrado",
      perfil: banco.usuarios[jogadorId]
    });
  }

  return res.status(200).json({
    status: "logado",
    perfil: banco.usuarios[jogadorId]
  });
});

// ==========================================
// ROTA 3: REDIRECIONAMENTO COM TOKEN DO FACEBOOK
// ==========================================
app.get('/v3.1/dialog/oauth', (req, res) => {
  const urlRetorno = req.query.redirect_uri || 'fbconnect://success';
  const tokenFalso = "access_token=foxyz_token_valido_999&expires_in=86400&state=" + (req.query.state || "");
  res.redirect(`${urlRetorno}#${tokenFalso}`);
});

// ==========================================
// ROTA 4: ENVIO DE DADOS DO PERFIL (ANTI-FECHAMENTO)
// ==========================================
// Essa rota responde quando o jogo tenta checar quem é o dono do Token que enviamos acima
app.get(['/v3.1/me', '/me'], (req, res) => {
  res.status(200).json({
    id: "100089123456789", // ID falso do perfil do Facebook exigido pelo jogo
    name: "Foxyz Player",   // Nome de exibição interno
    first_name: "Foxyz",
    last_name: "Player",
    picture: {
      data: {
        url: "https://graph.facebook.com/100089123456789/picture",
        is_silhouette: false
      }
    }
  });
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Servidor Foxyz Pro ativo com sucesso na porta ${PORT}`);
});
