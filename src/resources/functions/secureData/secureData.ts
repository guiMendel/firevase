type FunctionPropertyNames<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends Function ? K : never
}[keyof T]

export const fieldsNotToUpload = [
  'createdAt',
  'modifiedAt',
  'password',
  'senha',
  'id',
] as const

export type FieldsNotToUpload = (typeof fieldsNotToUpload)[number]

/** Remove metodos, dados que nao queremos fazer upload, e campos adicionais solicitados */
export const secureData = <D extends Record<string, any>, F extends string>(
  data: D,
  ...removeFields: F[]
): Omit<D, F | FunctionPropertyNames<D> | FieldsNotToUpload> => {
  // Mantem os campos de undefined
  const undefinedFields = Object.entries(data).reduce(
    (undefinedFields, [fieldName, fieldValue]) => {
      if (fieldValue === undefined)
        return { ...undefinedFields, [fieldName]: undefined }

      return undefinedFields
    },
    {} as Record<string, undefined>
  )

  const secureData = {
    // Mantem os campos de undefined
    ...undefinedFields,
    // Remove metodos
    ...JSON.parse(JSON.stringify(data)),
  } as D

  for (const field of [...removeFields, ...fieldsNotToUpload])
    delete secureData[field]

  return secureData
}
