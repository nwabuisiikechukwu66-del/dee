// Stub for local development without Convex setup
// Replace with real generated file after running: npx convex dev

export function mutation(config: any) { return config }
export function query(config: any) { return config }  
export function action(config: any) { return config }

export const v = {
  string: () => 'string' as any,
  number: () => 'number' as any,
  boolean: () => 'boolean' as any,
  optional: (t: any) => t,
  array: (t: any) => [t] as any,
  object: (t: any) => t,
  id: (t: string) => t as any,
  union: (...args: any[]) => args[0],
  null: () => null as any,
}
