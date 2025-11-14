// 扩展 Window 接口以支持 ethereum 对象
interface Window {
  ethereum?: {
    request: (args: {
      method: string
      params?: any[]
    }) => Promise<any>
    on?: (event: string, handler: (...args: any[]) => void) => void
    removeListener?: (event: string, handler: (...args: any[]) => void) => void
  }
}
