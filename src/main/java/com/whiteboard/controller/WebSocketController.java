package com.whiteboard.controller;

import java.security.Principal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.whiteboard.dto.ChatMessage;
import com.whiteboard.dto.CursorMessage;
import com.whiteboard.dto.DrawMessage;
import com.whiteboard.dto.JoinMessage;
import com.whiteboard.dto.LeaveMessage;
import com.whiteboard.dto.UserJoinedMessage;
import com.whiteboard.dto.UserLeftMessage;
import com.whiteboard.dto.UserPresence;
import com.whiteboard.model.Operation;
import com.whiteboard.model.Room;
import com.whiteboard.model.User;
import com.whiteboard.service.MessageService;
import com.whiteboard.service.OperationService;
import com.whiteboard.service.RoomService;
import com.whiteboard.service.UserService;

@Controller
public class WebSocketController {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private RoomService roomService;

    @Autowired
    private OperationService operationService;

    @Autowired
    private MessageService messageService;

    @Autowired
    private UserService userService;

    private final Map<String, Map<String, UserPresence>> roomUsers = new ConcurrentHashMap<>();

    @MessageMapping("/draw")
    @SendTo("/topic/draw")
    public DrawMessage handleDraw(DrawMessage message, Principal principal) {
        if (principal != null) {
            String username = principal.getName();
            System.out.println("Received draw operation from user: " + username + ", room: " + message.getRoomId() + ", type: " + message.getType());
            userService.findByUsername(username).ifPresent(user -> {
                Room room = roomService.findByRoomId(message.getRoomId())
                    .orElseThrow(() -> new RuntimeException("Room not found"));
                Operation savedOp = operationService.saveOperation(room, user, message.getType(), message.getData());
                System.out.println("Operation saved successfully: ID=" + savedOp.getId() + ", Sequence=" + savedOp.getSequenceNumber() + ", Type=" + savedOp.getOperationType());
            });
            message.setUsername(username);
        } else {
            System.out.println("WARNING: Received draw operation without principal!");
        }
        return message;
    }

    @MessageMapping("/join")
    public void handleJoin(JoinMessage message, Principal principal) {
        if (principal != null) {
            String username = principal.getName();
            String roomId = message.getRoomId();
            
            userService.findByUsername(username).ifPresent(user -> {
                roomUsers.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>())
                    .put(username, new UserPresence(username, user.getId()));
                
                UserJoinedMessage joinedMsg = new UserJoinedMessage();
                joinedMsg.setUsername(username);
                joinedMsg.setRoomId(roomId);
                joinedMsg.setUsers(roomUsers.get(roomId).values().stream().toList());
                
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/users", joinedMsg);
            });
        }
    }

    @MessageMapping("/leave")
    public void handleLeave(LeaveMessage message, Principal principal) {
        if (principal != null) {
            String username = principal.getName();
            String roomId = message.getRoomId();
            
            Map<String, UserPresence> users = roomUsers.get(roomId);
            if (users != null) {
                users.remove(username);
                
                UserLeftMessage leftMsg = new UserLeftMessage();
                leftMsg.setUsername(username);
                leftMsg.setRoomId(roomId);
                leftMsg.setUsers(users.values().stream().toList());
                
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/users", leftMsg);
            }
        }
    }

    @MessageMapping("/chat")
    @SendTo("/topic/chat")
    public ChatMessage handleChat(ChatMessage message, Principal principal) {
        System.out.println("Received chat message - Principal: " + (principal != null ? principal.getName() : "null") + 
                          ", Room: " + message.getRoomId() + ", Content: " + message.getContent());
        
        if (principal == null) {
            System.out.println("ERROR: Received chat message without principal! Rejecting message.");
            throw new RuntimeException("Authentication required");
        }
        
        String username = principal.getName();
        User user = userService.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));
        
        Room room = roomService.findByRoomId(message.getRoomId())
            .orElseThrow(() -> new RuntimeException("Room not found"));
        
        messageService.saveMessage(room, user, message.getContent());
        System.out.println("Chat message saved and broadcasting: " + username + " -> " + message.getContent());
        
        message.setUsername(username);
        System.out.println("Broadcasting chat message to /topic/chat: " + message);
        return message;
    }

    @MessageMapping("/cursor")
    @SendTo("/topic/cursor")
    public CursorMessage handleCursor(CursorMessage message, Principal principal) {
        if (principal != null) {
            message.setUsername(principal.getName());
        } else {
            message.setUsername("anonymous");
        }
        return message;
    }
}

