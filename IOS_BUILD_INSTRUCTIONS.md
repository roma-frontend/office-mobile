# 🍎 iOS Build Instructions

## Требования для сборки iOS

### 1. macOS (обязательно)
Для сборки iOS приложения **требуется macOS** с установленным Xcode.

### 2. Установка зависимостей

```bash
# Установи Node.js (если ещё не установлен)
brew install node

# Установи CocoaPods (менеджер зависимостей для iOS)
sudo gem install cocoapods

# Установи EAS CLI
npm install -g eas-cli
```

### 3. Настройка EAS

```bash
# Войди в Expo аккаунт
eas login

# Настрой проект для EAS Build
cd C:\Users\namel\Desktop\office-mobile
eas build:configure
```

---

## 📱 Варианты сборки

### Вариант 1: Сборка через EAS Build (Рекомендуется) ⭐

EAS Build — облачный сервис для сборки. **Не требует macOS!**

#### Для TestFlight (App Store):

```bash
# Production сборка для iOS (App Store / TestFlight)
eas build --platform ios --profile production

# Или для development (только симулятор)
eas build --platform ios --profile development
```

#### Для внутреннего тестирования (Ad Hoc):

```bash
# Ad Hoc сборка (до 100 устройств)
eas build --platform ios --profile preview
```

### Вариант 2: Локальная сборка (требуется macOS)

```bash
# Production сборка локально
eas build --platform ios --local

# Development сборка для симулятора
eas build --platform ios --local --profile development
```

---

## 🔧 Настройка eas.json

Создай файл `eas.json` в корне проекта:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "appleId": "your-apple-id@example.com",
      "ascAppId": "your-app-store-connect-app-id",
      "appleTeamId": "your-apple-team-id"
    }
  }
}
```

---

## 📤 Отправка в App Store

### 1. Создай App Store Connect запись

1. Зайди на [App Store Connect](https://appstoreconnect.apple.com)
2. Создай новое приложение
3. Заполни информацию о приложении

### 2. Отправь сборку

```bash
# Отправка в App Store Connect
eas submit --platform ios --latest
```

### 3. TestFlight

После отправки:
1. Зайди в App Store Connect
2. Перейди в раздел TestFlight
3. Добавь тестеров (внутренних или внешних)
4. Отправь на модерацию (для внешних тестеров)

---

## 🚀 Быстрый старт (по шагам)

### Шаг 1: Установка EAS CLI
```bash
npm install -g eas-cli
```

### Шаг 2: Вход в аккаунт
```bash
eas login
```

### Шаг 3: Настройка проекта
```bash
cd C:\Users\namel\Desktop\office-mobile
eas build:configure
```

### Шаг 4: Первая сборка
```bash
# Выбери профиль (production для App Store)
eas build --platform ios
```

### Шаг 5: Мониторинг сборки
```bash
# Смотри лог сборки в реальном времени
eas build:list --watch
```

---

## ⚙️ Конфигурация для iOS оптимизации

В `app.json` уже настроено:

```json
{
  "ios": {
    "bundleIdentifier": "com.hrleave.app",
    "buildNumber": "1",
    "supportsTablet": false,
    "requireFullScreen": true,
    "infoPlist": {
      "NSMicrophoneUsageDescription": "...",
      "NSCameraUsageDescription": "...",
      "UIBackgroundModes": ["fetch", "remote-notification", "voip"]
    }
  }
}
```

---

## 🎯 Профили сборки

| Профиль | Назначение | Распространение |
|---------|------------|-----------------|
| **development** | Разработка | Симулятор / Устройство |
| **preview** | Тестирование | Ad Hoc (до 100 устройств) |
| **production** | App Store | TestFlight / App Store |

---

## 🔍 Мониторинг сборок

```bash
# Список всех сборок
eas build:list

# Детали конкретной сборки
eas build:view <BUILD_ID>

# Отмена сборки
eas build:cancel <BUILD_ID>

# Скачать IPA файл
eas build:download --platform ios --latest
```

---

## 📱 Установка на устройство

### Через TestFlight:
1. Открой TestFlight на iPhone/iPad
2. Найди своё приложение
3. Нажми "Install"

### Через Ad Hoc:
1. Скачай IPA файл
2. Используй Xcode или Apple Configurator
3. Или сервис типа Diawi

---

## ⚡ Оптимизации для iOS

### Включены в конфигурации:
- ✅ `requireFullScreen: true` — для iPhone
- ✅ `supportsTablet: false` — только iPhone
- ✅ `UIBackgroundModes` — фоновые уведомления и VoIP
- ✅ `ITSAppUsesNonExemptEncryption: false` — без шифрования

### Babel оптимизации:
- ✅ `react-native-reanimated/plugin` — плавные анимации
- ✅ Production plugins — удаление console.log

---

## 🆘 Troubleshooting

### Ошибка: "No profiles found"
```bash
# Сбрось профили
eas credentials
```

### Ошибка: "Provisioning profile expired"
```bash
# Обнови профили
eas build --platform ios --clear-credentials
```

### Ошибка: "Bundle identifier taken"
Измени `bundleIdentifier` в `app.json`:
```json
{
  "ios": {
    "bundleIdentifier": "com.hrleave.app.v2"
  }
}
```

---

## 📚 Полезные ссылки

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Apple Developer Program](https://developer.apple.com/programs/)
- [TestFlight Guide](https://developer.apple.com/testflight/)
