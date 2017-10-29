"use strict";

import {
  Terminal,
  window,
  workspace,
  TextDocument,
  Disposable,
  OutputChannel,
  TextEditor
} from "vscode";

export default class LogtalkTerminal {
  private static _terminal: Terminal;
  private static _document: TextDocument;

  constructor() {}

  public static init(): Disposable {
    return (<any>window).onDidCloseTerminal(terminal => {
      LogtalkTerminal._terminal = null;
      terminal.dispose();
    });
  }

  private static createLogtalkTerm() {
    if (LogtalkTerminal._terminal) {
      return;
    }

    let section = workspace.getConfiguration("logtalk");
    if (section) {
      let executable = section.get<string>("executablePath", "logtalk");
      let args = section.get<string[]>("terminal.runtimeArgs");
      LogtalkTerminal._terminal = (<any>window).createTerminal(
        "Logtalk",
        executable,
        args
      );
    } else {
      throw new Error("configuration settings error: logtalk");
    }
  }

  public static sendString(text: string) {
    LogtalkTerminal.createLogtalkTerm();
    LogtalkTerminal._terminal.sendText(text);
    LogtalkTerminal._terminal.show(false);
  }

  public static openLogtalk() {
    LogtalkTerminal.createLogtalkTerm();
    LogtalkTerminal._terminal.show(true);
  }
  public static loadDocument() {
    LogtalkTerminal._document = window.activeTextEditor.document;
    LogtalkTerminal.createLogtalkTerm();
    let goals = "logtalk_load('" + LogtalkTerminal._document.fileName + "').";
    if (LogtalkTerminal._document.isDirty) {
      LogtalkTerminal._document.save().then(_ => {
        LogtalkTerminal.sendString(goals);
      });
    } else {
      LogtalkTerminal.sendString(goals);
    }
  }
}
