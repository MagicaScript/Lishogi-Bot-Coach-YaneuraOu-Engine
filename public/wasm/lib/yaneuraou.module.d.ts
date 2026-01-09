export interface EmscriptenModule {
    [key: string]: any;
}

export type EmscriptenModuleFactory<T extends EmscriptenModule = EmscriptenModule> = (
  moduleOverrides?: Partial<T>
) => Promise<T>;

export interface YaneuraOuModule extends EmscriptenModule
{
  addMessageListener: (listener: (line: string) => void) => void;
  removeMessageListener: (listener: (line: string) => void) => void;
  postMessage: (command: string) => void;
  terminate: () => void;
  ccall: (ident: string, returnType: string | null, argTypes: string[], args: any[], opts?: any) => any;
  FS: any;
}