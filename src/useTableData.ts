import { ComputedRef, inject, reactive, ref, watch } from "@vue/runtime-core"
import { getRequestParams, HiRequestArgument, useBusGet, useBusPost } from "hi-http"
import { useState } from "./useState"
import { getDeepCopy, getFieldValueByPath, isDeepEqual } from "hi-utils-pro"

/**
 * 获取表格数据
 */
export interface HiTableDataConfig<T> {
  from?: string
  args?: HiRequestArgument<T>
  default: () => [T]
}
type HiPaginationParam = [number, number, string, string]
export function useTableData(
  data_config: HiTableDataConfig<any>,
  pagination_config: ComputedRef<HiPaginationParam>,
  onSuccess: (data: any) => void,
) {
  const page_state: any = inject('page_state', reactive({}))
  let prev_params_flag = {}
  if (!data_config) {
    return null
  }
  if (data_config.default) {
    const data = data_config.default()
    watch(
      data,
      (data) => {
        const loading = useState('default_table_data_loading', () => true)
        loading.value = true
        const data_res = data.filter((item: any) => item)
        data_res && onSuccess({ data: data_res, total: data_res.length })
      },
      {
        immediate: true,
        deep: true
      }
    )
    return null
  }
  const reload_mark = ref<number>(0)
  if (data_config.args) {
    /**
     * @page: arrangement-gas-generation
     * @requires: 点击分厂分月发电用气安排、省统调发电用气电量分月安排两列的查看按钮
     *            分别调用不同的数据接口展示在下面的 table 里
     * @logic: 引入 pageStroe 管理页面全局数据
     */
    const options_value_string = data_config.args[2]
      ? Object.values(data_config.args[2]).join('')
      : ''
    watch(
      [(): any => data_config.args, pagination_config, reload_mark],
      async ([args, [page_current, page_size, current_name, size_name], _reload_mark]) => {
        let [url, params, options]: any = args
        params = getRequestParams(params, options, { params })
        if (url.includes('{{') && url.includes('}}')) {
          url = url.replace(/{{(.*?)}}/g, (_: any, param_key: string) => {
            if (param_key.includes('||')) {
              const [key, default_value] = param_key.split('||')
              return Reflect.get(params, key) || default_value
            }
            return Reflect.get(params, param_key)
          })
        }
        /**
         * arrangement-gas-generation
         * 气电联动/发电用气安排
         * 查看详情功能
         */
        // if (
        //   options_value_string.includes('state') &&
        //   !options_value_string.includes('page_state')
        // ) {
        //   const state = usePageStore()
        //   params = getRequestParams(params, options, { state })
        // }
        /**
         * 2024-08-28
         * power-sales-company-general
         * 售电公司概况
         * 列表接口需要传入数据展示区点击后得到的type
         */
        if (options_value_string.includes('page_state')) {
          params = getRequestParams(params, options, { page_state })
        }
        params = {
          ...params,
          [current_name]: page_current,
          [size_name]: page_size
        }
        let params_flag = {
          ...params,
          reload_mark: _reload_mark
        }
        if (!url || !isDeepEqual(params_flag, prev_params_flag)) {
          return
        }
        prev_params_flag = getDeepCopy(params_flag)

        const loading = useState(`${url.replaceAll('/', '_')}_table_data_loading`, () => true)
        loading.value = true
        if (options?.request_method === 'get') {
          await useBusGet(url, params, {
            onFormat(data: any) {
              if (options?.res_key_name) {
                let res_data = getFieldValueByPath(options?.res_key_name, data)
                /**
                 * 2024-07-08
                 * multi-dimension-presentation
                 * 汇总数据包裹 数组
                 */
                res_data = Array.isArray(res_data) ? res_data : [res_data]
                return {
                  data: res_data,
                  total: res_data.length
                }
              }
              return {
                data:
                  data.result ||
                  data.rows ||
                  data.resultValue.rows ||
                  data.resultValue.records ||
                  data.resultValue,
                total: data.total || data.resultValue.total || data.resultValue.length
              }
            },
            ...options,
            onSuccess,
            onFail() {
              loading.value = false
            }
          })
        } else {
          await useBusPost(url, params, {
            onFormat(data: any) {
              if (!data) {
                return {
                  data: [],
                  total: 0
                }
              }
              if (options?.res_key_name) {
                let res_data = getFieldValueByPath(options?.res_key_name, data)
                /**
                 * 2024-07-08
                 * multi-dimension-presentation
                 * 汇总数据包裹 数组
                 */
                res_data = Array.isArray(res_data) ? res_data : [res_data]
                return {
                  data: res_data,
                  total: res_data.length,
                  response_data: data.resultValue
                }
              }
              let res_data =
                (Array.isArray(data.result) && data.result) ||
                data.rows ||
                data.resultValue?.rows ||
                data.resultValue?.records ||
                (options?.res_data_name && getFieldValueByPath(options?.res_data_name, data)) ||
                data.resultValue
              // data.resultValue.itemCount ||
              let res_total =
                data.total ||
                data.resultValue?.total?.toString() ||
                (options?.res_total_name && getFieldValueByPath(options?.res_total_name, data)) ||
                res_data.length
              if (options?.format_table_row_data) {
                const { format_key, format_type, format_content_key, format_condition_config } =
                  options.format_table_row_data
                res_data = res_data.map((item: any) => {
                  let format_value: any = {}
                  if (format_type === 'obj_array') {
                    Object.entries(format_content_key).forEach(([key, value_key]: any) => {
                      const _value = Reflect.get(item, value_key)
                      Reflect.set(format_value, key, _value)
                    })
                    Reflect.set(item, format_key, [format_value])
                  }
                  if (format_type === 'string') {
                    const { type, condition_data, value_1, value_2 } = format_condition_config
                    const format_content_value = Reflect.get(item, format_content_key)
                    if (type === 'includes') {
                      format_value = format_content_value.includes(condition_data)
                        ? value_1
                        : value_2
                      Reflect.set(item, format_key, format_value)
                    }
                  }
                  return item
                })
              }
              /**
               * @page 浮动比例_slidingScales
               */
              if (url === 'engine-finance/fsAgtBaFloatscale/queryFsAgtBaFloatscaleInfos') {
                res_data = res_data.map((row: any) => {
                  const { touType, floatPctStr } = row
                  const touTypes = touType.split(',')
                  const floatPctStrs = floatPctStr ? floatPctStr.split(',') : ''
                  touTypes.forEach((i: string, index: number) => {
                    row[`touType${i}`] = floatPctStrs[index]
                  })
                  return row
                })
              }
              let column_data
              if (options?.res_columns_name) {
                column_data = getFieldValueByPath(options.res_columns_name, data)
              }
              // if (options?.update_config) {
              //   Object.entries(options?.update_config).forEach((item: any) => {
              //     let [key_name, value_name] = item
              //     let data_source
              //     let data_value = getFieldValueByPath(value_name, data)
              //     if (key_name.includes('.')) {
              //       const keys = key_name.split('.')
              //       if (keys[0] === 'page_state') {
              //         Reflect.set(page_state, keys[1], data_value)
              //       }
              //     }
              //   })
              // }
              return {
                column_data,
                data: res_data,
                total: Number(res_total)
              }
            },
            ...options,
            onSuccess,
            onFail() {
              loading.value = false
            }
          })
        }
      },
      { immediate: true, deep: true }
    )
  }
  if (data_config.from) {
    watch(
      reload_mark,
      () => {
        const loading = useState(`${data_config.from}_table_data_loading`, () => true)
        loading.value = true
        const data_res = getFieldValueByPath(data_config.from, { page_state }, [])
        data_res && onSuccess({ data: data_res, total: data_res.length })
      },
      {
        immediate: true
      }
    )
  }
  function onReload() {
    reload_mark.value++
  }
  return onReload
}