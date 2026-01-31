const express = require('express');
const cors = require('cors');

const app = express();

// 中间件配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 支付配置（从环境变量读取）
const config = {
  appId: process.env.DOUYIN_APP_ID || 'tt799d0f20e696135501',
  merchantId: process.env.DOUYIN_MERCHANT_ID || '74935375955954588430',
  paymentSalt: process.env.DOUYIN_PAYMENT_SALT || 'dev_salt',
  callbackToken: process.env.DOUYIN_CALLBACK_TOKEN || 'dev_token'
};

// 工具函数：生成签名
function generateSignature(params, salt) {
  const crypto = require('crypto');
  const excludeFields = ['app_id', 'sign', 'other_settle_params'];
  const signParams = [];
  
  for (const [key, value] of Object.entries(params)) {
    if (excludeFields.includes(key)) continue;
    if (value !== null && value !== undefined && value !== '') {
      let strValue = String(value).trim();
      if (strValue.startsWith('"') && strValue.endsWith('"') && strValue.length > 1) {
        strValue = strValue.substring(1, strValue.length - 1).trim();
      }
      if (strValue !== '' && strValue !== 'null') {
        signParams.push(strValue);
      }
    }
  }
  
  signParams.push(salt);
  signParams.sort();
  const signString = signParams.join('&');
  return crypto.createHash('md5').update(signString).digest('hex');
}

// 1. 预下单接口
app.post('/api/payment/pre-order', (req, res) => {
  try {
    console.log('收到预下单请求:', req.body);
    
    const { orderId, amount, productName, userId, membershipType } = req.body;
    
    // 参数验证
    if (!orderId || !amount || !productName) {
      return res.status(400).json({
        err_no: 400,
        err_tips: '缺少必要参数: orderId, amount, productName'
      });
    }
    
    // 生成签名（模拟真实支付流程）
    const signature = generateSignature({
      app_id: config.appId,
      out_order_no: orderId,
      total_amount: Math.round(amount * 100),
      subject: `MLB数据会员服务 - ${productName}`,
      body: 'MLB高级会员服务，解锁所有高级功能',
      valid_time: 1800,
      notify_url: `${process.env.VERCEL_URL || 'https://your-project.vercel.app'}/api/payment/notify`
    }, config.paymentSalt);
    
    // 模拟预下单响应（实际项目中应该调用抖音API）
    const preOrderResult = {
      order_id: `DOUYIN_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      order_token: `TOKEN_${Math.random().toString(36).substr(2, 16)}`,
      out_order_no: orderId,
      sign: signature,
      timestamp: new Date().toISOString()
    };
    
    console.log('返回预下单结果:', preOrderResult);
    
    res.json({
      err_no: 0,
      err_tips: 'success',
      data: preOrderResult
    });
    
  } catch (error) {
    console.error('预下单处理错误:', error);
    res.status(500).json({
      err_no: 500,
      err_tips: '服务器内部错误: ' + error.message
    });
  }
});

// 工具函数：验证回调签名（根据抖音官方文档实现）
function verifyCallbackSignature(headers, body, token) {
  try {
    const crypto = require('crypto');
    
    // 抖音支付回调签名参数（根据文档）
    const timestamp = headers['byte-timestamp'];
    const nonce = headers['byte-nonce-str'];
    const signature = headers['byte-signature'];
    
    if (!timestamp || !nonce || !signature) {
      console.warn('回调签名参数缺失:', { timestamp, nonce, signature });
      return false;
    }
    
    // 根据抖音文档的签名算法：token + timestamp + nonce + msg
    const msg = JSON.stringify(body);
    const strArr = [token, timestamp, nonce, msg].sort();
    const str = strArr.join('');
    
    // 使用SHA1算法计算签名
    const calculatedSignature = crypto.createHash('sha1').update(str).digest('hex');
    
    console.log('签名验证详情:', {
      token: token.substring(0, 8) + '...', // 部分显示保护隐私
      timestamp,
      nonce,
      msgLength: msg.length,
      calculatedSignature,
      receivedSignature: signature
    });
    
    return calculatedSignature === signature;
  } catch (error) {
    console.error('签名验证异常:', error);
    return false;
  }
}

// 2. 支付回调接口（抖音平台回调此接口）
app.post('/api/payment/notify', (req, res) => {
  try {
    console.log('收到支付回调:', {
      headers: req.headers,
      body: req.body
    });
    
    // 验证回调签名（关键安全步骤）
    const isValid = verifyCallbackSignature(req.headers, req.body, config.callbackToken);
    if (!isValid) {
      console.error('回调签名验证失败');
      return res.status(400).json({ 
        err_no: 400, 
        err_tips: '签名验证失败' 
      });
    }
    
    console.log('回调签名验证成功');
    
    const { out_order_no, order_status, total_fee, pay_time, transaction_id } = req.body;
    
    // 处理支付成功逻辑
    console.log('支付回调处理:', {
      orderId: out_order_no,
      status: order_status,
      amount: total_fee,
      payTime: pay_time,
      transactionId: transaction_id
    });
    
    // 实际业务逻辑：
    // 1. 更新订单状态为已支付
    // 2. 激活会员权限
    // 3. 发送支付成功通知
    // 4. 记录支付日志
    
    // 必须按照抖音文档要求返回成功响应
    res.json({
      err_no: 0,
      err_tips: 'success'
    });
    
  } catch (error) {
    console.error('支付回调处理错误:', error);
    // 即使处理失败，也要返回成功响应避免重试
    res.json({
      err_no: 0,
      err_tips: 'success'
    });
  }
});

// 3. 查询订单状态接口
app.post('/api/payment/query-order', (req, res) => {
  try {
    const { orderId, outOrderNo } = req.body;
    
    if (!orderId && !outOrderNo) {
      return res.status(400).json({
        err_no: 400,
        err_tips: '缺少订单ID参数'
      });
    }
    
    // 模拟查询结果（实际项目中应该查询数据库或调用抖音API）
    const orderStatus = {
      order_id: orderId || outOrderNo,
      out_order_no: outOrderNo || orderId,
      status: 'SUCCESS', // 模拟支付成功
      total_fee: 2990, // 29.9元，单位分
      pay_time: new Date().toISOString(),
      pay_channel: 10 // 抖音支付
    };
    
    res.json({
      err_no: 0,
      err_tips: 'success',
      data: orderStatus
    });
    
  } catch (error) {
    console.error('查询订单错误:', error);
    res.status(500).json({
      err_no: 500,
      err_tips: '查询失败: ' + error.message
    });
  }
});

// 4. 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'MLB Payment Server',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// 5. 根路径重定向到健康检查
app.get('/', (req, res) => {
  res.redirect('/api/health');
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('未处理的错误:', err);
  res.status(500).json({
    err_no: 500,
    err_tips: '服务器内部错误'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    err_no: 404,
    err_tips: '接口不存在: ' + req.originalUrl
  });
});

// Vercel需要导出handler
module.exports = app;