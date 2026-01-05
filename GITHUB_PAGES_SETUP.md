# GitHub Pages 설정 가이드 (1분 완성)

GitHub Pages를 활성화하면 **https://taekilKim.github.io/figflow/** 에서 바로 사용할 수 있습니다!

## 📝 설정 단계 (따라하기만 하면 됩니다!)

### 1단계: GitHub 저장소 접속
웹 브라우저에서 다음 주소로 이동:
```
https://github.com/taekilKim/figflow
```

### 2단계: Settings 탭 클릭
- 저장소 상단 메뉴에서 **"Settings"** 클릭
- (Code, Issues, Pull requests 옆에 있습니다)

### 3단계: Pages 메뉴 찾기
- 왼쪽 사이드바를 아래로 스크롤
- **"Pages"** 메뉴 클릭
- (Code and automation 섹션 아래에 있습니다)

### 4단계: Source 설정
**Build and deployment** 섹션에서:

1. **Source** 드롭다운 클릭
2. **"GitHub Actions"** 선택
3. 자동으로 저장됨 (Save 버튼 없음)

### 5단계: 완료! 🎉
- 페이지 상단에 초록색 체크 표시가 나타남
- 5-10분 정도 기다리면 배포 완료
- https://taekilKim.github.io/figflow/ 접속!

---

## ✅ 제대로 설정되었는지 확인하기

### 방법 1: Actions 탭 확인
1. 저장소 상단의 **"Actions"** 탭 클릭
2. "Deploy to GitHub Pages" 워크플로우 실행 중/완료 확인
3. 초록색 체크 표시가 나타나면 성공!

### 방법 2: 배포 상태 확인
1. Settings → Pages로 이동
2. 상단에 다음과 같은 메시지 확인:
   ```
   ✅ Your site is live at https://taekilKim.github.io/figflow/
   ```

---

## 🚨 문제 해결

### "Pages" 메뉴가 안 보여요
**원인**: 저장소가 Private일 수 있습니다

**해결**:
1. Settings → General로 이동
2. 아래로 스크롤하여 "Danger Zone" 찾기
3. "Change repository visibility" → **"Public"**으로 변경

### 배포가 실패했어요 (빨간색 X 표시)
**확인**:
1. Actions 탭에서 실패한 워크플로우 클릭
2. 에러 메시지 확인

**일반적인 해결**:
- Settings → Pages에서 Source를 "GitHub Actions"로 다시 설정
- 저장소를 Public으로 변경

### 10분 지났는데 접속이 안 돼요
1. 브라우저 캐시 삭제 후 재시도
2. Actions 탭에서 워크플로우가 완료되었는지 확인
3. Settings → Pages에서 URL 확인

---

## 📸 스크린샷 참고

### Settings 위치
```
[Code] [Issues] [Pull requests] [Actions] [Settings] ← 여기 클릭
```

### Pages 메뉴 위치
```
왼쪽 사이드바:
├── General
├── Access
├── Code and automation
│   ├── Branches
│   ├── Rules
│   ├── Webhooks
│   └── Pages ← 여기 클릭
```

### Source 설정
```
Build and deployment
━━━━━━━━━━━━━━━━
Source: [GitHub Actions ▼]  ← 이것 선택
       (Deploy from a branch 대신)
```

---

## 💡 참고 사항

### 배포 시간
- 첫 배포: 5-10분
- 이후 업데이트: 2-3분

### 자동 배포
코드가 업데이트될 때마다 자동으로 배포됩니다:
- 새로운 커밋 푸시 → 자동 빌드 → 자동 배포

### 비용
GitHub Pages는 **완전 무료**입니다!
- Public 저장소: 무료
- Private 저장소: GitHub Pro 필요

---

## 🎯 설정 완료 후

웹 브라우저에서 접속:
```
https://taekilKim.github.io/figflow/
```

**즐거운 FigFlow 사용 되세요!** 🎉
