/**
 * FigFlow - Simple Express Server
 *
 * 사용법:
 * 1. npm install express
 * 2. npm run build
 * 3. npm start
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 정적 파일 제공 (dist 폴더)
app.use(express.static(path.join(__dirname, 'dist')));

// SPA 라우팅: 모든 요청을 index.html로 리다이렉트
// (React Router 등의 클라이언트 사이드 라우팅 지원)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 서버 시작
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 FigFlow 서버가 실행 중입니다!');
  console.log('');
  console.log(`   로컬 접속:    http://localhost:${PORT}`);
  console.log('');
  console.log('   서버를 종료하려면 Ctrl+C를 누르세요');
  console.log('');
});

// 우아한 종료 처리
process.on('SIGTERM', () => {
  console.log('서버를 종료합니다...');
  process.exit(0);
});
