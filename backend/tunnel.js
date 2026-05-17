const localtunnel = require('localtunnel');

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: 3000 });
    console.log('TUNNEL_URL=' + tunnel.url);

    tunnel.on('close', () => {
      console.log('隧道断开，3秒后重连...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.log('隧道出错:', err.message);
    });
  } catch (err) {
    console.log('连接失败，5秒后重试:', err.message);
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
