import { FieldsNotToUpload, fieldsNotToUpload, secureData } from '.'


describe('secureData', () => {
  it('remove metodos', () => {
    const method = 'baba'

    const object = { [method]: () => {}, ok: 2 }

    expect(object).toHaveProperty(method)

    expect(secureData(object)).not.toHaveProperty(method)
  })

  it('remove campos que nao devem ser subidos', () => {
    const object = fieldsNotToUpload.reduce(
      (object, field) => ({ ...object, [field]: true }),
      {} as Record<FieldsNotToUpload, true>
    )

    for (const field of fieldsNotToUpload) expect(object).toHaveProperty(field)

    for (const field of fieldsNotToUpload)
      expect(secureData(object)).not.toHaveProperty(field)
  })

  it('remove campos adicionais', () => {
    type Field = 'baba' | 'yaga' | 'scooby'

    const removeFields: Field[] = ['baba', 'yaga']

    const object = [...removeFields, 'scooby'].reduce(
      (object, field) => ({ ...object, [field]: true }),
      {} as Record<Field, true>
    )

    for (const field of removeFields) expect(object).toHaveProperty(field)

    for (const field of removeFields)
      expect(secureData(object, ...removeFields)).not.toHaveProperty(field)
  })
})
