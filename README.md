# ibas-invitation
IBAS 행사 웹 초대장

카카오톡으로 링크를 공유하는 모바일 우선 정적 페이지. 행사 내용은 `config.json`에서 바꾼다.

## 수정하고 배포하기

1. `config.json`의 값을 채운다 (형식은 `config.sample.json` 참고).
2. `npm run build` → `dist/` 생성 (비어 있는 값은 경고로 알려 준다).
3. Vercel이 `vercel.json` 설정대로 `npm run build` 후 `dist/`를 배포한다.

## 폴더

- `src/` 초대장 템플릿 (`{{event.name}}` 같은 값이 `config.json`에서 채워진다)
- `public/images/` 로고, 지도, 카카오톡 미리보기 이미지
- `og/` 미리보기 이미지(`index.html`)와 지도 이미지(`map.html`) 원본. 다시 만드는 명령은 각 파일 맨 위 주석에 있다.
- `variants/` 디자인 시안 (`npm run build:variants` → `dist-variants/`)
