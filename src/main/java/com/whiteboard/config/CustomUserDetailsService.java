package com.whiteboard.config;

import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.whiteboard.model.User;
import com.whiteboard.service.UserService;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    @Autowired
    private UserService userService;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // 通过原始用户名查找用户（UserService 会处理哈希查找）
        User user = userService.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        
        // 将 salt 和 hash 组合成 "salt:hash" 格式，供 CustomPasswordEncoder 使用
        String encodedPassword = user.getSalt() + ":" + user.getPassword();
        
        // 返回用户详情，注意这里返回的是原始用户名（用于 JWT 等），而不是哈希值
        return org.springframework.security.core.userdetails.User.builder()
            .username(username) // 使用原始用户名，而不是哈希值
            .password(encodedPassword) // 格式：salt:hash
            .authorities(new ArrayList<>())
            .build();
    }
}

