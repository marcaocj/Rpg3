const ServerController = require("../controllers/serverController");
const logger = require("../utils/logger");

class ServerManager {
  constructor(io, serverId = 1) {
    this.io = io;
    this.serverId = serverId;
    this.isRunning = false;
    this.updateInterval = null;
    this.setupComplete = false;
  }

  // Iniciar monitoramento do servidor
  start() {
    if (this.isRunning) {
      logger.warn("ServerManager já está rodando");
      return;
    }

    this.isRunning = true;
    logger.info(`Iniciando monitoramento do servidor ${this.serverId}`);

    // Configurar listeners apenas uma vez
    if (!this.setupComplete) {
      this.setupSocketListeners();
      this.setupComplete = true;
    }

    // Atualizar status do servidor a cada 30 segundos
    this.updateInterval = setInterval(() => {
      this.updateServerStatus();
    }, 30000);

    // Atualizar status inicial
    this.updateServerStatus();
  }

  // Parar monitoramento do servidor
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info(`Parando monitoramento do servidor ${this.serverId}`);

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Configurar listeners para eventos de socket
  setupSocketListeners() {
    // Log inicial da contagem
    logger.info(`Configurando listeners. Clientes atuais: ${this.getCurrentPlayerCount()}`);

    this.io.on("connection", (socket) => {
      const currentCount = this.getCurrentPlayerCount();
      logger.info(`Jogador conectado: ${socket.id}. Total: ${currentCount}`);

      socket.on("disconnect", (reason) => {
        // Aguardar um tick para a contagem ser atualizada
        setImmediate(() => {
          const currentCount = this.getCurrentPlayerCount();
          logger.info(`Jogador desconectado: ${socket.id} (${reason}). Total: ${currentCount}`);
        });
      });
    });
  }

  // Atualizar status do servidor no banco de dados
  async updateServerStatus() {
    try {
      const currentPlayerCount = this.getCurrentPlayerCount();
      await ServerController.updateServerStatus(this.serverId, "online", currentPlayerCount);
      
      logger.info(`Status do servidor ${this.serverId} atualizado: ${currentPlayerCount} jogadores`);
    } catch (error) {
      logger.error("Erro ao atualizar status do servidor:", error.message);
    }
  }

  // Obter contagem atual de jogadores - MÉTODO MAIS PRECISO
  getCurrentPlayerCount() {
    try {
      // Usar o método mais preciso: contar sockets no namespace principal
      const count = this.io.of("/").sockets.size;
      return count;
    } catch (error) {
      logger.error("Erro ao obter contagem de jogadores:", error.message);
      return 0;
    }
  }

  // Verificar se o servidor está ativo
  isActive() {
    return this.isRunning;
  }

  // Método para debug - listar todos os sockets conectados
  listConnectedSockets() {
    try {
      const sockets = Array.from(this.io.of("/").sockets.keys());
      logger.info(`Sockets conectados: ${sockets.join(", ")}`);
      return sockets;
    } catch (error) {
      logger.error("Erro ao listar sockets:", error.message);
      return [];
    }
  }
}

module.exports = ServerManager;