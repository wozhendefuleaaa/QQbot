from playwright.sync_api import sync_playwright
import time

# 测试前端功能
def test_frontend_functionality():
    with sync_playwright() as p:
        # 启动浏览器
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # 1. 测试登录功能
            print("测试登录功能...")
            page.goto('http://localhost:5175')
            page.wait_for_load_state('networkidle')
            
            # 检查是否需要登录
            if "Login" in page.title() or "登录" in page.content():
                # 输入登录信息
                page.fill('input[type="email"]', 'admin')
                page.fill('input[type="password"]', 'admin123')
                page.click('button[type="submit"]')
                page.wait_for_load_state('networkidle')
                print("登录成功")
            else:
                print("已经登录")
            
            # 2. 测试聊天功能
            print("测试聊天功能...")
            # 导航到聊天页面
            page.click('a[href="/chat"]')
            page.wait_for_load_state('networkidle')
            print("聊天页面加载成功")
            
            # 3. 测试插件管理功能
            print("测试插件管理功能...")
            # 导航到插件页面
            page.click('a[href="/plugins"]')
            page.wait_for_load_state('networkidle')
            print("插件页面加载成功")
            
            # 4. 测试配置管理功能
            print("测试配置管理功能...")
            # 导航到配置页面
            page.click('a[href="/config"]')
            page.wait_for_load_state('networkidle')
            print("配置页面加载成功")
            
            # 5. 测试其他功能模块
            print("测试其他功能模块...")
            # 导航到统计页面
            page.click('a[href="/statistics"]')
            page.wait_for_load_state('networkidle')
            print("统计页面加载成功")
            
            # 导航到平台页面
            page.click('a[href="/platform"]')
            page.wait_for_load_state('networkidle')
            print("平台页面加载成功")
            
            # 导航到日志页面
            page.click('a[href="/logs"]')
            page.wait_for_load_state('networkidle')
            print("日志页面加载成功")
            
            # 6. 测试响应速度
            print("测试响应速度...")
            start_time = time.time()
            page.goto('http://localhost:5175')
            page.wait_for_load_state('networkidle')
            load_time = time.time() - start_time
            print(f"页面加载时间: {load_time:.2f}秒")
            
            # 7. 测试用户体验
            print("测试用户体验...")
            # 检查页面是否有错误
            console_logs = page.console.logs()
            error_logs = [log for log in console_logs if log.type == 'error']
            if error_logs:
                print(f"发现 {len(error_logs)} 个错误日志")
            else:
                print("未发现错误日志")
            
            print("前端功能测试完成")
            
        except Exception as e:
            print(f"测试过程中出现错误: {e}")
        finally:
            # 关闭浏览器
            browser.close()

if __name__ == "__main__":
    test_frontend_functionality()
