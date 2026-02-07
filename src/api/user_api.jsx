import { BACKEND_BASE_URL, API_ROUTES } from '../configs/backend_config';

/**
 * 模拟签名函数（因为您后端使用了签名验证）
 * 注意：您需要根据实际的签名逻辑实现这个函数
 */
const generateSignature = async (message) => {
    // 开发环境模拟签名
    console.log('生成消息签名:', message);
    
    // 在实际应用中，您需要实现真实的签名逻辑
    // 这里返回一个模拟签名以便测试
    return "mock_signature_for_development";
};

/**
 * 用户注册API
 * @param {Object} params - 注册参数
 * @param {string} params.username - 用户名
 * @param {string} params.email - 邮箱
 * @param {string} params.password - 密码
 * @param {string|number} params.graduation_year - 毕业年份
 * @param {number} timeout - 超时时间（毫秒），默认10000ms
 * @returns {Promise<Object>} 注册结果
 */
export const registerUser = async ({ username, email, password, graduation_year }, timeout = 10000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        // 构建请求体（不需要签名）
        const requestBody = {
            username: username.trim(),
            email: email.trim(),
            password: password,
            graduation_year: graduation_year.toString()
        };

        console.log('发送注册请求:', {
            url: `${BACKEND_BASE_URL}${API_ROUTES.REGISTER}`,
            data: requestBody
        });

        const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.REGISTER}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timer);
        
        if (!res.ok) {
            const text = await res.text().catch(() => null);
            let errorMessage = `注册失败: ${res.status}`;
            
            try {
                if (text) {
                    const errorData = JSON.parse(text);
                    if (errorData.error_message) {
                        errorMessage = errorData.error_message;
                    } else if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                }
            } catch (e) {
                if (text) errorMessage += ` - ${text}`;
            }
            
            throw new Error(errorMessage);
        }
        
        const result = await res.json();
        
        // 处理响应
        if (result.success === 1) {
            return {
                success: true,
                data: {
                    user_id: result.user_id,
                    username: result.username,
                    email: result.email,
                    graduation_year: result.graduation_year,
                    message: result.message || '注册成功'
                }
            };
        } else {
            throw new Error(result.error_message || '注册失败');
        }
        
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('注册请求超时');
        }
        throw err;
    }
};