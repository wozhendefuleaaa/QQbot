import requests
import time

# 测试后端API功能
def test_backend_api():
    base_url = 'http://localhost:3000'
    
    # 1. 测试认证API
    print("测试认证API...")
    auth_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    response = requests.post(f'{base_url}/api/auth/login', json=auth_data)
    print(f"登录API响应: {response.status_code}")
    
    if response.status_code == 200:
        token = response.json().get('token')
        headers = {'Authorization': f'Bearer {token}'}
        print("登录成功，获取到token")
    else:
        print("登录失败，无法获取token")
        return
    
    # 2. 测试聊天API
    print("测试聊天API...")
    response = requests.get(f'{base_url}/api/chat/conversations', headers=headers)
    print(f"获取会话列表API响应: {response.status_code}")
    
    # 3. 测试插件API
    print("测试插件API...")
    response = requests.get(f'{base_url}/api/plugins', headers=headers)
    print(f"获取插件列表API响应: {response.status_code}")
    
    # 4. 测试配置API
    print("测试配置API...")
    response = requests.get(f'{base_url}/api/config', headers=headers)
    print(f"获取配置API响应: {response.status_code}")
    
    # 5. 测试统计API
    print("测试统计API...")
    response = requests.get(f'{base_url}/api/statistics', headers=headers)
    print(f"获取统计数据API响应: {response.status_code}")
    
    # 6. 测试平台API
    print("测试平台API...")
    response = requests.get(f'{base_url}/api/platform', headers=headers)
    print(f"获取平台信息API响应: {response.status_code}")
    
    # 7. 测试日志API
    print("测试日志API...")
    response = requests.get(f'{base_url}/api/logs', headers=headers)
    print(f"获取日志API响应: {response.status_code}")
    
    # 8. 测试API响应速度
    print("测试API响应速度...")
    start_time = time.time()
    response = requests.get(f'{base_url}/api/chat/conversations', headers=headers)
    end_time = time.time()
    print(f"API响应时间: {end_time - start_time:.2f}秒")
    
    print("后端API测试完成")

if __name__ == "__main__":
    test_backend_api()
