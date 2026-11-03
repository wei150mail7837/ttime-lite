import { isNotNull } from '../../common/utils/validate'

export const paramsFilter = (obj): object => {
  const newObj = JSON.parse(JSON.stringify(obj))
  newObj['appId'] = 'appId***'
  newObj['appKey'] = 'appKey***'
  newObj['img'] = 'img***'
  newObj['token'] = 'token***'
  newObj['responseData'] = '***'
  // 隐私：请求原文不打日志
  newObj['translateContent'] = '***'
  newObj['text'] = '***'
  return newObj
}

export const responseFilter = (obj, appId, appKey): object => {
  let str = JSON.stringify(obj)
  if (isNotNull(appId)) {
    str = str.replaceAll(appId, 'appId***')
  }
  if (isNotNull(appKey)) {
    str = str.replaceAll(appKey, 'appKey***')
  }
  return JSON.parse(str)
}

export const responseFilterByCustomField = (obj, ...fields): object => {
  const newObj = JSON.parse(JSON.stringify(obj))
  fields.map((field) => {
    if (isNotNull(field) && isNotNull(newObj[field])) {
      newObj[field] = '***'
    }
  })
  return newObj
}
