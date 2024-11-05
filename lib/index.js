"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const node_ssh_1 = require("node-ssh");
const keyboard_1 = require("./keyboard");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const command = core.getInput('command');
        const host = core.getInput('host') || 'localhost';
        const username = core.getInput('username');
        const port = +core.getInput('port') || 22;
        const privateKey = core.getInput('privateKey');
        const password = core.getInput('password');
        const passphrase = core.getInput('passphrase');
        const tryKeyboard = !!core.getInput('tryKeyboard');
        try {
            const ssh = yield connect(host, username, port, privateKey, password, passphrase, tryKeyboard);
            yield executeCommand(ssh, command);
            ssh.dispose();
        }
        catch (err) {
            if (typeof err === 'string') {
                core.setFailed(err);
            }
            else if (err instanceof Error) {
                core.setFailed(err.message);
            }
        }
    });
}
function connect() {
    return __awaiter(this, arguments, void 0, function* (host = 'localhost', username, port = 22, privateKey, password, passphrase, tryKeyboard) {
        const ssh = new node_ssh_1.NodeSSH();
        console.log(`Establishing a SSH connection to ${host}.`);
        try {
            const config = {
                host: host,
                port: port,
                username: username,
                password: password,
                passphrase: passphrase,
                tryKeyboard: tryKeyboard,
                onKeyboardInteractive: tryKeyboard
                    ? (0, keyboard_1.keyboardFunction)(password)
                    : undefined
            };
            if (privateKey) {
                console.log('using provided private key');
                config.privateKey = privateKey;
            }
            yield ssh.connect(config);
            console.log(`🤝 Connected to ${host}.`);
        }
        catch (err) {
            if (typeof err === 'string') {
                console.error(`⚠️ The GitHub Action couldn't connect to ${host}.`, err);
                core.setFailed(err);
            }
            else if (err instanceof Error) {
                console.error(`⚠️ The GitHub Action couldn't connect to ${host}.`, err.message);
                core.setFailed(err.message);
            }
        }
        return ssh;
    });
}
function executeCommand(ssh, command) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Executing command: ${command}`);
        try {
            const { code } = yield ssh.exec(command, [], {
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
        }
        catch (err) {
            if (typeof err === 'string') {
                console.error(`⚠️ An error happened executing command ${command}.`, err);
                core.setFailed(err);
            }
            else if (err instanceof Error) {
                console.error(`⚠️ An error happened executing command ${command}.`, err.message);
                core.setFailed(err.message);
            }
            process.abort();
        }
    });
}
process.on('uncaughtException', (err) => {
    if (err instanceof Error) {
        if (err.code !== 'ECONNRESET') {
            throw err;
        }
    }
});
run();
