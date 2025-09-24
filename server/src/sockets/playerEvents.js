const PlayerController = require('../controllers/playerController');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  // Mover jogador
  socket.on('move', async (data, callback) => {
    try {
      if (!socket.characterId) {
        return callback({ success: false, error: 'Personagem não selecionado' });
      }
      
      const { posX, posY, posZ, map } = data;
      
      if (posX === undefined || posY === undefined || posZ === undefined) {
        return callback({ success: false, error: 'Posição inválida' });
      }
      
      const result = await PlayerController.movePlayer(socket.characterId, posX, posY, posZ, map);
      
      if (result.success) {
        // Notificar outros jogadores no mesmo mapa
        socket.to(socket.character.map).emit('player_moved', {
          characterId: socket.characterId,
          posX,
          posY,
          posZ,
          map
        });
        
        // Atualizar mapa do personagem no socket se necessário
        if (map && map !== socket.character.map) {
          socket.leave(socket.character.map);
          socket.join(map);
          socket.character.map = map;
        }
      }
      
      callback(result);
    } catch (error) {
      logger.error('Erro no evento move:', error.message);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // Atualizar status do jogador
  socket.on('player_update', async (data, callback) => {
    try {
      if (!socket.characterId) {
        return callback({ success: false, error: 'Personagem não selecionado' });
      }
      
      const { stats } = data;
      
      if (!stats) {
        return callback({ success: false, error: 'Stats são obrigatórios' });
      }
      
      const result = await PlayerController.updatePlayerStats(socket.characterId, stats);
      
      if (result.success) {
        // Notificar outros jogadores no mesmo mapa se necessário
        if (stats.hp !== undefined) {
          socket.to(socket.character.map).emit('player_stats_updated', {
            characterId: socket.characterId,
            stats
          });
        }
      }
      
      callback(result);
    } catch (error) {
      logger.error('Erro no evento player_update:', error.message);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });
};