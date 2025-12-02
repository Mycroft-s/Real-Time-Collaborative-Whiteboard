package com.whiteboard.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.whiteboard.model.User;
import com.whiteboard.repository.UserRepository;
import com.whiteboard.util.HashUtil;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HashUtil hashUtil;

    public User register(String username, String password, String email) {
        // 检查用户名是否已存在（通过哈希值查找）
        String hashedUsername = hashUtil.hashUsername(username);
        if (userRepository.existsByUsername(hashedUsername)) {
            throw new RuntimeException("Username already exists");
        }
        if (email != null && userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already exists");
        }

        // 生成用户唯一的 salt
        String salt = hashUtil.generateSalt();
        
        // 使用 salt+pepper 哈希密码
        String hashedPassword = hashUtil.hashWithSaltAndPepper(password, salt);
        
        // 使用通用 salt+pepper 哈希用户名
        // hashedUsername 已经在上面计算了

        User user = new User();
        user.setUsername(hashedUsername); // 存储哈希后的用户名（用于查找）
        user.setOriginalUsername(username); // 存储原始用户名（用于显示）
        user.setPassword(hashedPassword); // 存储哈希后的密码
        user.setSalt(salt); // 存储 salt（用于密码验证）
        user.setEmail(email);
        return userRepository.save(user);
    }

    /**
     * 通过原始用户名查找用户
     * 需要遍历所有用户并验证用户名哈希
     */
    public Optional<User> findByUsername(String username) {
        String hashedUsername = hashUtil.hashUsername(username);
        return userRepository.findByUsername(hashedUsername);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    /**
     * 验证密码是否匹配
     * @param rawPassword 原始密码
     * @param user 用户对象（包含 salt 和哈希后的密码）
     * @return 是否匹配
     */
    public boolean validatePassword(String rawPassword, User user) {
        return hashUtil.verify(rawPassword, user.getSalt(), user.getPassword());
    }
}

