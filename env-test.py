import os
import subprocess

# 测试环境变量配置
def test_env_variables():
    print("测试环境变量配置...")
    
    # 1. 检查环境变量文件是否存在
    env_file = ".env"
    if os.path.exists(env_file):
        print(f"环境变量文件 {env_file} 存在")
    else:
        print(f"环境变量文件 {env_file} 不存在")
        # 复制示例文件
        if os.path.exists(".env.example"):
            print("正在从 .env.example 创建 .env 文件...")
            subprocess.run(["cp", ".env.example", ".env"], check=True)
            print("创建成功")
        else:
            print(".env.example 文件也不存在")
            return
    
    # 2. 读取环境变量
    with open(env_file, "r") as f:
        env_content = f.read()
        print("环境变量文件内容:")
        print(env_content)
    
    # 3. 检查关键环境变量
    required_vars = [
        "QQ_APP_ID",
        "QQ_CLIENT_SECRET",
        "JWT_SECRET",
        "ADMIN_PASSWORD"
    ]
    
    print("\n检查关键环境变量:")
    for var in required_vars:
        value = os.environ.get(var)
        if value:
            print(f"{var}: {value}")
        else:
            print(f"{var}: 未设置")
    
    # 4. 测试系统是否能正确读取环境变量
    print("\n测试系统是否能正确读取环境变量...")
    # 检查后端是否能正常启动并读取环境变量
    # 这里我们通过检查后端日志来验证
    print("请检查后端日志，确认环境变量是否被正确读取")
    
    print("环境变量配置测试完成")

if __name__ == "__main__":
    test_env_variables()
