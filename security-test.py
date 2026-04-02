import requests
import time

# 安全测试
def test_security():
    base_url = 'http://localhost:3000'
    
    print("测试系统安全性...")
    
    # 1. 测试认证机制
    print("\n1. 测试认证机制")
    # 测试弱密码
    weak_passwords = ['123456', 'admin', 'password', '12345678', 'qwerty']
    for password in weak_passwords:
        auth_data = {
            'username': 'admin',
            'password': password
        }
        response = requests.post(f'{base_url}/api/auth/login', json=auth_data)
        if response.status_code == 200:
            print(f"  弱密码 '{password}' 登录成功，存在安全风险")
        else:
            print(f"  弱密码 '{password}' 登录失败，安全措施有效")
    
    # 2. 测试API访问控制
    print("\n2. 测试API访问控制")
    # 无token访问API
    response = requests.get(f'{base_url}/api/plugins')
    if response.status_code == 401:
        print("  无token访问API被拒绝，访问控制有效")
    else:
        print(f"  无token访问API成功，存在安全风险 (状态码: {response.status_code})")
    
    # 3. 测试输入验证
    print("\n3. 测试输入验证")
    # 测试SQL注入
    sql_injection_payloads = [
        'admin\' OR 1=1 --',
        'admin\' AND 1=2 --',
        '\' OR \'1\'=\'1'
    ]
    for payload in sql_injection_payloads:
        auth_data = {
            'username': payload,
            'password': 'admin123'
        }
        response = requests.post(f'{base_url}/api/auth/login', json=auth_data)
        if response.status_code == 200:
            print(f"  SQL注入攻击成功，存在安全风险: {payload}")
        else:
            print(f"  SQL注入攻击失败，输入验证有效: {payload}")
    
    # 4. 测试敏感信息泄露
    print("\n4. 测试敏感信息泄露")
    # 登录获取token
    auth_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    response = requests.post(f'{base_url}/api/auth/login', json=auth_data)
    if response.status_code == 200:
        token = response.json().get('token')
        headers = {'Authorization': f'Bearer {token}'}
        
        # 检查配置API是否泄露敏感信息
        response = requests.get(f'{base_url}/api/config', headers=headers)
        if response.status_code == 200:
            config_data = response.json()
            # 检查是否包含敏感信息
            sensitive_keys = ['password', 'secret', 'token', 'app_id', 'client_secret']
            for key in sensitive_keys:
                if key in str(config_data).lower():
                    print(f"  配置API可能泄露敏感信息: {key}")
            print("  配置API返回数据检查完成")
    
    # 5. 测试请求频率限制
    print("\n5. 测试请求频率限制")
    # 连续发送多个登录请求
    for i in range(10):
        auth_data = {
            'username': 'admin',
            'password': 'wrongpassword'
        }
        response = requests.post(f'{base_url}/api/auth/login', json=auth_data)
        if response.status_code == 429:
            print(f"  请求被频率限制，安全措施有效 (第{i+1}次请求)")
            break
        time.sleep(0.1)
    else:
        print("  未检测到请求频率限制，存在安全风险")
    
    print("\n安全测试完成")

if __name__ == "__main__":
    test_security()
