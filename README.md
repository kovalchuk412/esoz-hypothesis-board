# ЕСОЗ — спільний борд гіпотез

Проєкт складається з:

- `frontend/` — статичний HTML для GitHub Pages.
- `backend/` — API на Node.js + Express + SQLite для спільних голосів і коментарів.

## Локальний запуск

### 1. Запустити бекенд

```bash
cd backend
npm install
npm run dev
```

API буде доступне на:

```text
http://localhost:3000
```

Перевірка:

```text
http://localhost:3000/health
```

### 2. Відкрити фронтенд

У файлі `frontend/config.js` має бути:

```js
window.API_BASE = "http://localhost:3000";
```

Далі відкрий `frontend/index.html` у браузері або запусти простий локальний сервер:

```bash
cd frontend
python3 -m http.server 8080
```

Після цього відкрий:

```text
http://localhost:8080
```

## Деплой

### Frontend: GitHub Pages

1. Завантаж проєкт у GitHub-репозиторій.
2. У GitHub: `Settings → Pages`.
3. Source: `Deploy from a branch`.
4. Branch: `main`.
5. Folder: `/frontend`.

### Backend: Render / Railway / Fly.io

GitHub Pages не запускає бекенд. API потрібно розмістити окремо.

Для Render:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment variables:
  - `PORT` — Render поставить автоматично
  - `CORS_ORIGIN` — URL GitHub Pages, наприклад `https://your-login.github.io`
  - `DB_PATH` — можна не задавати для тесту; для production бажано підключити persistent disk і вказати шлях до нього

Після деплою бекенду заміни у `frontend/config.js`:

```js
window.API_BASE = "https://your-backend-url.onrender.com";
```

Потім зроби commit і push.

## API

### GET `/health`

Перевірка працездатності API.

### GET `/api/users`

Повертає всі голоси та коментарі користувачів.

### GET `/api/users/:id`

Повертає дані одного користувача.

### PUT `/api/users/:id`

Оновлює дані користувача.

Body:

```json
{
  "blob": {
    "name": "О. Коваль",
    "votes": {
      "A1": "keep"
    },
    "comments": {
      "A1": [
        { "t": 1710000000000, "txt": "Коментар" }
      ]
    }
  }
}
```

## Важливо

Цей варіант не має авторизації. Будь-хто, хто відкриє борд, зможе голосувати та коментувати. Для внутрішнього командного обговорення цього може бути достатньо, але для публічного доступу краще додати авторизацію або хоча б приватний URL/API key.
