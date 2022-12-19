

export function hasKey<O extends object>(obj: O, key: PropertyKey): key is keyof O {
    return key in obj
}