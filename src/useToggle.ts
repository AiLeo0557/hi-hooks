import useState from "./useState"

/**
 * @function 状态转换
 * @param key 状态名称唯一标识
 * @param defaultValue
 * @returns
 */
export function useToggle(...args: any) {
  const state = useState(...args)
  function onToggle(value?: boolean) {
    if (typeof value === 'boolean') {
      state.value = value
      return
    }
    state.value = !state.value
  }
  return [state, onToggle]
}
