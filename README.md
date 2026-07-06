# Sysadmin Notes

Профессиональный блокнот для сисадмина: проекты, доступы, инструкции, таблицы, картинки и публичные ссылки.

## Стек

- **Frontend:** Next.js 16, React 19, TipTap, Zustand, Tailwind CSS 4
- **Backend:** NestJS 11, Prisma, PostgreSQL, JWT

## Возможности

### Авторизация и проекты
- Регистрация / вход через защищённую cookie-сессию
- OAuth: GitHub, Google и Яндекс
- SMTP-почта и тестовая отправка из настроек
- Telegram-бот: привязка аккаунта, одноразовый вход, создание и редактирование заметок, паролей и задач
- Управление привязанными способами входа
- Проекты с цветом, иконкой, описанием
- Перенос заметок между проектами
- ПКМ на проекте — редактирование

### Заметки
- Типы: доступ, инструкция, ссылка
- Поля: хост, порт, URL, логин, пароль, TOTP, SSH-ключ, заметка
- Rich-text: заголовки, списки, код, таблицы, ссылки, картинки
- Шаблоны: доступ, инструкция, инцидент, сервер (с таблицей)
- Избранное, закрепление, архив, теги
- Автосохранение, дублирование, экспорт JSON/Markdown, печать
- Копирование всех доступов одной кнопкой

### Поиск и навигация
- Локальный и глобальный поиск (кнопка ALL)
- Командная палитра `⌘K`
- Фильтр по категориям и тегам
- Сортировка: дата, название, тип

### Интерфейс
- Светлая / тёмная / системная тема
- Сворачиваемая боковая панель `⌘B`
- Toast-уведомления
- Skeleton-загрузка
- Адаптивная вёрстка

### Шаринг
- Публичные ссылки на заметку или проект
- Срок действия: 1 / 7 / 30 / 90 дней или без срока
- Скрытие паролей, TOTP и SSH на публичной странице
- Панель управления активными ссылками (копировать / удалить)

### Импорт / экспорт
- Экспорт заметки: JSON, Markdown
- Экспорт проекта: JSON (все заметки)
- Импорт заметок из JSON в проект
- Импорт паролей из Bitwarden, KeePass, 1Password, LastPass, Chrome и Firefox

### Профиль
- Смена имени и пароля в настройках

### Редактор
- Диалоги вместо `prompt` для ссылок и картинок
- Drag & drop изображений в редактор
- Горизонтальный разделитель
- Фокус-режим (на весь экран)

### Горячие клавиши
| Клавиша | Действие |
|---------|----------|
| `⌘K` | Командная палитра |
| `⌘N` | Новая заметка |
| `⌘B` | Свернуть панель |
| `⌘,` | Настройки |

## Запуск

```bash
npm run dev:all
```

- Web: http://localhost:3000
- API: http://localhost:4000/api

## Сборка

```bash
npm run build
npm run build:api
```

## Docker

Быстрый запуск с автоматической генерацией локальных секретов:

```bash
./scripts/docker-up.sh
```

Или вручную:

```bash
cp .env.docker.example .env.docker
# Замените JWT_SECRET и VAULT_ENCRYPTION_SECRET
docker compose --env-file .env.docker up -d --build
```

Приложение будет доступно на http://localhost:3000. API работает внутри Docker-сети
и проксируется через `/api`, поэтому отдельно открывать порт 4000 не требуется.

Полезные команды:

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f
docker compose --env-file .env.docker down
docker compose --env-file .env.docker down -v # также удалить БД и uploads
```

Для внешнего домена укажите в `.env.docker`:

```dotenv
APP_URL=https://notes.example.com
APP_PORT=3000
```

OAuth callback: `https://notes.example.com/api/auth/oauth/<provider>/callback`.

### Почта и Telegram

SMTP настраивается переменными `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
`SMTP_USER`, `SMTP_PASSWORD` и `SMTP_FROM`. После запуска отправьте тестовое
письмо в разделе «Настройки → Интеграции».

Для Telegram создайте бота через `@BotFather`, затем укажите
`TELEGRAM_BOT_TOKEN` и имя без `@` в `TELEGRAM_BOT_USERNAME`. Режим
`TELEGRAM_MODE=polling` работает из Docker без публичного домена. Пользователь
привязывает Telegram одноразовой ссылкой в настройках.

Команды бота:

- `/newnote Заголовок | текст`
- `/newpassword Название | логин | пароль | URL`
- `/newtask Заголовок | описание`
- `/notes`, `/tasks`, `/projects`
- `/note ID`, `/password ID`
- `/editnote ID | заголовок | текст`
- `/editpassword ID | логин | пароль | URL`
- `/edittask ID | todo/in_progress/done | заголовок`
- `/login` — одноразовая ссылка входа

Для webhook-режима задайте `TELEGRAM_MODE=webhook` и
`TELEGRAM_WEBHOOK_SECRET`, затем зарегистрируйте URL
`https://notes.example.com/api/integrations/telegram/webhook` через Bot API
`setWebhook` с тем же `secret_token`.

Для локального `http://localhost` оставьте `COOKIE_SECURE` пустым или задайте
`false`. На production-домене с HTTPS укажите `APP_URL=https://...` — защищённая
cookie включится автоматически.
Данные сохраняются в volumes `postgres-data` и `api-uploads`. PostgreSQL доступен
локально только на `127.0.0.1:5432` для Prisma Studio и разработки.

Если проект ранее запускался с SQLite, старый volume `sysadmin-notes_api-data`
не удаляется автоматически и остаётся резервной копией. Новый запуск использует PostgreSQL.
