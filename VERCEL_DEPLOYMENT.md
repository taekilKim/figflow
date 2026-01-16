# Vercel 배포 가이드

이 프로젝트는 **Vercel**에서 배포되어야 합니다. GitHub Pages는 SPA 라우팅과 Serverless Function을 지원하지 않기 때문입니다.

## 왜 Vercel을 사용해야 하나요?

| 기능 | GitHub Pages | Vercel |
|------|--------------|--------|
| SPA 라우팅 | ❌ 지원 안 함 | ✅ 완벽 지원 |
| Serverless Function | ❌ 없음 | ✅ 지원 |
| 환경변수 | ❌ 빌드타임만 | ✅ 런타임 지원 |
| HTTPS | ✅ 지원 | ✅ 지원 |
| 커스텀 도메인 | ✅ 지원 | ✅ 지원 |
| OAuth Callback | ❌ 404 에러 | ✅ 정상 동작 |

## 배포 방법

### 1. Vercel 계정 생성
1. [Vercel](https://vercel.com) 방문
2. GitHub 계정으로 로그인

### 2. 프로젝트 임포트
1. Vercel 대시보드에서 "Add New" → "Project" 클릭
2. GitHub 저장소 선택: `taekilKim/figflow`
3. Import 클릭

### 3. 환경변수 설정
**중요**: 다음 환경변수를 **반드시** 설정해야 합니다.

Vercel 프로젝트 설정에서 `Settings` → `Environment Variables`로 이동:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `VITE_FIGMA_CLIENT_ID` | `your_client_id` | Figma OAuth Client ID |
| `VITE_FIGMA_CLIENT_SECRET` | `your_client_secret` | Figma OAuth Client Secret |

#### Figma OAuth 앱 생성 방법
1. [Figma 개발자 설정](https://www.figma.com/developers/apps) 방문
2. "Create new app" 클릭
3. 앱 정보 입력:
   - **App name**: FigFlow
   - **Website**: `https://your-project.vercel.app`
   - **Callback URL**: `https://your-project.vercel.app/auth/callback`
4. Client ID와 Client Secret 복사
5. Vercel 환경변수에 추가

### 4. 빌드 설정
Vercel이 자동으로 감지하지만, 수동으로 설정하려면:

- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 5. 배포
1. "Deploy" 버튼 클릭
2. 몇 분 후 배포 완료
3. 제공된 URL로 접속 (예: `https://figflow.vercel.app`)

## Figma OAuth Callback URL 업데이트

배포 후 반드시 Figma OAuth 앱 설정을 업데이트하세요:

1. [Figma 개발자 설정](https://www.figma.com/developers/apps) 방문
2. 앱 선택
3. **Callback URL**을 Vercel URL로 변경:
   ```
   https://your-project.vercel.app/auth/callback
   ```
4. 저장

## 자동 배포

Vercel은 기본적으로 GitHub와 연동되어 있습니다:

- **main 브랜치에 푸시**: 자동으로 프로덕션 배포
- **다른 브랜치에 푸시**: 미리보기 배포 생성
- **Pull Request 생성**: PR마다 고유한 미리보기 URL 제공

## 로컬 개발

로컬에서 테스트하려면:

```bash
# 환경변수 설정 (.env 파일 생성)
echo "VITE_FIGMA_CLIENT_ID=your_client_id" > .env
echo "VITE_FIGMA_CLIENT_SECRET=your_client_secret" >> .env

# 개발 서버 실행
npm run dev
```

**주의**: OAuth Callback은 `http://localhost:5173/auth/callback`로 설정해야 로컬에서 테스트 가능합니다.

## 문제 해결

### 404 에러 발생
- **원인**: GitHub Pages로 배포된 경우
- **해결**: Vercel로 재배포

### OAuth 콜백 실패
- **원인**: Figma OAuth 앱의 Callback URL이 잘못됨
- **해결**: Figma 설정에서 Callback URL을 Vercel URL로 업데이트

### 환경변수 로드 안 됨
- **원인**: Vercel 환경변수가 설정되지 않음
- **해결**: Vercel 대시보드에서 환경변수 확인 후 재배포

### Serverless Function 404
- **원인**: `api/` 폴더가 빌드에 포함되지 않음
- **해결**: Vercel이 자동으로 처리하므로 재배포

## 프로젝트 구조

```
figflow/
├── api/                    # Vercel Serverless Functions
│   └── figma/
│       └── token.ts       # OAuth 토큰 교환
├── src/                   # React SPA
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── AuthCallbackPage.tsx
│   │   └── WorkspacePage.tsx
│   └── utils/
│       ├── figmaAuth.ts   # OAuth 클라이언트
│       └── figma.ts       # Figma API
├── vercel.json            # Vercel 설정
├── vite.config.ts         # Vite 설정
└── .env.example           # 환경변수 예시
```

## 보안

- ✅ Client Secret은 Serverless Function에서만 사용
- ✅ HTTPS 자동 적용
- ✅ CORS 설정 완료
- ✅ 환경변수는 Vercel에서 안전하게 관리

## 참고 링크

- [Vercel 문서](https://vercel.com/docs)
- [Figma OAuth 문서](https://www.figma.com/developers/api#oauth2)
- [Vite 문서](https://vitejs.dev)

## 지원

문제가 발생하면 [GitHub Issues](https://github.com/taekilKim/figflow/issues)에 제보해주세요.
