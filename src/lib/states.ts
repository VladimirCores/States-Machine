export default class States implements IStates {
  static readonly DISPOSE: string = 'states_reserved_action_dispose'
  static readonly EXCEPTION__LOCK_KEY: string = 'LOCK KEY MUST BE DEFINED'
  static readonly EXCEPTION__LOCKED: string = 'STATES IS LOCKED'

  private static _INDEX: number = 0

  private _id: Nullable<string>
  private _lockKey: string = ''
  private _currentStateMeta?: StatesMeta|null

  readonly current: Nullable<string> = null

  get id(): string { return this._id! }
  get all(): StatesTransition[] { return this._transitions.map((t) => t) }
  get isLocked(): boolean { return this._lockKey.length > 0 }

  readonly _transitions: StatesTransition[] = [];
  readonly _metas: StatesMeta[] = [];
  readonly _subscribers: Map<String, StatesTransitionHandler> = new Map<String, StatesTransitionHandler>()

  private _changeCurrentStateWithTransition(transition: StatesTransition, run: boolean = true): void {
    if (run && transition.handlers.length > 0) {
      transition.handlers.forEach((handler) => handler(transition))
    }
    this._currentStateMeta = transition.to
    // console.log('<<< _currentStateMeta: ${_currentStateMeta}');
    Array.from(this._subscribers.values()).forEach((s) => s(transition))
  }

  private _findStateTransitionByAction(action: string): Nullable<StatesTransition> {
    return this._transitions.find((transition: StatesTransition) => transition.action === action)
  }

  private _findStateMetaByName(state: string): Nullable<StatesMeta> {
    return this._metas.find((meta: StatesMeta) => meta.name == state)
  }

  constructor(id?: string) {
    ++States._INDEX
    this._id = id ?? `states_${States._INDEX}`
  }

  /// What are the valid actions you can perform from the current state?
  ///
  /// @return An array of actions.
  actions(from?: string): StatesTransition[] {
    let base: StatesMeta|null|undefined = from == undefined
      ? this._currentStateMeta
      : this._findStateMetaByName(from!)
    const actions: StatesTransition[] = []
    this._transitions.forEach((transition: StatesTransition) => {
      if (transition.at == base) actions.push(transition)
    })
    return actions
  }

  /// What are the valid states you can get to from the current state?
  ///
  /// @return An array of states.
  metas(from?: string): StatesMeta[] {
    const base: Nullable<StatesMeta> = from == null ? this._currentStateMeta : this._findStateMetaByName(from);
    const metas: StatesMeta[] = [];
    this._transitions.forEach((transition: StatesTransition) => {
      if (transition.at == base && transition.to !== null) metas.push(transition.to)
    })
    return metas;
  }

  /// Add a valid link between two states. The state machine can then move between
  ///
  /// @param fromState State you want to move from.
  /// @param toState State you want to move to.
  /// @param action Action that when performed will move from the from state to the to state.
  /// @param handler Optional method that gets called when moving between these two states.
  /// @return true if link was added, false if it was not.
  when(at: string, to: string, on: string, handler?: StatesTransitionHandler|null): States {
    // console.log('< States -> when: ${at} | ${to} | ${on}');
    if (this.isLocked) throw States.EXCEPTION__LOCKED

    let metaFrom: Nullable<StatesMeta>
    let metaTo: Nullable<StatesMeta>

    /// can't have duplicate actions
    if (this._transitions.some((transition: StatesTransition) => {
      return transition.at?.name == at &&
        transition.to?.name == to &&
        (handler && transition.handlers.includes(handler)) &&
        transition.action == on
    })) return this

    metaFrom = this._findStateMetaByName(at)
    if (metaFrom === null || metaFrom === undefined) {
      metaFrom = this.add(at)
    }

    metaTo = this._findStateMetaByName(to)
    if (metaTo === null || metaTo === undefined) {
      metaTo = this.add(to)
    }

    const st = new StatesTransition(
      metaFrom!,
      metaTo!,
      on,
      handler
    )
    this._transitions.push(st)

    return this
  }

  subscribe(func: StatesTransitionHandler, single: boolean = false): Nullable<string> {
    if (single && Array.from(this._subscribers.values()).find((s) => s == func)) return null
    const subscriptionKey = `_ssk${Array.from(this._subscribers.keys()).length}${Date.now().toString()}`
    this._subscribers.set(subscriptionKey, func)
    return subscriptionKey
  }

  unsubscribe(subscriptionKey: string): boolean {
    const result = Array.from(this._subscribers.keys()).includes(subscriptionKey)
    if (result) this._subscribers.delete(subscriptionKey)
    return result
  }

  add(state: string): Nullable<StatesMeta> {
    // console.log('< States -> add: ${state}')
    if (this.isLocked) return null

    /// can't have duplicate states
    if (this.has(undefined, state)) return null
    const stateMeta = new StatesMeta(state)
    this._metas.push(stateMeta)

    /// if no states exist set current state to first state
    if (this._metas.length == 1) {
      this._currentStateMeta = stateMeta
      // console.log('<< _currentStateMeta: ${stateMeta.name}')
    }
    return stateMeta
  }

  /// Move from the current state to another state.
  ///
  /// @param state - New state to try and move to.
  /// @param run - Should execute action function or not, default true.
  /// @return True if the state machine has moved to this new state, false if it was unable to do so.
  change(state: string, run: boolean = true): boolean {
    if (!this.has(undefined, state)) return false
    return this._transitions.some((transition) => {
      const result = transition.at == this._currentStateMeta && transition.to != null && transition.to!.isEqual(state);
      if (result) {
        // console.log('<< transition: ${transition}')
        this._changeCurrentStateWithTransition(transition, run)
      }
      return result
    })
  }

  /// Change the current state by performing an action.
  ///
  /// @param action The action to perform.
  /// @return True if the action was able to be performed and the state machine moved to a new state, false if the action was unable to be performed.
  execute(action: string): boolean {
    // console.log('< States -> execute: ${action}');
    return this._transitions.some((transition) => {
      const result = transition.at == this._currentStateMeta && transition.action == action;
      if (result) {
        // console.log('<< transition: ${transition}')
        this._changeCurrentStateWithTransition(transition)
      }
      return result
    })
  }

  /// Adds handler to the specific action
  ///
  /// @param action The action to which assign handler.
  /// @param handler [StatesTransitionHandler] which will executed on specified action
  /// @return True if the action is transition with specified action registered in the states.
  on(action: string, handler: StatesTransitionHandler): boolean {
    return this._transitions.some((transition) => {
      if (transition.action == action) {
        transition.append(handler)
        return true
      }
      return false
    })
  }

  get(action: string): Nullable<StatesTransition> {
    return this._transitions.find((transition) =>
      action == transition.action)
  }

  /// Does an action exist in the state machine?
  ///
  /// @param action The action in question.
  /// @return True if the action exists, false if it does not.
  has(action?: string, state?: string, conform: boolean = true): boolean {
    let result = false
    let stateActionExists = false
    let stateNameExists = false

    if (action != null) {
      stateActionExists = this._findStateTransitionByAction(action) != null
    } else
      stateActionExists = state != null

    if (state != null) {
      stateNameExists = this._findStateMetaByName(state) != null
    } else
      stateNameExists = stateActionExists

    result = conform
      ? (stateActionExists && stateNameExists)
      : (stateActionExists || stateNameExists)

    return result
  }

  dispose(): void {
    this._transitions.forEach((transition) => transition.dispose())
    const disposeTransition = new StatesTransition(this._currentStateMeta!, this._currentStateMeta!, States.DISPOSE);
    for (let key in Array.from(this._subscribers.keys())) {
      let sub = this._subscribers.get(key)
      if (sub != null) sub(disposeTransition)
    }
    this._subscribers.clear()
    this._transitions.splice(0)
    this._metas.splice(0)
    this._currentStateMeta = undefined
    States._INDEX = 0
  }

  lock(token: string): void {
    if (token == null || token.length == 0) throw new Error(States.EXCEPTION__LOCK_KEY)
    this._lockKey = token
  }

  unlock(token: string): void {
    if (this._lockKey == token) this._lockKey = ''
  }

  reset(): void {
    this._currentStateMeta = this._metas.length > 0 ? this._metas[0] : null
  }
}


/**
 * Multiplies a value by 2. (Also a full example of TypeDoc's functionality.)
 *
 * ### Example (es module)
 * ```js
 * import { double } from 'typescript-starter'
 * console.log(double(4))
 * // => 8
 * ```
 *
 * ### Example (commonjs)
 * ```js
 * var double = require('typescript-starter').double;
 * console.log(double(4))
 * // => 8
 * ```
 *
 * @param value - Comment describing the `value` parameter.
 * @returns Comment describing the return type.
 * @anotherNote Some other value.
 */
export const double = (value: number) => {
  return value * 2;
};

/**
 * Raise the value of the first parameter to the power of the second using the
 * es7 exponentiation operator (`**`).
 *
 * ### Example (es module)
 * ```js
 * import { power } from 'typescript-starter'
 * console.log(power(2,3))
 * // => 8
 * ```
 *
 * ### Example (commonjs)
 * ```js
 * var power = require('typescript-starter').power;
 * console.log(power(2,3))
 * // => 8
 * ```
 * @param base - the base to exponentiate
 * @param exponent - the power to which to raise the base
 */
export const power = (base: number, exponent: number) => {
  /**
   * This es7 exponentiation operator is transpiled by TypeScript
   */
  return base ** exponent;
};
