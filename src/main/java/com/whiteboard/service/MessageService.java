package com.whiteboard.service;

import com.whiteboard.model.Message;
import com.whiteboard.model.Room;
import com.whiteboard.model.User;
import com.whiteboard.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MessageService {
    @Autowired
    private MessageRepository messageRepository;

    public Message saveMessage(Room room, User user, String content) {
        Message message = new Message();
        message.setRoom(room);
        message.setUser(user);
        message.setContent(content);
        return messageRepository.save(message);
    }

    public List<Message> getRoomMessages(Room room) {
        return messageRepository.findByRoomOrderByTimestampAsc(room);
    }
}

