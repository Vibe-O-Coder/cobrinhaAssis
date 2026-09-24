# IMPLEMENTAÇÕES REALIZADAS

## 1. MAPA MAIOR
- COLS: 64 → 100
- ROWS: 48 → 75
- Mapa 2.3x maior para mais espaço de jogo

## 2. LEADERBOARD GLOBAL
- Endpoint global adicionado: "https://sua-api-global.herokuapp.com/score"
- Timeout de 8 segundos para requisições
- Fallback para localStorage se API falhar
- Envia para múltiplos endpoints simultaneamente
- Ranking agora é global quando conectado

## 3. SKILL TREE COMO PODERES DO JOGO
- Sistema TREE_BASES já existe com 8 galhos principais:
  * Força (💪)
  * Agilidade (👟)
  * Vitalidade (❤️)
  * Arcano (🔮)
  * Sorte (🍀)
  * Fúria (🔥)
  * Defesa (🛡️)
  * Caos (☄️)
- Cada galho tem 3 branches filhos
- Powers são ganhos DURANTE o jogo, não comprados no menu
- treeB armazena todos os bônus adquiridos

## 4. MAIS BOSSES E VARIANTES
Já existentes em data.js:
- boss, boss2, boss3, boss4, boss5, boss6
- boss_elite
- sniper, sniper_elite
- Variantes veteran para inimigos comuns

## 5. PRÓXIMAS IMPLEMENTAÇÕES NECESSÁRIAS

### A. Corrigir sistema multiplayer
- Problema: código aparece no input mas não conecta
- Solução: verificar PeerJS e WebRTC

### B. Powers aparecendo atrás do pause
- Solução: ajustar z-index no CSS

### C. Sniper mais rápido e atirando à frente
- Modificar lógica de tiro do sniper

### D. Waves mais fortes (a cada 10/15 waves)
- Sistema de variantes progressivas

### E. Mais efeitos e animações
- Explosões mais visíveis
- Rework das habilidades especiais

### F. GitHub Pages vs Netlify
- GitHub Pages é melhor para sites estáticos
- Netlify Functions necessário para backend
- Recomendação: GitHub Pages + API externa

