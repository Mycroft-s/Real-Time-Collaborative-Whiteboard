package com.whiteboard.util;

import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 用于处理 salt+pepper 哈希的工具类
 * Salt: 每个用户唯一的随机值
 * Pepper: 应用级别的密钥（存储在配置文件中）
 */
@Component
public class HashUtil {
    
    private static final int SALT_LENGTH = 32; // 256 bits
    private static final int ITERATIONS = 100000; // PBKDF2 迭代次数
    private static final int KEY_LENGTH = 256; // 256 bits
    
    @Value("${app.pepper:defaultPepperKeyChangeInProduction}")
    private String pepper;
    
    @Value("${app.username.salt:UsernameSaltKey2023ChangeInProduction}")
    private String usernameSalt; // 用于用户名的通用 salt（便于查找）
    
    /**
     * 生成随机 salt
     */
    public String generateSalt() {
        SecureRandom random = new SecureRandom();
        byte[] salt = new byte[SALT_LENGTH];
        random.nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }
    
    /**
     * 使用 salt+pepper 对数据进行哈希
     * @param data 要哈希的数据（用户名或密码）
     * @param salt Base64 编码的 salt
     * @return Base64 编码的哈希值
     */
    public String hashWithSaltAndPepper(String data, String salt) {
        try {
            byte[] saltBytes = Base64.getDecoder().decode(salt);
            
            // 将 pepper 添加到数据中
            String dataWithPepper = data + pepper;
            
            // 使用 PBKDF2 进行哈希
            PBEKeySpec spec = new PBEKeySpec(
                dataWithPepper.toCharArray(),
                saltBytes,
                ITERATIONS,
                KEY_LENGTH
            );
            
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            byte[] hash = factory.generateSecret(spec).getEncoded();
            
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new RuntimeException("哈希处理失败", e);
        }
    }
    
    /**
     * 验证数据是否匹配哈希值
     * @param data 原始数据
     * @param salt Base64 编码的 salt
     * @param hash Base64 编码的哈希值
     * @return 是否匹配
     */
    public boolean verify(String data, String salt, String hash) {
        String computedHash = hashWithSaltAndPepper(data, salt);
        return computedHash.equals(hash);
    }
    
    /**
     * 哈希用户名（使用通用 salt，便于查找）
     * @param username 原始用户名
     * @return Base64 编码的哈希值
     */
    public String hashUsername(String username) {
        // 将通用 salt 编码为 Base64 格式
        String saltBase64 = Base64.getEncoder().encodeToString(usernameSalt.getBytes());
        return hashWithSaltAndPepper(username, saltBase64);
    }
    
    /**
     * 验证用户名是否匹配
     * @param username 原始用户名
     * @param hash Base64 编码的哈希值
     * @return 是否匹配
     */
    public boolean verifyUsername(String username, String hash) {
        String computedHash = hashUsername(username);
        return computedHash.equals(hash);
    }
}

