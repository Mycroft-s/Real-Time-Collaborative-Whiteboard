package com.whiteboard.config;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import com.whiteboard.util.JwtUtil;

@Component
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {
    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        if (request instanceof ServletServerHttpRequest) {
            ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
            
            // Try to get token from query parameter
            String token = servletRequest.getServletRequest().getParameter("token");
            
            // If not in query, try from Authorization header
            if (token == null) {
                String authHeader = servletRequest.getServletRequest().getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    token = authHeader.substring(7);
                }
            }
            
            if (token != null && !token.isEmpty()) {
                try {
                    String username = jwtUtil.extractUsername(token);
                    if (username != null && jwtUtil.validateToken(token, username)) {
                        // Store token in attributes for later use
                        attributes.put("token", token);
                        attributes.put("username", username);
                        System.out.println("WebSocket handshake: Token found for user: " + username);
                        return true;
                    } else {
                        System.out.println("WebSocket handshake: Invalid token");
                    }
                } catch (Exception e) {
                    System.err.println("WebSocket handshake: Error validating token: " + e.getMessage());
                }
            } else {
                System.out.println("WebSocket handshake: No token provided");
            }
        }
        
        // Allow connection even without token (for debugging, can be restricted later)
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                WebSocketHandler wsHandler, Exception exception) {
        // Nothing to do after handshake
    }
}

