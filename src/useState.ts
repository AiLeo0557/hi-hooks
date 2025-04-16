import { reactive, toRef, isRef } from '@vue/runtime-core';
// 定义允许动态键的接口
interface States {
  [key: string]: unknown;
}
const states = reactive<States>({})

export default function useState(...args) {
  const autoKey = typeof args[args.length - 1] === 'string' ? args.pop() : void 0
  if (typeof args[0] !== 'string') {
    args.unshift(autoKey)
  }
  const [_key, init] = args
  if (!_key || typeof _key !== 'string') {
    throw new TypeError('[useState] key must be a string:' + _key)
  }
  if (init !== void 0 && typeof init !== 'function') {
    throw new Error('[useState] init must be a function:' + init)
  }
  const key = '$s' + _key
  const state = toRef(states, key)
  if (state.value === void 0 && init) {
    const initialValue = init()
    if (isRef(initialValue)) {
      states[key] = initialValue
      return initialValue
    }
    state.value = initialValue
  }
  return state
}
