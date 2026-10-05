import { createContext } from 'react'

/** ค่าที่ useSnackbar() ได้รับ: { show(message, options), dismiss() } */
export const SnackbarContext = createContext(null)
