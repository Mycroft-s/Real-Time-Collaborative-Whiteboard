package com.whiteboard.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.whiteboard.model.Operation;
import com.whiteboard.model.Room;
import com.whiteboard.model.User;
import com.whiteboard.service.MessageService;
import com.whiteboard.service.OperationService;
import com.whiteboard.service.RoomService;
import com.whiteboard.service.SnapshotService;
import com.whiteboard.service.UserService;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {
    @Autowired
    private RoomService roomService;

    @Autowired
    private OperationService operationService;

    @Autowired
    private UserService userService;

    @Autowired
    private SnapshotService snapshotService;

    @Autowired
    private MessageService messageService;

    @PostMapping("/create")
    public ResponseEntity<?> createRoom(@RequestBody Map<String, String> request, Authentication authentication) {
        String name = request.get("name");
        String username = authentication.getName();
        
        User user = userService.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        Room room = roomService.createRoom(name, user);
        
        Map<String, Object> response = new HashMap<>();
        response.put("roomId", room.getRoomId());
        response.put("name", room.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<?> getRoom(@PathVariable String roomId) {
        Room room = roomService.findByRoomId(roomId)
            .orElseThrow(() -> new RuntimeException("Room not found"));
        
        Map<String, Object> response = new HashMap<>();
        response.put("roomId", room.getRoomId());
        response.put("name", room.getName());
        response.put("owner", room.getOwner().getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/list")
    public ResponseEntity<?> listRooms() {
        List<Room> rooms = roomService.findAllRooms();
        List<Map<String, Object>> roomList = rooms.stream().map(room -> {
            Map<String, Object> roomMap = new HashMap<>();
            roomMap.put("roomId", room.getRoomId());
            roomMap.put("name", room.getName());
            roomMap.put("owner", room.getOwner().getUsername());
            return roomMap;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(roomList);
    }

    @PostMapping("/{roomId}/save")
    public ResponseEntity<?> saveSnapshot(@PathVariable String roomId, @RequestBody Map<String, String> request, Authentication authentication) {
        try {
            if (authentication == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
            }
            
            Room room = roomService.findByRoomId(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));
            
            String imageData = request.get("imageData");
            if (imageData == null || imageData.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Image data is required"));
            }
            
            snapshotService.saveSnapshot(room, imageData);
            System.out.println("Snapshot saved for room: " + roomId + " by user: " + authentication.getName());
            
            return ResponseEntity.ok(Map.of("success", true, "message", "Snapshot saved successfully"));
        } catch (RuntimeException e) {
            System.err.println("Error saving snapshot: " + e.getMessage());
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.err.println("Unexpected error saving snapshot: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal server error: " + e.getMessage()));
        }
    }

    @GetMapping("/{roomId}/snapshot")
    public ResponseEntity<?> getLatestSnapshot(@PathVariable String roomId) {
        Room room = roomService.findByRoomId(roomId)
            .orElseThrow(() -> new RuntimeException("Room not found"));
        
        return snapshotService.getLatestSnapshot(room)
            .map(snapshot -> {
                Map<String, Object> response = new HashMap<>();
                response.put("imageData", snapshot.getImageData());
                response.put("createdAt", snapshot.getCreatedAt().toString());
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.ok(Map.of("imageData", "", "createdAt", "")));
    }

    @GetMapping("/{roomId}/operations")
    public ResponseEntity<?> getOperations(@PathVariable String roomId, @RequestParam(required = false) Long afterSequence) {
        Room room = roomService.findByRoomId(roomId)
            .orElseThrow(() -> new RuntimeException("Room not found"));
        
        List<Operation> operations = operationService.getRoomOperations(room);
        
        // If afterSequence is provided, only return operations after that sequence
        if (afterSequence != null && afterSequence > 0) {
            operations = operations.stream()
                .filter(op -> op.getSequenceNumber() > afterSequence)
                .collect(Collectors.toList());
        }
        
        List<Map<String, Object>> operationList = operations.stream().map(op -> {
            Map<String, Object> opMap = new HashMap<>();
            opMap.put("type", op.getOperationType());
            opMap.put("data", op.getOperationData());
            opMap.put("sequence", op.getSequenceNumber());
            return opMap;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(operationList);
    }

    @GetMapping("/{roomId}/messages")
    public ResponseEntity<?> getMessages(@PathVariable String roomId) {
        Room room = roomService.findByRoomId(roomId)
            .orElseThrow(() -> new RuntimeException("Room not found"));
        
        List<com.whiteboard.model.Message> messages = messageService.getRoomMessages(room);
        // Filter out messages without valid user and map to response
        List<Map<String, Object>> messageList = messages.stream()
            .filter(msg -> msg.getUser() != null && msg.getUser().getUsername() != null)
            .map(msg -> {
                Map<String, Object> msgMap = new HashMap<>();
                msgMap.put("username", msg.getUser().getUsername());
                msgMap.put("content", msg.getContent());
                msgMap.put("timestamp", msg.getTimestamp() != null ? msg.getTimestamp().toString() : "");
                return msgMap;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(messageList);
    }
}

