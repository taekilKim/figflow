#!/bin/bash
# Vercel 환경 변수 일괄 추가 스크립트

echo "🚀 Vercel 환경 변수를 추가합니다..."
echo ""
echo "⚠️  이 스크립트를 실행하기 전에 'vercel login'으로 로그인하세요!"
echo ""

# Firebase 환경 변수 추가
vercel env add VITE_FIREBASE_API_KEY production preview development
# 입력 프롬프트가 나오면: AIzaSyBSONtxf-VAkudrxmYh1f7N1Z9h-EJFNrg

vercel env add VITE_FIREBASE_AUTH_DOMAIN production preview development
# 입력: figmaflow-f441b.firebaseapp.com

vercel env add VITE_FIREBASE_PROJECT_ID production preview development
# 입력: figmaflow-f441b

vercel env add VITE_FIREBASE_STORAGE_BUCKET production preview development
# 입력: figmaflow-f441b.firebasestorage.app

vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production preview development
# 입력: 821780037319

vercel env add VITE_FIREBASE_APP_ID production preview development
# 입력: 1:821780037319:web:af03ae54ed6a1bff19c8e2

vercel env add VITE_FIREBASE_MEASUREMENT_ID production preview development
# 입력: G-PE03MRLFQX

echo ""
echo "✅ 완료! 이제 Vercel에서 재배포하세요: vercel --prod"
