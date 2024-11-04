import {Prompt, KeyboardInteractiveCallback} from 'ssh2';

export const keyboardFunction =
  (password: string) =>
  (
    name: string,
    instructions: string,
    lang: string,
    prompts: Prompt[],
    finish: KeyboardInteractiveCallback
  ) => {
    if (
      prompts.length > 0 &&
      prompts[0].prompt.toLowerCase().includes('password')
    ) {
      finish([password]);
    }
  };
