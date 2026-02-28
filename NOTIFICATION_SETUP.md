# 📱 Настройка Push-уведомлений для Pomodoro

## ⚠️ Важно!
`expo-notifications` **не работает в Expo Go**! Нужно собрать development build.

## 📋 Шаги для активации уведомлений:

### 1. Установка зависимостей (уже сделано ✅)
```bash
npm install expo-notifications
```

### 2. Пересборка нативных модулей
```bash
cd Desktop/office-mobile

# Для Android
npx expo prebuild --platform android
npx expo run:android

# Для iOS
npx expo prebuild --platform ios
npx expo run:ios
```

### 3. Альтернатива: EAS Build
Если не хотите локально собирать:

```bash
# Установите EAS CLI
npm install -g eas-cli

# Войдите в Expo
eas login

# Создайте development build
eas build --profile development --platform android

# Или для iOS
eas build --profile development --platform ios
```

### 4. Настройка app.json (если нужно)
Добавьте в `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#2563eb",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#2563eb",
      "androidMode": "default",
      "androidCollapsedTitle": "HR Office"
    }
  }
}
```

## 🧪 Тестирование

### Тест 1: Проверка разрешений
Откройте приложение - должно запросить разрешение на уведомления.

### Тест 2: Запуск Pomodoro
1. Откройте веб-версию (`localhost:3001`)
2. В user menu откройте Pomodoro Timer
3. Переключите на "Short Break" (5 минут)
4. Нажмите "Start"
5. Подождите 5 минут (или измените duration в коде для теста)
6. На телефоне должно прийти уведомление!

## 🔍 Отладка

### Проверка логов
```bash
# Android
npx expo run:android

# Смотрите в консоль:
# "Notification scheduled: ..."
# "Push notification token: ..."
```

### Проверка в коде
В `Desktop/office-mobile/components/PomodoroNotificationListener.tsx` добавьте логи:

```typescript
useEffect(() => {
  if (activeSession) {
    console.log('🍅 Active Pomodoro session:', activeSession);
  }
}, [activeSession]);
```

## ⚡ Быстрый тест (без ожидания 5 минут)

Измените duration в веб-версии для теста:

```typescript
// Desktop/office/src/components/productivity/PomodoroTimer.tsx
const DURATIONS = {
  pomodoro: 10,      // Было: 25 * 60 → Тест: 10 секунд
  shortBreak: 10,    // Было: 5 * 60 → Тест: 10 секунд
  longBreak: 15,     // Было: 15 * 60 → Тест: 15 секунд
};
```

## 📱 Требования

### Android:
- ✅ Android 5.0+ (API 21+)
- ✅ Google Play Services
- ✅ Разрешение на уведомления

### iOS:
- ✅ iOS 10+
- ✅ Apple Developer Account (для push)
- ✅ Разрешение на уведомления

## ❓ Проблемы?

### "Expo Go не поддерживает notifications"
➡️ Используйте `npx expo run:android` или EAS Build

### "Уведомления не приходят"
1. Проверьте разрешения в настройках телефона
2. Проверьте что таймер действительно завершился
3. Проверьте логи в консоли

### "Cannot find module expo-notifications"
➡️ Запустите `npm install` и `npx expo prebuild`

## 🎯 Готово!

После успешной сборки уведомления будут работать:
- 🎉 "Pomodoro Complete!" - после 25 минут
- 💪 "Break Over!" - после 5 минут
- ✨ "Long Break Complete!" - после 15 минут

Со звуком, вибрацией и высоким приоритетом!
