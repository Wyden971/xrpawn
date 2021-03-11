export default class Logger {

  static trace(trace: string, ...args: any[]) {
    if ('WAMPRT_TRACE' in global && global.WAMPRT_TRACE && 'console' in global) {
      // @ts-ignore
      console.log.apply(null, [trace, ...args])
    }
  }
}
