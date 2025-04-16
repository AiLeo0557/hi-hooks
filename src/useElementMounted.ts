import { onMounted, ref } from "@vue/runtime-core";

/**
 * @author: 杜朝辉
 * @description: 该文件用于判断元素是否挂载
 * @date: 2025-04-16
 */
export default function useElementMounted(id: string) {
  const isMounted = ref(false)
  onMounted(() => {
    const element = document.getElementById(id)
    if (element) {
      isMounted.value = true
    }
  })
  return isMounted
}