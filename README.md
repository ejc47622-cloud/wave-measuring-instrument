# 활동 1 소리 비교

GitHub에 올린 뒤 Netlify와 연결해 게시할 수 있도록 구성한 파일입니다.

## 포함된 기능

- 학생 소리 측정 및 파동 저장
- 선생님 화면에서 학생 측정 결과 확인
- 각 측정 결과 삭제
- 학생 화면과 선생님 화면 전환
- 활동2 사이트 이동
- Netlify Blobs를 이용한 측정 결과 저장

측정 결과는 선생님 화면에서 삭제하기 전까지 유지되며, 사이트를 다시 배포해도 남아 있습니다.

## GitHub에 올리기

1. GitHub에서 새 저장소를 만듭니다.
2. 이 ZIP 파일의 압축을 풉니다.
3. 압축을 푼 폴더 안의 파일과 폴더를 모두 GitHub 저장소에 업로드합니다.
4. GitHub에서 `netlify.toml`, `package.json`, `public`, `netlify`가 보이면 정상입니다.

## Netlify와 연결하기

1. Netlify에서 **Add new project**를 누릅니다.
2. **Import an existing project**를 선택합니다.
3. GitHub를 선택하고 방금 만든 저장소를 고릅니다.
4. 배포 설정은 `netlify.toml`에서 자동으로 읽으므로 변경하지 않아도 됩니다.
5. **Deploy**를 누릅니다.

별도의 데이터베이스 계정이나 환경 변수 설정은 필요하지 않습니다.

## 주요 주소

- 첫 화면 및 학생 화면: `/` 또는 `/student.html`
- 선생님 화면: `/teacher.html`

## 파일 구조

```text
activity1-netlify-github/
├─ public/
│  ├─ index.html
│  ├─ student.html
│  ├─ teacher.html
│  └─ favicon.svg
├─ netlify/
│  └─ functions/
│     └─ submissions.mjs
├─ netlify.toml
├─ package.json
└─ README.md
```
