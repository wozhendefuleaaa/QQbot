from playwright.sync_api import sync_playwright
import time

def test_application():
    with sync_playwright() as p:
        # 启动浏览器（使用headless模式）
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # 访问前端应用
            page.goto('http://localhost:5175')
            page.wait_for_load_state('networkidle')
            
            # 截图：登录页面
            page.screenshot(path='/workspace/test-results/login-page.png', full_page=True)
            print('✓ 登录页面加载成功')
            
            # 输入登录信息
            page.fill('input[type="text"]', 'admin')
            page.fill('input[type="password"]', 'admin123')
            
            # 点击登录按钮
            page.click('button[type="submit"]')
            page.wait_for_load_state('networkidle')
            
            # 截图：控制台首页
            page.screenshot(path='/workspace/test-results/dashboard.png', full_page=True)
            print('✓ 登录成功，进入控制台首页')
            
            # 测试后端API
            print('\n测试后端API...')
            try:
                # 测试健康检查端点
                health_response = page.request.get('http://localhost:3000/health')
                if health_response.status == 200:
                    print('✓ 后端健康检查API正常')
                else:
                    print(f'✗ 后端健康检查API失败，状态码: {health_response.status}')
                
                # 测试就绪检查端点
                ready_response = page.request.get('http://localhost:3000/ready')
                if ready_response.status == 200:
                    print('✓ 后端就绪检查API正常')
                else:
                    print(f'✗ 后端就绪检查API失败，状态码: {ready_response.status}')
                
                # 测试获取账号列表（直接使用认证信息）
                # 手动构建认证请求
                login_response = page.request.post('http://localhost:3000/api/auth/login', data={
                    'username': 'admin',
                    'password': 'admin123'
                })
                
                if login_response.status == 200:
                    login_data = login_response.json()
                    if 'token' in login_data:
                        token = login_data['token']
                        print('✓ 成功获取登录token')
                        
                        # 使用token测试API
                        accounts_response = page.request.get('http://localhost:3000/api/accounts', headers={
                            'Authorization': f'Bearer {token}'
                        })
                        if accounts_response.status == 200:
                            print('✓ 后端账号API正常')
                        else:
                            print(f'✗ 后端账号API失败，状态码: {accounts_response.status}')
                    else:
                        print('✗ 登录响应中未找到token')
                else:
                    print(f'✗ 登录API失败，状态码: {login_response.status}')
            except Exception as e:
                print(f'✗ 后端API测试失败: {e}')
            
            # 测试退出登录
            try:
                # 尝试点击退出登录按钮
                print('\n尝试退出登录...')
                
                # 尝试不同的选择器
                selectors = [
                    'text=退出登录',
                    'button:has-text("退出登录")',
                    'a:has-text("退出登录")',
                    'div:has-text("退出登录")'
                ]
                
                logout_success = False
                for selector in selectors:
                    try:
                        page.click(selector, timeout=5000)
                        page.wait_for_load_state('networkidle')
                        
                        # 截图：退出登录后
                        page.screenshot(path='/workspace/test-results/logout-page.png', full_page=True)
                        print('✓ 退出登录成功')
                        logout_success = True
                        break
                    except:
                        continue
                
                if not logout_success:
                    print('✗ 未找到退出登录按钮')
                    # 截图当前页面
                    page.screenshot(path='/workspace/test-results/current-page.png', full_page=True)
            except Exception as e:
                print(f'✗ 退出登录失败: {e}')
                page.screenshot(path='/workspace/test-results/logout-error.png', full_page=True)
            
        except Exception as e:
            print(f'✗ 测试失败: {e}')
            page.screenshot(path='/workspace/test-results/error.png', full_page=True)
        finally:
            # 关闭浏览器
            browser.close()

if __name__ == '__main__':
    # 创建测试结果目录
    import os
    os.makedirs('/workspace/test-results', exist_ok=True)
    
    test_application()
    print('\n测试完成，结果保存在 /workspace/test-results 目录中')
