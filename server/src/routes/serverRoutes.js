const express = require("express");
const ServerController = require("../controllers/serverController");
const logger = require("../utils/logger");

const router = express.Router();

// Obter lista de todos os servidores
router.get("/servers", async (req, res) => {
  try {
    const result = await ServerController.getServers(req.io);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error("Erro na rota /servers:", error.message);
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

// Obter informações de um servidor específico
router.get("/servers/:id", async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const result = await ServerController.isServerAvailable(serverId);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error("Erro na rota /servers/:id:", error.message);
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

// Atualizar status de um servidor (apenas para administradores)
router.put("/servers/:id/status", async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const { status, playerCount } = req.body;
    
    const result = await ServerController.updateServerStatus(serverId, status, playerCount);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error("Erro na rota PUT /servers/:id/status:", error.message);
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

// Criar novo servidor (apenas para administradores)
router.post("/servers", async (req, res) => {
  try {
    const { name, maxPlayers, status } = req.body;
    
    if (!name || !maxPlayers) {
      return res.status(400).json({ 
        success: false, 
        error: "Nome e máximo de jogadores são obrigatórios" 
      });
    }
    
    const result = await ServerController.createServer(name, maxPlayers, status);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error("Erro na rota POST /servers:", error.message);
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

module.exports = router;
