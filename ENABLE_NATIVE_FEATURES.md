# 🔓 Как включить Face ID и Speech Recognition

## 📋 Что было отключено

Для совместимости с **Expo Go** были отключены:
- 📸 **Face ID** (face login/registration)
- 🎤 **Speech Recognition** (voice commands в chat)

---

## ✅ Как вернуть эти функции

### Шаг 1: Обновите `app.json`

**Откройте:** `app.json`

**Найдите:**
```json
"plugins": [
  "expo-router",
  "expo-font"
],
```

**Замените на:**
```json
"plugins": [
  "expo-router",
  "expo-font",
  [
    "expo-camera",
    {
      "cameraPermission": "Allow HRLeave to use your camera for Face ID and profile photos."
    }
  ],
  [
    "expo-speech-recognition",
    {
      "microphonePermission": "Allow HRLeave to access your microphone for voice commands.",
      "speechRecognitionPermission": "Allow HRLeave to use speech recognition for Hey HR voice activation.",
      "android": {
        "packageName": "android.speech.action.RECOGNIZE_SPEECH"
      }
    }
  ]
],
```

---

### Шаг 2: Раскомментируйте Face ID в `login.tsx`

**Откройте:** `app/(auth)/login.tsx`

**Найдите:**
```tsx
// import { FaceLogin } from '@/components/FaceLogin'; // Disabled for Expo Go
```

**Замените на:**
```tsx
import { FaceLogin } from '@/components/FaceLogin';
```

**Найдите:**
```tsx
// const [showFaceLogin, setShowFaceLogin] = useState(false); // Disabled for Expo Go
```

**Замените на:**
```tsx
const [showFaceLogin, setShowFaceLogin] = useState(false);
```

**Найдите:**
```tsx
{/* Face ID button - Disabled for Expo Go */}
{/* <TouchableOpacity
  style={[styles.faceIdButton, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
  onPress={() => setShowFaceLogin(true)}
>
  <Ionicons name="scan-outline" size={24} color={colors.primary} />
  <Text style={[styles.faceIdText, { color: colors.textPrimary }]}>Login with Face ID</Text>
</TouchableOpacity> */}
```

**Замените на:**
```tsx
{/* Face ID button */}
<TouchableOpacity
  style={[styles.faceIdButton, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
  onPress={() => setShowFaceLogin(true)}
>
  <Ionicons name="scan-outline" size={24} color={colors.primary} />
  <Text style={[styles.faceIdText, { color: colors.textPrimary }]}>Login with Face ID</Text>
</TouchableOpacity>
```

**Найдите:**
```tsx
{/* Face ID Login Modal - Disabled for Expo Go */}
{/* <FaceLogin
  visible={showFaceLogin}
  onClose={() => setShowFaceLogin(false)}
  onSuccess={() => {
    setShowFaceLogin(false);
    router.replace('/(tabs)');
  }}
/> */}
```

**Замените на:**
```tsx
{/* Face ID Login Modal */}
<FaceLogin
  visible={showFaceLogin}
  onClose={() => setShowFaceLogin(false)}
  onSuccess={() => {
    setShowFaceLogin(false);
    router.replace('/(tabs)');
  }}
/>
```

---

### Шаг 3: Раскомментируйте Face ID в `profile.tsx`

**Откройте:** `app/(tabs)/profile.tsx`

**Найдите:**
```tsx
// import { FaceRegistration } from '@/components/FaceRegistration'; // Disabled for Expo Go
```

**Замените на:**
```tsx
import { FaceRegistration } from '@/components/FaceRegistration';
```

**Найдите:**
```tsx
// const [showFaceRegistration, setShowFaceRegistration] = useState(false); // Disabled for Expo Go
```

**Замените на:**
```tsx
const [showFaceRegistration, setShowFaceRegistration] = useState(false);
```

**Найдите закомментированный TouchableOpacity для Face ID и раскомментируйте:**
```tsx
{/* Disabled for Expo Go */}
{/* <TouchableOpacity style={[...]} onPress={() => setShowFaceRegistration(true)}>
  ...
</TouchableOpacity> */}
```

**Замените на:**
```tsx
<TouchableOpacity style={[styles.infoRow, styles.infoRowBorder, { borderBottomColor: colors.border }]} onPress={() => setShowFaceRegistration(true)}>
  <View style={[styles.infoIconWrap, { backgroundColor: colors.primary + '22' }]}>
    <Ionicons name="scan-outline" size={16} color={colors.primary} />
  </View>
  <Text style={[styles.infoValue, { flex: 1, color: colors.textPrimary }]}>
    {user?.faceRegisteredAt ? 'Update Face ID' : 'Register Face ID'}
  </Text>
  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
</TouchableOpacity>
```

**Найдите закомментированный FaceRegistration Modal и раскомментируйте:**
```tsx
{/* Face ID Registration Modal - Disabled for Expo Go */}
{/* {userId && (
  <FaceRegistration ... />
)} */}
```

**Замените на:**
```tsx
{/* Face ID Registration Modal */}
{userId && (
  <FaceRegistration
    visible={showFaceRegistration}
    userId={userId as Id<'users'>}
    onClose={() => setShowFaceRegistration(false)}
    onSuccess={() => {
      setShowFaceRegistration(false);
    }}
  />
)}
```

---

### Шаг 4: Включите Speech Recognition в `chat.tsx`

**Откройте:** `app/(tabs)/chat.tsx`

**Найдите:**
```tsx
// Expo Go compatibility: Speech recognition disabled
const ExpoSpeechRecognitionModule = null as any;
const useSpeechRecognitionEvent = (event: string, handler: any) => {};
```

**Замените на:**
```tsx
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
```

**Найдите в `startVoiceInput` функции:**
```tsx
// Disabled for Expo Go
if (!ExpoSpeechRecognitionModule) {
  Alert.alert('Voice Input Unavailable', 'Voice input requires a development build. Please use text input instead.');
  return;
}
```

**Удалите эту проверку** (или закомментируйте).

---

### Шаг 5: Создайте Development Build

Теперь native modules включены, и нужно создать **Development Build**:

#### Для Android:
```bash
cd Desktop/office-mobile
npx eas build --profile development --platform android
```

Дождитесь окончания сборки (~15-20 минут), скачайте APK и установите на Android устройство.

#### Для iOS (требуется Apple Developer Account $99/год):
```bash
cd Desktop/office-mobile
npx eas build --profile development --platform ios
```

Установите через TestFlight.

---

### Шаг 6: Запустите с Development Client

**Вместо Expo Go используйте:**
```bash
cd Desktop/office-mobile
npx expo start --dev-client
```

Откройте приложение на устройстве (не Expo Go, а установленный development build).

---

## ⚠️ Важно

### ❌ **НЕ БУДЕТ РАБОТАТЬ в Expo Go:**
- Face ID
- Speech Recognition

### ✅ **БУДЕТ РАБОТАТЬ в Development Build:**
- Все функции, включая Face ID и Speech Recognition

---

## 🎯 Краткая инструкция

```bash
# 1. Раскомментируйте код (см. выше)
# 2. Обновите app.json (добавьте plugins)
# 3. Создайте development build
npx eas build --profile development --platform android

# 4. Установите APK на устройство
# 5. Запустите с dev-client
npx expo start --dev-client
```

---

## 📚 Дополнительно

### Проверьте зависимости:

```bash
npm install expo-face-detector expo-speech-recognition expo-camera
```

### Очистите кэш:

```bash
npx expo start --clear --dev-client
```

---

## ✅ Результат

После выполнения всех шагов:
- ✅ Face ID login/registration работает
- ✅ Voice commands в chat работают
- ✅ Camera permissions настроены
- ✅ Microphone permissions настроены

---

**Дата:** 27 февраля 2026  
**Требуется:** Development Build (не Expo Go)
