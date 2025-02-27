export type UserCommand = "set" | "delete" | "show" | "get";
export type DistCommand = "append" | "vote";
export type Command = UserCommand | DistCommand;
