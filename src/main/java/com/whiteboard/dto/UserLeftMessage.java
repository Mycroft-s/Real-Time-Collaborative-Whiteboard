package com.whiteboard.dto;

import java.util.List;

public class UserLeftMessage {
    private String username;
    private String roomId;
    private List<UserPresence> users;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public List<UserPresence> getUsers() {
        return users;
    }

    public void setUsers(List<UserPresence> users) {
        this.users = users;
    }
}

