import * as core from '@actions/core';
import {Config, NodeSSH} from 'node-ssh';
import {keyboardFunction} from './keyboard';

async function run() {
  const command: string = core.getInput('command');
  const host: string = core.getInput('host') || 'localhost';
  const username: string = core.getInput('username');
  const port: number = +core.getInput('port') || 22;
  const privateKey: string = core.getInput('privateKey');
  const password: string = core.getInput('password');
  const passphrase: string = core.getInput('passphrase');
  const tryKeyboard: boolean = !!core.getInput('tryKeyboard');
  try {
    const ssh = await connect(
      host,
      username,
      port,
      privateKey,
      password,
      passphrase,
      tryKeyboard
    );

    await executeCommand(ssh, command);

    ssh.dispose();
  } catch (err) {
    if (typeof err === 'string') {
      core.setFailed(err);
    } else if (err instanceof Error) {
      core.setFailed(err.message);
    }
  }
}

async function connect(
  host = 'localhost',
  username: string,
  port = 22,
  privateKey: string,
  password: string,
  passphrase: string,
  tryKeyboard: boolean
) {
  const ssh = new NodeSSH();
  console.log(`Establishing a SSH connection to ${host}.`);

  try {
    const config: Config = {
      host: host,
      port: port,
      username: username,
      password: password,
      passphrase: passphrase,
      tryKeyboard: tryKeyboard,
      onKeyboardInteractive: tryKeyboard
        ? keyboardFunction(password)
        : undefined
    };
    if (privateKey) {
      console.log('using provided private key');
      config.privateKey = privateKey;
    }
    await ssh.connect(config);
    console.log(`🤝 Connected to ${host}.`);
  } catch (err) {
    if (typeof err === 'string') {
      console.error(`⚠️ The GitHub Action couldn't connect to ${host}.`, err);
      core.setFailed(err);
    } else if (err instanceof Error) {
      console.error(
        `⚠️ The GitHub Action couldn't connect to ${host}.`,
        err.message
      );
      core.setFailed(err.message);
    }
  }
  return ssh;
}

async function executeCommand(ssh: NodeSSH, command: string) {
  console.log(`Executing command: ${command}`);

  try {
    const {code} = await ssh.exec(command, [], {
      stream: 'both',
      onStdout(chunk) {
        console.log(chunk.toString('utf8'));
      },
      onStderr(chunk) {
        console.log(chunk.toString('utf8'));
      }
    });

    if (typeof code === 'number' && code > 0) {
      throw Error(`Command exited with code ${code}`);
    }
    console.log('✅ SSH Action finished.');
    if (ssh.isConnected()) {
      ssh.dispose();
    }
  } catch (err) {
    if (typeof err === 'string') {
      console.error(`⚠️ An error happened executing command ${command}.`, err);
      core.setFailed(err);
    } else if (err instanceof Error) {
      console.error(
        `⚠️ An error happened executing command ${command}.`,
        err.message
      );
      core.setFailed(err.message);
    }
    process.abort();
  }
}

process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
  if (err instanceof Error) {
    if (err.code !== 'ECONNRESET') {
      throw err;
    }
  }
});

run();
