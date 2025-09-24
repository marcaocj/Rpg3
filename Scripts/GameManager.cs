using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using SocketIOClient;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance;
    
    public GameObject playerPrefab;
    public GameObject enemyPrefab;
    
    private Dictionary<string, GameObject> players = new Dictionary<string, GameObject>();
    private Dictionary<string, GameObject> enemies = new Dictionary<string, GameObject>();

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    void Start()
    {
        SetupGameEvents();
    }

    void SetupGameEvents()
    {
        SocketIOManager.Instance.On("player_joined", (response) =>
        {
            var data = SocketIOManager.GetData<PlayerJoinedData>(response);
            SpawnPlayer(data.characterId, data.name, data.posX, data.posY, data.posZ);
        });
        
        SocketIOManager.Instance.On("player_left", (response) =>
        {
            var data = SocketIOManager.GetData<PlayerLeftData>(response);
            RemovePlayer(data.characterId);
        });
        
        SocketIOManager.Instance.On("player_moved", (response) =>
        {
            var data = SocketIOManager.GetData<PlayerMovedData>(response);
            MovePlayer(data.characterId, data.posX, data.posY, data.posZ);
        });
        
        SocketIOManager.Instance.On("combat_update", (response) =>
        {
            var data = SocketIOManager.GetData<CombatUpdateData>(response);
            HandleCombatUpdate(data);
        });
    }

    void SpawnPlayer(string characterId, string name, float x, float y, float z)
    {
        if (!players.ContainsKey(characterId))
        {
            Vector3 position = new Vector3(x, y, z);
            GameObject playerObj = Instantiate(playerPrefab, position, Quaternion.identity);
            players.Add(characterId, playerObj);
            
            // Configurar nome do jogador - método alternativo sem PlayerController
            SetPlayerName(playerObj, name);
        }
    }

    // Método alternativo para definir nome do jogador
    void SetPlayerName(GameObject playerObj, string name)
    {
        // Você pode implementar sua própria lógica para mostrar o nome
        // Por exemplo, usando UI sobre a cabeça do personagem
        Debug.Log("Jogador " + name + " spawnado");
        
        // Se quiser usar TextMeshPro, certifique-se de ter o componente no prefab
        var textMesh = playerObj.GetComponentInChildren<TMPro.TextMeshPro>();
        if (textMesh != null)
        {
            textMesh.text = name;
        }
    }

    void RemovePlayer(string characterId)
    {
        if (players.ContainsKey(characterId))
        {
            Destroy(players[characterId]);
            players.Remove(characterId);
        }
    }

    void MovePlayer(string characterId, float x, float y, float z)
    {
        if (players.ContainsKey(characterId))
        {
            Vector3 position = new Vector3(x, y, z);
            players[characterId].transform.position = position;
        }
    }

    void HandleCombatUpdate(CombatUpdateData data)
    {
        Debug.Log($"Combate: {data.result} - Dano: {data.damage}");
        // Implementar efeitos visuais de combate
    }

    public void MoveToPosition(float x, float y, float z)
    {
        var moveData = new MoveRequest
        {
            posX = x,
            posY = y,
            posZ = z,
            map = "village_of_gludin" // Mapa padrão
        };
        
        SocketIOManager.Instance.Emit("move", moveData);
    }

    public void AttackTarget(string targetId, string targetType)
    {
        var attackData = new AttackRequest
        {
            targetId = targetId,
            targetType = targetType
        };
        
        SocketIOManager.Instance.Emit("attack", attackData);
    }

    [System.Serializable]
    public class PlayerJoinedData
    {
        public string characterId;
        public string name;
        public string classe;
        public string race;
        public int level;
        public float posX;
        public float posY;
        public float posZ;
    }

    [System.Serializable]
    public class PlayerLeftData
    {
        public string characterId;
        public string name;
    }

    [System.Serializable]
    public class PlayerMovedData
    {
        public string characterId;
        public float posX;
        public float posY;
        public float posZ;
        public string map;
    }

    [System.Serializable]
    public class CombatUpdateData
    {
        public string attackerId;
        public string targetId;
        public string targetType;
        public string result;
        public int damage;
        public bool isCritical;
        public int monsterHp;
    }

    [System.Serializable]
    public class MoveRequest
    {
        public float posX;
        public float posY;
        public float posZ;
        public string map;
    }

    [System.Serializable]
    public class AttackRequest
    {
        public string targetId;
        public string targetType;
    }

}
