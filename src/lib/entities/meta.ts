class StatesMeta {
  private readonly _name: string;

  /// State's name.
  constructor(name: string) {
    this._name = name;
  }

  isEqual(name: string): boolean { return this._name == name }

  /// @return The state's name.
  public get name(): string { return this._name }
}
