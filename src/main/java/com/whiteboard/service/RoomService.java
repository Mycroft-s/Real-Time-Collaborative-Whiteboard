package com.whiteboard.service;

import com.whiteboard.model.Room;
import com.whiteboard.model.User;
import com.whiteboard.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class RoomService {
    @Autowired
    private RoomRepository roomRepository;

    public Room createRoom(String name, User owner) {
        Room room = new Room();
        room.setRoomId(UUID.randomUUID().toString());
        room.setName(name);
        room.setOwner(owner);
        return roomRepository.save(room);
    }

    public Optional<Room> findByRoomId(String roomId) {
        return roomRepository.findByRoomId(roomId);
    }

    public List<Room> findAllRooms() {
        return roomRepository.findAll();
    }

    public Room save(Room room) {
        return roomRepository.save(room);
    }
}

