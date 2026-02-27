// Shared global flag: true when chat screen mic is active
// Used to prevent wake word listener from conflicting with chat mic
let _chatMicActive = false;

export const chatMicState = {
  get active() { return _chatMicActive; },
  set(val: boolean) { _chatMicActive = val; },
};
