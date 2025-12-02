package com.whiteboard.dto;

public class ChatMessage {
    private String roomId;
    private String content;
    private String username;

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    @Override
    public String toString() {
        return "ChatMessage{roomId='" + roomId + "', username='" + username + "', content='" + content + "'}";
    }
}

