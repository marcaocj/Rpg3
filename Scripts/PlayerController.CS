using UnityEngine;
using TMPro;

public class PlayerController : MonoBehaviour
{
    [Header("Player Settings")]
    public float moveSpeed = 5f;
    public float rotationSpeed = 10f;
    
    [Header("UI References")]
    public TextMeshPro nameTag;
    
    private CharacterController characterController;
    private Vector3 movement;
    
    void Awake()
    {
        characterController = GetComponent<CharacterController>();
        
        if (nameTag == null)
        {
            // Tenta encontrar o nameTag nos filhos
            nameTag = GetComponentInChildren<TextMeshPro>();
        }
    }
    
    void Update()
    {
        // Movimento básico (pode ser substituído por clique para mover)
        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");
        
        movement = new Vector3(horizontal, 0f, vertical) * moveSpeed * Time.deltaTime;
        
        if (movement.magnitude > 0)
        {
            // Rotacionar na direção do movimento
            Quaternion targetRotation = Quaternion.LookRotation(movement.normalized);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, rotationSpeed * Time.deltaTime);
            
            // Mover
            characterController.Move(movement);
            
            // Notificar servidor do movimento
            SocketIOManager.Instance.Emit("move", new 
            {
                posX = transform.position.x,
                posY = transform.position.y,
                posZ = transform.position.z,
                map = "village_of_gludin"
            });
        }
    }
    
    public void SetPlayerName(string name)
    {
        if (nameTag != null)
        {
            nameTag.text = name;
        }
    }
    
    public void MoveToPosition(Vector3 position)
    {
        transform.position = position;
        
        // Notificar servidor
        SocketIOManager.Instance.Emit("move", new 
        {
            posX = position.x,
            posY = position.y,
            posZ = position.z,
            map = "village_of_gludin"
        });
    }
}