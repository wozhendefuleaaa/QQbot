from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 访问登录页面
    page.goto('http://localhost:5175')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='/workspace/login_page.png', full_page=True)
    
    # 访问首页（假设登录后或直接可访问）
    page.goto('http://localhost:5175/home')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='/workspace/home_page.png', full_page=True)
    
    browser.close()
