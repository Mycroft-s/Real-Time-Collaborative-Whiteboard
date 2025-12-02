package com.whiteboard.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.whiteboard.util.HashUtil;

/**
 * 自定义密码编码器，支持 salt+pepper 哈希验证
 * 密码格式：salt:hash（Base64 编码）
 */
@Component
public class CustomPasswordEncoder implements PasswordEncoder {
    
    @Autowired
    private HashUtil hashUtil;
    
    @Override
    public String encode(CharSequence rawPassword) {
        // 这个方法不应该被直接调用，因为我们使用 UserService 来处理注册
        // 但为了兼容性，我们仍然实现它
        String salt = hashUtil.generateSalt();
        String hash = hashUtil.hashWithSaltAndPepper(rawPassword.toString(), salt);
        return salt + ":" + hash;
    }
    
    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        // encodedPassword 格式：salt:hash
        if (encodedPassword == null || !encodedPassword.contains(":")) {
            return false;
        }
        
        String[] parts = encodedPassword.split(":", 2);
        if (parts.length != 2) {
            return false;
        }
        
        String salt = parts[0];
        String hash = parts[1];
        
        return hashUtil.verify(rawPassword.toString(), salt, hash);
    }
}

