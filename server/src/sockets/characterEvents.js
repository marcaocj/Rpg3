const CharacterController = require('../controllers/characterController');
const PlayerController = require('../controllers/playerController');
const ServerController = require('../controllers/serverController');
const Monster = require('../models/Monster');
const logger = require('../utils/logger');

function getFallbackServers(io) {
  return [
    { id: 1, name: 'Server 1 - Gludin', status: 'online', playerCount: io.engine.clientsCount, maxPlayers: 1000 },
    { id: 2, name: 'Server 2 - Giran', status: 'online', playerCount: Math.floor(io.engine.clientsCount * 0.7), maxPlayers: 1000 },
    { id: 3, name: 'Server 3 - Dion', status: 'maintenance', playerCount: 0, maxPlayers: 1000 }
  ];
}

module.exports = (io, socket) => {
  // Buscar servidores disponíveis
  socket.on('get_servers', async () => {
    try {
      const result = await ServerController.getServers(io);
      
      if (result.success) {
        socket.emit('get_servers_response', [{
          success: true,
          servers: result.servers
        }]);
      } else {
        socket.emit('get_servers_response', [{
          success: true,
          servers: getFallbackServers(io)
        }]);
      }
    } catch (error) {
      logger.error('Erro no evento get_servers:', error.message);
      socket.emit('get_servers_response', [{
        success: true,
        servers: getFallbackServers(io)
      }]);
    }
  });

  // Criar personagem
  socket.on('create_character', async (data) => {
    console.log('Dados recebidos do cliente Unity:', data);

    try {
      if (!socket.accountId) {
        return socket.emit('create_character_response', [{
          success: false,
          error: 'Não autenticado'
        }]);
      }
      
      const { name, classe: characterClass, race } = data;
      
      if (!name || !characterClass || !race) {
        return socket.emit('create_character_response', [{
          success: false,
          error: 'Nome, classe e raça são obrigatórios'
        }]);
      }
      
      const result = await CharacterController.createCharacter(socket.accountId, name, characterClass, race);
      socket.emit('create_character_response', [result]);
    } catch (error) {
      logger.error('Erro no evento create_character:', error.message);
      socket.emit('create_character_response', [{
        success: false,
        error: 'Erro interno do servidor'
      }]);
    }
  });

  // Buscar personagens da conta
  socket.on('get_characters', async () => {
    try {
      if (!socket.accountId) {
        return socket.emit('get_characters_response', [{
          success: false,
          error: 'Não autenticado'
        }]);
      }
      
      const result = await CharacterController.getCharacters(socket.accountId);
      socket.emit('get_characters_response', [result]);
    } catch (error) {
      logger.error('Erro no evento get_characters:', error.message);
      socket.emit('get_characters_response', [{
        success: false,
        error: 'Erro interno do servidor'
      }]);
    }
  });

  // Selecionar personagem para jogar
  socket.on('select_character', async (data) => {
    try {
      if (!socket.accountId) {
        return socket.emit('select_character_response', [{
          success: false,
          error: 'Não autenticado'
        }]);
      }
      
      const { characterId } = data;
      
      if (!characterId) {
        return socket.emit('select_character_response', [{
          success: false,
          error: 'ID do personagem é obrigatório'
        }]);
      }
      
      const result = await CharacterController.selectCharacter(characterId);
      
      if (result.success) {
        socket.characterId = characterId;
        socket.character = result.character;
      }
      
      socket.emit('select_character_response', [result]);
    } catch (error) {
      logger.error('Erro no evento select_character:', error.message);
      socket.emit('select_character_response', [{
        success: false,
        error: 'Erro interno do servidor'
      }]);
    }
  });

  // NOVO: Entrar no mundo do jogo
  socket.on('enter_world', async (data) => {
    try {
      if (!socket.accountId) {
        return socket.emit('enter_world_response', [{
          success: false,
          error: 'Não autenticado'
        }]);
      }
      
      const { characterId } = data;
      
      if (!characterId) {
        return socket.emit('enter_world_response', [{
          success: false,
          error: 'ID do personagem é obrigatório'
        }]);
      }
      
      // Buscar dados do personagem
      const result = await PlayerController.getPlayer(characterId);
      
      if (result.success) {
        // Associar dados do personagem ao socket
        socket.characterId = characterId;
        socket.character = result.character;
        
        // Entrar na sala do mapa
        socket.join(result.character.map);
        
        // Buscar outros jogadores no mesmo mapa
        const nearbyPlayers = [];
        const socketsInRoom = await io.in(result.character.map).fetchSockets();
        
        for (const roomSocket of socketsInRoom) {
          if (roomSocket.id !== socket.id && roomSocket.character) {
            nearbyPlayers.push({
              characterId: roomSocket.character.id,
              name: roomSocket.character.name,
              classe: roomSocket.character.classe,
              race: roomSocket.character.race,
              level: roomSocket.character.level,
              pos_x: roomSocket.character.pos_x,
              pos_y: roomSocket.character.pos_y,
              pos_z: roomSocket.character.pos_z
            });
          }
        }

        // Buscar monstros no mapa
        const monsters = await Monster.findByMap(result.character.map);
        
        // Enviar confirmação para o cliente
        socket.emit('enter_world_response', [{
          success: true,
          character: result.character,
          spawnInfo: {
            x: result.character.pos_x,
            y: result.character.pos_y,
            z: result.character.pos_z,
            map: result.character.map,
            nearbyPlayers: nearbyPlayers,
            monsters: monsters
          }
        }]);
        
        // Notificar outros jogadores no mapa sobre o novo jogador
        socket.to(result.character.map).emit('player_joined', {
          characterId: result.character.id,
          name: result.character.name,
          classe: result.character.classe,
          race: result.character.race,
          level: result.character.level,
          pos_x: result.character.pos_x,
          pos_y: result.character.pos_y,
          pos_z: result.character.pos_z
        });
        
        logger.info(`Jogador ${result.character.name} entrou no mundo em ${result.character.map}`);
      } else {
        socket.emit('enter_world_response', [{
          success: false,
          error: result.error
        }]);
      }
      
    } catch (error) {
      logger.error('Erro no evento enter_world:', error.message);
      socket.emit('enter_world_response', [{
        success: false,
        error: 'Erro interno do servidor'
      }]);
    }
  });
};