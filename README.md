# Analiz — Корпоративная веб-платформа BI (замена Power BI)

MVP веб-версии аналитической платформы. Загрузка Excel/CSV, дашборды, многопользовательский доступ с ролями, фоновая синхронизация.

## Стек

- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, Celery, Redis, pandas, openpyxl
- **Frontend:** React 18 + TypeScript + Vite, TailwindCSS, Recharts
- **Auth:** JWT, RBAC (admin / analyst / manager / employee)
- **Инфраструктура:** Docker Compose, Nginx

## Быстрый старт

```bash
cp .env.example .env           # отредактируй секреты
docker compose up --build -d
```

Откройте:
- Веб-интерфейс: http://localhost:3000
- API docs (Swagger): http://localhost:8000/docs

**Логин по умолчанию:**
- Email: `admin@analiz.local`
- Пароль: `admin123`

⚠️ Обязательно смените `JWT_SECRET` и пароль администратора в продакшене.

## Структура проекта

```
.
├── backend/             # FastAPI приложение
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── security.py
│   │   ├── deps.py
│   │   ├── celery_app.py
│   │   ├── tasks.py
│   │   ├── routers/     # auth, users, datasets, dashboards
│   │   └── services/    # excel parser
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/            # React + Vite
│   ├── src/
│   │   ├── pages/       # Login, Dashboard, Datasets, Upload, Users
│   │   ├── components/  # Layout
│   │   ├── context/     # AuthContext
│   │   └── api.ts
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── .env.example
```

## Реализованные модули MVP

- [x] JWT-аутентификация и RBAC (4 роли)
- [x] Загрузка Excel/CSV с автоопределением типов колонок
- [x] Хранение данных в PostgreSQL (JSONB строки)
- [x] Дашборд с динамическими графиками (агрегации sum/avg/count/min/max)
- [x] Управление пользователями (CRUD для админа)
- [x] Аудит действий (вход, создание/удаление пользователей и данных)
- [x] Celery worker + beat для фоновых задач
- [x] Изоляция данных по отделам для manager/employee

## Roadmap

- [ ] Подключение SQL-источников (PostgreSQL, MySQL, MS SQL)
- [ ] Google Sheets / REST API источники
- [ ] Экспорт отчётов в Excel/PDF
- [ ] 2FA, SSO/LDAP
- [ ] Шифрование загружаемых файлов
- [ ] Десктоп-приложение (Electron/Tauri)
- [ ] Мобильное приложение (React Native)

## Разработка локально без Docker

Backend:
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```
