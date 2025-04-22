import { ref, Ref, watch, watchEffect } from "@vue/runtime-core"
import { getRequestParams, HiRequestArgument, useBusPost } from "hi-http"
import { getFieldValueByPath } from "hi-utils-pro"

export interface HiDataSourcesApiConfig<T> {
  from?: string
  default?: () => Ref<T>
  args: HiRequestArgument<T>
}

export function useAsyncData(
  data_config: HiDataSourcesApiConfig<any>,
  props: any
) {
  const res = ref<any>(null)
  let prev_param = {}
  if (data_config.default) {
    res.value = data_config.default()
  } else {
    watchEffect(async () => {
      if (data_config.args) {
        let [url, params, options] = data_config.args
        params = getRequestParams(params, options, props)
        const new_param_values = Object.values(params).join(',') + url
        const prev_param_values = Object.values(prev_param).join(',') + url
        if (
          new_param_values &&
          prev_param_values &&
          Object.is(new_param_values, prev_param_values)
        ) {
          return
        }
        res.value = await useBusPost(url, params, options)
        prev_param = Object.assign({}, params)
      }
      if (data_config.from) {
        res.value = getFieldValueByPath(data_config.from, props)
      }
      if (!res) {
        return
      }
    })
  }
  return res
}