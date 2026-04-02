import requests

# 测试账号API
print("测试账号API...")

# 首先登录
base_url = 'http://localhost:3000'
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
    
    # 测试账号API
    print("测试账号列表API...")
    response = requests.get(f'{base_url}/api/accounts', headers=headers)
    print(f"获取账号列表API响应: {response.status_code}")
    if response.status_code == 200:
        print("账号API工作正常!")
    else:
        print("账号API返回错误")
else:
    print("登录失败，无法获取token")

print("测试完成")
