# Node.js 웹서버로 실행하기

npm을 사용하여 Node.js 웹서버로 FigFlow를 실행하는 방법입니다.

## 🚀 가장 간단한 방법 (추천!)

### 방법 1: Vite 프리뷰 서버 (1줄로 끝!)

```bash
# 1. 빌드하기
npm run build

# 2. 서버 실행
npm run preview
```

**결과:**
```
  ➜  Local:   http://localhost:4173/
  ➜  Network: http://192.168.0.100:4173/
```

브라우저에서 `http://localhost:4173/figflow/` 접속!

**장점:**
- ✅ 가장 간단 (추가 설치 불필요)
- ✅ Vite에 내장된 기능
- ✅ 빠른 성능

**단점:**
- ❌ 개발용 (실제 서비스용 아님)

---

## 방법 2: `serve` 패키지 사용 (매우 간단!)

### 한 번만 설치
```bash
npm install -g serve
```

### 서버 실행
```bash
# 먼저 빌드
npm run build

# 서버 실행
serve dist -s
```

**결과:**
```
   ┌─────────────────────────────────────┐
   │                                     │
   │   Serving!                          │
   │                                     │
   │   Local:  http://localhost:3000     │
   │                                     │
   └─────────────────────────────────────┘
```

브라우저에서 `http://localhost:3000` 접속!

**옵션:**
```bash
# 다른 포트 사용
serve dist -s -l 8080

# 특정 IP에서 접속 허용
serve dist -s -l 0.0.0.0:3000
```

**장점:**
- ✅ 매우 간단
- ✅ SPA(Single Page App) 지원
- ✅ 실제 서비스에도 사용 가능

---

## 방법 3: Express 서버 만들기 (커스터마이징 가능)

### 1. Express 설치
```bash
npm install express
```

### 2. 서버 파일 생성

`server.js` 파일 생성:
```javascript
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'dist')));

// SPA 라우팅 (모든 요청을 index.html로)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 FigFlow 서버가 실행 중입니다!`);
  console.log(`📍 http://localhost:${PORT}`);
});
```

### 3. package.json에 스크립트 추가

`package.json`의 `scripts`에 추가:
```json
{
  "scripts": {
    "start": "node server.js",
    "start:prod": "npm run build && node server.js"
  }
}
```

### 4. 서버 실행
```bash
# 빌드 + 서버 실행
npm run start:prod

# 또는 따로 실행
npm run build
npm start
```

**장점:**
- ✅ 완전히 커스터마이징 가능
- ✅ API 추가 가능
- ✅ 프로덕션 환경에 적합

---

## 방법 4: Python HTTP 서버 (Python 있다면)

Node.js 없이도 가능합니다!

```bash
# 먼저 빌드 (Node.js 필요)
npm run build

# Python 3 서버 실행
cd dist
python -m http.server 8000
```

브라우저에서 `http://localhost:8000` 접속!

**주의:** GitHub Pages용 base 경로 때문에 제대로 안 보일 수 있습니다.
이 경우 `vite.config.ts`에서 `base: '/'`로 변경 후 다시 빌드하세요.

---

## 🌐 외부에서 접속하기 (같은 네트워크)

### 내 컴퓨터의 IP 주소 확인

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```

**Windows:**
```cmd
ipconfig
```

IP 주소 예시: `192.168.0.100`

### 서버 실행 시 모든 IP에서 접속 허용

**Vite preview:**
```bash
npm run preview -- --host
```

**serve:**
```bash
serve dist -s -l 0.0.0.0:3000
```

**Express (server.js 수정):**
```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`http://localhost:${PORT}`);
});
```

이제 같은 Wi-Fi에 연결된 스마트폰/태블릿에서도 접속 가능:
```
http://192.168.0.100:3000
```

---

## 🔒 인터넷에 공개하기 (무료)

### ngrok 사용 (가장 쉬움)

1. **ngrok 설치**
   - https://ngrok.com/download
   - 회원가입 후 토큰 설정

2. **서버 실행**
   ```bash
   npm run preview
   ```

3. **새 터미널에서 ngrok 실행**
   ```bash
   ngrok http 4173
   ```

4. **공개 URL 생성됨!**
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:4173
   ```

이제 전 세계 누구나 `https://abc123.ngrok.io/figflow/` 접속 가능!

**주의:**
- 무료 버전은 세션이 끊기면 URL이 바뀝니다
- 실제 서비스용은 GitHub Pages나 Vercel 추천

---

## 📊 각 방법 비교

| 방법 | 난이도 | 속도 | 프로덕션 | 커스터마이징 |
|------|--------|------|----------|--------------|
| Vite preview | ⭐ | 🚀🚀🚀 | ❌ | ❌ |
| serve | ⭐ | 🚀🚀 | ✅ | ⭐ |
| Express | ⭐⭐ | 🚀🚀 | ✅ | ⭐⭐⭐ |
| Python | ⭐ | 🚀 | ❌ | ❌ |

---

## 💡 추천 방법

### 개발/테스트용
```bash
npm run preview
```

### 간단한 배포
```bash
serve dist -s
```

### 실제 서비스
- GitHub Pages (무료, 가장 쉬움)
- Vercel/Netlify (무료, 자동 배포)
- Express 서버 (완전 제어 가능)

---

## 🚨 문제 해결

### 포트가 이미 사용 중
```bash
# 다른 포트 사용
npm run preview -- --port 5000
serve dist -s -l 5000
```

### 빌드 파일이 없다는 에러
```bash
# 먼저 빌드 실행
npm run build
```

### 페이지가 404 에러
- SPA 라우팅 문제입니다
- `serve -s` 또는 Express의 `app.get('*')` 사용

---

**원하는 방법으로 서버를 실행해보세요!** 🎉
