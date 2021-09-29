interface IStates {
  readonly current: Nullable<string>;
  readonly isLocked: boolean;
  readonly all: StatesTransition[];

  actions(from: string): StatesTransition[];
  metas(from: string): StatesMeta[];

  add(state: string): Nullable<StatesMeta>;
  when(at: string, to: string, on: string, handler: Nullable<StatesTransitionHandler>): any;

  subscribe(listener: StatesTransitionHandler): Nullable<string>;
  unsubscribe(subscriptionKey: string): boolean;

  change(state: string, run : boolean): boolean;
  has(action: string, state: string, conform: boolean): Nullable<boolean>;
  get(action: string): Nullable<StatesTransition>;
  execute(action: string): boolean;
  on(action: string, listener: StatesTransitionHandler): boolean;

  reset(): void;
  dispose(): void;

  lock(key: string): void;
  unlock(key: string): void;
}
