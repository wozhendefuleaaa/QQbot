import requests
import time
import concurrent.futures

# 性能测试
def test_performance():
    base_url = 'http://localhost:3000'
    
    # 先登录获取token
    auth_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    response = requests.post(f'{base_url}/api/auth/login', json=auth_data)
    if response.status_code != 200:
        print("登录失败，无法进行性能测试")
        return
    
    token = response.json().get('token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # 测试API端点
    test_endpoints = [
        '/api/plugins',
        '/api/config',
        '/api/statistics',
        '/api/logs'
    ]
    
    # 测试不同负载
    load_levels = [1, 5, 10, 20, 50]
    
    for load in load_levels:
        print(f"\n测试负载: {load} 并发请求")
        
        # 测试每个API端点
        for endpoint in test_endpoints:
            print(f"  测试API: {endpoint}")
            
            # 记录开始时间
            start_time = time.time()
            
            # 并发请求
            with concurrent.futures.ThreadPoolExecutor(max_workers=load) as executor:
                futures = []
                for _ in range(load):
                    future = executor.submit(requests.get, f'{base_url}{endpoint}', headers=headers)
                    futures.append(future)
                
                # 等待所有请求完成
                results = []
                for future in concurrent.futures.as_completed(futures):
                    try:
                        response = future.result()
                        results.append(response.status_code)
                    except Exception as e:
                        results.append(f"错误: {e}")
            
            # 计算总时间
            total_time = time.time() - start_time
            
            # 统计结果
            success_count = sum(1 for r in results if r == 200)
            error_count = len(results) - success_count
            
            print(f"    总请求数: {load}")
            print(f"    成功数: {success_count}")
            print(f"    错误数: {error_count}")
            print(f"    总时间: {total_time:.2f}秒")
            print(f"    平均响应时间: {total_time/load:.2f}秒/请求")
    
    print("\n性能测试完成")

if __name__ == "__main__":
    test_performance()
