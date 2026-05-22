# Analiz — Корпоративная BI-платформа

Веб-замена Power BI. Загрузка Excel/CSV, дашборды с графиками, многопользовательский доступ с ролями, фоновая синхронизация данных.

---

## Содержание

- [Стек технологий](#стек-технологий)
- [Быстрый старт (Docker)](#быстрый-старт-docker)
- [Локальная разработка без Docker](#локальная-разработка-без-docker)
- [Переменные окружения](#переменные-окружения)
- [Структура проекта](#структура-проекта)
- [API документация](#api-документация)
- [Роли и права доступа](#роли-и-права-доступа)
- [Работа с Git](#работа-с-git)
- [Roadmap](#roadmap)

---

## Стек технологий

| Слой | Технология |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic |
| База данных | PostgreSQL 16 |
| Очереди | Celery + Redis |
| Парсинг файлов | pandas, openpyxl |
| Frontend | React 18, TypeScript, Vite |
| UI | TailwindCSS |
| Графики | Recharts |
| Аутентификация | JWT (jose), bcrypt |
| Инфраструктура | Docker, Docker Compose, Nginx |

---

## Быстрый старт (Docker)

### Требования

- Docker 19+ (поддерживаются как старые, так и новые версии)
- Git

### Проверь версию Docker Compose

```bash
docker compose version      # новый синтаксис (Docker 20.10+)
docker-compose --version    # старый синтаксис (отдельная утилита)
```

Используй ту команду, которая работает на твоём сервере.

### Запуск

```bash
# 1. Клонировать репозиторий
git clone https://github.com/nnfirdavs96-cell/analiz.git
cd analiz

# 2. Создать файл окружения
cp .env.example .env
# Открой .env и обязательно смени JWT_SECRET и ADMIN_PASSWORD!
nano .env

# 3. Запустить (выбери нужный вариант)
docker compose up --build -d        # Docker 20.10+ (новый)
# ИЛИ
docker-compose up --build -d        # старый docker-compose

# 4. Проверить что всё работает
docker compose ps
# ИЛИ
docker-compose ps
```

### Что запустится

| Сервис | Адрес |
|---|---|
| Веб-интерфейс | http://localhost:3000 |
| API (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

**Логин по умолчанию:** `admin@analiz.local` / `admin123`

> ⚠️ Обязательно смени пароль и `JWT_SECRET` перед деплоем на сервер!

### Остановить и удалить

```bash
docker compose down          # остановить контейнеры (новый)
docker-compose down          # остановить контейнеры (старый)

docker compose down -v       # остановить и удалить данные (БД, файлы)
```

### Посмотреть логи

```bash
docker compose logs -f backend    # логи API
docker compose logs -f worker     # логи Celery
docker compose logs -f frontend   # логи Nginx
# (заменить на docker-compose если старая версия)
```

### Установить docker-compose на старый сервер (если нет)

```bash
# Ubuntu / Debian
sudo apt-get update && sudo apt-get install -y docker-compose

# Или вручную (последняя версия)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

---

## Локальная разработка без Docker

Удобно, когда нужно быстро менять код без пересборки образов.

### Требования

- Python 3.12+
- Node.js 20+
- PostgreSQL 16
- Redis 7

### Backend

```bash
cd backend

# Создать и активировать виртуальное окружение
python -m venv .venv
source .venv/bin/activate        # Linux / macOS
# .venv\Scripts\activate         # Windows

# Установить зависимости
pip install -r requirements.txt

# Создать .env в корне проекта (или backend/) с настройками БД
# DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/analiz
# REDIS_URL=redis://localhost:6379/0
# JWT_SECRET=my-dev-secret

# Запустить сервер
uvicorn app.main:app --reload --port 8000
```

Swagger доступен по адресу: http://localhost:8000/docs

### Celery Worker (фоновые задачи)

```bash
# В отдельном терминале, в папке backend/ с активированным venv
celery -A app.celery_app worker --beat --loglevel=info
```

### Frontend

```bash
cd frontend

npm install

# Запустить dev-сервер
npm run dev
```

Приложение: http://localhost:5173

> В dev-режиме запросы `/api/*` автоматически проксируются на `http://localhost:8000` (настроено в `vite.config.ts`).

---

## Переменные окружения

Скопируй `.env.example` в `.env` и настрой значения:

| Переменная | По умолчанию | Описание |
|---|---|---|
| `POSTGRES_USER` | `analiz` | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | `analiz_pass` | Пароль PostgreSQL |
| `POSTGRES_DB` | `analiz` | Имя базы данных |
| `JWT_SECRET` | `change-me-...` | **Секретный ключ JWT — обязательно смени!** |
| `ADMIN_EMAIL` | `admin@analiz.local` | Email администратора при первом запуске |
| `ADMIN_PASSWORD` | `admin123` | Пароль администратора при первом запуске |

---

## Структура проекта

```
analiz/
├── backend/
│   ├── app/
│   │   ├── main.py            # Точка входа FastAPI, startup event
│   │   ├── config.py          # Настройки через pydantic-settings
│   │   ├── database.py        # SQLAlchemy engine и сессия
│   │   ├── models.py          # Модели БД: User, Dataset, DatasetRow, AuditLog, SyncJob
│   │   ├── schemas.py         # Pydantic схемы (request/response)
│   │   ├── security.py        # JWT и bcrypt
│   │   ├── deps.py            # FastAPI зависимости (current_user, require_roles)
│   │   ├── celery_app.py      # Настройка Celery
│   │   ├── tasks.py           # Фоновые задачи
│   │   ├── routers/
│   │   │   ├── auth.py        # POST /api/auth/login, GET /api/auth/me
│   │   │   ├── users.py       # CRUD пользователей (admin only)
│   │   │   ├── datasets.py    # Загрузка и управление наборами данных
│   │   │   └── dashboards.py  # Агрегации и сводка KPI
│   │   └── services/
│   │       └── excel.py       # Парсер Excel/CSV (pandas)
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Роутинг
│   │   ├── main.tsx           # Точка входа React
│   │   ├── api.ts             # Axios клиент + TypeScript типы
│   │   ├── index.css          # Tailwind base styles
│   │   ├── context/
│   │   │   └── AuthContext.tsx  # Глобальное состояние авторизации
│   │   ├── components/
│   │   │   └── Layout.tsx     # Шапка и навигация
│   │   └── pages/
│   │       ├── Login.tsx      # Страница входа
│   │       ├── Dashboard.tsx  # KPI + столбчатый и круговой графики
│   │       ├── Datasets.tsx   # Список наборов с превью строк
│   │       ├── Upload.tsx     # Форма загрузки Excel/CSV
│   │       └── Users.tsx      # Управление пользователями (admin)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── nginx.conf             # Nginx: SPA fallback + proxy /api → backend
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API документация

После запуска Swagger доступен по адресу: **http://localhost:8000/docs**

### Основные эндпоинты

| Метод | URL | Описание | Роль |
|---|---|---|---|
| `POST` | `/api/auth/login` | Получить JWT токен | все |
| `GET` | `/api/auth/me` | Текущий пользователь | все |
| `GET` | `/api/users` | Список пользователей | admin |
| `POST` | `/api/users` | Создать пользователя | admin |
| `DELETE` | `/api/users/{id}` | Удалить пользователя | admin |
| `GET` | `/api/datasets` | Список наборов данных | все |
| `POST` | `/api/datasets/upload` | Загрузить Excel/CSV | admin, analyst, manager |
| `GET` | `/api/datasets/{id}/rows` | Строки набора данных | все |
| `DELETE` | `/api/datasets/{id}` | Удалить набор | admin, analyst |
| `POST` | `/api/dashboards/aggregate` | Агрегация по колонкам | все |
| `GET` | `/api/dashboards/summary` | Сводка KPI | все |

---

## Роли и права доступа

| Роль | Загрузка данных | Все данные | Только свой отдел | Управление пользователями |
|---|:---:|:---:|:---:|:---:|
| `admin` | ✅ | ✅ | — | ✅ |
| `analyst` | ✅ | ✅ | — | ❌ |
| `manager` | ✅ | ❌ | ✅ | ❌ |
| `employee` | ❌ | ❌ | ✅ | ❌ |

---

## Работа с Git

### Ветки

| Ветка | Назначение |
|---|---|
| `main` | Стабильная версия, деплой на сервер |
| `claude/session-review-CjsdN` | MVP BI-платформы (текущий PR) |
| `feature/*` | Новые функции |
| `fix/*` | Исправления |

### Как внести изменения

```bash
# 1. Создать ветку от main
git checkout main && git pull origin main
git checkout -b feature/название-задачи

# 2. Вносить изменения, коммитить
git add .
git commit -m "feat: описание что сделано"

# 3. Запушить ветку
git push -u origin feature/название-задачи

# 4. Создать Pull Request на GitHub через web-интерфейс
# main ← feature/название-задачи
```

### Соглашение по коммитам

```
feat:  — новая функция
fix:   — исправление бага
refactor: — рефакторинг без изменения поведения
docs:  — документация
test:  — тесты
chore: — инфраструктура, зависимости
```

---

## Roadmap

### Этап 2 — Источники данных
- [ ] Подключение PostgreSQL / MySQL / MS SQL Server
- [ ] Интеграция Google Sheets (API)
- [ ] Подключение внешних REST API
- [ ] Расписание синхронизации через UI

### Этап 3 — Дашборды
- [ ] Drill-down (детализация по клику)
- [ ] Линейные графики и таблицы
- [ ] Фильтры по дате и отделу
- [ ] Экспорт в Excel / PDF

### Этап 4 — Безопасность
- [ ] Двухфакторная аутентификация (2FA / TOTP)
- [ ] SSO / LDAP / Active Directory
- [ ] Шифрование загружаемых файлов (AES-256)

### Этап 5 — Другие платформы
- [ ] Десктоп-приложение (Electron или Tauri)
- [ ] Мобильное приложение (React Native, iOS + Android)
- [ ] PWA (Progressive Web App)
