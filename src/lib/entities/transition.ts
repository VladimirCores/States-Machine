/// Creates a new action. The action method is optional.
///
/// @param fromState State to move form.
/// @param toState State to move to.
/// @param name Action's name.
/// @param action Method to call on performing action.

type StatesTransitionHandler = (transition: StatesTransition) => void;

class StatesTransition {
  private readonly _from: StatesMeta
  private readonly _to: StatesMeta
  private readonly _action?: string|null

  private readonly _handlers: StatesTransitionHandler[] = []

  constructor(from: StatesMeta, to: StatesMeta, action?: string|null, handler?: StatesTransitionHandler|null) {
    this._from = from
    this._to = to
    this._action = action
    this.append(handler)
  }

  dispose(): void { this._handlers.splice(0) }

  append(func?: StatesTransitionHandler|null): void {
    if (func != undefined) this._handlers.push(func)
  }

  /// @return The method to call on preforming the action.
  get handlers(): StatesTransitionHandler[] { return this._handlers }

  /// @return The state to move from.
  get at(): StatesMeta { return this._from }

  /// @return  The state to move to.
  get to(): StatesMeta { return this._to }

  /// @return The action's name.
  get action(): string|null|undefined { return this._action }

  toString(): string {
    return `[${this._from?.name}] -> [${this._to?.name}] on: [${this._action}]`;
  }
}
