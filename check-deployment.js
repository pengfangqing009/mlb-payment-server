// Vercel部署状态检查脚本
const https = require('https');

// 替换为您的Vercel域名
const VERCEL_DOMAIN = 'mlb-payment-server.vercel.app';

async function checkDeployment() {
  console.log('🔍 开始检查Vercel部署状态...\n');

  // 测试健康检查接口
  console.log('1. 测试健康检查接口...');
  await testEndpoint('/api/health');

  // 测试预下单接口
  console.log('\n2. 测试预下单接口...');
  await testPostEndpoint('/api/payment/pre-order', {
    orderId: 'test_' + Date.now(),
    amount: 9.9,
    productName: '月度会员测试',
    userId: 'test_user',
    membershipType: 'premium_monthly'
  });

  console.log('\n✅ 部署状态检查完成！');
}

function testEndpoint(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: VERCEL_DOMAIN,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'MLB-Payment-Checker'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${path} - 状态码: ${res.statusCode}`);
          try {
            const jsonData = JSON.parse(data);
            console.log(`   响应数据: ${JSON.stringify(jsonData, null, 2)}`);
          } catch (e) {
            console.log(`   响应内容: ${data}`);
          }
        } else {
          console.log(`❌ ${path} - 状态码: ${res.statusCode}`);
          console.log(`   错误信息: ${data}`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${path} - 请求失败: ${error.message}`);
      resolve();
    });

    req.setTimeout(10000, () => {
      console.log(`❌ ${path} - 请求超时`);
      req.destroy();
      resolve();
    });

    req.end();
  });
}

function testPostEndpoint(path, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: VERCEL_DOMAIN,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'MLB-Payment-Checker'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${path} - 状态码: ${res.statusCode}`);
          try {
            const jsonData = JSON.parse(responseData);
            console.log(`   响应数据: ${JSON.stringify(jsonData, null, 2)}`);
          } catch (e) {
            console.log(`   响应内容: ${responseData}`);
          }
        } else {
          console.log(`❌ ${path} - 状态码: ${res.statusCode}`);
          console.log(`   错误信息: ${responseData}`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${path} - 请求失败: ${error.message}`);
      resolve();
    });

    req.setTimeout(10000, () => {
      console.log(`❌ ${path} - 请求超时`);
      req.destroy();
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

// 执行检查
checkDeployment().catch(console.error);

// 同时测试直接访问
console.log('\n🔗 直接访问测试:');
console.log(`健康检查: https://${VERCEL_DOMAIN}/api/health`);
console.log(`预下单接口: https://${VERCEL_DOMAIN}/api/payment/pre-order`);
console.log('请在浏览器中打开以上链接测试访问');