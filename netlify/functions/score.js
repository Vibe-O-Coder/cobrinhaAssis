// Função serverless para leaderboard do Snake Roguelike Ultra
// Deploy: netlify deploy --prod

const fs = require('fs');
const path = require('path');

// Arquivo JSON para armazenar scores (em produção, usar banco de dados)
const DB_PATH = path.join(__dirname, 'scores.json');

// Carregar scores do arquivo
function loadScores() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Erro ao carregar scores:', e);
  }
  return [];
}

// Salvar scores no arquivo
function saveScores(scores) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(scores, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Erro ao salvar scores:', e);
    return false;
  }
}

// Handler principal
exports.handler = async (event, context) => {
  const { httpMethod, body, queryStringParameters } = event;
  
  // Headers CORS para permitir acesso de qualquer origem
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight OPTIONS request
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  // GET - Listar leaderboard
  if (httpMethod === 'GET') {
    const limit = parseInt(queryStringParameters?.limit || '50', 10);
    const scores = loadScores();
    
    // Ordenar por score (maior primeiro) e limitar
    const sorted = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, scores: sorted })
    };
  }
  
  // POST - Enviar novo score
  if (httpMethod === 'POST') {
    try {
      const data = JSON.parse(body);
      
      // Validação básica
      if (!data.name || typeof data.score !== 'number') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'Nome e score são obrigatórios' })
        };
      }
      
      // Limitar tamanho do nome
      const name = String(data.name).substring(0, 12).trim();
      const score = Math.floor(data.score);
      const wave = data.wave || 0;
      const kills = data.kills || 0;
      const cls = data.cls || 0;
      const timestamp = Date.now();
      
      // Carregar scores existentes
      const scores = loadScores();
      
      // Adicionar novo score
      scores.push({ name, score, wave, kills, cls, timestamp });
      
      // Manter apenas top 500 para não inflar o arquivo
      const trimmed = scores
        .sort((a, b) => b.score - a.score)
        .slice(0, 500);
      
      // Salvar
      if (saveScores(trimmed)) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            ok: true, 
            message: 'Score salvo com sucesso!',
            rank: trimmed.findIndex(s => s.timestamp === timestamp) + 1
          })
        };
      } else {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ ok: false, error: 'Erro ao salvar score' })
        };
      }
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'JSON inválido' })
      };
    }
  }
  
  // Método não suportado
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ ok: false, error: 'Método não suportado' })
  };
};
