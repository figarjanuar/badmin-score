import { useRouter } from 'vue-router'

export function useAppBack() {
  const router = useRouter()

  return function goBack() {
    if (router.options.history.state.back) {
      router.back()
    } else {
      router.replace({ name: 'dashboard' })
    }
  }
}
