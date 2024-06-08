import { Relations } from '.'
import { FirevaseClient } from '../firevase'
import { PathsFrom, RelationsFrom } from '../firevase/types'

/** Um map de definicoes de relacao do target resource path */
type TargetsRelations<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof Relations<C, P>
> = RelationsFrom<C>[RelationsFrom<C>[P][R]['targetResourcePath']]

/** Retorna o tipo do target, mas retorna never para relacoes has-many se a relacao oposta dada pelo targetResourcePath for protected e has-one */
// Aqui never eh usado de 2 formas diferentes: primeiro para gerar uma tupla vazia, depois para proibir um tipo invalido
export type ValidHasManyTarget<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof Relations<C, P>,
  T
> = [
  // Gera um objeto que mapeia as relacoes opostas a true se for a condicao proibida, e a never se for de boas
  {
    [OR in keyof TargetsRelations<
      C,
      P,
      R
      // 1. A relacao deve ser has-many
    >]: RelationsFrom<C>[P][R]['type'] extends 'has-many'
      ? // A relacao oposta deve ser 'has-one

        TargetsRelations<C, P, R>[OR]['type'] extends 'has-one'
        ? // A relacao oposta deve ser protected

          TargetsRelations<C, P, R>[OR]['protected'] extends true
          ? // A relacao e a relacao oposta devem ter a mesma relationKey

            TargetsRelations<
              C,
              P,
              R
            >[OR]['relationKey'] extends RelationsFrom<C>[P][R]['relationKey']
            ? true
            : never
          : never
        : never
      : never
    // Gera uma uniao dos valores deste objeto, que sera `never` se for de boas, e sera `true` se for proibido
    // Ja que `never | true` === `true`
  }[keyof TargetsRelations<C, P, R>]
  // Coloca a uniao em uma tupla para verificar contra [never] — explicacao https://stackoverflow.com/questions/53984650/typescript-never-type-inconsistently-matched-in-conditional-type
] extends [never]
  ? // Se for de boas pega o tipo do target da relacao, se nao, proibe com never
    T
  : never

// declare const test: ValidHasManyTarget<Vase, 'players', 'ownedGuilds'>

/** Dado um path P, retorna as relacoes has-one dele que nao sao protected */
export type HasOneRelations<
  C extends FirevaseClient,
  P extends PathsFrom<C>
> = {
  [R in keyof RelationsFrom<C>[P]]: RelationsFrom<C>[P][R]['type'] extends 'has-one'
    ? R
    : never
}[keyof RelationsFrom<C>[P]]

/** Dado um path P, retorna as relacoes has-one dele que nao sao protected */
export type OptionalHasOneRelations<
  C extends FirevaseClient,
  P extends PathsFrom<C>
> = {
  [R in keyof RelationsFrom<C>[P]]: RelationsFrom<C>[P][R]['type'] extends 'has-one'
    ? RelationsFrom<C>[P][R]['protected'] extends false
      ? R
      : never
    : never
}[keyof RelationsFrom<C>[P]]

/** Dado um path P, retorna as relacoes nao has-one dele */
export type NonHasOneRelations<
  C extends FirevaseClient,
  P extends PathsFrom<C>
> = {
  [R in keyof RelationsFrom<C>[P]]: RelationsFrom<C>[P][R]['type'] extends 'has-one'
    ? never
    : R
}[keyof RelationsFrom<C>[P]]
