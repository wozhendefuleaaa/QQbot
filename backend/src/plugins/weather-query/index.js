/**
 * 天气查询插件
 * 支持查询全国各城市实时天气和预报
 */

// 模拟天气数据
const mockWeatherData = {
  '北京': {
    temp: 18,
    humidity: 45,
    wind: '东北风 3级',
    weather: '晴',
    aqi: 65,
    aqiLevel: '良'
  },
  '上海': {
    temp: 22,
    humidity: 72,
    wind: '东南风 2级',
    weather: '多云',
    aqi: 48,
    aqiLevel: '优'
  },
  '广州': {
    temp: 28,
    humidity: 85,
    wind: '南风 2级',
    weather: '阴',
    aqi: 55,
    aqiLevel: '良'
  },
  '深圳': {
    temp: 27,
    humidity: 80,
    wind: '东风 3级',
    weather: '多云',
    aqi: 42,
    aqiLevel: '优'
  },
  '成都': {
    temp: 20,
    humidity: 68,
    wind: '微风',
    weather: '阴',
    aqi: 78,
    aqiLevel: '良'
  },
  '杭州': {
    temp: 21,
    humidity: 75,
    wind: '东风 2级',
    weather: '小雨',
    aqi: 38,
    aqiLevel: '优'
  }
};

// 获取天气图标
function getWeatherIcon(weather) {
  const icons = {
    '晴': '☀️',
    '多云': '⛅',
    '阴': '☁️',
    '小雨': '🌧️',
    '中雨': '🌧️',
    '大雨': '⛈️',
    '雪': '❄️'
  };
  return icons[weather] || '🌤️';
}

// 获取空气质量颜色
function getAqiColor(level) {
  const colors = {
    '优': '🟢',
    '良': '🟡',
    '轻度污染': '🟠',
    '中度污染': '🔴',
    '重度污染': '🟣'
  };
  return colors[level] || '⚪';
}

module.exports = {
  name: '天气查询',
  version: '1.0.0',
  description: '天气查询插件，支持查询全国各城市实时天气和预报',
  author: 'weather-dev',

  commands: [
    {
      name: '天气',
      description: '查询城市天气',
      pattern: /^#天气\s*(.+)$/,
      handler: async (args, event, ctx) => {
        const city = args[1]?.trim();
        
        if (!city) {
          await ctx.sendMessage(
            event.groupId || event.senderId,
            event.groupId ? 'group' : 'user',
            '❌ 请输入城市名称，例如: #天气 北京'
          );
          return { success: false, error: '缺少城市名称' };
        }
        
        console.log(`[天气查询] 查询城市: ${city}`);
        
        // 查找城市数据（支持模糊匹配）
        let cityData = null;
        let matchedCity = null;
        
        for (const [name, data] of Object.entries(mockWeatherData)) {
          if (name.includes(city) || city.includes(name)) {
            cityData = data;
            matchedCity = name;
            break;
          }
        }
        
        if (!cityData) {
          // 生成随机天气数据
          const weathers = ['晴', '多云', '阴', '小雨'];
          const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
          cityData = {
            temp: Math.floor(Math.random() * 20) + 10,
            humidity: Math.floor(Math.random() * 50) + 30,
            wind: '微风',
            weather: randomWeather,
            aqi: Math.floor(Math.random() * 100) + 20,
            aqiLevel: ['优', '良', '良'][Math.floor(Math.random() * 3)]
          };
          matchedCity = city;
        }
        
        const icon = getWeatherIcon(cityData.weather);
        const aqiIcon = getAqiColor(cityData.aqiLevel);
        
        const weatherText = `🌤️ ${matchedCity}天气

${icon} 天气: ${cityData.weather}
🌡️ 温度: ${cityData.temp}°C
💧 湿度: ${cityData.humidity}%
🌬️ 风力: ${cityData.wind}
${aqiIcon} 空气质量: ${cityData.aqi} (${cityData.aqiLevel})

📅 更新时间: ${new Date().toLocaleString('zh-CN')}`;
        
        await ctx.sendMessage(
          event.groupId || event.senderId,
          event.groupId ? 'group' : 'user',
          weatherText
        );
        
        return { success: true, city: matchedCity, data: cityData };
      }
    },
    {
      name: '天气预报',
      description: '查询城市未来天气',
      pattern: /^#天气预报\s*(.+)$/,
      handler: async (args, event, ctx) => {
        const city = args[1]?.trim();
        
        if (!city) {
          await ctx.sendMessage(
            event.groupId || event.senderId,
            event.groupId ? 'group' : 'user',
            '❌ 请输入城市名称，例如: #天气预报 北京'
          );
          return { success: false, error: '缺少城市名称' };
        }
        
        console.log(`[天气查询] 查询预报: ${city}`);
        
        // 生成未来3天预报
        const weathers = ['晴', '多云', '阴', '小雨'];
        const forecast = [];
        const today = new Date();
        
        for (let i = 0; i < 3; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
          const weather = weathers[Math.floor(Math.random() * weathers.length)];
          const highTemp = Math.floor(Math.random() * 10) + 20;
          const lowTemp = highTemp - Math.floor(Math.random() * 8) - 3;
          
          forecast.push(`${dateStr} ${getWeatherIcon(weather)} ${weather} ${lowTemp}°C ~ ${highTemp}°C`);
        }
        
        const forecastText = `📅 ${city}未来3天天气预报

${forecast.join('\n')}

💡 提示: 数据为模拟演示`;
        
        await ctx.sendMessage(
          event.groupId || event.senderId,
          event.groupId ? 'group' : 'user',
          forecastText
        );
        
        return { success: true, city };
      }
    },
    {
      name: '空气质量',
      description: '查询城市空气质量',
      pattern: /^#空气质量\s*(.+)$/,
      handler: async (args, event, ctx) => {
        const city = args[1]?.trim();
        
        if (!city) {
          await ctx.sendMessage(
            event.groupId || event.senderId,
            event.groupId ? 'group' : 'user',
            '❌ 请输入城市名称，例如: #空气质量 北京'
          );
          return { success: false, error: '缺少城市名称' };
        }
        
        console.log(`[天气查询] 查询空气质量: ${city}`);
        
        // 查找或生成空气质量数据
        let cityData = mockWeatherData[city];
        if (!cityData) {
          for (const [name, data] of Object.entries(mockWeatherData)) {
            if (name.includes(city) || city.includes(name)) {
              cityData = data;
              break;
            }
          }
        }
        
        const aqi = cityData?.aqi || Math.floor(Math.random() * 100) + 20;
        const aqiLevel = cityData?.aqiLevel || ['优', '良', '良'][Math.floor(Math.random() * 3)];
        const aqiIcon = getAqiColor(aqiLevel);
        
        const aqiText = `🌬️ ${city}空气质量

${aqiIcon} AQI指数: ${aqi}
📊 等级: ${aqiLevel}

💡 建议:
${aqi <= 50 ? '空气质量优秀，适合户外活动' : 
  aqi <= 100 ? '空气质量良好，敏感人群减少户外活动' :
  '空气质量较差，建议减少户外活动'}

📅 更新时间: ${new Date().toLocaleString('zh-CN')}`;
        
        await ctx.sendMessage(
          event.groupId || event.senderId,
          event.groupId ? 'group' : 'user',
          aqiText
        );
        
        return { success: true, city, aqi, aqiLevel };
      }
    }
  ],

  onLoad: async () => {
    console.log('[天气查询] 插件已加载 v1.0.0');
  },

  onUnload: async () => {
    console.log('[天气查询] 插件已卸载');
  }
};
