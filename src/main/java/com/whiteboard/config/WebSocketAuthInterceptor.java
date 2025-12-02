package com.whiteboard.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import com.whiteboard.util.JwtUtil;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor != null) {
            // Handle CONNECT command - authenticate user
            if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                String token = null;
                
                // First, try to get from session attributes (set by handshake interceptor)
                if (accessor.getSessionAttributes() != null) {
                    token = (String) accessor.getSessionAttributes().get("token");
                }
                
                // Try to get token from Authorization header
                if (token == null) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        token = authHeader.substring(7);
                    }
                }
                
                // If not in header, try from query parameter (for SockJS compatibility)
                if (token == null) {
                    String query = accessor.getFirstNativeHeader("query");
                    if (query != null && query.contains("token=")) {
                        token = query.substring(query.indexOf("token=") + 6);
                        if (token.contains("&")) {
                            token = token.substring(0, token.indexOf("&"));
                        }
                    }
                }
                
                if (token != null && !token.isEmpty()) {
                    try {
                        String username = jwtUtil.extractUsername(token);
                        if (username != null && jwtUtil.validateToken(token, username)) {
                            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                            accessor.setUser(auth);
                            
                            // Store token in session for future messages
                            if (accessor.getSessionAttributes() != null) {
                                accessor.getSessionAttributes().put("token", token);
                            }
                            
                            System.out.println("WebSocket authenticated user: " + username);
                        } else {
                            System.out.println("Invalid JWT token for WebSocket connection");
                        }
                    } catch (Exception e) {
                        System.err.println("Error authenticating WebSocket connection: " + e.getMessage());
                    }
                } else {
                    System.out.println("No JWT token provided for WebSocket connection");
                }
            } 
            // For other commands (SEND, SUBSCRIBE, etc.), try to restore authentication from session
            else if (accessor.getUser() == null) {
                String token = null;
                
                // First try session attributes
                if (accessor.getSessionAttributes() != null) {
                    token = (String) accessor.getSessionAttributes().get("token");
                }
                
                // Also try from headers
                if (token == null) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        token = authHeader.substring(7);
                    }
                }
                
                if (token != null && !token.isEmpty()) {
                    try {
                        String username = jwtUtil.extractUsername(token);
                        if (username != null && jwtUtil.validateToken(token, username)) {
                            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                            accessor.setUser(auth);
                            System.out.println("Restored authentication for message: " + accessor.getCommand() + ", user: " + username);
                        }
                    } catch (Exception e) {
                        System.err.println("Error restoring authentication for " + accessor.getCommand() + ": " + e.getMessage());
                    }
                } else {
                    System.out.println("No token found for message: " + accessor.getCommand());
                }
            } else {
                // User already authenticated
                System.out.println("Message " + accessor.getCommand() + " from authenticated user: " + accessor.getUser().getName());
            }
        }
        
        return message;
    }
}

